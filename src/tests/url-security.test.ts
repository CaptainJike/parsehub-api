import { describe, expect, it } from 'vitest';
import { assertPublicHttpUrl } from '../shared/security/url';

describe('url security', () => {
  it('allows public http urls', () => {
    expect(() => assertPublicHttpUrl('https://example.com/video/1')).not.toThrow();
  });

  it('blocks local and private urls', () => {
    expect(() => assertPublicHttpUrl('file:///etc/passwd')).toThrow();
    expect(() => assertPublicHttpUrl('http://localhost:3000')).toThrow();
    expect(() => assertPublicHttpUrl('http://127.0.0.1:3000')).toThrow();
    expect(() => assertPublicHttpUrl('http://192.168.1.10')).toThrow();
  });
});
