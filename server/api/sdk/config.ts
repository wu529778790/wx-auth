// SDK 配置接口 - 供前端 SDK 获取公众号信息
// 路由: /api/sdk/config

import { eventHandler, getQuery } from 'h3';

export default eventHandler(async (event) => {
  const config = useRuntimeConfig();

  return {
    wechatName: config.wechat?.name || process.env.WECHAT_NAME || '公众号',
    qrcodeUrl: config.wechat?.qrcodeUrl || process.env.WECHAT_QRCODE_URL || '',
    codeLength: config.code?.length || 6
  };
});
