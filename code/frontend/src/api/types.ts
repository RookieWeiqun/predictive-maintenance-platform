/**
 * 统一后端业务响应壳：{ code, data, msg }
 */
export type ApiEnvelope<T> = {
  code: number;
  data: T;
  msg: string;
};
