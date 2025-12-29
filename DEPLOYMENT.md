# Docker 部署指南

## 🚀 快速开始

### 1. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置（必须填写）
nano .env
```

**必需配置：**
- `SITE_URL` - 网站地址（如：`https://auth.example.com`）
- `WECHAT_TOKEN` - 微信后台 Token
- `SESSION_SECRET` - Session 密钥（使用 `openssl rand -hex 32` 生成）

### 2. 启动服务

```bash
# 构建并启动
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 访问服务
# http://localhost:3000
```

---

## 📖 常用命令

| 命令 | 说明 |
|------|------|
| `docker-compose up -d` | 启动服务 |
| `docker-compose down` | 停止服务 |
| `docker-compose restart` | 重启服务 |
| `docker-compose logs -f` | 查看日志 |
| `docker-compose ps` | 查看状态 |
| `docker-compose up -d --build` | 重建镜像 |

---

## 🔄 GitHub Actions 自动发布

### 触发发布

```bash
# 创建标签
git tag v1.0.0

# 推送
git push origin v1.0.0
```

### 使用发布的镜像

```bash
# 拉取镜像
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

- `Dockerfile` - 镜像构建文件
- `docker-compose.yml` - 部署配置
- `.dockerignore` - 构建排除
- `.github/workflows/` - 自动化工作流
- `deploy.sh` - 快速部署脚本

---

## 🔧 使用部署脚本

```bash
./deploy.sh [命令]

Commands:
  dev      开发环境
  prod     生产环境
  stop     停止
  restart  重启
  logs     日志
  status   状态
  update   更新
  clean    清理
  help     帮助
```

**示例：**
```bash
./deploy.sh dev    # 开发环境
./deploy.sh logs   # 查看日志
./deploy.sh status # 查看状态
```

---

## ⚙️ 环境变量

### 必须

| 变量 | 说明 | 示例 |
|------|------|------|
| `SITE_URL` | 网站地址 | `https://auth.example.com` |
| `WECHAT_TOKEN` | 微信 Token | `your-token` |
| `SESSION_SECRET` | 密钥 | `openssl rand -hex 32` |

### 可选

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `WECHAT_NAME` | 微信公众号 | 公众号名称 |
| `WECHAT_QRCODE_URL` | - | 二维码 URL |
| `CODE_EXPIRY` | 300 | 验证码过期时间(秒) |
| `STORAGE_TYPE` | file | 存储类型(file/sqlite) |

---

## 💾 数据持久化

数据保存在 `./data/` 目录：
- `auth-data.json` - JSON 存储
- `auth.db` - SQLite 数据库（如果启用）

**备份：**
```bash
tar -czf backup.tar.gz ./data/
```

---

## 🆘 常见问题

**Q: 端口被占用？**
```bash
# 修改端口映射
# docker-compose.yml: "3001:3000"
```

**Q: 如何更新？**
```bash
docker-compose pull
docker-compose up -d --build
```

**Q: 如何清理？**
```bash
docker-compose down
rm -rf ./data
docker image prune -a
```

---

## 📚 更多文档

- [完整部署指南](./DOCKER_DEPLOYMENT.md)
- [项目说明](./README.md)
- [更新日志](./CHANGELOG.md)

---

**最后更新**: 2025-12-30
