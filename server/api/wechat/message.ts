// 微信消息处理 API - 极简版
// 路由: /api/wechat/message

import {
  validateWeChatSignature,
  parseWeChatMessage,
  generateWeChatReply,
  generateVerificationCode,
  containsAuthKeyword,
  isStatusKeyword,
  isHelpKeyword,
  generateWelcomeMessage,
  generateCodeMessage,
  generateHelpMessage,
  generateStatusMessage
} from '~/server/utils/wechat';
import {
  saveAuthCode,
  getUserByAuthCode,
  deleteAuthCode,
  markUserAuthenticated
} from '~/server/utils/storage';

export default defineEventHandler(async (event) => {
  const method = getMethod(event);
  const config = useRuntimeConfig().wechat;

  // 验证配置
  if (!config.token) {
    return 'Invalid configuration';
  }

  // 1. 微信服务器验证
  if (method === 'GET') {
    const { signature, timestamp, nonce, echostr } = getQuery(event);

    if (!signature || !timestamp || !nonce || !echostr) {
      return 'Invalid parameters';
    }

    const isValid = validateWeChatSignature(
      signature as string,
      timestamp as string,
      nonce as string,
      config.token
    );

    return isValid ? echostr : 'Invalid signature';
  }

  // 2. 处理消息
  if (method === 'POST') {
    const { signature, timestamp, nonce } = getQuery(event);

    if (!signature || !timestamp || !nonce ||
        !validateWeChatSignature(signature as string, timestamp as string, nonce as string, config.token)) {
      return 'Invalid signature';
    }

    try {
      const body = await readBody(event);
      if (!body) return 'Empty body';

      console.log('[WeChat] 收到消息:', body.substring(0, 200));

      const message = parseWeChatMessage(body);
      const { MsgType, Event, FromUserName, ToUserName, Content } = message;

      // 关注事件 - 核心逻辑：自动发送验证码
      if (MsgType === 'event' && Event === 'subscribe') {
        // 生成6位验证码
        const code = generateVerificationCode();

        // 保存验证码（关联用户openid）
        saveAuthCode(code, FromUserName);

        console.log(`[WeChat] 用户 ${FromUserName} 关注公众号，发送验证码 ${code}`);

        // 回复欢迎消息 + 验证码
        const welcomeMsg = generateWelcomeMessage(FromUserName);
        const codeMsg = `\n\n您的认证码：${code}\n\n请在网站输入此验证码完成认证。`;

        return generateWeChatReply({
          ToUserName: FromUserName,
          FromUserName: ToUserName,
          CreateTime: Math.floor(Date.now() / 1000),
          MsgType: 'text',
          Content: welcomeMsg + codeMsg
        });
      }

      // 文本消息
      if (MsgType === 'text') {
        const content = (Content || '').trim();

        // 状态查询
        if (isStatusKeyword(content)) {
          return generateWeChatReply({
            ToUserName: FromUserName,
            FromUserName: ToUserName,
            CreateTime: Math.floor(Date.now() / 1000),
            MsgType: 'text',
            Content: generateStatusMessage(FromUserName)
          });
        }

        // 帮助信息
        if (isHelpKeyword(content)) {
          return generateWeChatReply({
            ToUserName: FromUserName,
            FromUserName: ToUserName,
            CreateTime: Math.floor(Date.now() / 1000),
            MsgType: 'text',
            Content: generateHelpMessage()
          });
        }

        // 认证关键词 - 重新发送验证码
        if (containsAuthKeyword(content)) {
          const existingCode = generateVerificationCode();
          saveAuthCode(existingCode, FromUserName);

          console.log(`[WeChat] 用户 ${FromUserName} 请求验证码，重新生成 ${existingCode}`);

          return generateWeChatReply({
            ToUserName: FromUserName,
            FromUserName: ToUserName,
            CreateTime: Math.floor(Date.now() / 1000),
            MsgType: 'text',
            Content: generateCodeMessage(existingCode)
          });
        }

        // 默认回复
        return generateWeChatReply({
          ToUserName: FromUserName,
          FromUserName: ToUserName,
          CreateTime: Math.floor(Date.now() / 1000),
          MsgType: 'text',
          Content: '欢迎！如果您需要重新获取验证码，请发送"已关注"或"认证"。'
        });
      }

      return 'success';
    } catch (error) {
      console.error('[WeChat] 处理出错:', error);
      return 'Internal Server Error';
    }
  }

  return 'Method Not Allowed';
});
