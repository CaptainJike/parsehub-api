import { env } from '../../config/env';
import { AppError } from '../../shared/errors/app-error';

export interface WechatSession {
  openid: string;
  unionid?: string;
  sessionKey?: string;
}

export async function code2Session(code: string): Promise<WechatSession> {
  if (env.ENABLE_MOCK_WECHAT && env.NODE_ENV !== 'production') {
    return {
      openid: `mock_${code}`,
      unionid: `mock_union_${code}`
    };
  }

  const url = new URL('https://api.weixin.qq.com/sns/jscode2session');
  url.searchParams.set('appid', env.WECHAT_APP_ID);
  url.searchParams.set('secret', env.WECHAT_APP_SECRET);
  url.searchParams.set('js_code', code);
  url.searchParams.set('grant_type', 'authorization_code');

  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  const data = (await response.json()) as {
    openid?: string;
    unionid?: string;
    session_key?: string;
    errcode?: number;
    errmsg?: string;
  };

  if (!response.ok || !data.openid) {
    throw new AppError({
      code: 'WECHAT_LOGIN_FAILED',
      message: data.errmsg ?? 'Wechat login failed.',
      statusCode: 401
    });
  }

  return {
    openid: data.openid,
    unionid: data.unionid,
    sessionKey: data.session_key
  };
}
