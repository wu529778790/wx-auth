// 认证状态检查 API - 极简版
// 路由: /api/auth/check

import { eventHandler, getQuery, getHeader, setHeader, setResponseStatus } from 'h3';
import {
  getUserByAuthCode,
  deleteAuthCode,
  getAuthenticatedUser,
  markUserAuthenticated
} from '~/server/utils/storage';
import { getClientIp, checkRateLimit } from '~/server/utils/rate-limit';
import { signOpenid, verifySignedToken, isTokenRevoked } from '~/server/utils/token';
import { recordCheckUsage } from '~/server/utils/usage-tracker';
import { recordCheckFailure } from '~/server/utils/check-failure-tracker';

export default eventHandler(async (event) => {
  const config = useRuntimeConfig();

  // 校验服务端配置
  if (!config.session?.secret || config.session.secret.length < 16) {
    console.error('[Auth] session.secret 配置无效或过短，Token 功能不可用');
    return {
      authenticated: false,
      error: 'server_config_error',
      message: '服务端配置错误，请联系管理员'
    };
  }

  const { authToken, siteId, token } = getQuery(event);

  // Bearer 凭证（服务端接入方集中代理用户流量时使用）：query 无 token 时从
  // Authorization 头取。网页端 SDK 全走 query + Cookie，不命中此分支，行为不变。
  let bearerToken: string | null = null;
  if (!token) {
    const authHeader = getHeader(event, 'authorization');
    if (authHeader?.startsWith('Bearer ')) {
      bearerToken = authHeader.slice('Bearer '.length).trim() || null;
    }
  }
  const tokenParam = (token as string | undefined) || bearerToken;

  // ===== 验签前置 + 限流分型（2026-08-29）=====
  // 验签是本地 HMAC（零网络成本，签名不可伪造、无枚举面），先于限流执行，据此选桶：
  //   - 签名有效 → 按 openid 限流 120/分。此前一律按 IP——接入方服务端集中代理
  //     全部用户流量（单出口 IP），全体用户共享一个桶，高峰打满 → 批量
  //     authenticated:false → 接入方前端反复弹验证码（30/分 时代已发生过一次）。
  //     真实用量 ~5 次/人/天，120/分 余量约 1000 倍；超限多为并发突发，封锁 60s 即可。
  //   - 签名无效 → 按 IP 30/分（防暴力探测伪造 token）
  //   - 无凭证   → 按 IP 300/分（维持原口径，主要是爬虫/探活）
  //   - 验证码认证尝试（authToken）→ 按 IP 10/分（防验证码暴力枚举，不放松）
  let resolvedOpenid: string | null = null;
  if (tokenParam) {
    resolvedOpenid = verifySignedToken(tokenParam, config.session.secret);
  }

  const isAuthAttempt = !!authToken;
  const clientIp = getClientIp(event);
  const rateLimitKey = isAuthAttempt
    ? `auth-check:${clientIp}:auth`
    : resolvedOpenid
      ? `auth-check:openid:${resolvedOpenid}`
      : tokenParam
        ? `auth-check:${clientIp}:bad-token`
        : `auth-check:${clientIp}:query`;

  const rateLimit = checkRateLimit(rateLimitKey, {
    maxAttempts: isAuthAttempt ? 10 : resolvedOpenid ? 120 : tokenParam ? 30 : 300,
    windowMs: 60 * 1000,
    // openid 桶超限多为前端并发突发（一次搜索 35+ 子请求），短封锁即可自动恢复
    blockMs: resolvedOpenid && !isAuthAttempt ? 60 * 1000 : 5 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    setHeader(event, 'Retry-After', String(rateLimit.retryAfter));
    recordCheckFailure('rate_limited');
    return {
      authenticated: false,
      error: 'rate_limited',
      message: `请求过于频繁，请 ${rateLimit.retryAfter} 秒后重试`
    };
  }

  // failureReason：本次请求的失败口径（每个失败出口只记一次，见最终 fallback 前）
  let failureReason: string | null = null;
  if (tokenParam && !resolvedOpenid) failureReason = 'token_invalid';

  // 吊销黑名单校验（2026-08-26 方案 C）：签名有效但已注销的 token 视为未认证。
  // 2026-08-29：记录 tokenRevoked 标志，最终响应返回结构化错误码 token_revoked，
  // 供接入方前端区分「token 已被吊销（登录已过期）」与普通未认证，展示过期提示
  // 并引导重新验证（客户端凭证保留不清除：蜜罐/401 分岔与吊销来源诊断都依赖它）。
  // 此处不提前 return：凭失效 token + 新验证码的重新登录仍须正常走 authToken 分支。
  let tokenRevoked = false;

  // ===== 存储层区段（全部 Turso 远程调用）=====
  // 2026-08-29 包 try/catch：此前任一次 Turso 抖动都会让异常冒泡成 500，SDK 把
  // 「服务不可用」当成「未登录」弹验证码（掉登录反馈的主要来源之一），且抛错路径
  // 不经 recordCheckFailure，失败统计对这类事故失明。现统一 503 + server_error，
  // 新 SDK 据此重试而非弹码框；验证码输入路径不受影响（code 未删，重试即可）。
  try {
    if (resolvedOpenid && tokenParam) {
      if (await isTokenRevoked(tokenParam)) {
        resolvedOpenid = null;
        tokenRevoked = true;
        failureReason = 'token_revoked';
      }
    }

    if (resolvedOpenid) {
      // 记录该 openid 的 check 调用（用量统计，内存计数不阻塞响应）
      recordCheckUsage(resolvedOpenid);

      const user = await getAuthenticatedUser(resolvedOpenid);
      if (user) {
        return {
          authenticated: true,
          token: tokenParam,
          user: {
            openid: resolvedOpenid,
            unionid: user.unionid,
            nickname: user.nickname,
            headimgurl: user.headimgurl,
            authenticatedAt: user.authenticatedAt
          }
        };
      }
      // 签名有效且未吊销，但用户记录不存在或非 active（取关/封禁/数据缺失）
      failureReason = 'user_inactive';
    }

    // 2. 检查认证码（用户输入验证码）
    if (authToken) {
      const authData = await getUserByAuthCode(authToken as string);

      if (authData) {
        // 认证成功，标记用户
        await markUserAuthenticated(authData.openid, {
          nickname: authData.nickname,
          headimgurl: authData.headimgurl,
          unionid: authData.unionid,
          siteId: siteId as string | undefined
        }, event);

        // 验证码认证也计入该 openid 的使用量（同一个人）
        recordCheckUsage(authData.openid);

        // 删除已使用的认证码
        await deleteAuthCode(authToken as string);

        // 生成签名 Token 供 SDK 存储
        const signedToken = signOpenid(authData.openid, config.session.secret);

        return {
          authenticated: true,
          token: signedToken,
          user: {
            openid: authData.openid,
            unionid: authData.unionid,
            nickname: authData.nickname,
            headimgurl: authData.headimgurl,
            authenticatedAt: new Date().toISOString()
          }
        };
      } else {
        recordCheckFailure('invalid_or_expired');
        return {
          authenticated: false,
          error: 'invalid_or_expired'
        };
      }
    }
  } catch (err) {
    console.error('[Auth] check 存储层异常（返回 503 server_error）:', err);
    recordCheckFailure('server_error');
    setResponseStatus(event, 503);
    return {
      authenticated: false,
      error: 'server_error',
      retryable: true,
      message: '登录服务暂时不可用，请稍后重试'
    };
  }

  // 3. 未提供任何认证信息（token 已被吊销时带结构化错误码，便于前端区分状态）
  // 每个失败请求在此恰记一次（成功路径均已提前 return）
  recordCheckFailure(failureReason ?? 'no_credential');
  return tokenRevoked
    ? { authenticated: false, error: 'token_revoked' }
    : { authenticated: false };
});
