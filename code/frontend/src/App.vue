<template>
  <IxApplicationContext>
    <IxApplication>
    <!-- 定义页面的头部 -->
    <IxApplicationHeader name="预防性维护报告平台">
      <Logo />
      <IxAvatar username="Your user" extra="Administrator">
        <IxDropdownItem
          :icon="iconUserSettings"
          label="User Settings"
          @click="showDemoMessage"
        />
        <IxDropdownItem :icon="iconLogOut" label="Logout" @click="showDemoMessage" />
      </IxAvatar>
    </IxApplicationHeader>
    <!-- 定义页面的导航菜单 -->
    <IxMenu enable-toggle-theme i18n-toggle-theme="Toggle Theme" i18n-settings="Settings">
      <!-- 设备管理菜单 -->
      <IxMenuItem :active="route.path === '/device/list'" @click="navigateTo('/device/list')" :icon="iconGenericDeviceMaintenance">
        设备管理
      </IxMenuItem>
      <IxMenuItem :active="route.path === '/customer/list'" @click="navigateTo('/customer/list')" :icon="iconCustomer">
        客户管理
      </IxMenuItem>
      <!-- 项目管理菜单 -->
      <IxMenuItem :active="route.path === '/project/list'" @click="navigateTo('/project/list')" :icon="iconList">
        项目列表
      </IxMenuItem>
      <IxMenuItem :active="route.path === '/project/create'" @click="navigateTo('/project/create')" :icon="iconAdd">
        新建项目
      </IxMenuItem>
      
      <!-- 方案维护菜单 -->
      <IxMenuItem :active="route.path === '/scheme/list'" @click="navigateTo('/scheme/list')" :icon="iconSingleCheck">
        方案维护
      </IxMenuItem>
      <IxMenuItem :active="route.path === '/task/list'" @click="navigateTo('/task/list')" :icon="iconTasksAll">
        任务列表
      </IxMenuItem>
      
      <!-- 定义设置菜单 -->
      <IxMenuSettings label="Settings">
        <IxMenuSettingsItem label="User Settings">
          <UserSettings />
        </IxMenuSettingsItem>
      </IxMenuSettings>
    </IxMenu>
    <!-- 定义页面的内容 -->
    <IxContent>
      <RouterView />
    </IxContent>
    </IxApplication>
  </IxApplicationContext>
</template>

<script setup lang="ts">
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
} from "@siemens/ix-vue";
import { iconLogOut, iconUserSettings, iconFolder, iconList, iconAdd, iconSingleCheck, iconTasksAll, iconDeviceManager, iconGenericDevice, iconDeviceFan, iconDeviceDriver, iconDevicePlay, iconGenericDeviceMaintenance, iconCustomer } from "@siemens/ix-icons/icons";
import { useShowDemoMessage } from "./hooks/demoMessage";
import Logo from "./components/Logo.vue";
import UserSettings from "./pages/user-settings/index.vue";

const showDemoMessage = useShowDemoMessage();
const route = useRoute();
const router = useRouter();

const navigateTo = (path: string) => {
  router.push(path);
};
</script>
