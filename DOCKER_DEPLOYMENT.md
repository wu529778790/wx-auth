# Docker 部署指南

微信订阅号认证系统的完整 Docker 化部署方案，支持本地开发、生产部署和 CI/CD 自动化发布。

---

## 快速开始

### 1. 本地开发

```bash
# 1. 复制环境变量
cp .env.example .env

# 2. 编辑环境变量（必须配置）
nano .env
# 修改以下变量：
# - SITE_URL=https://your-site.com
# - WECHAT_TOKEN=your-wechat-token
# - SESSION_SECRET=your-secret-key

# 3. 启动服务
docker-compose up -d

# 4. 查看日志
docker-compose logs -f wx-auth

# 5. 访问服务
# http://localhost:3000
```

### 2. 生产部署

```bash
# 1. 克隆仓库
git clone https://github.com/your-username/wx-auth.git
cd wx-auth

# 2. 配置环境变量
cp .env.example .env
nano .env  # 修改为生产配置

# 3. 启动服务
docker-compose up -d

# 4. 查看状态
docker-compose ps

# 5. 查看日志
docker-compose logs -f
```

---

## GitHub Actions 自动发布

### 触发条件

**方式 1：创建 Git Tag（推荐）**

```bash
# 1. 确保代码已提交
git add .
git commit -m "feat: 发布 v1.0.0"
git push origin main

# 2. 创建标签
git tag v1.0.0

# 3. 推送标签
git push origin v1.0.0
```

**方式 2：手动触发**

在 GitHub 仓库页面：
- 进入 **Actions** 标签页
- 选择 **Build and Publish Docker Image** 或 **Build and Publish to Docker Hub**
- 点击 **Run workflow**

### 发布流程

```
开发完成
   ↓
创建 Tag (v1.0.0)
   ↓
GitHub Actions 自动触发
   ↓
构建 Docker 镜像 (支持 amd64 + arm64)
   ↓
推送到容器仓库
   ↓
完成通知
```

### 使用发布的镜像

**从 GitHub Container Registry 拉取：**

```bash
# 拉取镜像（替换 your-username）
docker pull ghcr.io/your-username/wx-auth:1.0.0

# 运行容器
docker run -d \
  --name wx-auth \
  -p 3000:3000 \
  -e SITE_URL=https://auth.example.com \
  -e WECHAT_TOKEN=your-token \
  -e SESSION_SECRET=your-secret \
  -v ./data:/app/data \
  ghcr.io/your-username/wx-auth:1.0.0
```

**从 Docker Hub 拉取：**

```bash
# 拉取镜像
docker pull yourusername/wx-auth-system:1.0.0

# 运行容器
docker run -d \
  --name wx-auth \
  -p 3000:3000 \
  --env-file .env \
  -v ./data:/app/data \
  yourusername/wx-auth-system:1.0.0
```

---

## 环境变量配置

### 必须配置

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `SITE_URL` | 网站地址（微信回调用） | `https://auth.example.com` |
| `WECHAT_TOKEN` | 微信后台 Token | `your-wechat-token` |
| `SESSION_SECRET` | Session 密钥 | `openssl rand -hex 32` 生成 |

**生成 Session 密钥：**
```bash
# Linux/macOS
openssl rand -hex 32

# Windows (PowerShell)
openssl rand -hex 32
```

### 可选配置

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `WECHAT_NAME` | 公众号名称 | `微信公众号` |
| `WECHAT_QRCODE_URL` | 二维码 URL | 空 |
| `WECHAT_AES_KEY` | 安全模式密钥 | 空 |
| `CODE_EXPIRY` | 验证码过期时间（秒） | `300` (5分钟) |
| `KEYWORDS` | 触发关键词 | `["验证码"]` |
| `STORAGE_TYPE` | 存储类型 | `file` |
| `POLL_INTERVAL` | 轮询间隔（毫秒） | `3000` (3秒) |
| `POLL_TIMEOUT` | 轮询超时（毫秒） | `300000` (5分钟) |

---

## 常用命令

### Docker Compose

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f

# 查看状态
docker-compose ps

# 重建镜像（代码更新后）
docker-compose up -d --build

# 更新到新版本
docker-compose pull
docker-compose up -d --build

# 查看服务资源使用
docker-compose top
```

### Docker 命令

```bash
# 查看所有容器
docker ps

# 查看所有镜像
docker images

# 查看特定容器日志
docker logs wx-auth-system

# 进入容器调试
docker exec -it wx-auth-system sh

# 重启容器
docker restart wx-auth-system

# 删除容器
docker rm -f wx-auth-system

# 清理无用镜像
docker image prune -a

# 查看容器详细信息
docker inspect wx-auth-system

