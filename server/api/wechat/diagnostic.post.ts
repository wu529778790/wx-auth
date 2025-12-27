/**
 * 诊断接口 - 接收微信原始消息并保存到日志
 * 用于调试微信消息推送问题
 */

import { defineEventHandler, readBody, getQuery } from 'h3';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const query = getQuery(event);

  // 记录诊断信息
  const diagnostic = {
    timestamp: new Date().toISOString(),
    method: event.node.req.method,
    headers: event.node.req.headers,
    query: query,
    body: body,
    bodyType: typeof body,
    bodyLength: body ? body.length : 0,
    bodyHex: body ? Buffer.from(body).toString('hex') : null,
    bodyPreview: body ? body.substring(0, 500) : null,
    // 尝试不同编码
    bodyUtf8: body ? Buffer.from(body).toString('utf8') : null,
    bodyLatin1: body ? Buffer.from(body).toString('latin1') : null,
  };

  console.log('=== 微信消息诊断 ===');
  console.log('时间:', diagnostic.timestamp);
  console.log('查询参数:', diagnostic.query);
  console.log('请求头:', JSON.stringify(diagnostic.headers, null, 2));
  console.log('Body长度:', diagnostic.bodyLength);
  console.log('Body内容:', diagnostic.bodyPreview);
  console.log('Body Hex:', diagnostic.bodyHex);
  console.log('Body UTF8:', diagnostic.bodyUtf8);
  console.log('Body Latin1:', diagnostic.bodyLatin1);
  console.log('完整诊断数据:', JSON.stringify(diagnostic, null, 2));

  // 保存到文件（如果需要）
  // const fs = require('fs');
  // const path = require('path');
  // fs.appendFileSync(
  //   path.join(process.cwd(), 'wechat-diagnostic.log'),
  //   JSON.stringify(diagnostic) + '\n'
  // );

  return {
    status: 'ok',
    received: true,
    timestamp: diagnostic.timestamp,
    bodyLength: diagnostic.bodyLength,
    bodyPreview: diagnostic.bodyPreview,
    message: '诊断数据已记录到控制台'
  };
});
