#!/bin/bash
# 跳过 Taro 配置验证并启动开发服务器
export TARO_DISABLE_VALIDATE=1
export NODE_ENV=development
exec taro build --type h5 --watch