# 查看资源使用
docker stats
```

---

## 高级配置

### 1. 使用 Nginx 反向代理

**步骤：**

1. 创建 `nginx.conf`（见下方配置）
2. 在 `docker-compose.yml` 中取消 nginx 服务注释
3. 创建 SSL 证书目录：
   ```bash
   mkdir -p ssl
   # 将证书放入 ssl/ 目录
   ```
4. 重启服务：
   ```bash
   docker-compose up -d
   ```

### 2. HTTPS 配置

```bash
# 1. 准备证书
mkdir -p ssl
# 将证书放入 ssl/ 目录：
# - fullchain.pem
# - privkey.pem

# 2. 修改 nginx.conf
# listen 443 ssl http2;
# ssl_certificate /etc/nginx/ssl/fullchain.pem;
# ssl_certificate_key /etc/nginx/ssl/privkey.pem;

# 3. 重启服务
docker-compose up -d
```

### 3. 数据持久化与备份

```bash
# 数据目录结构
./data/
├── auth-data.json    # JSON 存储
└── auth.db           # SQLite 数据库（如果使用 SQLite）

# 备份数据
tar -czf backup-$(date +%Y%m%d).tar.gz ./data/

# 恢复数据
tar -xzf backup-20251230.tar.gz -C ./

# 只备份数据文件
cp -r ./data ./data-backup-$(date +%Y%m%d)
```

### 4. 使用 SQLite 存储

在 `.env` 中添加：
```env
STORAGE_TYPE=sqlite
```

SQLite 数据库文件将保存在 `./data/auth.db`

---

## 监控与维护

### 资源监控

```bash
# 实时查看 CPU 和内存使用
docker stats

# 查看磁盘使用
docker system df

# 查看容器详细信息
docker inspect wx-auth-system
```

### 日志管理

```bash
# 实时日志（最后 100 行）
docker-compose logs -f --tail=100 wx-auth

# 查看最近 1000 行
docker-compose logs --tail=1000 wx-auth

# 按时间过滤
docker-compose logs --since 2025-12-30T00:00:00

# 查看错误日志
docker-compose logs --tail=50 wx-auth 2>&1 | grep -i error
```

### 更新策略

```bash
# 1. 拉取新代码
git pull origin main

# 2. 拉取新镜像（如果使用预构建镜像）
docker-compose pull

# 3. 重建容器
docker-compose up -d --build

# 4. 清理旧镜像
docker image prune -f

# 5. 验证服务
docker-compose ps
curl http://localhost:3000
```

---

## 故障排查

### 问题：容器启动失败

```bash
# 1. 查看日志
docker-compose logs wx-auth

# 2. 检查环境变量
docker exec wx-auth-system env

# 3. 进入容器调试
docker exec -it wx-auth-system sh

# 4. 检查端口占用
netstat -tlnp | grep 3000
```

### 问题：端口被占用

```bash
# 查看端口占用
netstat -tlnp | grep 3000

# 或使用 docker-compose 修改端口
# 在 docker-compose.yml 中修改：
# ports:
#   - "3001:3000"
```

### 问题：数据目录权限不足

```bash
# 检查权限
ls -la ./data/

# 修复权限
chmod 777 ./data/

# 或在 docker-compose 中指定用户
# user: "1000:1000"
```

### 问题：微信回调失败

```bash
# 1. 检查 SITE_URL 配置
echo $SITE_URL

# 2. 检查容器网络
docker exec wx-auth-system wget -qO- http://localhost:3000

# 3. 检查微信后台配置
# - URL 必须是 HTTPS
# - Token 必须一致
```

### 问题：镜像构建失败

```bash
# 1. 清理缓存
docker system prune -a

# 2. 重新构建
docker-compose build --no-cache

# 3. 查看构建日志
docker build . 2>&1 | tee build.log
```

---

## CI/CD 配置

### GitHub Secrets 配置

在 GitHub 仓库设置中添加以下 Secrets：

**路径：** Settings → Secrets and variables → Actions → New repository secret

| Secret 名称 | 说明 | 获取方式 |
|-------------|------|----------|
| `GITHUB_TOKEN` | 自动创建 | 无需手动配置 |
| `DOCKERHUB_USERNAME` | Docker Hub 用户名 | Docker Hub 账户名 |
| `DOCKERHUB_TOKEN` | Docker Hub Token | Docker Hub → Security → New Access Token |

### Docker Hub Token 获取

1. 登录 [Docker Hub](https://hub.docker.com)
2. 进入 **Account Settings** → **Security**
3. 点击 **New Access Token**
4. 输入描述，点击 **Generate**
5. **复制 Token 并立即保存**（只显示一次）
6. 添加到 GitHub Secrets

### GitHub Secrets 设置示例

```
Secret name: DOCKERHUB_USERNAME
Value: yourusername

