export function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export function parseNumberInput(value: string): number {
  const normalized = value.replace(/\s+/g, '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatHours(value: number): string {
  return `${roundToOneDecimal(value).toFixed(1)} ч`;
}

export function formatHoursLong(value: number): string {
  return `${roundToOneDecimal(value).toFixed(1)} часов`;
}

export function formatPercent(value: number): string {
  return `${roundToOneDecimal(value).toFixed(1)}%`;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 1
  }).format(value);
}
