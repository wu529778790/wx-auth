/**
 * 静默拦截中间件
 *
 * 在请求到达 Nuxt/Vue Router 之前，直接关闭扫描器连接。
 * 效果：
 *   1. 消除 Vue Router 404 warn（日志噪音降低 ~96%）
 *   2. 不返回 404 响应体，避免泄露"路径不存在"信息
 *   3. 不走到 Nuxt SSR，节省渲染资源
 *
 * 设计原则：
 *   - 高危特征（RCE/穿越）→ 直接断开 TCP 连接
 *   - 已知攻击路径清单 → 空 200（让对方摸不清是拦截还是文件不存在）
 *   - 绝不拦截自身真实路径：/api/auth/*、/api/wechat/*、/api/sdk/*（白名单见 isOwnApi）
 */

// ===== 高危 → destroy()，不给任何响应 =====
const DEADLY_PATTERNS = [
  /\/vendor\/phpunit\/phpunit\/src\/Util\/PHP\/eval-stdin\.php/i,
  // 路径穿越 — URL 编码或原生
  /%2e%2e/i,
  /\/\.\.\//,
  // 反斜杠穿越 (Windows 风格) — URL 编码 %5C 和原生反斜杠
  /\.{2}%5c/i,
  /%5c\.{2}/i,
]

// ===== 敏感文件/配置窃取 → 空 200 =====
const SENSITIVE_FILE_PATTERNS = [
  /^\/\.env?(\.[a-z]+)?$/i,
  /^\/\.(npmrc|yarnrc|pypirc|pgpass|user\.ini|spring-boot-devtools\.properties)$/,
  /^\/\.(git|svn|hg)\//,
  /^\/\.(bzr|travis\.yml|drone\.yml|semaphore|buildkite|digitalocean)/,
  /^\/(__nextjs_action|_next|\.next|\.nuxt|\.output)\//,
  /\.js\.map$/,
  /^\/\.well-known\//,
]

// ===== 敏感文件名关键词匹配 =====
const SENSITIVE_NAME_PATTERNS = [
  /(config|keys|credentials|secrets|token|stripe|twilio|slack|sendgrid|webhook|pay|oauth)\.(json|ya?ml|log|txt|ini|env|cfg|conf)$/i,
  /^\/var\//,
  /^\/logs?\/(\w+\/)?(access|app|application|error)\.log$/i,
  /^\/(app|application|access|error)\.log$/i,
]

// ===== 接口字典扫描 → 空 200（精确路径，不误杀自己） =====
// 维护提示：小写即可；实际判断同时检查 Math.random 时的原值和 toLowerCase 版本
const BLOCKED_API_PATHS = new Set([
  '/api/login',
  '/api/admin',
  '/api/swagger',
  '/api/health',
  '/admin',
  '/admin.html',
  '/rest/login',
  '/rest/logout',
  '/rest/oauth1-credential/auth',
  '/rest/oauth2-credential/auth',
  '/auth/login',
  '/oauth/authorize',
  '/oauth/token',
  '/login',
  '/logout',
  // '/admin' 也在拦截之列（本应用无此页面）
  '/administrator/',
  '/administrator',
  '/phpmyadmin',
  '/phpMyAdmin',
  '/dbadmin',
  '/__debug',
  '/graphql',
  '/v1/graphql',
  '/v2/graphql',
  '/adminer.php',
  '/solr/admin',
  '/actuator',
  '/actuator/health',
  '/actuator/info',
  '/actuator/metrics',
  '/debug',
  '/debug/pprof',
  '/debug/vars',
  '/health',
  '/healthz',
  '/metrics',
  '/openapi.json',
  '/openapi.yaml',
  '/swagger',
  '/swagger-ui.html',
  '/swagger.json',
])

