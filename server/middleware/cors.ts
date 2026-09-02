// 动态 CORS 中间件 - 解决 credentials:include 与 Access-Control-Allow-Origin:* 冲突
// 浏览器规范要求：当请求携带 credentials 时，不允许使用通配符 *，必须返回具体 origin
export default defineEventHandler((event) => {
  const pathname = getRequestURL(event).pathname;

  // logout 吊销属敏感写操作（第三方页面可能借 cookie 自动附带，静默吊销用户 token）：
  // 非同源且不在部署域名父域子域白名单内的 Origin 直接 403。
  // 允许自有子域跨域——接入方页面上的「退出登录」会跨子域调用；
  // 纵深防御（body.token 必填的双提交）见 logout.post.ts。
  if (pathname === '/api/auth/logout') {
    const logoutOrigin = getRequestHeader(event, 'origin');
    if (logoutOrigin) {
      let trusted = false;
      try {
        const originHost = new URL(logoutOrigin).host;
        if (originHost === getRequestHeader(event, 'host')) {
          // 同源（含本地 dev localhost:port）
          trusted = true;
        } else {
          // 自有子域白名单：NUXT_PUBLIC_SITE_URL=https://a.example.com → 放行 *.example.com
          const siteHost = new URL(useRuntimeConfig().public.siteUrl).host;
          const parentDomain = siteHost.split('.').slice(-2).join('.');
          trusted =
            originHost === parentDomain || originHost.endsWith(`.${parentDomain}`);
        }
      } catch {
        // 非法 Origin / siteUrl 视为不可信
      }
      if (!trusted) {
        setResponseStatus(event, 403);
        return { error: 'forbidden', message: '拒绝跨域退出请求' };
      }
    }
  }

  const origin = getRequestHeader(event, 'origin')

  // 有 origin 头说明是跨域请求
  if (origin) {
    // 动态返回请求来源，效果等同于 * 但符合浏览器规范
    setResponseHeader(event, 'Access-Control-Allow-Origin', origin)
    setResponseHeader(event, 'Access-Control-Allow-Credentials', 'true')
    setResponseHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    setResponseHeader(event, 'Access-Control-Allow-Headers', 'Content-Type')
  }

  // 处理浏览器 OPTIONS 预检请求
  if (getMethod(event) === 'OPTIONS') {
    setResponseStatus(event, 204)
    return ''
  }
})
