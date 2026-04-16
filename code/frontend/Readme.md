# 预防性维护报告平台（前端）

本仓库为 **预防性维护报告平台** 的 **Vue 3 单页应用（SPA）**：技术栈为 **Vue 3 + TypeScript + Siemens iX + Vite**，覆盖设备、客户、项目、维护方案与任务等业务流程。当前业务数据主要由 **`src/mockdata/`** 提供，可按接入进度逐步替换为后端接口；**Word 报告导出** 等能力通过 **n8n Webhook** 集成（见 `src/config/n8n.ts`）。

## 特性

- **Vue 3 + TypeScript**：`<script setup>`、组合式 API
- **Siemens iX**：工业风 UI（`@siemens/ix-vue`、主题切换）
- **Vite 6**：开发与构建；路径别名 `@` → `src`
- **Vue Router（Hash）**：`createWebHashHistory`，便于静态部署
- **ag-grid**：列表与复杂表格（`@siemens/ix-aggrid`）
- **ECharts 6**：报告页雷达图、柱状图、饼图等
- **国际化**：未内置；需要时可自行接入 `vue-i18n` 与文案目录
- **数据层（当前）**：`src/mockdata/` 中 JSON 与 TS 装配，便于在无后端或联调前运行完整界面；对接 API 时可集中替换数据访问层
- **n8n 集成**：报告导出 Word（`src/config/n8n.ts`）；开发环境可走 Vite 代理 `/n8n-proxy` 规避 CORS

## 环境要求

- **Node.js**：>= 22.21.x  
- **pnpm**：>= 10.x（仓库锁定 `pnpm@10.17.0`）

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

默认访问：<http://localhost:5173>（路由为 Hash，例如 `/#/device/list`）。

### 构建生产版本

```bash
pnpm build
```

执行 `vue-tsc` 类型检查后由 Vite 输出到 `dist/`。

### 预览生产构建

```bash
pnpm preview
```

`vite.config.ts` 中为预览服务配置了与开发环境一致的 **n8n 代理**（见下文）。

### 预发构建（staging mode）

```bash
pnpm build:staging
```

使用 `vite build --mode staging`，加载项目根目录 **`.env.staging`**（及 `.env.staging.local`）。用于与生产不同的 n8n / API 地址时，勿把密钥写入仓库，请用 `*.local` 或 CI 变量。

### 类型检查（不打包）

```bash
pnpm typecheck
```

---

## 环境变量（Vite）

