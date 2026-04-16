import { requestJson, ApiError } from '../http';
import type { ApiEnvelope } from '../types';

export type EquipmentDto = {
  equipid?: number;
  companyid: number;
  factory?: string | null;
  workshop?: string | null;
  equipmentname?: string | null;
  productcategory?: string | null;
  productgroup?: string | null;
  number?: number | null;
};

function unwrap<T>(res: ApiEnvelope<T>): T {
  if (res.code !== 0) {
    throw new ApiError(res.msg || `业务错误 code=${res.code}`, res.code);
  }
  return res.data;
}

export async function listEquipments(): Promise<EquipmentDto[]> {
  const res = await requestJson<ApiEnvelope<EquipmentDto[]>>('/api/Equipments');
  return unwrap(res);
}

export async function createEquipment(payload: EquipmentDto): Promise<EquipmentDto> {
  const res = await requestJson<ApiEnvelope<EquipmentDto>>('/api/Equipments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return unwrap(res);
}

export async function updateEquipment(payload: EquipmentDto): Promise<EquipmentDto> {
  const res = await requestJson<ApiEnvelope<EquipmentDto>>('/api/Equipments', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return unwrap(res);
}

export async function deleteEquipment(id: number): Promise<void> {
  const res = await requestJson<ApiEnvelope<unknown>>(`/api/Equipments/${id}`, {
    method: 'DELETE',
  });
  unwrap(res);
}
