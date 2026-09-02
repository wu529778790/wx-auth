/**
 * 微信订阅号认证 SDK - 入口文件
 *
 * 使用方法：
 *
 * 1. 引入SDK和样式
 *    import { WxAuth } from '@your-npm-package/wx-auth-sdk';
 *    import 'wx-auth-sdk/dist/wx-auth.css';
 *
 * 2. 初始化
 *    WxAuth.init({
 *      apiBase: 'https://wx-auth.shenzjd.com',
 *      onVerified: (user) => { console.log('验证通过', user); }
 *    });
 *
 * 3. 使用
 *    await WxAuth.requireAuth();
 */

// 导出核心 API
export { WxAuth } from './wx-auth';

// 导出类型
export type { WxAuthConfig } from './wx-auth';

// 导入样式（在构建时会被处理）
import './wx-auth.css';
