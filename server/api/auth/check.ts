// 认证状态检查 API - 极简版
// 路由: /api/auth/check

import { eventHandler, getQuery } from 'h3';
import {
  getUserByAuthCode,
  deleteAuthCode,
  isUserAuthenticated,
  getAuthenticatedUser,
  markUserAuthenticated
} from '~/server/utils/storage';

export default eventHandler(async (event) => {
  const { authToken, openid } = getQuery(event);

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

  // 2. 检查认证码（用户输入验证码）
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

  // 3. 未提供任何认证信息
  return { authenticated: false };
});
