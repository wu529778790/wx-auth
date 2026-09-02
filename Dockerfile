# 构建阶段
# 注意: 使用 Node 22+，满足 @libsql/client（Turso 存储层）与 Nuxt 4 运行要求
FROM node:22-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package.json package-lock.json ./
COPY wx-auth-sdk/package.json wx-auth-sdk/

# 安装依赖
RUN npm install

# 安装 SDK 子项目依赖
RUN cd wx-auth-sdk && npm install && cd ..

# 复制源代码
COPY . .

# 构建项目（包括 SDK）
RUN cd wx-auth-sdk && npm run build && cd .. && npm run build

# 运行阶段
FROM node:22-alpine AS runtime

WORKDIR /app

# 时区设置（Asia/Shanghai，保证日志时间戳为本地时区）
RUN apk add --no-cache tzdata \
    && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo "Asia/Shanghai" > /etc/timezone

ENV TZ=Asia/Shanghai

# 复制构建产物
COPY --from=builder /app/.output /app/.output
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/package-lock.json /app/package-lock.json

# 安装生产依赖（仅运行时需要）
RUN npm install --production

# 创建数据目录
RUN mkdir -p /app/data

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# 启动命令
CMD [ "node", ".output/server/index.mjs" ]
