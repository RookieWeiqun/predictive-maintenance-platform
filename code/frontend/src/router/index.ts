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

// 项目管理界面
import ProjectList from "../pages/project/list/index.vue";
import ProjectCreate from "../pages/project/create/index.vue";
import ProjectDetail from "../pages/project/detail/index.vue";
import ProjectReport from "../pages/project/report/index.vue";

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
import TaskScheme from "../pages/task/scheme/index.vue";
import TaskCollect from "../pages/task/collect/index.vue";
import TaskReview from "../pages/task/review/index.vue";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      redirect: "/device/list",
    },
    {
      path: "/home",
      component: HomePage,
    },
    // 设备管理界面路由
    {
      path: "/device/list",
      component: DeviceList,
    },
    // 客户管理界面路由
    {
      path: "/customer/list",
      component: CustomerList,
    },
    // 项目管理界面路由
    {
      path: "/project/list",
      component: ProjectList,
    },
    {
      path: "/project/create",
      component: ProjectCreate,
    },
    {
      path: "/project/detail/:id",
      component: ProjectDetail,
    },
    {
      path: "/project/report/:id",
      component: ProjectReport,
    },
    // 方案维护界面路由
    {
      path: "/scheme/list",
      component: SchemeList,
    },
    {
      path: "/scheme/view/:id",
      component: SchemeView,
    },
    {
      path: "/scheme/create/:type",
      component: SchemeCreate,
    },
    {
      path: "/scheme/edit/:id",
      component: SchemeEdit,
    },
    // 数据维护界面路由
    {
      path: "/task/list",
      component: TaskList,
    },
    {
      path: "/task/scheme/:taskId",
      component: TaskScheme,
    },
    {
      path: "/task/collect/:taskId",
      component: TaskCollect,
    },
    {
      path: "/task/review/:taskId",
      component: TaskReview,
    },
  ],
});

export default router;
