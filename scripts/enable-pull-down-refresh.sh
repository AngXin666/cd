#!/bin/bash

# 为所有页面配置文件启用下拉刷新功能

# 需要排除的页面（登录页面不需要下拉刷新）
EXCLUDE_PAGES=(
  "src/pages/login/index.config.ts"
  "src/pages/index/index.config.ts"
  "src/pages/home/index.config.ts"
)

# 查找所有页面配置文件
find src/pages -name "index.config.ts" | while read -r config_file; do
  # 检查是否在排除列表中
  skip=false
  for exclude in "${EXCLUDE_PAGES[@]}"; do
    if [ "$config_file" = "$exclude" ]; then
      skip=true
      break
    fi
  done
  
  if [ "$skip" = true ]; then
    echo "跳过: $config_file"
    continue
  fi
  
  # 检查文件是否已经包含 enablePullDownRefresh
  if grep -q "enablePullDownRefresh" "$config_file"; then
    echo "已启用: $config_file"
  else
    echo "启用下拉刷新: $config_file"
    # 在 definePageConfig 的对象中添加 enablePullDownRefresh
    # 这里需要手动处理，因为配置文件格式可能不同
  fi
done