// ===== 服务端脚本扩展名（本 Nuxt 应用绝不会提供，100% 扫描） =====
const SCRIPT_EXT_PATTERNS = [
  /\.(php|phtml|php3|php4|php5|pht|asp|aspx|jsp|jspx|do|action|cgi|pl|py|sh|rb|cfm|cfc)$/i,
]

// ===== WordPress 路径（本应用非 WordPress） =====
const WP_PATTERNS = [
  /^\/(wp-admin|wp-content|wp-includes|wp-json|wp-login|xmlrpc\.php)/i,
]

// ===== 敏感/备份文件扩展名（应用从不提供） =====
const SENSITIVE_EXT_PATTERNS = [
  /\.(log|sqlite|sql|bak|old|swp|env\.backup|dump)$/i,
]

// ===== 密钥/凭证/基础设施披露扫描（.env 任意位置、云厂商凭证、证书、扫描器字典 token） =====
const DISCLOSURE_PATTERNS = [
  // .env 文件（任意位置，含 .env.local/.env.prod）
  /\.env(\.[a-z0-9]+)?$/i,
  // 云厂商 / 基础设施凭证目录
  /\/\.aws\//i, /\/\.azure\//i, /\/\.gcp\//i, /\/\.google\//i,
  /\/\.kube\//i, /\/\.terraform\//i, /\/\.serverless\//i,
  /\/\.amplify\//i, /\/\.github\//i, /\/\.git(\/|$)/i, /\/\.ssh\//i,
  /\/\.ebextensions\//i, /\/\.elasticbeanstalk\//i, /\/\.platform\//i,
  // 凭证 / 密钥文件扩展名
  /\/\.npmrc$/i, /\/credentials\//i, /\/secrets?\//i,
  /\.(pem|key|keystore|p12|pfx|cer|crt|ca-bundle|tfstate|tfvars)$/i,
  // 基础设施 / 扫描器字典 token（本应用绝不出现，可安全拦截）
  /\b(aws|kubernetes|k8s|serverless|helm|sendgrid|smtp|postfix|exim4?|courier|terraform|ebextensions|elasticbeanstalk|env|actuator|phpmyadmin|adminer)\b/i,
]

// ===== 业务字典扫描（contact/about/team/pricing/... 多语言） =====
const BIZ_DICT_PATTERN = /^\/(contact[a-z]*|contatt[io]s?|kontakt|get-in-touch|reach-us|sobre-nosotros|[a-z]{2}\/[a-z\-]+contact[a-z]*|about(-us)?|help|support|team|company|impressum|legal|privacy|pricing|terms|sitemap\.xml|forum|blog|\.buildkite|\.digitalocean|\.drone|\.semaphore|\.travis|\.cache|\.hg|\.svn|\.bzr|\.pypirc|\.npmrc|\.yarnrc|\.pgpass|\.user\.ini)$/i

function matchAny(path: string, patterns: RegExp[]): boolean {
  for (const re of patterns) {
    if (re.test(path)) return true
  }
  return false
}

function isOwnApi(path: string): boolean {
  // 自身真实 API，绝对不能拦截
  if (path.startsWith('/api/auth/')) return true
  if (path.startsWith('/api/wechat/')) return true
  if (path.startsWith('/api/sdk/')) return true
  // 微信验证文件 prefix 也放行
  if (path.startsWith('/MP_verify_')) return true
  return false
}

// ===== 默认拒绝（allowlist）白名单 =====
// 注意：Nuxt 3 的脚本/样式/映射资源只位于 /_nuxt/ 下，故 js/css/map 不允许在根目录出现；
//       此处仅放行图片/字体/文档类扩展名（刻意不含 .txt/.json/.yaml/.conf/.js/.css 等，避免扫描器穿透）
const GENERIC_STATIC_EXT = /\.(png|jpe?g|gif|svg|ico|webp|avif|woff2?|ttf|eot|wasm|pdf)$/i

