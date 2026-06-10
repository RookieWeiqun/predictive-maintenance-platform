<template>
  <div class="login-page">
    <div class="login-page__panel">
      <div>
        <p class="login-page__eyebrow">认证入口</p>
        <h1 class="login-page__title">{{ pageTitle }}</h1>
        <p class="login-page__description">{{ pageDescription }}</p>
      </div>

      <section class="login-page__card">
        <h2>OneID</h2>
        <p>回调地址：{{ redirectUri }}</p>
        <p>Client ID：{{ clientId || '未配置' }}</p>
        <p v-if="endpointWarning" class="login-page__warning">{{ endpointWarning }}</p>
        <IxButton variant="primary" :disabled="loading || !clientId" @click="startOneIdLogin">
          {{ loading ? '跳转中...' : '使用 OneID 登录' }}
        </IxButton>
      </section>

      <section v-if="showDebugLogin" class="login-page__card">
        <h2>本地调试角色</h2>
        <div class="login-page__debug-actions">
          <IxButton variant="secondary" @click="startDebugLogin('administrator')">管理员视角</IxButton>
          <IxButton variant="secondary" @click="startDebugLogin('engineer')">工程师视角</IxButton>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { IxButton, showToast } from '@siemens/ix-vue';
import {
  getOneIdAuthorizationEndpoint,
  getOneIdClientId,
  getOneIdRedirectUri,
} from '@/config/oneid';
import { beginOneIdLogin, canStartOneIdLogin, isLocalDebugLoginEnabled, loginWithDebug, resolvePostLoginPath } from '@/auth/store';
import type { AppRoleProfile } from '@/auth/access';

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const showDebugLogin = isLocalDebugLoginEnabled();
const clientId = computed(() => getOneIdClientId());
const redirectUri = computed(() => getOneIdRedirectUri());
const pageTitle = computed(() => (showDebugLogin ? 'OneID 登录与本地调试' : 'OneID 登录'));
const pageDescription = computed(() => (
  showDebugLogin
    ? 'Web 端和平板端统一走 OneID。开发联调阶段可以直接切换为本地管理员或工程师视角，验证菜单与页面权限。'
    : '当前环境将直接跳转到 OneID 认证中心。如未自动跳转，可手动点击下方按钮继续登录。'
));
const endpointWarning = computed(() => {
  const endpoint = getOneIdAuthorizationEndpoint();
  if (endpoint.includes('.well-known/openid-configuration')) {
    return '当前授权端点配置成了发现端点，点击后只会看到 JSON，不会进入 OneID 登录页。';
  }
  return '';
});

function getDesiredRedirectPath(): string {
  const raw = route.query.redirect;
  return typeof raw === 'string' && raw ? raw : '/project/list';
}

function shouldAutoStartOneIdLogin(): boolean {
  return !showDebugLogin && route.query.manual !== '1' && canStartOneIdLogin();
}

function startOneIdLogin() {
  const currentClientId = clientId.value;
  if (!currentClientId) {
    showToast({ message: '缺少 OneID client_id，请先配置 VITE_ONEID_CLIENT_ID。' });
    return;
  }
  if (endpointWarning.value) {
    showToast({ message: endpointWarning.value });
    return;
  }

  loading.value = true;
  const redirectPath = getDesiredRedirectPath();
  beginOneIdLogin(redirectPath);
}

async function startDebugLogin(profile: AppRoleProfile) {
  await loginWithDebug(profile);
  await router.replace(resolvePostLoginPath());
}

onMounted(() => {
  if (shouldAutoStartOneIdLogin()) {
    startOneIdLogin();
  }
});
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background:
    radial-gradient(circle at top right, rgba(0, 153, 153, 0.15), transparent 35%),
    linear-gradient(135deg, #f5f7fa 0%, #eef4f6 100%);
}

.login-page__panel {
  width: min(720px, 100%);
  display: grid;
  gap: 1.5rem;
  padding: 2rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.08);
}

.login-page__eyebrow {
  margin: 0 0 0.5rem;
  color: #0a7d7d;
  font-weight: 700;
}

.login-page__title {
  margin: 0;
  font-size: clamp(2rem, 4vw, 3rem);
}

.login-page__description {
  margin: 1rem 0 0;
  color: #4d5b66;
  line-height: 1.7;
}

.login-page__card {
  display: grid;
  gap: 0.75rem;
  padding: 1.25rem;
  border-radius: 0.875rem;
  border: 1px solid rgba(10, 125, 125, 0.16);
  background: #ffffff;
}

.login-page__card h2,
.login-page__card p {
  margin: 0;
}

.login-page__warning {
  color: #b45309;
  line-height: 1.6;
}

.login-page__debug-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}
</style>