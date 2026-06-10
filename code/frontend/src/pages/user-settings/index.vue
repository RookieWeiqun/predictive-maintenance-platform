<!--
 * SPDX-FileCopyrightText: 2024 Siemens AG
 *
 * SPDX-License-Identifier: MIT
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 -->
<template>
  <div class="user-settings">
    <h3>当前用户</h3>
    <p class="user-settings__line">{{ displayName }}</p>
    <p class="user-settings__line">当前角色：{{ roleLabel }}</p>
    <div class="user-settings__actions">
      <button type="button" class="user-settings__button" @click="switchTo('administrator')">切到管理员</button>
      <button type="button" class="user-settings__button" @click="switchTo('engineer')">切到工程师</button>
      <button type="button" class="user-settings__button user-settings__button--secondary" @click="clearOverride">恢复真实角色</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { showToast } from '@siemens/ix-vue';
import type { AppRoleProfile } from '@/auth/access';
import { authState, clearRoleOverride as clearAuthRoleOverride, setRoleOverride } from '@/auth/store';

const displayName = computed(() => authState.displayName || '未登录');
const roleLabel = computed(() => authState.roleDisplayLabel || '未分配');

function switchTo(profile: AppRoleProfile) {
  setRoleOverride(profile);
  showToast({ message: `已切换为${profile === 'administrator' ? '管理员' : '工程师'}视角` });
}

function clearOverride() {
  clearAuthRoleOverride();
  showToast({ message: '已恢复真实角色权限' });
}
</script>

<style scoped>
.user-settings {
  padding: 1rem;
}

.user-settings__line {
  margin: 0.5rem 0;
}

.user-settings__actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
}

.user-settings__button {
  border: 1px solid var(--theme-color-soft-border);
  background: var(--theme-color-base-1, #fff);
  color: var(--theme-color-text);
  border-radius: 0.25rem;
  min-height: 2.25rem;
  cursor: pointer;
}

.user-settings__button--secondary {
  color: var(--theme-color-dynamic);
}
</style>
