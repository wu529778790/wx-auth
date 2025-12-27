// 认证状态检查 API - 极简版
// 路由: /api/auth/check

import {
  getUserByAuthCode,
  deleteAuthCode,
  isUserAuthenticated,
  getAuthenticatedUser,
  markUserAuthenticated,
  getPendingCode
} from '~/server/utils/storage';

export default defineEventHandler(async (event) => {
  const { authToken, openid, token } = getQuery(event);

  // 1. 检查 openid（已认证过的用户）
  if (openid) {
    const user = getAuthenticatedUser(openid as string);
    if (user) {
      return {
        authenticated: true,
        user: {
          openid,
          unionid: user.unionid,
          nickname: user.nickname,
          headimgurl: user.headimgurl,
          authenticatedAt: user.authenticatedAt
        }
      };
    }
  }

  // 2. 检查 token（新的待验证流程）
  if (token) {
    const pendingData = getPendingCode(token as string);

    if (pendingData) {
      // 检查是否已转换为认证码（用户已发送代码到公众号）
      const authData = getUserByAuthCode(pendingData.code);

      if (authData) {
        // 认证成功，标记用户
        markUserAuthenticated(authData.openid, {
          nickname: authData.nickname,
          headimgurl: authData.headimgurl,
          unionid: authData.unionid
        });

        // 删除已使用的认证码
        deleteAuthCode(pendingData.code);

        return {
          authenticated: true,
          user: {
            openid: authData.openid,
            unionid: authData.unionid,
            nickname: authData.nickname,
            headimgurl: authData.headimgurl,
            authenticatedAt: new Date().toISOString()
          }
        };
      }

      // 仍在等待用户发送代码
      return {
        authenticated: false,
        pendingCode: pendingData.code
      };
    }

    // token无效或已过期
    return {
      authenticated: false,
      error: 'invalid_or_expired'
    };
  }

  // 3. 检查认证码（兼容旧版）
  if (authToken) {
    const authData = getUserByAuthCode(authToken as string);

    if (authData) {
      // 认证成功，标记用户
      markUserAuthenticated(authData.openid, {
        nickname: authData.nickname,
        headimgurl: authData.headimgurl,
        unionid: authData.unionid
      });

      // 删除已使用的认证码
      deleteAuthCode(authToken as string);

      return {
        authenticated: true,
        user: {
          openid: authData.openid,
          unionid: authData.unionid,
          nickname: authData.nickname,
          headimgurl: authData.headimgurl,
          authenticatedAt: new Date().toISOString()
        }
      };
    } else {
      return {
        authenticated: false,
        error: 'invalid_or_expired'
      };
    }
  }

  // 4. 未提供任何认证信息
  return { authenticated: false };
});
