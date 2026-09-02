// 微信消息处理 API - 支持安全模式（加密消息）
// 路由: /api/wechat/message

import { eventHandler, getMethod, getQuery, readBody, createError } from 'h3';
import {
  validateWeChatSignature,
  parseWeChatMessage,
  generateWeChatReply,
  generateVerificationCode,
  containsAuthKeyword,
  generateWelcomeMessage,
  generateCodeMessage,
  decryptWeChatMessage,
  encryptWeChatReply,
  generateEncryptedWeChatReply,
  generateSignature
} from '../../utils/wechat';
import {
  saveAuthCode,
  getUserByAuthCode,
  deleteAuthCode,
  markUserAuthenticated,
  clearUserAuthentication
} from '../../utils/storage';
import { makeLogger } from '../../utils/logger';

export default eventHandler(async (event) => {
  const method = getMethod(event);
  const log = makeLogger(event);
  const config = useRuntimeConfig().wechat;

  // 验证配置
  if (!config.token) {
    log.error('[WeChat] WECHAT_TOKEN 未设置');
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

    try {
      const body = await readBody(event);
      if (!body) {
        return 'Empty body';
      }

      // 判断是否是加密消息（安全模式）
      const isEncrypted = encrypt_type === 'aes' || body.includes('<Encrypt>');

      let message: any;
      let needEncrypt = false;

      if (isEncrypted) {
        // ========== 安全模式（加密消息）==========
        const encryptMatch = body.match(/<Encrypt><!\[CDATA\[(.*?)\]\]><\/Encrypt>/);
        if (!encryptMatch) {
          return 'Invalid encrypted message';
        }

        const encryptMsg = encryptMatch[1];

        // 微信安全模式签名验证
        const expectedSignature = generateSignature(
          config.token,
          timestamp as string,
          nonce as string,
          encryptMsg
        );

        if (!msg_signature || msg_signature !== expectedSignature) {
          log.error('[WeChat] 消息签名验证失败');
          return 'Invalid signature';
        }

        const decryptedXml = decryptWeChatMessage(
          encryptMsg,
          config.aesKey,
          config.appId
        );

        message = parseWeChatMessage(decryptedXml);
        needEncrypt = true;

      } else {
        // ========== 明文模式或兼容模式==========
        message = parseWeChatMessage(body);
      }

      const { MsgType, Event, EventKey, FromUserName, ToUserName, Content } = message;

      // 处理消息逻辑
      let replyMsg = '';

      // 关注事件 - 欢迎语 + 全站用户编号（不再随关注推送验证码，验证码走关键词/菜单主动获取）
      if (MsgType === 'event' && Event === 'subscribe') {
        // 重新关注 = 恢复认证状态（unsubscribed → active）：
        // unsubscribe 事件会把 status 置为 unsubscribed，重新关注不恢复的话
        // check 接口永远未认证（2026-08-22 修复）
        await markUserAuthenticated(FromUserName, {}, event);
        replyMsg = generateWelcomeMessage();

      } else if (MsgType === 'event' && Event === 'CLICK') {
        // 菜单点击事件 - 用户点击公众号"验证码"菜单，无需打字直接获取验证码
        // 菜单 key 与微信公众平台后台配置的事件 key 一致（默认 GET_CODE）
        if (EventKey === config.menuKey) {
          const code = generateVerificationCode();
          await saveAuthCode(code, FromUserName, undefined, event);
          // 用户主动点击"验证码"菜单 = 当前关注状态，恢复认证状态
          await markUserAuthenticated(FromUserName, {}, event);
          replyMsg = generateCodeMessage(code);
        } else {
          log.info(`[WeChat] 未知菜单点击 EventKey=${EventKey}`);
          return 'success';
        }

      } else if (MsgType === 'event' && Event === 'unsubscribe') {
        // 取消关注事件 - 清除用户认证状态
        await clearUserAuthentication(FromUserName, event);
        return 'success';

      } else if (MsgType === 'event' && Event === 'LOCATION') {
        // 位置事件 - 不回复
        return 'success';

      } else if (MsgType === 'text') {
        const content = String(Content || '').trim();

        if (!content) {
          // 空内容（纯空格等）- 静默不回复，避免噪音
          return 'success';
        } else if (containsAuthKeyword(content)) {
          // 认证关键词（含模糊匹配：繁体/拼音/错别字/单字"码"）- 重新发送验证码
          const existingCode = generateVerificationCode();
          await saveAuthCode(existingCode, FromUserName, undefined, event);
          // 用户主动发码说明当前在关注状态，恢复认证状态（修复 unsubscribed 卡死）
          await markUserAuthenticated(FromUserName, {}, event);
          replyMsg = generateCodeMessage(existingCode);
        } else {
          // 无关文本 - 静默不回复（验证码入口已有关注推送 + 菜单"验证码"，无需引导文案）
          return 'success';
        }
      }

      // 如果没有回复内容，直接返回成功（不发送空回复）
      if (!replyMsg) {
        return 'success';
      }

      // 构建回复消息
      if (needEncrypt && config.aesKey) {
        // ========== 安全模式：加密回复 ==========
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

        return finalReply;

      } else {
        // ========== 明文模式：直接回复 ==========
        return generateWeChatReply({
          ToUserName: FromUserName,
          FromUserName: ToUserName,
          CreateTime: Math.floor(Date.now() / 1000),
          MsgType: 'text',
          Content: replyMsg
        });
      }

    } catch (error) {
      // 返回真实 500（而非 200 + 错误文本）：
      // 1) 微信会对 5xx 重试 3 次，服务恢复后用户消息能被自动补发
      // 2) 反向代理/监控能感知故障，错误不会静默丢失
      log.error('[WeChat] ❌ 处理出错:', error);
      throw createError({
        statusCode: 500,
        message: 'WeChat message processing failed'
      });
    }
  }

  return 'Method Not Allowed';
});
