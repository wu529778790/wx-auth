// 测试 API 端点 - 用于验证持久化存储
import { eventHandler, getMethod } from 'h3';
import {
  saveAuthCode,
  getUserByAuthCode,
  markUserAuthenticated,
  isUserAuthenticated,
  getAuthenticatedUser,
  getStorageStats,
  clearUserAuthentication,
  findAuthCodeByOpenid,
  deleteAuthCode
} from '~/server/utils/storage';

export default eventHandler(async (event) => {
  const method = getMethod(event);

  if (method !== 'GET' && method !== 'POST') {
    return { error: 'Method not allowed' };
  }

  try {
    // 测试数据
    const testUser = {
      openid: 'test_openid_' + Date.now(),
      nickname: '测试用户',
      headimgurl: 'https://example.com/avatar.jpg',
      unionid: 'test_unionid_' + Date.now()
    };
    const testCode = Math.random().toString().slice(2, 8);

    const results = {
      timestamp: new Date().toISOString(),
      before: getStorageStats(),
      steps: [] as any[]
    };

    // 步骤1: 保存认证码
    saveAuthCode(testCode, testUser.openid, {
      nickname: testUser.nickname,
      headimgurl: testUser.headimgurl,
      unionid: testUser.unionid
    });
    results.steps.push({
      action: 'saveAuthCode',
      code: testCode,
      openid: testUser.openid,
      success: true
    });

    // 步骤2: 查询认证码
    const userData = getUserByAuthCode(testCode);
    results.steps.push({
      action: 'getUserByAuthCode',
      code: testCode,
      result: userData ? 'found' : 'not_found',
      success: !!userData && userData.openid === testUser.openid
    });

    // 步骤3: 标记用户已认证
    markUserAuthenticated(testUser.openid, {
      nickname: testUser.nickname,
      headimgurl: testUser.headimgurl,
      unionid: testUser.unionid
    });
    results.steps.push({
      action: 'markUserAuthenticated',
      openid: testUser.openid,
      success: true
    });

    // 步骤4: 检查认证状态
    const isAuth = isUserAuthenticated(testUser.openid);
    results.steps.push({
      action: 'isUserAuthenticated',
      result: isAuth,
      success: isAuth === true
    });

    // 步骤5: 获取用户信息
    const authUser = getAuthenticatedUser(testUser.openid);
    results.steps.push({
      action: 'getAuthenticatedUser',
      result: authUser ? 'found' : 'not_found',
      success: !!authUser && authUser.openid === testUser.openid
    });

    // 步骤6: 清理测试数据
    clearUserAuthentication(testUser.openid);
    results.steps.push({
      action: 'clearUserAuthentication',
      openid: testUser.openid,
      success: true
    });

    // 最终状态
    results.after = getStorageStats();

    return {
      success: true,
      data: results,
      storageStats: getStorageStats()
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
});
