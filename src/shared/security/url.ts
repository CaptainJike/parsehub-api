import { isIP } from 'node:net';
import { AppError } from '../errors/app-error';

const blockedHostnames = new Set(['localhost', 'localhost.localdomain']);

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split('.').map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }

  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    a === 0
  );
}

function isBlockedIp(hostname: string): boolean {
  const version = isIP(hostname);
  if (version === 4) {
    return isPrivateIpv4(hostname);
  }

  if (version === 6) {
    const normalized = hostname.toLowerCase();
    return normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80');
  }

  return false;
}

export function assertPublicHttpUrl(input: string): void {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new AppError({
      code: 'INVALID_URL',
      message: 'Input must be a valid URL for this platform.',
      statusCode: 400
    });
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new AppError({
      code: 'INVALID_URL_SCHEME',
      message: 'Only http and https URLs are allowed.',
      statusCode: 400
    });
  }

  const hostname = parsed.hostname.toLowerCase();
  if (blockedHostnames.has(hostname) || hostname.endsWith('.local') || isBlockedIp(hostname)) {
    throw new AppError({
      code: 'BLOCKED_URL_HOST',
      message: 'Private, local, or internal hosts are not allowed.',
      statusCode: 400
    });
  }
}

export function normalizeInput(input: string): string {
  return input.trim();
}
