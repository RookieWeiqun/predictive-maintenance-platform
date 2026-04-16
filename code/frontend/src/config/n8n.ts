/**
 * 预维护平台 — n8n Webhook 集成配置（本文件为唯一入口，勿与旧项目整段复制对齐）。
 *
 * ## Word 报告导出
 * 默认指向 `https://n8n.ezangao.cn/webhook/<id>`；可用环境变量覆盖完整 URL 或 BASE。
 *
 * ### n8n 侧建议工作流（概要）
 * 1. **Webhook**（POST，JSON）：接收下方 `WordReportWebhookPayload`（**单层 JSON**：报告字段在根级，无 `report` 包裹）。
 * 2. **数据处理**：根级含完整 `ReportData`，以及 **Word 模版变量**（`serviceId`、`customerName`、`city` 等，见 `WordTemplateRootFields`）、`exportKind`、`generatedAtClient`、`summary`。
 * 3. **Respond to Webhook**：优先直接返回 **二进制 .docx**（`Content-Type` 使用 docx MIME 或 `application/octet-stream`），
 *    并在 `Content-Disposition: attachment; filename="..."` 中给出文件名。
 *
 * 若工作流只能返回 JSON，可返回例如：
 * `{ "fileName": "报告.docx", "fileBase64": "<base64>" }`，或 n8n 代码节点常见的嵌套 `data.data`、`binary.data`。
 * 前端会识别 ZIP(docx) 二进制，或从 JSON 中递归提取 base64（见 `requestWordReportDownload`）。
 *
 * ### CORS（浏览器直连跨域）
 * - **本地开发**：默认走 Vite 同源代理 `/n8n-proxy/...` → `https://n8n.ezangao.cn/...`，无需改 n8n。
 *   关闭代理：`VITE_N8N_DEV_PROXY=false`（此时须让 n8n/网关返回 `Access-Control-Allow-Origin`）。
 * - **生产部署**：由**同源后端或网关**转发到 n8n，或在 n8n 上配置允许的前端 Origin。
 *
 * ### 常见 HTTP 错误（与代理无关，多为 n8n 工作流）
 * - **404** + `not registered for POST`：Webhook 节点未勾选 **POST**，或工作流未**激活**（生产 URL 需激活）。
 * - **500** + `Unused Respond to Webhook`：存在多余的 **Respond to Webhook** 节点，或执行路径未正确连到唯一的响应节点。
 */

import type { ReportData } from '@/mockdata/report/index.ts';
import type { ServiceBasicInfo, ServiceContactPerson } from '@/mockdata/report/types';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** 与 Word 模版 `{{serviceId}}` 等变量对齐的根级字段（由 `buildWordTemplateRootFields` 生成） */
export interface WordTemplateRootFields {
  serviceId: string;
  customerName: string;
  city: string;
  customerContact: string;
  siemensContact: string;
  leadEngineer: string;
  startDate: string;
  endDate: string;
  workDays: number;
  engineerQTY: number;
  reportCreateDate: string;
}

function formatContactForWord(c: ServiceContactPerson | string | undefined | null): string {
  if (c == null || c === '') return '-';
  if (typeof c === 'string') return c;
  if (c.label) return c.label;
  if (c.phone) return `${c.name}（${c.phone}）`;
  return c.name;
}

function parseExecutionDateRange(range: string | undefined): { startDate: string; endDate: string } {
  if (!range?.trim()) return { startDate: '-', endDate: '-' };
  const m = /^(.+?)\s*[~～]\s*(.+)$/.exec(range.trim());
  if (m) return { startDate: m[1].trim(), endDate: m[2].trim() };
  return { startDate: range.trim(), endDate: '-' };
}

function isServiceBasicBlock(s: unknown): s is ServiceBasicInfo {
  return !!(s && typeof s === 'object' && 'serviceId' in s && typeof (s as ServiceBasicInfo).serviceId === 'string');
}

