import type { TemplateMappingDto } from '@/api/modules/templatemappings';

function normalizeTemplateMappingValue(value: string | null | undefined): string {
  return String(value ?? '').trim();
}

export function dedupeTemplateMappingField(
  mappings: TemplateMappingDto[],
  field: 'mlfb' | 'series' | 'size',
): string[] {
  const values = new Set<string>();
  for (const mapping of mappings) {
    const value = normalizeTemplateMappingValue(mapping[field]);
    if (value) {
      values.add(value);
    }
  }
  return Array.from(values).sort((a, b) => a.localeCompare(b));
}

export function filterTemplateMappingsByKeyword(
  mappings: TemplateMappingDto[],
  keyword: string,
): TemplateMappingDto[] {
  const q = normalizeTemplateMappingValue(keyword).toLowerCase();
  if (!q) {
    return mappings;
  }
  return mappings.filter((mapping) => normalizeTemplateMappingValue(mapping.mlfb).toLowerCase().includes(q));
}