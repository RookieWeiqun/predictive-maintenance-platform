/*
 * SPDX-FileCopyrightText: 2024 Siemens AG
 *
 * SPDX-License-Identifier: MIT
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { createRouter, createWebHashHistory } from "vue-router";
import HomePage from "../pages/home/index.vue";
import { canAccessRoute, findFirstAccessiblePath } from "@/auth/access";
import { authState, beginOneIdLogin, canStartOneIdLogin, initializeAuth, isLocalDebugLoginEnabled } from "@/auth/store";

// 项目管理界面
import ProjectList from "../pages/project/list/index.vue";
import ProjectCreate from "../pages/project/create/index.vue";
import ProjectDetail from "../pages/project/detail/index.vue";
import ProjectReport from "../pages/project/report/index.vue";
import LoginPage from "../pages/login/index.vue";
import CallbackPage from "../pages/auth/callback/index.vue";
import AccessDeniedPage from "../pages/access-denied/index.vue";
import UserListPage from "../pages/user/list/index.vue";
import RoleListPage from "../pages/role/list/index.vue";

// 方案维护界面
import SchemeList from "../pages/scheme/list/index.vue";
import SchemeEdit from "../pages/scheme/edit/index.vue";
import SchemeView from "../pages/scheme/view/index.vue";
import SchemeCreate from "../pages/scheme/create/index.vue";

// 设备管理界面
import DeviceList from "../pages/device/list/index.vue";

// 客户管理界面
import CustomerList from "../pages/customer/list/index.vue";

// 数据维护界面
import TaskList from "../pages/task/list/index.vue";
import OfflineTaskList from "../pages/task/offline-list/index.vue";
import TaskScheme from "../pages/task/scheme/index.vue";
import TaskCollect from "../pages/task/collect/index.vue";
import TaskReview from "../pages/task/review/index.vue";
import AndroidDebug from "../pages/android/debug/index.vue";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      redirect: "/project/list",
    },
    {
      path: "/login",
      component: LoginPage,
      meta: { public: true, layout: 'blank' },
    },
    {
      path: "/callback",
      component: CallbackPage,
      meta: { public: true, layout: 'blank' },
    },
    {
      path: "/access-denied",
      component: AccessDeniedPage,
      meta: { layout: 'blank' },
    },
    {
      path: "/home",
      component: HomePage,
      meta: { permissionKey: 'project:list' },
    },
    // 设备管理界面路由
    {
      path: "/device/list",
      component: DeviceList,
      meta: { permissionKey: 'device:view' },
    },
    // 客户管理界面路由
    {
      path: "/customer/list",
      component: CustomerList,
      meta: { permissionKey: 'customer:view' },
    },
    // 项目管理界面路由
    {
      path: "/project/list",
      component: ProjectList,
      meta: { permissionKey: 'project:list' },
    },
    {
      path: "/project/create",
      component: ProjectCreate,
      meta: { permissionKey: 'project:create' },
    },
    {
      path: "/project/detail/:id",
      component: ProjectDetail,
      meta: { permissionKey: 'project:list' },
    },
    {
      path: "/project/report/:id",
      component: ProjectReport,
      meta: { permissionKey: 'project:list' },
    },
    // 方案维护界面路由
    {
      path: "/scheme/list",
      component: SchemeList,
      meta: { permissionKey: 'scheme:view' },
    },
    {
      path: "/scheme/view/:id",
      component: SchemeView,
      meta: { permissionKey: 'scheme:view' },
    },
    {
      path: "/scheme/create/:type",
      component: SchemeCreate,
      meta: { permissionKey: 'scheme:view' },
    },
    {
      path: "/scheme/edit/:id",
      component: SchemeEdit,
      meta: { permissionKey: 'scheme:view' },
    },
    // 数据维护界面路由
    {
      path: "/task/list",
      redirect: "/task/list-online",
    },
    {
      path: "/task/list-online",
      component: TaskList,
      meta: { permissionKey: 'task:online' },
    },
    {
      path: "/task/list-offline",
      component: OfflineTaskList,
      meta: { permissionKey: 'task:offline' },
    },
    {
      path: "/task/scheme/:taskId",
      component: TaskScheme,
      meta: { permissionKey: ['task:online', 'task:offline'] },
    },
    {
      path: "/task/collect/:taskId",
      component: TaskCollect,
      meta: { permissionKey: ['task:online', 'task:offline'] },
    },
    {
      path: "/task/review/:taskId",
      component: TaskReview,
      meta: { permissionKey: ['task:online', 'task:offline'] },
    },
    {
      path: "/android/debug",
      component: AndroidDebug,
      meta: { permissionKey: 'task:offline' },
    },
    {
      path: "/user/list",
      component: UserListPage,
      meta: { permissionKey: 'user:manage' },
    },
    {
      path: "/role/list",
      component: RoleListPage,
      meta: { permissionKey: 'role:manage' },
    },
  ],
});

router.beforeEach(async (to) => {
  await initializeAuth();

  if (to.meta.public === true) {
    if (to.path === '/login' && authState.session) {
      return findFirstAccessiblePath(authState.accessibleMenuItems);
    }
    return true;
  }

  if (!authState.session) {
    const redirect = to.fullPath === '/access-denied' ? '/' : to.fullPath;
    if (!isLocalDebugLoginEnabled() && canStartOneIdLogin()) {
      beginOneIdLogin(redirect);
      return false;
    }
    return `/login?redirect=${encodeURIComponent(redirect)}`;
  }

  if (to.path === '/access-denied') {
    return true;
  }

  if (!canAccessRoute(to, authState.accessiblePathSet)) {
    return '/access-denied';
  }

  return true;
});

export default router;
