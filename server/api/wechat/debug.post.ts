// 调试接口 - 查看消息解析详情
import { eventHandler, readBody } from 'h3';

export default eventHandler(async (event) => {
  const body = await readBody(event);
  const config = useRuntimeConfig().wechat;

  console.log('=== 调试接口 ===');
  console.log('Token:', config.token);
  console.log('原始Body:', body);

  // 手动解析
  const { XMLParser } = await import('fast-xml-parser');
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseNodeValue: true,
    parseAttributeValue: true
  });

  try {
    const parsed = parser.parse(body);
    console.log('解析结果:', JSON.stringify(parsed, null, 2));

    const message = parsed.xml;
    console.log('消息对象:', message);

    const { MsgType, Event, FromUserName, Content } = message;
    console.log('MsgType:', MsgType);
    console.log('Event:', Event);
    console.log('FromUserName:', FromUserName);
    console.log('Content:', Content);

    // 检查关键词匹配
    const content = (Content || '').trim();
    const keywords = ['已关注', '认证', '验证', 'login', '已订阅', '关注了', '验证码'];
    const matched = keywords.some(k => content.includes(k));

    console.log('内容:', content);
    console.log('关键词匹配:', matched);

    return {
      success: true,
      parsed: message,
      content: content,
      matched: matched,
      keywords: keywords
    };

  } catch (error) {
    console.error('解析错误:', error);
    return { error: error.message };
  }
});
