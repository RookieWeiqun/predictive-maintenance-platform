/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 应用环境标识：development | staging | production（自建，非 Node 的 NODE_ENV） */
  readonly VITE_APP_ENV?: string;
  /** 构建版本号，可用于关于页或日志 */
  readonly VITE_APP_VERSION?: string;
  /** 应用显示名（可选） */
  readonly VITE_APP_NAME?: string;
  /** 非空时加载 `public/theme/dist` 品牌主题（见 `main.ts`） */
  readonly VITE_THEME?: string;

  /**
   * 后端 API 根 URL（无末尾 `/`）。生产/预发必填（或同源部署时可留空）。
   * 开发环境留空时请求走相对路径 `/api/...`，由 Vite 代理到 `VITE_API_PROXY_TARGET`。
   */
  readonly VITE_API_BASE_URL?: string;
  /**
   * 仅用于 `vite.config.ts` 开发/预览代理：`/api` 转发目标（默认开发后端）。
   * 会打入前端 bundle，请勿在此存放密钥。
   */
  readonly VITE_API_PROXY_TARGET?: string;

  /** 例如 `https://n8n.example.com` 或 `https://n8n.example.com/webhook`（不要末尾 `/`） */
  readonly VITE_N8N_BASE_URL?: string;
  /** Word 报告导出 Webhook 完整 URL，优先于 BASE + 默认路径 */
  readonly VITE_N8N_WORD_REPORT_WEBHOOK_URL?: string;
  readonly VITE_N8N_API_KEY?: string;
  readonly VITE_N8N_ENABLE_AUTH?: string;
  readonly VITE_N8N_AUTH_TYPE?: string;
  readonly VITE_N8N_AUTH_HEADER?: string;
  /** 设为 `false` 时开发环境也直连 n8n（需服务端 CORS） */
  readonly VITE_N8N_DEV_PROXY?: string;
  /** Vite 代理目标，默认 `https://n8n.ezangao.cn` */
  readonly VITE_N8N_DEV_PROXY_TARGET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<Record<string, any>, Record<string, any>, any>;
  export default component;
}
