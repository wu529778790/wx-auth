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
  findTokenByPendingCode,
  convertPendingToAuthCode,
  getPendingCode
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

      // 关注事件
      if (MsgType === 'event' && Event === 'subscribe') {
        return generateWeChatReply({
          ToUserName: FromUserName,
          FromUserName: ToUserName,
          CreateTime: Math.floor(Date.now() / 1000),
          MsgType: 'text',
          Content: generateWelcomeMessage(FromUserName)
        });
      }

      // 文本消息
      if (MsgType === 'text') {
        const content = (Content || '').trim();

        // 1. 检查是否是6位数字（认证码）
        if (/^\d{6}$/.test(content)) {
          const token = findTokenByPendingCode(content);

          if (token) {
            // 找到对应的待验证代码，转换为认证码
            const pendingData = getPendingCode(token);
            if (pendingData) {
              // 转换为认证码，保存用户信息
              convertPendingToAuthCode(token, FromUserName);
              console.log(`[WeChat] 用户 ${FromUserName} 发送认证码 ${content}，认证成功`);

              return generateWeChatReply({
                ToUserName: FromUserName,
                FromUserName: ToUserName,
                CreateTime: Math.floor(Date.now() / 1000),
                MsgType: 'text',
                Content: `✅ 认证成功！请返回网站点击"我已关注"按钮完成登录。`
              });
            }
          }

          // 未找到对应的待验证代码
          return generateWeChatReply({
            ToUserName: FromUserName,
            FromUserName: ToUserName,
            CreateTime: Math.floor(Date.now() / 1000),
            MsgType: 'text',
            Content: `❌ 认证码无效或已过期。请访问网站生成新的认证码。`
          });
        }

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

        // 认证关键词（兼容旧版，生成认证码）
        if (containsAuthKeyword(content)) {
          const code = generateVerificationCode();
          saveAuthCode(code, FromUserName);

          console.log(`[WeChat] 生成认证码 ${code}`);

          return generateWeChatReply({
            ToUserName: FromUserName,
            FromUserName: ToUserName,
            CreateTime: Math.floor(Date.now() / 1000),
            MsgType: 'text',
            Content: generateCodeMessage(code)
          });
        }

        // 默认回复
        return generateWeChatReply({
          ToUserName: FromUserName,
          FromUserName: ToUserName,
          CreateTime: Math.floor(Date.now() / 1000),
          MsgType: 'text',
          Content: '收到消息！请访问网站生成认证码，然后发送6位数字到此公众号完成认证。'
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
