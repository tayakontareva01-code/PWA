export function parseNumberInput(value: string): number {
  const digits = value.replace(/[^\d.,]/g, '').replace(',', '.');
  const parsed = Number.parseFloat(digits);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatRubles(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 0
  }).format(Math.round(value));
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function toMinutesFromAmount(amount: number, hourRate: number): number {
  if (amount <= 0 || hourRate <= 0) {
    return 0;
  }

  const hours = amount / hourRate;
  return Math.floor(hours * 60);
}

export function formatMinutes(minutes: number): string {
  const sign = minutes < 0 ? '-' : '';
  const absoluteMinutes = Math.abs(minutes);
  const displayHours = Math.floor(absoluteMinutes / 60);
  const displayMinutes = absoluteMinutes % 60;

  if (displayHours > 0 && displayMinutes > 0) {
    return `${sign}${displayHours} ч ${displayMinutes} м`;
  }

  if (displayHours > 0) {
    return `${sign}${displayHours} ч`;
  }

  return `${sign}${displayMinutes} м`;
}

export function formatMinutesFull(minutes: number): string {
  const sign = minutes < 0 ? '-' : '';
  const absoluteMinutes = Math.abs(minutes);
  const displayHours = Math.floor(absoluteMinutes / 60);
  const displayMinutes = absoluteMinutes % 60;
  return `${sign}${displayHours} ч ${displayMinutes} м`;
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
