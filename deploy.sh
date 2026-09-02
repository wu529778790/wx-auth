#!/bin/bash

# 微信订阅号认证系统 - 快速部署脚本
# 使用方法: ./deploy.sh [dev|prod|stop|logs|update]

set -e

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 函数：显示帮助信息
show_help() {
    echo "用法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  dev          启动开发环境"
    echo "  prod         启动生产环境"
    echo "  stop         停止服务"
    echo "  restart      重启服务"
    echo "  logs         查看日志"
    echo "  update       更新到最新版本"
    echo "  status       查看服务状态"
    echo "  clean        清理所有数据"
    echo "  help         显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 dev       # 启动开发环境"
    echo "  $0 logs      # 查看实时日志"
}

# 函数：检查环境变量
check_env() {
    if [ ! -f .env ]; then
        echo -e "${YELLOW}警告: .env 文件不存在，正在从 .env.example 复制...${NC}"
        cp .env.example .env
        echo -e "${RED}请编辑 .env 文件并配置必要的环境变量！${NC}"
        echo "必需配置:"
        echo "  - SITE_URL"
        echo "  - WECHAT_TOKEN"
        echo "  - SESSION_SECRET"
        exit 1
    fi

    # 检查必需的环境变量
    local missing=()
    for var in SITE_URL WECHAT_TOKEN SESSION_SECRET; do
        if ! grep -q "^${var}=" .env || [ -z "$(grep "^${var}=" .env | cut -d'=' -f2-)" ]; then
            missing+=("$var")
        fi
    done

    if [ ${#missing[@]} -gt 0 ]; then
        echo -e "${RED}错误: 缺少必需的环境变量${NC}"
        for var in "${missing[@]}"; do
            echo "  - $var"
        done
        echo ""
        echo "请编辑 .env 文件并配置这些变量。"
        exit 1
    fi
}

# 函数：启动开发环境
start_dev() {
    echo -e "${GREEN}启动开发环境...${NC}"
    check_env

    # 检查端口是否被占用
    if netstat -tuln 2>/dev/null | grep -q ":3000 "; then
        echo -e "${YELLOW}警告: 端口 3000 已被占用${NC}"
        read -p "是否继续? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi

    docker-compose up -d
    echo -e "${GREEN}服务已启动，访问: http://localhost:3000${NC}"
    echo -e "${GREEN}查看日志: $0 logs${NC}"
}

# 函数：启动生产环境
start_prod() {
    echo -e "${GREEN}启动生产环境...${NC}"
    check_env

    # 生产环境额外检查
    if [[ "$SESSION_SECRET" == "dev-secret-change-in-production" ]]; then
        echo -e "${RED}错误: 请修改生产环境的 SESSION_SECRET！${NC}"
        exit 1
    fi

    if [[ "$SITE_URL" == "http://localhost:3000" ]]; then
        echo -e "${YELLOW}警告: 生产环境应该使用 HTTPS 域名${NC}"
    fi

    docker-compose up -d
    echo -e "${GREEN}生产环境已启动${NC}"
    echo -e "${GREEN}访问: $SITE_URL${NC}"
}

# 函数：停止服务
stop_service() {
    echo -e "${YELLOW}停止服务...${NC}"
    docker-compose down
    echo -e "${GREEN}服务已停止${NC}"
}

# 函数：重启服务
restart_service() {
    echo -e "${GREEN}重启服务...${NC}"
    docker-compose restart
    echo -e "${GREEN}服务已重启${NC}"
}

# 函数：查看日志
show_logs() {
    docker-compose logs -f --tail=100
}

# 函数：更新服务
update_service() {
    echo -e "${GREEN}更新服务...${NC}"

    # 拉取最新代码
    if [ -d .git ]; then
        echo "拉取最新代码..."
        git pull origin main
    fi

    # 拉取最新镜像
    echo "拉取最新镜像..."
    docker-compose pull

    # 重建容器
    echo "重建容器..."
    docker-compose up -d --build

    # 清理旧镜像
    echo "清理旧镜像..."
    docker image prune -f

    echo -e "${GREEN}更新完成！${NC}"
}

# 函数：查看状态
show_status() {
    echo -e "${GREEN}服务状态:${NC}"
    docker-compose ps

    echo ""
    echo -e "${GREEN}资源使用:${NC}"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

    echo ""
    echo -e "${GREEN}磁盘使用:${NC}"
    docker system df
}

# 函数：清理所有数据
clean_all() {
    echo -e "${RED}警告: 这将删除所有容器、网络和数据！${NC}"
    read -p "确定继续? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi

    echo "停止并删除容器..."
    docker-compose down

    echo "删除数据目录..."
    if [ -d ./data ]; then
        rm -rf ./data
    fi

    echo "清理无用镜像..."
    docker image prune -a -f

    echo -e "${GREEN}清理完成！${NC}"
}

# 主程序
case "$1" in
    dev)
        start_dev
        ;;
    prod)
        start_prod
        ;;
    stop)
        stop_service
        ;;
    restart)
        restart_service
        ;;
    logs)
        show_logs
        ;;
    update)
        update_service
        ;;
    status)
        show_status
        ;;
    clean)
        clean_all
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}错误: 未知命令 '$1'${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
