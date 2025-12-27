// 内存存储 - 极简方案，无需数据库
// 数据存储在内存中，重启后丢失（适合开发/小型项目）

// 验证码存储：code -> {openid, expiredAt, userInfo}
// 用户关注公众号时生成，用户输入验证码时验证
const authCodes = new Map<string, {
  openid: string;
  expiredAt: number;
  nickname?: string;
  headimgurl?: string;
  unionid?: string;
}>();

// 已认证用户：openid -> {authenticatedAt, userInfo}
const authenticatedUsers = new Map<string, {
  authenticatedAt: string;
  nickname?: string;
  headimgurl?: string;
  unionid?: string;
}>();

// 自动清理过期数据（每分钟执行一次）
setInterval(() => {
  const now = Date.now();
  let cleanedAuth = 0;
  let cleanedUsers = 0;

  // 清理认证码
  for (const [code, data] of authCodes) {
    if (data.expiredAt < now) {
      authCodes.delete(code);
      cleanedAuth++;
    }
  }

  // 清理已认证用户（可选，如果需要限制登录时间）
  // for (const [openid, data] of authenticatedUsers) {
  //   // 可以设置用户认证有效期
  // }

  if (cleanedAuth > 0 || cleanedUsers > 0) {
    console.log(`[Storage] 清理了 ${cleanedAuth} 个过期认证码, ${cleanedUsers} 个过期用户`);
  }
}, 60 * 1000);

/**
 * 保存认证码（用户关注公众号时调用）
 */
export function saveAuthCode(
  code: string,
  openid: string,
  userInfo?: { nickname?: string; headimgurl?: string; unionid?: string }
) {
  const expiryTime = parseInt(process.env.CODE_EXPIRY || '300') * 1000;

  // 删除该用户之前的认证码（一个用户只有一个有效验证码）
  for (const [existingCode, data] of authCodes) {
    if (data.openid === openid) {
      authCodes.delete(existingCode);
    }
  }

  authCodes.set(code, {
    openid,
    expiredAt: Date.now() + expiryTime,
    ...userInfo
  });

  console.log(`[Storage] 保存认证码 ${code} 给用户 ${openid}`);
}

/**
 * 通过认证码获取用户信息
 */
export function getUserByAuthCode(code: string) {
  const data = authCodes.get(code);

  if (!data) return null;

  // 检查是否过期
  if (data.expiredAt < Date.now()) {
    authCodes.delete(code);
    return null;
  }

  return data;
}

/**
 * 删除认证码
 */
export function deleteAuthCode(code: string) {
  return authCodes.delete(code);
}

/**
 * 标记用户为已认证
 */
export function markUserAuthenticated(
  openid: string,
  userInfo: { nickname?: string; headimgurl?: string; unionid?: string }
) {
  authenticatedUsers.set(openid, {
    authenticatedAt: new Date().toISOString(),
    ...userInfo
  });

  console.log(`[Storage] 用户 ${openid} 已认证`);
}

/**
 * 检查用户是否已认证
 */
export function isUserAuthenticated(openid: string) {
  return authenticatedUsers.has(openid);
}

/**
 * 获取已认证用户信息
 */
export function getAuthenticatedUser(openid: string) {
  return authenticatedUsers.get(openid);
}

/**
 * 清除用户认证状态（登出）
 */
export function clearUserAuthentication(openid: string) {
  // 删除认证用户
  authenticatedUsers.delete(openid);

  // 删除该用户的认证码
  for (const [code, data] of authCodes) {
    if (data.openid === openid) {
      authCodes.delete(code);
    }
  }

  console.log(`[Storage] 清除用户 ${openid} 的认证状态`);
}

/**
 * 获取存储统计信息
 */
export function getStorageStats() {
  return {
    authCodes: authCodes.size,
    authenticatedUsers: authenticatedUsers.size
  };
}

/**
 * 通过openid查找认证码（用于公众号发送消息后，用户输入时）
 */
export function findAuthCodeByOpenid(openid: string): string | null {
  for (const [code, data] of authCodes) {
    if (data.openid === openid) {
      return code;
    }
  }
  return null;
}
