const STORAGE_VERSION = 1;

function storageKey(projectId: number): string {
  return `isp:projectSchemeSelection:v${STORAGE_VERSION}:${projectId}`;
}

export type ProjectSchemePeripheralRowV1 = {
  /** `factory\\tworkshop`，用于编辑向导恢复外围下拉（旧数据可能仅有 workshopLabel） */
  workshopKey?: string;
  workshopLabel: string;
  templateId: string;
  schemeName: string;
};

export type ProjectSchemeSelectionV1 = {
  maintenanceSchemeId: string;
  maintenanceSchemeName: string;
  maintenanceModel: string;
  peripheralRows: ProjectSchemePeripheralRowV1[];
  savedAt: string;
};

export function saveProjectSchemeSelection(projectId: number, data: ProjectSchemeSelectionV1): void {
  try {
    localStorage.setItem(storageKey(projectId), JSON.stringify(data));
  } catch {
    /* 存储配额或隐私模式 */
  }
}

function isPeripheralRow(x: unknown): x is ProjectSchemePeripheralRowV1 {
  if (!x || typeof x !== 'object') return false;
  const r = x as Record<string, unknown>;
  if (
    typeof r.workshopLabel !== 'string' ||
    typeof r.templateId !== 'string' ||
    typeof r.schemeName !== 'string'
  ) {
    return false;
  }
  if (r.workshopKey !== undefined && typeof r.workshopKey !== 'string') return false;
  return true;
}

export function loadProjectSchemeSelection(projectId: number): ProjectSchemeSelectionV1 | null {
  try {
    const raw = localStorage.getItem(storageKey(projectId));
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<ProjectSchemeSelectionV1>;
    if (!p || typeof p.maintenanceSchemeId !== 'string') return null;
    const rows = Array.isArray(p.peripheralRows) ? p.peripheralRows.filter(isPeripheralRow) : [];
    return {
      maintenanceSchemeId: p.maintenanceSchemeId,
      maintenanceSchemeName:
        typeof p.maintenanceSchemeName === 'string' ? p.maintenanceSchemeName : '',
      maintenanceModel: typeof p.maintenanceModel === 'string' ? p.maintenanceModel : '',
      peripheralRows: rows.map((row) => ({
        ...row,
        workshopKey: row.workshopKey?.trim() ? row.workshopKey.trim() : undefined,
      })),
      savedAt: typeof p.savedAt === 'string' ? p.savedAt : '',
    };
  } catch {
    return null;
  }
}