Secret name: DOCKERHUB_TOKEN
Value: dckr_pat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 版本管理

### 语义化版本规范

```
v1.0.0
└─┬──┘
  │
  └── 主版本.次版本.修订版本

- 主版本 (1)：重大变更，不兼容旧版本
- 次版本 (0)：新增功能，向下兼容
- 修订版本 (0)：Bug 修复，向下兼容
```

### 发布流程

```bash
# 1. 测试完成，切换到 main 分支
git checkout main
git pull

# 2. 更新版本号（在 package.json 中）
# 手动修改版本号为 1.0.0

# 3. 提交版本更新
git add package.json
git commit -m "chore: bump version to v1.0.0"

# 4. 创建 Tag
git tag v1.0.0

# 5. 推送
git push origin main
git push origin v1.0.0

# 6. GitHub Actions 自动构建并发布镜像
# 等待 5-10 分钟，查看 Actions 页面
```

### 版本回滚

```bash
# 如果新版本有问题，可以快速回滚到旧版本

# 1. 拉取旧版本镜像
docker pull ghcr.io/your-username/wx-auth:0.9.0

# 2. 停止当前服务
docker-compose down

# 3. 修改 docker-compose.yml 使用旧版本
# image: ghcr.io/your-username/wx-auth:0.9.0

# 4. 重新启动
docker-compose up -d
```

---

## 性能优化

### 镜像优化

- ✅ **多阶段构建** - 减少最终镜像大小
- ✅ **Alpine 基础镜像** - 体积小，安全性高
- ✅ **Buildx 缓存** - 加速后续构建
- ✅ **生产依赖分离** - 只安装运行时必需的包

### 运行优化

```yaml
# docker-compose.yml 中的资源限制
deploy:
  resources:
    limits:
      memory: 1G      # 最大内存
      cpus: '0.5'     # CPU 限制
    reservations:
      memory: 256M    # 保留内存
      cpus: '0.25'    # 保留 CPU
```

### Nuxt 优化

```bash
# 在 .env 中
NODE_ENV=production
```

---

## 安全建议

### 1. 环境变量安全

- ❌ **不要**将 `.env` 提交到 Git
- ✅ **使用** `.env.example` 作为模板
- ✅ **生产环境**使用 Docker Secrets 或 K8s Secrets

### 2. Session 密钥

- 生产环境必须使用随机字符串
- 生成命令：`openssl rand -hex 32`
- 不要使用硬编码的默认值

### 3. HTTPS 强制

- 生产环境必须使用 HTTPS
- 微信公众号要求 HTTPS 回调地址
- 使用 Let's Encrypt 免费证书

### 4. 容器安全

```bash
# 非 root 用户运行（可选）
# 在 Dockerfile 中添加：
# RUN addgroup -g 1000 -S nodejs
# RUN adduser -S nodejs -u 1000
# USER nodejs
```

### 5. 定期更新

```bash
# 更新基础镜像
docker pull node:20-alpine
docker-compose build --no-cache

# 检查安全漏洞
docker scan your-image-name
```

---

## 常见问题 FAQ

### Q1: 如何查看当前运行的版本？

```bash
docker exec wx-auth-system cat /app/package.json | grep version
```

### Q2: 如何手动触发重新认证？

在浏览器中：
1. 打开开发者工具
2. 删除 Cookie `wxauth-openid`
3. 刷新页面

### Q3: 如何扩展到多台服务器？

使用 Docker Registry：
```bash
# 在服务器 A 上
docker tag wx-auth your-registry/wx-auth:v1.0.0
docker push your-registry/wx-auth:v1.0.0

# 在服务器 B 上
docker pull your-registry/wx-auth:v1.0.0
docker-compose up -d
```

### Q4: 如何监控服务健康？

```bash
# 健康检查端点（如果配置）
curl http://localhost:3000/health

# Docker 自动健康检查
docker inspect --format='{{.State.Health.Status}}' wx-auth-system
```

### Q5: 如何清理磁盘空间？

```bash
# 清理未使用的镜像、容器、网络
docker system prune -a

# 只清理停止的容器
docker container prune

# 只清理未使用的镜像
docker image prune -a
```

---

## 相关文档

- [项目 README](./README.md) - 项目概述和功能说明
- [SDK 文档](./wx-auth-sdk/src/protection.md) - SDK 保护模块文档
- [更新日志](./CHANGELOG.md) - 版本更新记录
- [CLAUDE.md](./CLAUDE.md) - 项目架构说明

---

## 支持与反馈

如有问题或建议，请通过以下方式联系：

- 提交 Issue 到 GitHub 仓库
- 查看 GitHub Discussions
- 阅读项目文档

---

**最后更新**: 2025-12-30
**版本**: v1.0.0
**维护者**: 微信订阅号认证系统团队
