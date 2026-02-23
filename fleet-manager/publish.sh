#!/bin/bash
# 发布热更新版本

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZXhwIjoxNzc0MzI0MDMxfQ.O2yiA2"

curl -X POST "http://45.197.148.64:8000/api/app/version" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "version_name": "1.0.11",
    "version_code": 111,
    "platform": "android",
    "update_type": "wgt",
    "download_url": "/uploads/app_updates/FleetManager-v1.0.11.wgt",
    "file_size": 409600,
    "md5": "c48cd21a1dae0b1fd853df08589da2bb",
    "description": "测试热更新功能",
    "is_force_update": false,
    "min_compatible_version": 100
  }'

echo ""
echo "版本发布完成！"
