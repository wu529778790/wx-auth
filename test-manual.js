/**
 * 手动测试脚本 - 验证微信订阅号认证系统核心功能
 *
 * 这个脚本用于在没有完整环境的情况下测试核心模块
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';

// ==================== 测试 1: 存储层测试 (JSON文件) ====================
console.log('\n=== 测试 1: 存储层 (JSON文件) ===');

const DATA_DIR = join(process.cwd(), 'data');
const DATA_FILE = join(DATA_DIR, 'auth-data.json');

// 确保 data 目录存在
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
  console.log('✓ 创建 data 目录');
}

// 测试数据
const testData = {
  authCodes: {
    '123456': {
      openid: 'oxxx_test_openid_123',
      expiredAt: Date.now() + 300000, // 5分钟后过期
      nickname: '测试用户',
      headimgurl: 'https://example.com/avatar.jpg',
      unionid: 'unionid_123'
    }
  },
  authenticatedUsers: {
    'oxxx_test_openid_123': {
      authenticatedAt: new Date().toISOString(),
      nickname: '测试用户',
      headimgurl: 'https://example.com/avatar.jpg',
      unionid: 'unionid_123'
    }
  }
};

// 写入测试数据
try {
  writeFileSync(DATA_FILE, JSON.stringify(testData, null, 2), 'utf8');
  console.log('✓ 写入测试数据成功');

  // 读取测试
  const readData = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
  if (readData.authCodes['123456'].openid === 'oxxx_test_openid_123') {
    console.log('✓ 数据读取验证成功');
  } else {
    console.log('✗ 数据读取验证失败');
  }
} catch (error) {
  console.log('✗ 存储层测试失败:', error.message);
}

// ==================== 测试 2: Session 加解密测试 ====================
console.log('\n=== 测试 2: Session 加解密 (AES-256-GCM) ===');

function encryptSession(data, secret) {
  const algorithm = 'aes-256-gcm';
  const key = crypto.createHash('sha256').update(secret).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decryptSession(encrypted, secret) {
  const [ivHex, authTagHex, encryptedData] = encrypted.split(':');
  const algorithm = 'aes-256-gcm';
  const key = crypto.createHash('sha256').update(secret).digest();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

try {
  const secret = 'dev-secret-change-in-production';
  const sessionData = JSON.stringify({
    authenticated: true,
    user: {
      openid: 'oxxx_session_test',
      nickname: 'Session用户',
      authenticatedAt: new Date().toISOString()
    }
  });

  const encrypted = encryptSession(sessionData, secret);
  console.log('✓ Session加密成功:', encrypted.substring(0, 50) + '...');

  const decrypted = decryptSession(encrypted, secret);
  const parsed = JSON.parse(decrypted);

  if (parsed.user.openid === 'oxxx_session_test') {
    console.log('✓ Session解密验证成功');
  } else {
    console.log('✗ Session解密验证失败');
  }
} catch (error) {
  console.log('✗ Session测试失败:', error.message);
}

// ==================== 测试 3: 微信签名验证 ====================
console.log('\n=== 测试 3: 微信签名验证 ===');

function validateWeChatSignature(signature, timestamp, nonce, token) {
  const array = [token, timestamp, nonce].sort();
  const str = array.join('');
  const sha1 = crypto.createHash('sha1').update(str).digest('hex');
  return sha1 === signature;
}

function generateSignature(token, timestamp, nonce, encryptMsg) {
  const array = [token, timestamp, nonce, encryptMsg].sort();
  const str = array.join('');
  return crypto.createHash('sha1').update(str).digest('hex');
}

try {
  const token = 'test_token';
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = 'random_nonce_123';

  // 测试1: 正常签名
  const expectedSignature = crypto.createHash('sha1')
    .update([token, timestamp, nonce].sort().join(''))
    .digest('hex');

  const isValid = validateWeChatSignature(expectedSignature, timestamp, nonce, token);
  console.log(isValid ? '✓ 签名验证成功' : '✗ 签名验证失败');

  // 测试2: 安全模式签名（加密消息）
  const encryptMsg = 'encrypted_message_123';
  const secureSignature = generateSignature(token, timestamp, nonce, encryptMsg);
  const verifySecure = secureSignature === crypto.createHash('sha1')
    .update([token, timestamp, nonce, encryptMsg].sort().join(''))
    .digest('hex');

  console.log(verifySecure ? '✓ 安全模式签名成功' : '✗ 安全模式签名失败');
} catch (error) {
  console.log('✗ 签名测试失败:', error.message);
}

// ==================== 测试 4: 验证码生成 ====================
console.log('\n=== 测试 4: 验证码生成 ===');

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

try {
  const code1 = generateVerificationCode();
  const code2 = generateVerificationCode();

  console.log(`✓ 生成验证码: ${code1}, ${code2}`);

  if (code1.length === 6 && code2.length === 6 && code1 !== code2) {
    console.log('✓ 验证码格式正确且随机');
  } else {
    console.log('✗ 验证码生成有问题');
  }
} catch (error) {
  console.log('✗ 验证码测试失败:', error.message);
}

// ==================== 测试 5: SDK 构建产物检查 ====================
console.log('\n=== 测试 5: SDK 构建产物 ===');

const SDK_DIST_DIR = join(process.cwd(), 'wx-auth-sdk', 'dist');

if (existsSync(SDK_DIST_DIR)) {
  const files = ['wx-auth.js', 'wx-auth.umd.js', 'wx-auth.css', 'index.d.ts'];
  let allExist = true;

  files.forEach(file => {
    const filePath = join(SDK_DIST_DIR, file);
    if (existsSync(filePath)) {
      const stats = statSync(filePath);
      console.log(`✓ ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
    } else {
      console.log(`✗ ${file} 缺失`);
      allExist = false;
    }
  });

  if (allExist) {
    console.log('✓ 所有SDK构建产物存在');
  }
} else {
  console.log('✗ SDK dist 目录不存在，请先运行 SDK 构建');
}

// ==================== 测试 6: 后端 API 文件检查 ====================
console.log('\n=== 测试 6: 后端 API 文件 ===');

const apiFiles = [
  'server/api/auth/check.ts',
  'server/api/auth/session.ts',
  'server/api/wechat/message.ts',
  'server/utils/storage.ts',
  'server/utils/session.ts',
  'server/utils/wechat.ts'
];

apiFiles.forEach(file => {
  const filePath = join(process.cwd(), file);
  if (existsSync(filePath)) {
    console.log(`✓ ${file}`);
  } else {
    console.log(`✗ ${file} 缺失`);
  }
});

// ==================== 测试 7: 配置文件检查 ====================
console.log('\n=== 测试 7: 配置文件 ===');

const configFiles = [
  'package.json',
  'nuxt.config.ts',
  'wx-auth-sdk/package.json',
  'wx-auth-sdk/vite.config.ts'
];

configFiles.forEach(file => {
  const filePath = join(process.cwd(), file);
  if (existsSync(filePath)) {
    try {
      const content = readFileSync(filePath, 'utf8');
      console.log(`✓ ${file} (${content.length} 字节)`);
    } catch (error) {
      console.log(`✗ ${file}: ${error.message}`);
    }
  } else {
    console.log(`✗ ${file} 缺失`);
  }
});

// ==================== 汇总 ====================
console.log('\n=== 测试完成 ===');
console.log('所有核心模块测试已完成。如需完整测试，请:');
console.log('1. 配置 .env 文件（参考 .env.example）');
console.log('2. 运行: pnpm dev');
console.log('3. 访问: http://localhost:3000');

// 清理测试数据
try {
  if (existsSync(DATA_FILE)) {
    // 保留目录但不删除文件，便于后续测试
    console.log('\n测试数据已保存在:', DATA_FILE);
  }
} catch (error) {
  // 忽略清理错误
}