/** 从报告数据推导 Word 模版用扁平变量（与 `reports.json` / 封面结构对齐） */
export function buildWordTemplateRootFields(report: ReportData): WordTemplateRootFields {
  const sb = report.serviceBasicInfo;
  if (isServiceBasicBlock(sb)) {
    const { startDate, endDate } = parseExecutionDateRange(sb.executionDateRange);
    const sd = sb.serviceDays;
    const workDays = sd && typeof sd === 'object' ? (sd.days ?? 0) : 0;
    const engineerQTY = sd && typeof sd === 'object' ? (sd.persons ?? 0) : 0;
    return {
      serviceId: sb.serviceId,
      customerName: sb.companyName,
      city: sb.serviceCity,
      customerContact: formatContactForWord(sb.customerContact),
      siemensContact: formatContactForWord(sb.siemensContact),
      leadEngineer: sb.serviceExecutors?.length ? sb.serviceExecutors.join('、') : '-',
      startDate,
      endDate,
      workDays,
      engineerQTY,
      reportCreateDate: sb.reportGeneratedDate || report.generatedAt || '-',
    };
  }
  const cover = report.reportDocument?.cover;
  return {
    serviceId: cover?.reportId || report.reportNo || '-',
    customerName: cover?.customerCompany || '-',
    city: '-',
    customerContact: cover?.applicant || '-',
    siemensContact: '-',
    leadEngineer: '-',
    startDate: '-',
    endDate: '-',
    workDays: 0,
    engineerQTY: 0,
    reportCreateDate: report.generatedAt || cover?.deliveryDate || '-',
  };
}

/** 与线上 n8n 实例一致；末尾不要斜杠 */
const DEFAULT_N8N_WEBHOOK_BASE = 'https://n8n.ezangao.cn/webhook';

const WORD_WEBHOOK_ID = 'f3b8839e-55de-4abe-865b-a5d65406fdb5';

const DEFAULT_WORD_WEBHOOK = `${DEFAULT_N8N_WEBHOOK_BASE}/${WORD_WEBHOOK_ID}`;

function wordWebhookUrlFromBase(baseRaw: string): string {
  const base = baseRaw.replace(/\/$/, '');
  return base.endsWith('/webhook')
    ? `${base}/${WORD_WEBHOOK_ID}`
    : `${base}/webhook/${WORD_WEBHOOK_ID}`;
}

