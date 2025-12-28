// Session 管理 API - 极简版
// 路由: /api/auth/session

import { createSession } from '~/server/utils/session';
import { eventHandler, getMethod, readBody, createError } from 'h3';

export default eventHandler(async (event) => {
  const method = getMethod(event);

  // 设置 Session
  if (method === 'POST') {
    const body = await readBody(event);
    const { user } = body;

    if (!user || !user.openid) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing user information'
      });
    }

    const session = await createSession(event);
    await session.update({
      authenticated: true,
      user: {
        openid: user.openid,
        unionid: user.unionid,
        nickname: user.nickname,
        headimgurl: user.headimgurl,
        authenticatedAt: user.authenticatedAt || new Date().toISOString()
      }
    });

    return { success: true };
  }

  // 获取 Session
  if (method === 'GET') {
    const session = await createSession(event);
    return session.value;
  }

  // 清除 Session（登出）
  if (method === 'DELETE') {
    const session = await createSession(event);
    await session.clear();
    return { success: true };
  }

  return 'Method Not Allowed';
});
