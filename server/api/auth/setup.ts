// 生成认证码 API
// 路由: /api/auth/setup

import { savePendingCode } from '~/server/utils/storage';

export default defineEventHandler(async (event) => {
  const method = getMethod(event);

  if (method !== 'POST') {
    return { error: 'Method not allowed' };
  }

  try {
    const body = await readBody(event);
    const { token, code } = body;

    if (!token || !code) {
      return { error: 'Missing token or code' };
    }

    // 保存待验证代码
    savePendingCode(token, code);

    console.log(`[Auth Setup] 生成待验证代码 ${code} 对应 token ${token}`);

    return {
      success: true,
      code,
      token
    };
  } catch (error) {
    console.error('[Auth Setup] Error:', error);
    return { error: 'Internal server error' };
  }
});