/** 可选：`https://n8n.ezangao.cn` 或已含路径的 `https://n8n.ezangao.cn/webhook` */
const n8nBase =
  (import.meta.env.VITE_N8N_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';

const explicitWordWebhook = import.meta.env.VITE_N8N_WORD_REPORT_WEBHOOK_URL as string | undefined;

/** 开发/预览 build 下为 true 时使用同源代理，见 `vite.config.ts` 中 `/n8n-proxy` */
const useN8nDevProxy =
  import.meta.env.DEV && import.meta.env.VITE_N8N_DEV_PROXY !== 'false';

function resolveWordReportWebhookUrl(): string {
  if (explicitWordWebhook) return explicitWordWebhook;
  if (n8nBase) return wordWebhookUrlFromBase(n8nBase);
  if (useN8nDevProxy) {
    return `/n8n-proxy/webhook/${WORD_WEBHOOK_ID}`;
  }
  return DEFAULT_WORD_WEBHOOK;
}

export const N8N_CONFIG = {
  /**
   * Word 维护报告导出 Webhook 完整 URL。
   * 优先级：`VITE_N8N_WORD_REPORT_WEBHOOK_URL` > `VITE_N8N_BASE_URL` 推导 >
   * 开发默认同源代理 `/n8n-proxy/webhook/...` > 生产默认直连线上地址。
   */
  WORD_REPORT_WEBHOOK_URL: resolveWordReportWebhookUrl(),

  /** 若 Webhook 启用了 Header 鉴权，在此配置密钥 */
  API_KEY: (import.meta.env.VITE_N8N_API_KEY as string | undefined) ?? '',

  ENABLE_AUTH: import.meta.env.VITE_N8N_ENABLE_AUTH === 'true',

  /**
   * `bearer`：写入 `Authorization: <API_KEY>`（与常见 n8n Header Auth 一致，不加 `Bearer ` 前缀）。
   * `header`：写入自定义头名（见 AUTH_HEADER）。
   */
  AUTH_TYPE: (import.meta.env.VITE_N8N_AUTH_TYPE as 'bearer' | 'header' | undefined) || 'bearer',

  AUTH_HEADER: (import.meta.env.VITE_N8N_AUTH_HEADER as string | undefined) || 'Authorization',
} as const;

/**
 * 发往 n8n 的 JSON：在 **根级** 展开报告数据（与 `getReportByProjectId` 一致），并叠加元字段。
 * 不再使用 `report: { ... }` 嵌套，便于 n8n / docxtpl 直接访问 `body.reportNo`、`body.summary` 等。
 */
export type WordReportWebhookPayload = ReportData &
  WordTemplateRootFields & {
    exportKind: 'maintenance_report';
    /** 路由上的项目 id（覆盖报告内同名字段，保证与当前页一致） */
    projectId: string;
    generatedAtClient: string;
    summary: {
      maintenanceSummary: string;
      sparePartsSuggestion: string;
    };
  };

export function buildWordReportWebhookPayload(params: {
  report: ReportData;
  projectId: string;
  summary: WordReportWebhookPayload['summary'];
}): WordReportWebhookPayload {
  const wordVars = buildWordTemplateRootFields(params.report);
  return {
    ...params.report,
    ...wordVars,
    exportKind: 'maintenance_report',
    projectId: params.projectId,
    generatedAtClient: new Date().toISOString(),
    summary: params.summary,
  };
}

export function getN8NHeaders(contentType: string = 'application/json'): Record<string, string> {
  const headers: Record<string, string> = {};
  if (contentType !== 'multipart/form-data') {
    headers['Content-Type'] = contentType;
  }
  if (N8N_CONFIG.ENABLE_AUTH && N8N_CONFIG.API_KEY) {
    if (N8N_CONFIG.AUTH_TYPE === 'bearer') {
      headers.Authorization = N8N_CONFIG.API_KEY;
    } else {
      headers[N8N_CONFIG.AUTH_HEADER] = N8N_CONFIG.API_KEY;
    }
  }
  return headers;
}

function parseFilenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"+|"+$/g, ''));
    } catch {
      return star[1].trim();
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(header);
  if (quoted?.[1]) return quoted[1];
  const plain = /filename=([^;\s]+)/i.exec(header);
  return plain?.[1]?.replace(/^"+|"+$/g, '') ?? null;
}

function base64ToBlob(
  base64: string,
  mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** 解析 n8n 常见 JSON 错误体，便于 Toast 展示 */
function formatN8nHttpError(status: number, errText: string): string {
  const trimmed = errText.trim();
  if (!trimmed) return `Word 导出失败（HTTP ${status}）`;
  try {
    const j = JSON.parse(trimmed) as Record<string, unknown>;
    const msg = typeof j.message === 'string' ? j.message : null;
    const hint = typeof j.hint === 'string' ? j.hint : null;
    if (msg) {
      const oneLine = hint ? `${msg} ${hint}` : msg;
      return `Word 导出失败（HTTP ${status}）：${oneLine}`;
    }
  } catch {
    /* 非 JSON */
  }
  const stripped = trimmed.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400);
  return stripped
    ? `Word 导出失败（HTTP ${status}）：${stripped}`
    : `Word 导出失败（HTTP ${status}）`;
}

function normalizeBase64String(raw: string): string {
  const t = raw.trim().replace(/\s/g, '');
  const m = /^data:[\w/+.-]+;base64,(.+)$/i.exec(t);
  return m?.[1] ?? t;
}

function looksLikeBase64Payload(s: string): boolean {
  const t = normalizeBase64String(s);
  return t.length > 120 && /^[A-Za-z0-9+/=]+$/.test(t);
}

