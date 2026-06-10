<template>
  <RouterView v-if="isBlankLayout" />
  <IxApplicationContext v-else>
    <IxApplication>
      <IxApplicationHeader name="预防性维护报告平台">
        <Logo />
        <IxAvatar :username="avatarName" :extra="avatarExtra">
          <IxDropdownItem
            :icon="iconUserSettings"
            label="调试角色切换"
            @click="openSettings"
          />
          <IxDropdownItem :icon="iconLogOut" label="退出登录" @click="handleLogout" />
        </IxAvatar>
      </IxApplicationHeader>
      <IxMenu enable-toggle-theme i18n-toggle-theme="Toggle Theme" i18n-settings="Settings">
        <IxMenuItem
          v-for="item in visibleMenuItems"
          :key="item.route"
          :active="isRouteActive(item.route)"
          :icon="item.icon"
          @click="navigateTo(item.route)"
        >
          {{ item.label }}
        </IxMenuItem>

        <IxMenuSettings label="Settings">
          <IxMenuSettingsItem label="用户与调试设置">
            <UserSettings />
          </IxMenuSettingsItem>
        </IxMenuSettings>
      </IxMenu>
      <IxContent>
        <RouterView />
      </IxContent>
    </IxApplication>
  </IxApplicationContext>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  IxApplication,
  IxApplicationContext,
  IxApplicationHeader,
  IxAvatar,
  IxContent,
  IxDropdownItem,
  IxMenu,
  IxMenuItem,
  IxMenuSettings,
  IxMenuSettingsItem,
  showToast,
} from "@siemens/ix-vue";
import { iconLogOut, iconUserSettings, iconFolder, iconList, iconAdd, iconSingleCheck, iconTasksAll, iconGenericDeviceMaintenance, iconCustomer } from "@siemens/ix-icons/icons";
import Logo from "./components/Logo.vue";
import UserSettings from "./pages/user-settings/index.vue";
import { authState, logout } from "./auth/store";

const route = useRoute();
const router = useRouter();

const menuIcons: Record<string, string | undefined> = {
  '/device/list': iconGenericDeviceMaintenance,
  '/customer/list': iconCustomer,
  '/project/list': iconList,
  '/project/create': iconAdd,
  '/scheme/list': iconSingleCheck,
  '/task/list-online': iconTasksAll,
  '/task/list-offline': iconFolder,
};

const isBlankLayout = computed(() => route.meta.layout === 'blank');
const visibleMenuItems = computed(() =>
  authState.accessibleMenuItems
    .map((item) => ({
      ...item,
      icon: menuIcons[item.route],
    })),
);
const avatarName = computed(() => authState.displayName || '未登录');
const avatarExtra = computed(() => authState.roleDisplayLabel || '未分配角色');

const navigateTo = (path: string) => {
  router.push(path);
};

const isRouteActive = (path: string) => route.path === path || route.path.startsWith(`${path}/`);

const openSettings = () => {
  showToast({ message: '请在左下角 Settings 中切换本地调试角色。' });
};

const handleLogout = async () => {
  await logout();
  await router.replace('/login');
};
</script>
