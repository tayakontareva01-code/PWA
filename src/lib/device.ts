import { DEVICE_COOKIE_NAME } from '../constants';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string) {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
}

export function ensureDeviceId(): string {
  const existing = getCookie(DEVICE_COOKIE_NAME);

  if (existing) {
    return existing;
  }

  const created = crypto.randomUUID();
  setCookie(DEVICE_COOKIE_NAME, created);
  return created;
}
