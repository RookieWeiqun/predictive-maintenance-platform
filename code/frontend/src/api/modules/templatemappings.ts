import { requestJson, ApiError } from '../http';
import type { ApiEnvelope } from '../types';

export type TemplateMappingDto = {
  tmid?: number;
  mlfb?: string | null;
  series?: string | null;
  size?: string | null;
};

function unwrapSingleTemplateMapping(raw: unknown): TemplateMappingDto {
  if (raw && typeof raw === 'object' && 'data' in (raw as Record<string, unknown>)) {
    const envelope = raw as ApiEnvelope<unknown>;
    if (envelope.code !== 0) {
      throw new ApiError(envelope.msg || `业务错误 code=${envelope.code}`, envelope.code);
    }
    return mapTemplateMappingRaw(envelope.data);
  }
  return mapTemplateMappingRaw(raw);
}

function mapTemplateMappingRaw(raw: unknown): TemplateMappingDto {
  const record = raw as Record<string, unknown>;
  const gv = (a: string, b: string) => record[a] ?? record[b];
  return {
    tmid: Number(gv('tmid', 'Tmid') ?? 0) || undefined,
    mlfb: (gv('mlfb', 'Mlfb') as string | null | undefined) ?? null,
    series: (gv('series', 'Series') as string | null | undefined) ?? null,
    size: (gv('size', 'Size') as string | null | undefined) ?? null,
  };
}

function unwrapTemplateMappings(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const envelope = raw as ApiEnvelope<unknown[]>;
    if (Array.isArray(envelope.data)) {
      if (envelope.code !== 0) {
        throw new ApiError(envelope.msg || `业务错误 code=${envelope.code}`, envelope.code);
      }
      return envelope.data;
    }
  }
  return [];
}

export async function searchTemplateMappingsByMlfb(keyword: string): Promise<TemplateMappingDto[]> {
  const q = new URLSearchParams();
  q.set('keyword', keyword);
  const raw = await requestJson<unknown>(`/api/Templatemappings/SearchByMlfb?${q.toString()}`);
  return unwrapTemplateMappings(raw).map(mapTemplateMappingRaw);
}

export async function listTemplateMappings(): Promise<TemplateMappingDto[]> {
  const raw = await requestJson<unknown>('/api/Templatemappings');
  return unwrapTemplateMappings(raw).map(mapTemplateMappingRaw);
}

export async function createTemplateMapping(payload: TemplateMappingDto): Promise<TemplateMappingDto> {
  const raw = await requestJson<unknown>('/api/Templatemappings', {
    method: 'POST',
    body: JSON.stringify({
      tmid: payload.tmid ?? 0,
      mlfb: payload.mlfb ?? null,
      series: payload.series ?? null,
      size: payload.size ?? null,
    }),
  });
  return unwrapSingleTemplateMapping(raw);
}

export async function updateTemplateMapping(payload: TemplateMappingDto): Promise<void> {
  const raw = await requestJson<unknown>('/api/Templatemappings', {
    method: 'PUT',
    body: JSON.stringify({
      tmid: payload.tmid ?? 0,
      mlfb: payload.mlfb ?? null,
      series: payload.series ?? null,
      size: payload.size ?? null,
    }),
  });
  if (raw && typeof raw === 'object' && 'code' in (raw as Record<string, unknown>)) {
    const envelope = raw as ApiEnvelope<unknown>;
    if (envelope.code !== 0) {
      throw new ApiError(envelope.msg || `业务错误 code=${envelope.code}`, envelope.code);
    }
  }
}

export async function deleteTemplateMapping(tmid: number): Promise<void> {
  const raw = await requestJson<unknown>(`/api/Templatemappings/${tmid}`, {
    method: 'DELETE',
  });
  if (raw && typeof raw === 'object' && 'code' in (raw as Record<string, unknown>)) {
    const envelope = raw as ApiEnvelope<unknown>;
    if (envelope.code !== 0) {
      throw new ApiError(envelope.msg || `业务错误 code=${envelope.code}`, envelope.code);
    }
  }
}