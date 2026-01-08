#!/bin/bash
# 后端启动脚本 - 等待数据库准备就绪

set -e

echo "等待数据库准备就绪..."

# 先等待 5 秒让网络完全初始化
sleep 5

# 等待数据库可用（最多等待 60 秒）
for i in {1..60}; do
    if python -c "import psycopg2; psycopg2.connect('$DATABASE_URL')" 2>/dev/null; then
        echo "数据库连接成功！"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "错误：无法连接到数据库"
        echo "DATABASE_URL: $DATABASE_URL"
        echo "尝试 ping db..."
        ping -c 2 db || true
        echo "尝试 nslookup db..."
        nslookup db || true
        exit 1
    fi
    echo "等待数据库... ($i/60)"
    sleep 1
done

# 启动应用
echo "启动 FastAPI 应用..."
exec uvicorn main:app --host 0.0.0.0 --port 8000
