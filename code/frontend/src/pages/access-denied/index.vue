<template>
  <div class="access-denied-page">
    <div class="access-denied-page__panel">
      <h1>无权访问</h1>
      <p>当前角色没有这个页面的权限。可以切换本地调试角色，或者返回你有权限的菜单。</p>
      <div class="access-denied-page__actions">
        <IxButton variant="primary" @click="goHome">返回可访问页面</IxButton>
        <IxButton variant="secondary" @click="goLogin">重新登录</IxButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IxButton, showToast } from '@siemens/ix-vue';
import { useRouter } from 'vue-router';
import { logout, resolvePostLoginPath } from '@/auth/store';

const router = useRouter();

async function goHome() {
  const target = resolvePostLoginPath();
  if (!target || target === '/access-denied') {
    showToast({ message: '当前角色没有任何可访问菜单，请重新登录或联系管理员分配权限。' });
    return;
  }
  await router.replace(target);
}

async function goLogin() {
  await logout();
  await router.replace('/login');
}
</script>

<style scoped>
.access-denied-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: linear-gradient(135deg, #faf6f3 0%, #f8efec 100%);
}

.access-denied-page__panel {
  width: min(560px, 100%);
  padding: 2rem;
  border-radius: 1rem;
  background: #fff;
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.08);
}

.access-denied-page__panel h1,
.access-denied-page__panel p {
  margin: 0;
}

.access-denied-page__panel p {
  margin-top: 1rem;
  line-height: 1.7;
}

.access-denied-page__actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 1.5rem;
}
</style>