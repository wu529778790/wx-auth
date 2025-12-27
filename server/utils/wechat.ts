// 微信相关工具函数
import crypto from 'crypto';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

export interface WeChatMessage {
  ToUserName: string;
  FromUserName: string;
  CreateTime: number;
  MsgType: 'text' | 'event' | 'news';
  Content?: string;
  Event?: string;
  MsgId?: number;
}

/**
 * 微信消息加解密（安全模式）
 * 参考：微信官方文档 - 消息加解密
 */

// 生成随机16位字节
function getRandomBytes(): Buffer {
  return crypto.randomBytes(16);
}

/**
 * 解密微信消息（安全模式）
 * @param encryptMsg 加密的消息体
 * @param aesKey EncodingAESKey（43位字符）
 * @param appId 公众号AppID
 */
export function decryptWeChatMessage(
  encryptMsg: string,
  aesKey: string,
  appId: string
): string {
  try {
    // 1. EncodingAESKey 转换为 32字节AES密钥
    // 微信的 EncodingAESKey 是43位Base64字符，需要添加 '=' 补全为44位
    const key = Buffer.from(aesKey + '=', 'base64');
    const iv = key.slice(0, 16);
    const cipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

    // 2. Base64解码
    const encrypted = Buffer.from(encryptMsg, 'base64');

    // 3. 解密
    let decrypted = cipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, cipher.final()]);

    // 4. 去除 PKCS#7 填充
    const padLen = decrypted[decrypted.length - 1];
    const unpadded = decrypted.slice(0, decrypted.length - padLen);

    // 5. 解析报文格式：随机16字节 + 消息长度(4字节) + 消息内容 + AppID
    const msgLen = unpadded.readUInt32BE(16);
    const content = unpadded.slice(20, 20 + msgLen).toString('utf8');
    const appIdFromMsg = unpadded.slice(20 + msgLen).toString('utf8');

    // 6. 验证AppID
    if (appIdFromMsg !== appId) {
      throw new Error('AppID验证失败');
    }

    return content;
  } catch (error) {
    console.error('解密失败:', error);
    throw new Error('消息解密失败');
  }
}

/**
 * 加密回复消息（安全模式）
 * @param replyMsg 明文回复消息
 * @param aesKey EncodingAESKey（43位字符）
 * @param appId 公众号AppID
 */
export function encryptWeChatReply(
  replyMsg: string,
  aesKey: string,
  appId: string
): string {
  try {
    // 1. EncodingAESKey 转换为 32字节AES密钥
    const key = Buffer.from(aesKey + '=', 'base64');
    const iv = key.slice(0, 16);

    // 2. 准备报文内容
    // 格式：随机16字节 + 消息长度(4字节, 网络字节序) + 消息内容 + AppID
    const randomBytes = getRandomBytes();
    const msgLen = Buffer.alloc(4);
    msgLen.writeUInt32BE(Buffer.from(replyMsg, 'utf8').length, 0);

    const appIdBuffer = Buffer.from(appId, 'utf8');

    // 3. 拼接报文
    const content = Buffer.concat([
      randomBytes,
      msgLen,
      Buffer.from(replyMsg, 'utf8'),
      appIdBuffer
    ]);

    // 4. PKCS#7 填充
    const blockSize = 32;
    const padLen = blockSize - (content.length % blockSize);
    const padding = Buffer.alloc(padLen, padLen);
    padding.fill(padLen);
    const paddedContent = Buffer.concat([content, padding]);

    // 5. AES-256-CBC 加密
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(paddedContent);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    // 6. Base64编码
    return encrypted.toString('base64');
  } catch (error) {
    console.error('加密失败:', error);
    throw new Error('消息加密失败');
  }
}

/**
 * 生成安全模式的回复XML
 */
export function generateEncryptedWeChatReply(
  encryptMsg: string,
  signature: string,
  timestamp: string,
  nonce: string
): string {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    format: false,
    suppressEmptyNode: true
  });

  const xmlObj = {
    xml: {
      Encrypt: { '#cdata': encryptMsg },
      MsgSignature: { '#cdata': signature },
      TimeStamp: timestamp,
      Nonce: nonce
    }
  };

  return builder.build(xmlObj);
}

/**
 * 生成签名（用于加密消息回复）
 */
export function generateSignature(
  token: string,
  timestamp: string,
  nonce: string,
  encryptMsg: string
): string {
  const arr = [token, timestamp, nonce, encryptMsg].sort();
  const str = arr.join('');
  return crypto.createHash('sha1').update(str).digest('hex');
}

