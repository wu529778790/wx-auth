// 服务端注销 API
// 路由: POST /api/auth/logout
// 职责: 把当前签名 token 加入吊销黑名单（revoked_tokens 表）。
//       此后该 token 在任意子域 / 设备 / localStorage 备份中都无法再通过鉴权。
//
// 设计:
//   - 凭证: body.token 必填（CSRF 双提交）。跨站页面读不到非 HttpOnly cookie
//     之外的内容，无法在 body 里伪造 token；「body 缺失时兜底读 cookie」绝不可加——
//     跨站请求会自动带上 cookie，兜底等于把吊销权开放给任意第三方页面。
//   - 一致性: cookie 在场时必须与 body.token 一致，防止已泄露的 token 被第三方
//     页面跨站吊销。无 cookie 客户端（仅传 body.token）不受影响。
//   - Origin: 跨站 Origin 由 cors.ts 拦截（同源 + 部署域名父域的子域放行）。
//   - 审计: 每条吊销记录带来源（origin/ip/ua）。外域/空 origin + 有效 token
//     = 跨站吊销事故的排查线索。
//   - 幂等: token 已吊销则忽略（ON CONFLICT DO NOTHING），重复退出不报错
//   - 只吊销「这一个 token」，不注销整个 openid（同一用户其他设备/新登录不受影响）
//   - 返回后客户端应再清本地 Cookie + localStorage（SDK revoke() 已内置）

import { eventHandler, readBody, getCookie, getRequestHeader } from 'h3';
import { verifySignedToken, revokeToken } from '~/server/utils/token';
import { getClientIp, checkRateLimit } from '~/server/utils/rate-limit';

export default eventHandler(async (event) => {
  const config = useRuntimeConfig();

  // 速率限制（写操作，宽松即可——误触发被拉黑才需要防）
  const clientIp = getClientIp(event);
  const rateLimit = checkRateLimit(`auth-logout:${clientIp}`, {
    maxAttempts: 60,
    windowMs: 60 * 1000,
    blockMs: 5 * 60 * 1000
  });
  if (!rateLimit.allowed) {
    setResponseStatus(event, 429);
    return { success: false, error: 'rate_limited', message: '请求过于频繁，请稍后重试' };
  }

  // 解析凭证：body.token 必填（双提交），cookie 仅作一致性比对、不再作为凭证来源
  // readBody 对空 body 返回 undefined（仅 reject 时走 catch），需 ?? 兜底
  const body = ((await readBody(event).catch(() => ({}))) ?? {}) as { token?: string };
  const cookieToken = getCookie(event, 'wxauth-token');
  if (!body.token) {
    return { success: false, error: 'no_token', message: '缺少认证凭证' };
  }
  if (cookieToken && cookieToken !== body.token) {
    return { success: false, error: 'token_mismatch', message: '凭证与当前会话不一致' };
  }

  // 校验签名（无效/过期 token 也直接返回成功——本地清理即可，无需报错）
  const openid = verifySignedToken(body.token, config.session.secret);
  if (!openid) {
    return { success: true, alreadyRevoked: true, message: '凭证已失效，无需吊销' };
  }

  // 写入吊销表（幂等，带来源审计：跨站吊销事故归因用）
  await revokeToken(body.token, openid, {
    origin: getRequestHeader(event, 'origin') ?? null,
    ip: clientIp,
    userAgent: getRequestHeader(event, 'user-agent') ?? null
  });

  return { success: true, message: '已注销，token 已失效' };
});