# Docker 快速部署参考

## 🚀 5 分钟快速开始

### 方式 1: 使用部署脚本（推荐）

```bash
# 1. 下载并配置环境变量
cp .env.example .env
nano .env  # 编辑配置

# 2. 启动服务
./deploy.sh dev

# 3. 访问服务
# http://localhost:3000
```

### 方式 2: 直接使用 Docker Compose

```bash
# 1. 配置环境变量
cp .env.example .env
nano .env

# 2. 启动服务
docker-compose up -d

# 3. 查看日志
docker-compose logs -f
```

---

## 📋 部署脚本命令

```bash
./deploy.sh [命令]

命令列表:
  dev          启动开发环境
  prod         启动生产环境
  stop         停止服务
  restart      重启服务
  logs         查看日志
  update       更新到最新版本
  status       查看服务状态
  clean        清理所有数据
  help         显示帮助信息
```

**示例：**
```bash
./deploy.sh dev      # 开发环境
./deploy.sh logs     # 查看日志
./deploy.sh status   # 查看状态
```

---

## 🔄 GitHub Actions 自动发布

### 触发方式

```bash
# 创建标签并推送
git tag v1.0.0
git push origin v1.0.0
```

### 使用发布的镜像

```bash
# 从 GitHub Container Registry
docker pull ghcr.io/your-username/wx-auth:1.0.0

# 运行
docker run -d \
  --name wx-auth \
  -p 3000:3000 \
  --env-file .env \
  -v ./data:/app/data \
  ghcr.io/your-username/wx-auth:1.0.0
```

---

## 📁 文件说明

| 文件 | 说明 |
|------|------|
| `Dockerfile` | 多阶段构建的 Docker 镜像定义 |
| `docker-compose.yml` | 主配置文件（生产环境） |
| `docker-compose.override.yml` | 开发环境覆盖配置 |
| `deploy.sh` | 快速部署脚本 |
| `.dockerignore` | Docker 构建排除文件 |
| `nginx.conf` | Nginx 反向代理配置 |
| `DOCKER_DEPLOYMENT.md` | 完整部署文档 |
| `.github/workflows/` | GitHub Actions 工作流 |

---

## 🔧 常用操作

### 查看日志
```bash
./deploy.sh logs
# 或
docker-compose logs -f
```

### 重启服务
```bash
./deploy.sh restart
# 或
docker-compose restart
```

### 更新服务
```bash
./deploy.sh update
```

### 查看状态
```bash
./deploy.sh status
```

### 清理数据
```bash
./deploy.sh clean
```

---

## 📝 环境变量配置

**必须配置：**
- `SITE_URL` - 网站地址
- `WECHAT_TOKEN` - 微信 Token
- `SESSION_SECRET` - Session 密钥

**快速配置：**
```bash
cp .env.example .env
# 然后编辑 .env 文件
```

---

## 🆘 常见问题

**Q: 端口被占用？**
```bash
# 修改 docker-compose.yml
ports:
  - "3001:3000"
```

**Q: 如何重新构建？**
```bash
docker-compose up -d --build
```

**Q: 如何清理？**
```bash
./deploy.sh clean
```

---

## 📚 更多文档

- 完整部署指南: [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)
- 项目说明: [README.md](./README.md)
- 更新日志: [CHANGELOG.md](./CHANGELOG.md)

---

**最后更新**: 2025-12-30
