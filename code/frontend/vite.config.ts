import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  /** 开发/预览时代理到真实 n8n，避免浏览器 CORS（可被 VITE_N8N_DEV_PROXY_TARGET 覆盖） */
  const n8nProxyTarget = env.VITE_N8N_DEV_PROXY_TARGET || "https://n8n.ezangao.cn";
  const n8nProxy = {
    "/n8n-proxy": {
      target: n8nProxyTarget,
      changeOrigin: true,
      /** 生成 Word 可能较慢，避免代理过早断开 */
      timeout: 120_000,
      proxyTimeout: 120_000,
      rewrite: (path: string) => path.replace(/^\/n8n-proxy/, ""),
    },
  };

  /** 后端 REST：`/api` → 开发环境（默认预维护后端），避免 CORS。可被 `VITE_API_PROXY_TARGET` 覆盖 */
  const apiProxyTarget =
    env.VITE_API_PROXY_TARGET || "http://36.110.89.30:8765";
  const apiProxy = {
    "/api": {
      target: apiProxyTarget,
      changeOrigin: true,
    },
  };

  const proxy = { ...apiProxy, ...n8nProxy };

  return {
    base: "/",
    plugins: [vue()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      proxy,
    },
    preview: {
      proxy,
    },
  };
});
