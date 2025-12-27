// 开发测试接口 - 模拟关注公众号
// 路由: /api/test/simulate-subscribe

import {
  generateVerificationCode,
  generateWelcomeMessage
} from '~/server/utils/wechat';
import {
  saveAuthCode
} from '~/server/utils/storage';

export default defineEventHandler(async (event) => {
  const method = getMethod(event);

  if (method !== 'POST') {
    return { success: false, error: '只支持 POST 方法' };
  }

  try {
    const body = await readBody(event);
    const { openid } = body;

    if (!openid) {
      return { success: false, error: '缺少 openid 参数' };
    }

    // 生成验证码
    const code = generateVerificationCode();

    // 保存验证码
    saveAuthCode(code, openid);

    console.log(`[Test] 模拟用户 ${openid} 关注公众号，生成验证码 ${code}`);

    // 返回验证码和模拟的回复消息
    const welcomeMsg = generateWelcomeMessage(openid);
    const codeMsg = `\n\n您的认证码：${code}\n\n请在网站输入此验证码完成认证。`;

    return {
      success: true,
      code: code,
      openid: openid,
      message: welcomeMsg + codeMsg
    };
  } catch (error) {
    console.error('[Test] 模拟失败:', error);
    return { success: false, error: '模拟失败' };
  }
});
