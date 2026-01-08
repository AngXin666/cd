# 车队管家前端 Dockerfile
# 多阶段构建：Node.js 构建 + Nginx 运行

# ============================================
# 阶段 1：构建阶段
# ============================================
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 设置 npm 镜像（加速国内构建）
RUN npm config set registry https://registry.npmmirror.com

# 复制依赖文件
COPY package*.json ./

# 安装依赖（强制安装，忽略平台检查）
RUN npm install --force --legacy-peer-deps

# 复制源代码
COPY . .

# 构建 H5 版本
RUN npm run build:h5 || true

# 修复资源路径（将绝对路径改为相对路径）
RUN if [ -f "dist/build/h5/index.html" ]; then \
    sed -i 's|href="/assets/|href="./assets/|g' dist/build/h5/index.html && \
    sed -i 's|src="/assets/|src="./assets/|g' dist/build/h5/index.html && \
    echo "✅ 路径修复完成"; \
    fi

# ============================================
# 阶段 2：运行阶段
# ============================================
FROM nginx:alpine

# 设置工作目录
WORKDIR /usr/share/nginx/html

# 删除默认的 nginx 静态文件
RUN rm -rf ./*

# 从构建阶段复制构建产物
COPY --from=builder /app/dist/build/h5 .

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