约定与 [Vite 环境变量与模式](https://vitejs.dev/guide/env-and-mode.html) 一致：

| 文件 | 说明 |
|------|------|
| **`.env.example`** | 模板：列出全部 `VITE_*` 含义，**可复制**为本地文件对照 |
| **`.env.development`** | `pnpm dev` 时加载（可入库，勿写密钥） |
| **`.env.production`** | `pnpm build` 时加载（可入库占位；真实密钥用 CI 或 `.env.production.local`） |
| **`.env.staging`** | `pnpm build:staging` 时加载 |
| **`.env`** / **`.env.*.local`** | **已被 `.gitignore`**，用于本机合并配置或密钥 |

**规则**：浏览器与打包产物中**仅**暴露以 **`VITE_`** 开头的变量；类型定义在 `src/vite-env.d.ts`。

**应用侧可选变量**：`VITE_APP_ENV`、`VITE_APP_VERSION`、`VITE_APP_NAME`、`VITE_THEME`（品牌主题，见 `main.ts`）。

**n8n 相关**：与 `src/config/n8n.ts` 一致，见下文「配置与环境变量（n8n / Word 导出）」表格。

**后端 REST**：`src/config/api.ts` 提供 `getApiBaseUrl()`、`apiUrl()`。开发环境下 `VITE_API_BASE_URL` 留空时，请求使用 **`/api/...`**，由 Vite 代理到 **`VITE_API_PROXY_TARGET`**（默认指向当前开发后端）。

### 后端开发环境（OpenAPI）

- **Swagger UI**：[http://36.110.89.30:8765/swagger/index.html](http://36.110.89.30:8765/swagger/index.html)
- **规范**：OpenAPI 3.0，标题 `premaintainProjects`，路径均以 **`/api`** 为前缀（例如 `/api/Companies`、`/api/Projects`、`/api/InspectionTasks` 等）。

当前规范中已出现的主要资源（与前端业务对应时可据此对接）：

| 前缀 | 说明 |
|------|------|
| `/api/Companies` | 公司 / 客户 |
| `/api/Equipments` | 设备（含 `ByCompany/{companyid}`） |
| `/api/Products`、`/api/Products/Search` | 产品 |
| `/api/Projects`、`/api/Projects/Search` | 项目 |
| `/api/InspectionCategories`、`InspectionItems`、`InspectionTasks`、`InspectionTemplates` | 检验分类 / 项 / 任务 / 模板（多含 `Search`） |
| `/api/Taskitems`、`/api/Taskitems/ByTask/{taskid}` | 任务子项 |
| `/api/Users`、`/api/Users/ByCompany/{companyid}` | 用户 |

若后端后续增加 **JWT / Cookie 鉴权**，需在 `fetch` / `axios` 封装中统一加头；当前 OpenAPI 文档中未见 `security` 定义。

---

## 功能与路由

侧边菜单与路由对应关系如下（根路径 `/` 会重定向到 **`/device/list`**）。

| 模块 | 路径 | 说明 |
|------|------|------|
| 设备管理 | `/device/list` | 设备列表 |
| 客户管理 | `/customer/list` | 客户列表 |
| 项目列表 | `/project/list` | 项目列表 |
| 新建项目 | `/project/create` | 多步向导（设备、方案匹配等） |
| 项目详情 | `/project/detail/:id` | 单项目详情 |
| **项目报告** | `/project/report/:id` | 报告阅读、图表、目录锚点、总结草稿、**导出 Word** |
| 方案维护 | `/scheme/list` | 方案列表 |
| 方案查看 | `/scheme/view/:id` | 只读查看 |
| 新建方案 | `/scheme/create/:type` | 按类型创建 |
| 编辑方案 | `/scheme/edit/:id` | 网格编辑等 |
| 任务列表 | `/task/list` | 任务列表 |
| 任务方案 | `/task/scheme/:taskId` | 任务关联方案 |
| 数据采集 | `/task/collect/:taskId` | 多步采集 |
| 任务审核 | `/task/review/:taskId` | 审核视图 |
| 首页（可选） | `/home` | 欢迎 / 概览入口 |

**用户设置**：未单独注册路由，在侧栏 **Settings** 抽屉中嵌入 `pages/user-settings/index.vue`。

---

## 项目结构（`src/`）

```
src/
├── App.vue                 # 应用壳：顶栏、侧栏菜单、RouterView
├── main.ts                 # 入口（iX、主题、路由）
├── index.css               # 全局基础样式
├── vite-env.d.ts           # 环境变量类型（含 VITE_N8N_*）
│
├── config/
│   ├── api.ts              # 后端 REST 基地址（开发走 Vite /api 代理）
│   └── n8n.ts              # n8n Webhook：Word 导出载荷、请求与响应解析（含代理 URL 推导）
│
├── router/
│   └── index.ts            # 路由表（Hash）
│
├── components/             # 全局复用组件
│   └── Logo.vue
│
├── pages/                  # 按业务域分目录的页面
│   ├── home/
│   ├── device/             # 列表 + 表单弹窗等
│   ├── customer/
│   ├── project/
│   │   ├── list|create|detail/
│   │   └── report/         # 报告详情（体量最大）
│   │       ├── index.vue
│   │       ├── types.ts                    # 报告页视图类型
│   │       ├── reportViewUtils.ts        # 目录、问题卡片映射、格式化
│   │       ├── reportChartOptions.ts     # ECharts option 纯函数
│   │       ├── composables/              # 图表、目录滚动高亮、总结 localStorage 草稿
│   │       └── styles/                   # 拆分后的页面样式（report-page.css 聚合）
│   ├── scheme/             # 列表、创建、编辑、查看 + utils 与表格子组件
│   ├── task/               # 列表、scheme、collect、review 及多步子组件
│   └── user-settings/      # 设置抽屉内容
│
├── mockdata/
│   ├── common/             # customers、devices、users、状态枚举等
│   ├── project/            # projects.json
│   ├── task/               # tasks.json
│   ├── scheme/             # 方案 JSON + index 装配
│   └── report/             # reports.json、类型与 getReportByProjectId 等
│
├── hooks/                  # 可复用逻辑（如全局提示封装）
├── util/
├── types/                  # 通用 TS 类型
└── styles/
    └── theme-mapping.css   # 与 iX 主题相关的 CSS 变量映射
```

**说明**：业务页面以「领域文件夹 + `index.vue`」为主；报告页交互与样式较多，已拆出 `composables/`、`styles/` 与图表/工具 TS 文件，便于维护与迭代。

---

## 配置与环境变量（n8n / Word 导出）

- **实现位置**：`src/config/n8n.ts`（注释中含 Webhook 约定、响应格式、常见错误说明）。
- **开发代理**：`vite.config.ts` 将 `/n8n-proxy` 代理到可配置目标（默认 `https://n8n.ezangao.cn`），避免浏览器直连跨域；生成 Word 可能较慢，代理超时设为 120s。
- **可选环境变量**（见 `src/vite-env.d.ts`）：

  | 变量 | 含义 |
  |------|------|
  | `VITE_N8N_BASE_URL` | n8n 根地址（勿末尾 `/`） |
  | `VITE_N8N_WORD_REPORT_WEBHOOK_URL` | Word 导出 Webhook **完整 URL**（优先） |
  | `VITE_N8N_DEV_PROXY` | 设为 `false` 时开发环境也可直连 n8n（需服务端 CORS） |
  | `VITE_N8N_DEV_PROXY_TARGET` | 覆盖代理目标主机 |

生产环境建议由**同源后端或网关**转发到 n8n，或与 n8n 配置允许的 Origin。

---

## Siemens iX 与图标

- 组件文档：<https://ix.siemens.io/docs/introduction>
- **图标**：从 `@siemens/ix-icons/icons` 导入 `iconXxx` 常量；在 **`IxIcon`** 上使用 **`:name="iconXxx"`**（底层 `ix-icon` 认 `name`；勿用错误的 prop 名导致占位图）。

```vue
<script setup lang="ts">
import { IxButton, IxIcon } from '@siemens/ix-vue';
import { iconHome } from '@siemens/ix-icons/icons';
</script>

<template>
  <IxButton>操作</IxButton>
  <IxIcon :name="iconHome" size="16" />
</template>
```

---

## 开发说明（摘要）

### 路径别名

使用 `@/` 引用 `src/` 下文件，例如：

```ts
import { getReportByProjectId } from '@/mockdata/report/index.ts';
```

### 数据与 Mock

在页面中可直接 `import` JSON，或通过 `mockdata/*/index.ts` 封装查询（如报告的 `getReportByProjectId`）。接入真实后端时，建议将上述调用逐步迁移为 API 客户端（如 `src/api/` 或各模块的 `services/`），保持视图层稳定。

### 类型检查

```bash
pnpm exec vue-tsc --noEmit
```

### 数据表格（ag-grid）

列表页使用 `ag-grid-vue3`；列定义与渲染器可参考 `pages/device`、`pages/project/list` 等。

---

## 技术栈（主要依赖）

| 依赖 | 用途 |
|------|------|
| `vue` ^3.5 | 框架 |
| `vue-router` ^4.4 | 路由 |
| `@siemens/ix-vue`、`@siemens/ix`、`@siemens/ix-icons` | UI 与图标 |
| `@siemens/ix-aggrid`、`ag-grid-community`、`ag-grid-vue3` | 表格 |
| `echarts` ^6 | 报告图表 |
| `vite` ^6、`vue-tsc`、`typescript` | 构建与类型 |

---

## 开发环境（VS Code）

推荐扩展见 `.vscode/extensions.json`，例如 **Vue - Official (Volar)**。

**常见问题**：若 Volar 异常，可尝试命令面板中 **Vue: Restart Vue Server** 或重载窗口。

---

## 学习资源

- [Siemens iX](https://ix.siemens.io/docs/introduction)
- [Vue 3 文档](https://vuejs.org/)
- [Vue Router](https://router.vuejs.org/)
- [Vite](https://vitejs.dev/)
- [ag-grid](https://www.ag-grid.com/)
- [ECharts](https://echarts.apache.org/)

## 许可证

MIT License
