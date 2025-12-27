// 微信消息处理 API - 支持安全模式（加密消息）
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
  generateStatusMessage,
  decryptWeChatMessage,
  encryptWeChatReply,
  generateEncryptedWeChatReply,
  generateSignature
} from '../../utils/wechat';
import {
  saveAuthCode,
  getUserByAuthCode,
  deleteAuthCode,
  markUserAuthenticated
} from '../../utils/storage';

export default defineEventHandler(async (event) => {
  const method = getMethod(event);
  const config = useRuntimeConfig().wechat;

  // 验证配置
  if (!config.token) {
    return 'Invalid configuration';
  }

  // 1. 微信服务器验证（GET请求）
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

  // 2. 处理消息（POST请求）
  if (method === 'POST') {
    const { signature, timestamp, nonce, encrypt_type, msg_signature } = getQuery(event);

    console.log('[WeChat] URL参数:', { signature, timestamp, nonce, encrypt_type, msg_signature });

    try {
      const body = await readBody(event);
      if (!body) return 'Empty body';

      console.log('[WeChat] 收到原始消息 (v2):', body);
      console.log('[WeChat] 消息长度:', body.length);

      // 判断是否是加密消息（安全模式）
      const isEncrypted = encrypt_type === 'aes' || body.includes('<Encrypt>');

      let message: any;
      let replyContent: string;
      let needEncrypt = false;

      if (isEncrypted) {
        // ========== 安全模式（加密消息）==========
        console.log('[WeChat] 检测到加密消息，使用安全模式处理');
        console.log('[WeChat] 配置检查:', {
          hasToken: !!config.token,
          hasAppId: !!config.appId,
          hasAesKey: !!config.aesKey,
          appIdValue: config.appId,
          aesKeyPreview: config.aesKey ? config.aesKey.substring(0, 10) + '...' : 'undefined'
        });

        // 验证消息签名
        const encryptMatch = body.match(/<Encrypt><!\[CDATA\[(.*?)\]\]><\/Encrypt>/);
        if (!encryptMatch) {
          return 'Invalid encrypted message';
        }

        const encryptMsg = encryptMatch[1];

        // 微信安全模式签名验证：token + timestamp + nonce + encryptMsg 排序后 SHA1
        const expectedSignature = generateSignature(
          config.token,
          timestamp as string,
          nonce as string,
          encryptMsg
        );

        if (!msg_signature || msg_signature !== expectedSignature) {
          console.log('[WeChat] 消息签名验证失败');
          console.log(`[WeChat] 期望签名: ${expectedSignature}`);
          console.log(`[WeChat] 收到签名: ${msg_signature}`);
          return 'Invalid signature';
        }

        // 解密消息
        const decryptedXml = decryptWeChatMessage(
          encryptMsg,
          config.aesKey,
          config.appId
        );

        console.log('[WeChat] 解密后消息:', decryptedXml.substring(0, 200));

        // 解析解密后的XML
        message = parseWeChatMessage(decryptedXml);
        needEncrypt = true; // 需要加密回复

      } else {
        // ========== 明文模式或兼容模式==========
        console.log('[WeChat] 使用明文模式处理');
        message = parseWeChatMessage(body);
      }

      const { MsgType, Event, FromUserName, ToUserName, Content } = message;

      console.log('[WeChat] 解析消息:', {
        MsgType,
        Event,
        FromUserName,
        ToUserName,
        Content,
        contentType: typeof Content,
        fullMessage: JSON.stringify(message)
      });

      // 处理消息逻辑
      let replyMsg = '';

      // 关注事件 - 核心逻辑：自动发送验证码
      if (MsgType === 'event' && Event === 'subscribe') {
        const code = generateVerificationCode();
        saveAuthCode(code, FromUserName);

        console.log(`[WeChat] 用户 ${FromUserName} 关注公众号，发送验证码 ${code}`);

        const welcomeMsg = generateWelcomeMessage(FromUserName);
        const codeMsg = `\n\n您的认证码：${code}\n\n请在网站输入此验证码完成认证。`;

        replyMsg = welcomeMsg + codeMsg;

      } else if (MsgType === 'text') {
        const content = String(Content || '').trim();

        if (!content) {
          // 空内容处理
          replyMsg = '请输入有效内容。发送"1"、"已关注"或"认证"获取验证码。';
        } else if (isStatusKeyword(content)) {
          // 状态查询
          replyMsg = generateStatusMessage(FromUserName);
        } else if (isHelpKeyword(content)) {
          // 帮助信息
          replyMsg = generateHelpMessage();
        } else if (containsAuthKeyword(content)) {
          // 认证关键词 - 重新发送验证码
          const existingCode = generateVerificationCode();
          saveAuthCode(existingCode, FromUserName);

          console.log(`[WeChat] 用户 ${FromUserName} 请求验证码，重新生成 ${existingCode}`);

          replyMsg = generateCodeMessage(existingCode);
        } else {
          // 默认回复
          replyMsg = '欢迎！如果您需要重新获取验证码，请发送"已关注"或"认证"。';
        }
      }

      // 构建回复消息
      if (needEncrypt && config.aesKey) {
        // ========== 安全模式：加密回复 ==========
        console.log('[WeChat] 使用安全模式回复（加密）');

        // 1. 生成明文回复XML
        const replyXml = generateWeChatReply({
          ToUserName: FromUserName,
          FromUserName: ToUserName,
          CreateTime: Math.floor(Date.now() / 1000),
          MsgType: 'text',
          Content: replyMsg
        });

        // 2. 加密回复
        const encryptedReply = encryptWeChatReply(
          replyXml,
          config.aesKey,
          config.appId
        );

        // 3. 生成签名
        const replySignature = generateSignature(
          config.token,
          timestamp as string,
          nonce as string,
          encryptedReply
        );

        // 4. 生成加密回复XML
        const finalReply = generateEncryptedWeChatReply(
          encryptedReply,
          replySignature,
          timestamp as string,
          nonce as string
        );

        console.log('[WeChat] 加密回复生成成功');
        return finalReply;

      } else {
        // ========== 明文模式：直接回复 ==========
        console.log('[WeChat] 使用明文模式回复');
        return generateWeChatReply({
          ToUserName: FromUserName,
          FromUserName: ToUserName,
          CreateTime: Math.floor(Date.now() / 1000),
          MsgType: 'text',
          Content: replyMsg
        });
      }

    } catch (error) {
      console.error('[WeChat] 处理出错:', error);
      return 'Internal Server Error';
    }
  }

  return 'Method Not Allowed';
});
