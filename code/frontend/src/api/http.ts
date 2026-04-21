function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (raw === undefined || String(raw).trim() === '') {
    return '';
  }
  return String(raw).replace(/\/+$/, '');
}

function buildApiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  const base = getApiBaseUrl();
  return base ? `${base}${p}` : p;
}

export class ApiError extends Error {
  code?: number;

  constructor(message: string, code?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new ApiError(`HTTP ${response.status}: ${response.statusText}`);
  }

  try {
    return (await response.json()) as T;
  } catch {
    const contentType = response.headers.get('content-type') || 'unknown';
    const bodyText = await response.text().catch(() => '');
    const preview = bodyText.slice(0, 200).replace(/\s+/g, ' ').trim();
    throw new ApiError(
      `后端响应不是合法 JSON。content-type=${contentType}${preview ? `，body=${preview}` : ''}`,
    );
  }
}
