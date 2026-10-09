/** Shared Vietnamese number/currency formatting. Keep persisted values numeric. */
export const formatNumber = (value: unknown): string => {
  const number = typeof value === 'number' ? value : Number(value ?? 0);
  if (!Number.isFinite(number)) return '0';
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(number);
};
export const formatMoney = (value: unknown, suffix = 'đ'): string => `${formatNumber(value)} ${suffix}`;
export const formatMoneyInput = (value: unknown): string => {
  if (value === '' || value === null || value === undefined) return '';
  const number = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9-]/g, ''));
  return Number.isFinite(number) ? formatNumber(number) : '';
};
export const parseMoneyInput = (value: string): number => {
  const digits = value.replace(/[^0-9-]/g, '');
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : 0;
};
