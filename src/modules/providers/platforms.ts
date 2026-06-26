export const enabledPlatforms = [
  'instagram',
  'tiktok',
  'facebook',
  'twitter',
  'youtube',
  'capcut',
  'gdrive',
  'pinterest',
  'douyin',
  'xiaohongshu',
  'xiaohongshuProfile',
  'snackvideo',
  'cocofun',
  'spotify',
  'yts',
  'soundcloud',
  'threads',
  'kuaishou'
] as const;

export const disabledPlatforms = ['mediafire', 'aio'] as const;

export type Platform = (typeof enabledPlatforms)[number];

export function isPlatform(value: string): value is Platform {
  return enabledPlatforms.includes(value as Platform);
}

export function listPlatformStatus(): Array<{ platform: string; enabled: boolean; maintained: boolean }> {
  return [
    ...enabledPlatforms.map((platform) => ({ platform, enabled: true, maintained: true })),
    ...disabledPlatforms.map((platform) => ({ platform, enabled: false, maintained: false }))
  ];
}

export function detectPlatform(input: string): Platform | null {
  const value = input.trim();
  const rules: Array<[Platform, RegExp]> = [
    ['instagram', /instagram\.com\/(p|reel|tv|stories)\//i],
    ['tiktok', /(tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com)/i],
    ['facebook', /(facebook\.com|fb\.watch)/i],
    ['twitter', /(twitter\.com|x\.com)\/\w+\/status\//i],
    ['youtube', /(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)/i],
    ['capcut', /capcut\.com/i],
    ['gdrive', /drive\.google\.com/i],
    ['pinterest', /(pinterest\.com|pin\.it)/i],
    ['douyin', /(douyin\.com|v\.douyin\.com)/i],
    ['xiaohongshuProfile', /xiaohongshu\.com\/user\/profile/i],
    ['xiaohongshu', /(xiaohongshu\.com|xhslink\.com)/i],
    ['snackvideo', /snackvideo\.com/i],
    ['cocofun', /(icocofun|cocofun)\.com/i],
    ['spotify', /(open\.spotify\.com|spotify\.link)/i],
    ['soundcloud', /soundcloud\.com/i],
    ['threads', /threads\.net/i],
    ['kuaishou', /(kuaishou\.com|v\.kuaishou\.com)/i]
  ];

  for (const [platform, regex] of rules) {
    if (regex.test(value)) {
      return platform;
    }
  }

  return null;
}
