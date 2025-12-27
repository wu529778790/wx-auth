// 内存存储 - 极简方案，无需数据库
// 数据存储在内存中，重启后丢失（适合开发/小型项目）

// 待验证代码存储：sessionToken -> {code, expiredAt}
// 用于用户访问网站时生成的临时验证码，等待用户关注公众号后发送
const pendingCodes = new Map<string, {
  code: string;
  expiredAt: number;
}>();

// 认证码存储：code -> {openid, expiredAt, userInfo}
// 用于公众号回复后，用户通过此码完成认证
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
  let cleanedPending = 0;

  // 清理待验证代码
  for (const [token, data] of pendingCodes) {
    if (data.expiredAt < now) {
      pendingCodes.delete(token);
      cleanedPending++;
    }
  }

  // 清理认证码
  for (const [code, data] of authCodes) {
    if (data.expiredAt < now) {
      authCodes.delete(code);
      cleanedAuth++;
    }
  }

  if (cleanedPending > 0 || cleanedAuth > 0) {
    console.log(`[Storage] 清理了 ${cleanedPending} 个过期待验证代码, ${cleanedAuth} 个过期认证码`);
  }
}, 60 * 1000);

/**
 * 保存认证码
 */
export function saveAuthCode(
  code: string,
  openid: string,
  userInfo?: { nickname?: string; headimgurl?: string; unionid?: string }
) {
  const expiryTime = parseInt(process.env.CODE_EXPIRY || '300') * 1000;

  // 删除该用户之前的认证码
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
    pendingCodes: pendingCodes.size,
    authCodes: authCodes.size,
    authenticatedUsers: authenticatedUsers.size
  };
}

/**
 * 保存待验证代码（用户访问网站时生成）
 */
export function savePendingCode(token: string, code: string) {
  const expiryTime = parseInt(process.env.CODE_EXPIRY || '300') * 1000;

  pendingCodes.set(token, {
    code,
    expiredAt: Date.now() + expiryTime
  });

  console.log(`[Storage] 保存待验证代码 ${code} 对应 token ${token}`);
}

/**
 * 通过token获取待验证代码
 */
export function getPendingCode(token: string) {
  const data = pendingCodes.get(token);

  if (!data) return null;

  // 检查是否过期
  if (data.expiredAt < Date.now()) {
    pendingCodes.delete(token);
    return null;
  }

  return data;
}

/**
 * 删除待验证代码
 */
export function deletePendingCode(token: string) {
  return pendingCodes.delete(token);
}

/**
 * 通过待验证代码查找token（用于公众号消息处理）
 */
export function findTokenByPendingCode(code: string): string | null {
  for (const [token, data] of pendingCodes) {
    if (data.code === code) {
      return token;
    }
  }
  return null;
}

/**
 * 将待验证代码转换为认证码（用户关注并发送代码后调用）
 */
export function convertPendingToAuthCode(token: string, openid: string, userInfo?: { nickname?: string; headimgurl?: string; unionid?: string }) {
  const pendingData = getPendingCode(token);

  if (!pendingData) {
    return null;
  }

  // 保存为认证码
  saveAuthCode(pendingData.code, openid, userInfo);

  // 删除待验证代码
  deletePendingCode(token);

  console.log(`[Storage] 待验证代码 ${pendingData.code} 已转换为认证码`);
  return pendingData.code;
}