// 仅放行"已知真实路由"，其余一律静默丢弃（扫描器无限字典的终极防线）
function isAllowed(path: string): boolean {
  // 已知页面路由
  if (path === '/sdk' || path.startsWith('/sdk/')) return true
  // Nitro 构建产物与内部错误路由（含所有 js/css/map 等资源）
  if (path.startsWith('/_nuxt/')) return true
  if (path === '/__nuxt_error') return true
  // 已知 public 静态文件（robots.txt / 微信校验文件已在 isOwnApi 放行）
  if (path === '/robots.txt') return true
  // 其它静态资源扩展名（图片/字体/文档）
  if (GENERIC_STATIC_EXT.test(path)) return true
  return false
}

export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  let path = url.pathname

  // 根路径直接放行
  if (path === '/') return

  // 自身 API / 验证文件始终放行（黑名单之前先确认是白名单）
  if (isOwnApi(path)) return

  // 0) 双斜杠畸形路径（//x.php）→ 直接断开 TCP
  const rawReqPath = (event.node.req.url || '').split('?')[0]
  if (rawReqPath.startsWith('//')) {
    event.node.res.destroy()
    return
  }

  // 1.5) 服务端脚本扩展名（.php/.asp/.jsp... 本应用绝不提供）
  if (matchAny(path, SCRIPT_EXT_PATTERNS)) {
    setResponseStatus(event, 200)
    return ''
  }

  // 1.6) WordPress 路径（本应用非 WordPress）
  if (matchAny(path, WP_PATTERNS)) {
    setResponseStatus(event, 200)
    return ''
  }

  // 1.7) /static/ 前缀（Nuxt 3 不使用该目录，全部为扫描器猜测）
  if (path.startsWith('/static/')) {
    setResponseStatus(event, 200)
    return ''
  }

  // 1.8) 非白名单的 /api/*（扫描器接口字典探测，如 /api/user/ismustmobile）
  if (path.startsWith('/api/') && !isOwnApi(path)) {
    setResponseStatus(event, 200)
    return ''
  }

  // 1.9) 敏感/备份文件扩展名（.log/.sql/.bak...）
  if (matchAny(path, SENSITIVE_EXT_PATTERNS)) {
    setResponseStatus(event, 200)
    return ''
  }

  // 1.10) 密钥/凭证/基础设施披露扫描
  if (matchAny(path, DISCLOSURE_PATTERNS)) {
    setResponseStatus(event, 200)
    return ''
  }

  // 1) 高危特征 → 直接断开 TCP
  if (matchAny(path, DEADLY_PATTERNS)) {
    event.node.res.destroy()
    return
  }

  // 2) 敏感文件名 → 空 200
  if (matchAny(path, SENSITIVE_FILE_PATTERNS) || matchAny(path, SENSITIVE_NAME_PATTERNS)) {
    setResponseStatus(event, 200)
    return ''
  }

  // 3) 精确接口/后台路径
  const lower = path.toLowerCase()
  if (BLOCKED_API_PATHS.has(lower) || BLOCKED_API_PATHS.has(path)) {
    setResponseStatus(event, 200)
    return ''
  }

  // 4) 业务字典 / 数字开头伪文章路径
  if (BIZ_DICT_PATTERN.test(path)) {
    setResponseStatus(event, 200)
    return ''
  }
  // /2024/06/... 这种日历格式
  if (/^\/\d{4}\/\d{1,2}(\/|$)/.test(path)) {
    setResponseStatus(event, 200)
    return ''
  }
  // Nuxt 生成的动态路由片段 [id] [slug]
  if (/^\/[^/]*%5B\w+%5D/.test(path)) {
    setResponseStatus(event, 200)
    return ''
  }

  // 9) 默认拒绝：仅放行已知真实路由，其余一律静默丢弃
  //    （扫描器无限字典的终极防线；新增页面/路由时需同步更新 isAllowed）
  if (!isAllowed(path)) {
    setResponseStatus(event, 200)
    return ''
  }
})