/**
 * 验证微信消息签名
 */
export function validateWeChatSignature(
  signature: string,
  timestamp: string,
  nonce: string,
  token: string
): boolean {
  const arr = [token, timestamp, nonce].sort();
  const str = arr.join('');
  const sha1Str = crypto.createHash('sha1').update(str).digest('hex');
  return sha1Str === signature;
}

/**
 * 解析微信 XML 消息
 */
export function parseWeChatMessage(xml: string): WeChatMessage {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseNodeValue: true,
    parseAttributeValue: true
  });

  const parsed = parser.parse(xml);
  return parsed.xml;
}

/**
 * 生成微信 XML 回复消息
 */
export function generateWeChatReply(message: WeChatMessage): string {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    format: false,
    suppressEmptyNode: true
  });

  const xmlObj = {
    xml: {
      ToUserName: { '#cdata': message.ToUserName },
      FromUserName: { '#cdata': message.FromUserName },
      CreateTime: message.CreateTime,
      MsgType: { '#cdata': message.MsgType },
      ...(message.MsgType === 'text' && message.Content ? {
        Content: { '#cdata': message.Content }
      } : {})
    }
  };

  return builder.build(xmlObj);
}

/**
 * 生成6位随机认证码
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * 检查消息内容是否包含关键词
 * 支持模糊匹配，处理可能的编码问题
 */
export function containsAuthKeyword(content: string): boolean {
  const keywords = ['已关注', '认证', '验证', 'login', '已订阅', '关注了', '验证码'];

  // 1. 精确匹配
  if (keywords.some(k => content.includes(k))) {
    return true;
  }

  // 2. 模糊匹配（处理乱码）
  // 将内容转换为字节数组，尝试匹配部分字符
  const contentBytes = Buffer.from(content, 'utf8');

  // 检查"验证码"的UTF-8字节序列：e9 aa 8c e8 af 81 e7 a0 81
  // 如果内容包含这些字节的任何部分，也认为匹配
  const patterns = [
    Buffer.from('验证码'), // 正常
    Buffer.from([0xe9, 0xaa, 0x8c]), // 验的前3字节
    Buffer.from([0xe8, 0xaf, 0x81]), // 证的前3字节
    Buffer.from([0xe7, 0xa0, 0x81]), // 码的前3字节
  ];

  for (const pattern of patterns) {
    if (contentBytes.includes(pattern)) {
      console.log('[WeChat] 模糊匹配成功:', pattern.toString('hex'));
      return true;
    }
  }

  // 3. 检查是否有乱码但包含"验"或"证"或"码"
  if (content.includes('验') || content.includes('证') || content.includes('码')) {
    return true;
  }

  return false;
}

/**
 * 检查是否是状态查询关键词
 */
export function isStatusKeyword(content: string): boolean {
  const keywords = ['状态', 'status', '查询'];
  return keywords.some(k => content.includes(k));
}

/**
 * 检查是否是帮助关键词
 */
export function isHelpKeyword(content: string): boolean {
  const keywords = ['帮助', 'help', '怎么', '如何'];
  return keywords.some(k => content.includes(k));
}

/**
 * 生成欢迎消息
 */
export function generateWelcomeMessage(openid: string): string {
  const siteUrl = useRuntimeConfig().public.siteUrl;
  return `欢迎关注！🎉

请访问网站完成认证：
${siteUrl}

在网站输入您的认证码，或发送"已关注"到本公众号获取认证码。

提示：认证码5分钟内有效。`;
}

/**
 * 生成认证码回复消息
 */
export function generateCodeMessage(code: string): string {
  return `✅ 认证码已生成

您的认证码：${code}

请在网站输入此认证码完成登录，或直接刷新网站页面。

提示：认证码5分钟内有效。`;
}

/**
 * 生成帮助消息
 */
export function generateHelpMessage(): string {
  return `认证流程帮助：

1. 关注公众号
2. 发送关键词【已关注】或【认证】
3. 获得6位认证码
4. 在网站输入认证码完成登录

支持关键词：
- 已关注, 认证, 验证, login
- 状态 - 查询认证状态
- 帮助 - 查看此帮助

如有问题，请联系管理员。`;
}

/**
 * 生成状态查询回复
 */
export function generateStatusMessage(openid: string): string {
  return `您的认证状态：已关注公众号

如需重新认证，请发送"已关注"。

如需帮助，请发送"帮助"。`;
}
