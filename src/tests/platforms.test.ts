import { describe, expect, it } from 'vitest';
import { detectPlatform, isPlatform } from '../modules/providers/platforms';

describe('platform helpers', () => {
  it('detects common platforms', () => {
    expect(detectPlatform('https://www.tiktok.com/@demo/video/123')).toBe('tiktok');
    expect(detectPlatform('https://youtu.be/abc')).toBe('youtube');
    expect(detectPlatform('https://www.xiaohongshu.com/user/profile/abc')).toBe('xiaohongshuProfile');
  });

  it('keeps disabled platforms out of public platform enum', () => {
    expect(isPlatform('mediafire')).toBe(false);
    expect(isPlatform('aio')).toBe(false);
  });
});