/**
 * 从 n8n / 代码节点返回的多种 JSON 结构中递归提取 docx base64。
 * 兼容：`{ fileBase64 }`、`{ data: "<b64>" }`、`{ data: { data: "<b64>" } }`、`{ binary: { data: { data } } }`、顶层数组等。
 */
function extractBase64FromUnknown(obj: unknown, depth = 0): { base64: string; fileName?: string } | null {
  if (depth > 10 || obj == null) return null;
  if (Array.isArray(obj)) {
    for (const el of obj) {
      const r = extractBase64FromUnknown(el, depth + 1);
      if (r) return r;
    }
    return null;
  }
  if (typeof obj !== 'object') return null;
  const rec = obj as Record<string, unknown>;
  const fileName =
    (typeof rec.fileName === 'string' && rec.fileName) ||
    (typeof rec.filename === 'string' && rec.filename) ||
    undefined;
  for (const key of ['fileBase64', 'base64', 'content', 'contents'] as const) {
    const v = rec[key];
    if (typeof v === 'string' && looksLikeBase64Payload(v)) {
      return { base64: normalizeBase64String(v), fileName };
    }
  }
  if (typeof rec.data === 'string' && looksLikeBase64Payload(rec.data)) {
    return { base64: normalizeBase64String(rec.data), fileName };
  }
  for (const key of ['data', 'binary', 'json', 'body', 'output'] as const) {
    const v = rec[key];
    if (v != null && typeof v === 'object') {
      const inner = extractBase64FromUnknown(v, depth + 1);
      if (inner) return { base64: inner.base64, fileName: inner.fileName ?? fileName };
    }
  }
  return null;
}

function ensureDocxFilename(name: string | undefined, projectId: string): string {
  const base = (name?.trim() || `维护报告_${projectId}`).replace(/[/\\?%*:|"<>]/g, '-');
  return base.toLowerCase().endsWith('.docx') ? base : `${base}.docx`;
}

function isZipDocxMagic(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 3 || bytes[2] === 5 || bytes[2] === 7);
}

/**
 * POST JSON 到 Word 导出 Webhook，并在浏览器侧触发下载。
 * @throws Error 网络或非 2xx、无法解析为文件时抛出
 */
export async function requestWordReportDownload(payload: WordReportWebhookPayload): Promise<void> {
  const res = await fetch(N8N_CONFIG.WORD_REPORT_WEBHOOK_URL, {
    method: 'POST',
    headers: getN8NHeaders('application/json'),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(formatN8nHttpError(res.status, errText));
  }

  const cdName = parseFilenameFromContentDisposition(res.headers.get('Content-Disposition'));
  const ct = (res.headers.get('Content-Type') || '').toLowerCase();
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);

  if (isZipDocxMagic(bytes)) {
    const name = ensureDocxFilename(cdName ?? undefined, payload.projectId);
    triggerDownload(new Blob([buf], { type: DOCX_MIME }), name);
    return;
  }

  const text = new TextDecoder('utf-8', { fatal: false }).decode(buf).trim().replace(/^\uFEFF/, '');
  const tryJson =
    ct.includes('application/json') ||
    ct.includes('text/json') ||
    text.startsWith('{') ||
    text.startsWith('[');

  if (tryJson && text.length > 0) {
    try {
      const json = JSON.parse(text) as unknown;
      const picked = extractBase64FromUnknown(json);
      if (picked) {
        const blob = base64ToBlob(normalizeBase64String(picked.base64));
        const name = ensureDocxFilename(picked.fileName || cdName || undefined, payload.projectId);
        triggerDownload(blob, name);
        return;
      }
    } catch (e) {
      if (!(e instanceof SyntaxError)) throw e;
    }
  }

  throw new Error(
    '无法解析 n8n 返回的 Word：响应既不是 docx（ZIP 头 PK），也不是可解析的含长 base64 的 JSON。请在 Respond to Webhook 中直接返回二进制 docx，或返回 { fileName, fileBase64 } / 嵌套 data.data 等结构。',
  );
}
