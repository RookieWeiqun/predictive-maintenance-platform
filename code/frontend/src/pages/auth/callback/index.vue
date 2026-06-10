<template>
  <div class="callback-page">
    <div class="callback-page__panel">
      <h1>登录处理中</h1>
      <p>{{ message }}</p>
      <IxButton v-if="failed" variant="secondary" @click="goBack">返回登录页</IxButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { IxButton } from '@siemens/ix-vue';
import { completeOneIdLogin, resolvePostLoginPath } from '@/auth/store';

const route = useRoute();
const router = useRouter();
const failed = ref(false);
const message = ref('正在校验 OneID 授权结果，请稍候。');

async function runCallback() {
  const searchParams = new URLSearchParams(window.location.search);
  const codeFromRoute = typeof route.query.code === 'string' ? route.query.code : '';
  const errorFromRoute = typeof route.query.error === 'string' ? route.query.error : '';
  const code = codeFromRoute || searchParams.get('code') || '';
  const error = errorFromRoute || searchParams.get('error') || '';
  if (error) {
    failed.value = true;
    message.value = `OneID 登录失败：${error}`;
    return;
  }
  if (!code) {
    failed.value = true;
    message.value = '回调中缺少 code，无法完成登录。';
    return;
  }

  try {
    await completeOneIdLogin(code);
    await router.replace(resolvePostLoginPath());
  } catch (errorValue) {
    failed.value = true;
    message.value = errorValue instanceof Error ? errorValue.message : 'OneID 登录失败';
  }
}

async function goBack() {
  await router.replace('/login?manual=1');
}

onMounted(() => {
  void runCallback();
});
</script>

<style scoped>
.callback-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: linear-gradient(135deg, #f5f8fa 0%, #eef5f7 100%);
}

.callback-page__panel {
  width: min(520px, 100%);
  padding: 2rem;
  border-radius: 1rem;
  background: #fff;
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.08);
}

.callback-page__panel h1,
.callback-page__panel p {
  margin: 0;
}

.callback-page__panel p {
  margin: 1rem 0 0;
  line-height: 1.7;
}
</style>