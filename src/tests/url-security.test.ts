import { describe, expect, it } from 'vitest';
import { assertPublicHttpUrl, resolveParseInput } from '../shared/security/url';

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

  it('keeps direct public urls unchanged', () => {
    expect(resolveParseInput('  https://example.com/video/1  ')).toEqual({
      normalizedInput: 'https://example.com/video/1',
      resolvedInput: 'https://example.com/video/1',
      hasPublicUrl: true
    });
  });

  it('extracts the first public url from share text', () => {
    expect(
      resolveParseInput(
        '4.15 复制打开抖音，看看【观世行侠的作品】干货分享 https://v.douyin.com/R_et2Jg-q00/ 07/12 :6pm Fho:/ l@C.hO'
      )
    ).toEqual({
      normalizedInput:
        '4.15 复制打开抖音，看看【观世行侠的作品】干货分享 https://v.douyin.com/R_et2Jg-q00/ 07/12 :6pm Fho:/ l@C.hO',
      resolvedInput: 'https://v.douyin.com/R_et2Jg-q00/',
      hasPublicUrl: true
    });
  });

  it('strips trailing share punctuation from extracted urls', () => {
    expect(resolveParseInput('看看这个视频 https://v.douyin.com/demo123/，')).toMatchObject({
      resolvedInput: 'https://v.douyin.com/demo123/'
    });
    expect(resolveParseInput('看看这个视频 https://v.douyin.com/demo123/...)')).toMatchObject({
      resolvedInput: 'https://v.douyin.com/demo123/'
    });
  });

  it('skips blocked urls and picks the first valid public candidate', () => {
    expect(
      resolveParseInput(
        '内部地址 http://127.0.0.1:3000/test 外部地址 https://v.douyin.com/next123/'
      )
    ).toEqual({
      normalizedInput: '内部地址 http://127.0.0.1:3000/test 外部地址 https://v.douyin.com/next123/',
      resolvedInput: 'https://v.douyin.com/next123/',
      hasPublicUrl: true
    });
  });

  it('uses the first valid public url when multiple candidates exist', () => {
    expect(
      resolveParseInput(
        '先看 https://v.douyin.com/first123/ 再看 https://v.kuaishou.com/second456/'
      )
    ).toMatchObject({
      resolvedInput: 'https://v.douyin.com/first123/'
    });
  });
});
