import { isIP } from 'node:net';
import { AppError } from '../errors/app-error';

const blockedHostnames = new Set(['localhost', 'localhost.localdomain']);
const urlCandidatePattern = /https?:\/\/[^\s]+/giu;
const trailingShareCharacters = new Set([
  ',',
  '.',
  ';',
  ':',
  '!',
  '?',
  '"',
  "'",
  ')',
  ']',
  '}',
  '>',
  '，',
  '。',
  '！',
  '？',
  '；',
  '：',
  '、',
  '）',
  '】',
  '》',
  '」',
  '』',
  '”',
  '’'
]);

export interface ParseInputResolution {
  normalizedInput: string;
  resolvedInput: string;
  hasPublicUrl: boolean;
}

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

function isPublicHttpUrl(input: string): boolean {
  try {
    assertPublicHttpUrl(input);
    return true;
  } catch {
    return false;
  }
}

function trimTrailingShareCharacters(input: string): string {
  let value = input;
  while (value.length > 0) {
    const lastCharacter = value.at(-1);
    if (!lastCharacter || !trailingShareCharacters.has(lastCharacter)) {
      break;
    }
    value = value.slice(0, -1);
  }

  return value;
}

function extractFirstPublicHttpUrl(input: string): string | null {
  for (const match of input.matchAll(urlCandidatePattern)) {
    const candidate = trimTrailingShareCharacters(match[0]);
    if (candidate && isPublicHttpUrl(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function resolveParseInput(input: string): ParseInputResolution {
  const normalizedInput = normalizeInput(input);
  if (isPublicHttpUrl(normalizedInput)) {
    return {
      normalizedInput,
      resolvedInput: normalizedInput,
      hasPublicUrl: true
    };
  }

  const extractedUrl = extractFirstPublicHttpUrl(normalizedInput);
  return {
    normalizedInput,
    resolvedInput: extractedUrl ?? normalizedInput,
    hasPublicUrl: extractedUrl !== null
  };
}
