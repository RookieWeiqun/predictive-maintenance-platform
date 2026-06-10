const DEFAULT_ONEID_ISSUER = 'https://api.qa.oneid.siemens.com.cn/api/bff/v1.2/developer/ciam/oidc/6d641a7f3713a34d6c282baff235aefa6XFrDLLlFfN';
const DEFAULT_ONEID_AUTHORIZATION_ENDPOINT = 'https://api.qa.oneid.siemens.com.cn/api/bff/v1.2/developer/ciam/oauth/authorize';

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function getBasePath(): string {
  const path = window.location.pathname || '/';
  if (path.endsWith('/callback')) {
    const base = path.slice(0, -'/callback'.length);
    return base || '/';
  }
  return path || '/';
}

export function getOneIdIssuer(): string {
  return trimTrailingSlash(import.meta.env.VITE_ONEID_ISSUER?.trim() || DEFAULT_ONEID_ISSUER);
}

export function getOneIdAuthorizationEndpoint(): string {
  return trimTrailingSlash(import.meta.env.VITE_ONEID_AUTHORIZATION_ENDPOINT?.trim() || DEFAULT_ONEID_AUTHORIZATION_ENDPOINT);
}

export function getOneIdClientId(): string {
  const configured = import.meta.env.VITE_ONEID_CLIENT_ID?.trim();
  if (configured) {
    return configured;
  }

  const issuer = getOneIdIssuer();
  const segments = issuer.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? '';
}

export function getOneIdScope(): string {
  return import.meta.env.VITE_ONEID_SCOPE?.trim() || 'openid profile';
}

export function getOneIdRedirectUri(): string {
  const configured = import.meta.env.VITE_ONEID_REDIRECT_URI?.trim();
  if (configured) {
    return configured;
  }
  return `${window.location.origin}${getBasePath().replace(/\/$/, '')}/callback`;
}

export function buildOneIdAuthorizeUrl(state: string): string {
  const query = new URLSearchParams();
  query.set('client_id', getOneIdClientId());
  query.set('response_type', 'code');
  query.set('redirect_uri', getOneIdRedirectUri());
  query.set('scope', getOneIdScope());
  query.set('state', state);
  return `${getOneIdAuthorizationEndpoint()}?${query.toString()}`;
}

export function normalizeOneIdCallbackLocation() {
  if (!window.location.pathname.endsWith('/callback')) {
    return;
  }

  if (window.location.hash.startsWith('#/callback')) {
    return;
  }

  const basePath = getBasePath().replace(/\/$/, '');
  const target = `${window.location.origin}${basePath || ''}#/callback${window.location.search}`;
  window.location.replace(target);
}