// 测试接口 - 用于调试微信消息接收
// 访问方式：POST https://auth.shenzjd.com/api/wechat/test
// Body: 任意XML内容

import { parseWeChatMessage } from '../../utils/wechat';
import { saveAuthCode } from '../../utils/storage';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig().wechat;

  console.log('=== 微信消息测试接口 ===');
  console.log('Token:', config.token);
  console.log('Name:', config.name);

  try {
    const body = await readBody(event);
    console.log('收到原始消息:', body);

    if (!body) {
      console.log('❌ 消息为空');
      return { error: 'Empty body' };
    }

    // 尝试解析消息
    const message = parseWeChatMessage(body);
    console.log('解析后的消息:', message);

    const { MsgType, Event, FromUserName, Content } = message;

    // 处理关注事件
    if (MsgType === 'event' && Event === 'subscribe') {
      console.log('✅ 检测到关注事件');
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      saveAuthCode(code, FromUserName);
      console.log(`✅ 生成验证码: ${code} 给用户: ${FromUserName}`);

      return {
        success: true,
        msg: '关注事件处理成功',
        code: code,
        user: FromUserName
      };
    }

    // 处理文本消息
    if (MsgType === 'text') {
      console.log('✅ 检测到文本消息');
      const content = (Content || '').trim();

      // 关键词触发
      const keywords = ['验证码', '已关注', '认证', '验证', 'login'];
      if (keywords.some(k => content.includes(k))) {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        saveAuthCode(code, FromUserName);
        console.log(`✅ 生成验证码: ${code} 给用户: ${FromUserName}`);

        return {
          success: true,
          msg: '关键词触发成功',
          code: code,
          user: FromUserName,
          reply: `您的认证码：${code}\n\n请在网站输入此验证码完成认证。`
        };
      }
    }

    console.log('⚠️ 未处理的消息类型:', MsgType);
    return { success: false, msg: '未处理的消息类型', message };

  } catch (error) {
    console.error('❌ 处理出错:', error);
    return { error: error.message };
  }
});
