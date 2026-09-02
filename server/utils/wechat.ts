// 微信相关工具函数
import crypto from 'crypto';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

export interface WeChatMessage {
  ToUserName: string;
  FromUserName: string;
  CreateTime: number;
  MsgType: 'text' | 'event' | 'news' | 'image';
  Content?: string;
  Event?: string;
  EventKey?: string;
  MsgId?: number;
  Image?: {
    PicUrl?: string;
    MediaId?: string;
  };
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
      throw new Error(`AppID验证失败: 期望[${appId}] 收到[${appIdFromMsg}]`);
    }

    return content;
  } catch (error) {
    console.error('[WeChat] 解密失败:', error);
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
  // 手动构建 XML 以确保正确的 CDATA 格式
  const cdata = (text: string) => `<![CDATA[${text}]]>`;

  let xml = '<xml>';
  xml += `<Encrypt>${cdata(encryptMsg)}</Encrypt>`;
  xml += `<MsgSignature>${cdata(signature)}</MsgSignature>`;
  xml += `<TimeStamp>${timestamp}</TimeStamp>`;
  xml += `<Nonce>${nonce}</Nonce>`;
  xml += '</xml>';

  return xml;
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
  // 手动构建 XML 以确保正确的 CDATA 格式
  const cdata = (text: string) => `<![CDATA[${text}]]>`;

  let xml = '<xml>';
  xml += `<ToUserName>${cdata(message.ToUserName)}</ToUserName>`;
  xml += `<FromUserName>${cdata(message.FromUserName)}</FromUserName>`;
  xml += `<CreateTime>${message.CreateTime}</CreateTime>`;
  xml += `<MsgType>${cdata(message.MsgType)}</MsgType>`;

  if (message.MsgType === 'text' && message.Content) {
    xml += `<Content>${cdata(message.Content)}</Content>`;
  } else if (message.MsgType === 'image' && message.Image?.PicUrl) {
    xml += `<Image><PicUrl>${cdata(message.Image.PicUrl)}</PicUrl></Image>`;
  }

  xml += '</xml>';

  return xml;
}

/**
 * 生成6位随机认证码（密码学安全）
 */
export function generateVerificationCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * 简体 → 繁体 映射（仅覆盖验证码关键词相关常用字）
 * 用于兼容用户发送繁体字（如"驗證碼"）时也能触发认证关键词
 */
const SIMPLIFIED_TO_TRADITIONAL: Record<string, string> = {
  '验': '驗',
  '证': '證',
  '码': '碼'
};

/**
 * 将简体字符串转为繁体（仅转换映射表中覆盖的字）
 */
function toTraditional(text: string): string {
  return text
    .split('')
    .map(c => SIMPLIFIED_TO_TRADITIONAL[c] || c)
    .join('');
}

/**
 * 内置模糊触发词（无需在 NUXT_KEYWORDS 中配置）
 * 覆盖常见输入变体：拼音、简写、错别字、单字，最大程度降低用户打字成本
 */
const FUZZY_VARIANTS = [
  'yanzhengma',   // 拼音全拼
  'yzm',          // 拼音首字母
  '验证马',       // 错别字
  '验证吗',
  '验证',         // 省略"码"字
  '驗證',         // 繁体省略
  '码',           // 单字（最省事）
  '碼'            // 繁体单字
];

/**
 * 检查消息内容是否包含关键词（支持简繁体 + 模糊匹配）
 * - 精确关键词：读取 NUXT_KEYWORDS 配置（默认["验证码"]），简繁体均匹配
 * - 模糊触发：拼音（yanzhengma/yzm）、错别字（验证马）、单字（码/碼）等
 */
export function containsAuthKeyword(content: string): boolean {
  const config = useRuntimeConfig();
  const keywords = config.keywords;
  const text = content.toLowerCase().trim();

  // 1. 配置关键词精确匹配（简体）
  if (keywords.some(k => text.includes(k))) return true;

  // 2. 配置关键词繁体匹配（如"驗證碼"）
  const traditionalText = toTraditional(text);
  if (keywords.some(k => traditionalText.includes(toTraditional(k)))) return true;

  // 3. 内置模糊变体匹配
  return FUZZY_VARIANTS.some(v => text.includes(v));
}
/**
 * 生成欢迎消息（关注事件回复：欢迎语 + 验证码获取指引）
 * 注意：关注事件不直接推送验证码（验证码 5 分钟过期，随关注推送大概率已失效），
 * 引导用户回复关键词或点菜单主动获取。
 */
export function generateWelcomeMessage(): string {
  const wechatName = useRuntimeConfig().wechat?.name || '公众号';

  return `🎉 欢迎关注${wechatName}！

🔗 访问网站，扫码后即可自动登录

🔑 获取验证码：回复「验证码」或点击公众号菜单`;
}

/**
 * 生成验证码回复消息 - 请求验证码时使用
 */
export function generateCodeMessage(code: string): string {
  return `✅ 验证码已生成

━━━━━━━━━━━━━━━━━━
您的验证码：${code}
━━━━━━━━━━━━━━━━━━

👉 在网站输入验证码完成认证

💡 验证码5分钟内有效`;
}
