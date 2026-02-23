#!/usr/bin/env python3
"""
发布热更新版本 - 使用 API
"""
import requests
import json
import os
import hashlib
import subprocess

API_BASE = "http://45.197.148.64:8000/api"
WGT_FILE = "frontend/dist/build/h5/FleetManager-v1.0.12.wgt"

def get_file_md5(filepath):
    """计算文件 MD5"""
    md5 = hashlib.md5()
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b""):
            md5.update(chunk)
    return md5.hexdigest()

def upload_file_to_server(local_file, remote_path):
    """使用 scp 上传文件到服务器"""
    try:
        cmd = [
            'scp',
            '-o', 'StrictHostKeyChecking=no',
            '-o', 'UserKnownHostsFile=/dev/null',
            local_file,
            f'root@45.197.148.64:{remote_path}'
        ]
        
        # 使用 subprocess 并通过环境变量传递密码
        env = os.environ.copy()
        env['SSHPASS'] = 'Hye19911206'
        
        result = subprocess.run(
            ['sshpass', '-e'] + cmd,
            capture_output=True,
            text=True,
            env=env
        )
        
        if result.returncode == 0:
            print(f"✅ 文件上传成功: {remote_path}")
            return True
        else:
            print(f"❌ 文件上传失败: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ 上传出错: {e}")
        return False

def publish_version():
    """发布新版本"""
    try:
        # 1. 检查 wgt 文件
        if not os.path.exists(WGT_FILE):
            print(f"❌ 找不到 wgt 文件: {WGT_FILE}")
            return
        
        file_size = os.path.getsize(WGT_FILE)
        file_md5 = get_file_md5(WGT_FILE)
        
        print(f"wgt 文件信息:")
        print(f"  路径: {WGT_FILE}")
        print(f"  大小: {file_size} bytes ({file_size/1024:.1f} KB)")
        print(f"  MD5: {file_md5}")
        print()
        
        # 2. 上传 wgt 文件到服务器
        print("正在上传 wgt 文件到服务器...")
        remote_path = "/opt/fleet-manager/backend/uploads/app_updates/FleetManager-v1.0.12.wgt"
        if not upload_file_to_server(WGT_FILE, remote_path):
            return
        print()
        
        # 3. 登录获取 token
        print("正在登录...")
        login_response = requests.post(
            f"{API_BASE}/auth/login",
            json={"username": "admin", "password": "admin123"}
        )
        login_response.raise_for_status()
        token = login_response.json()["access_token"]
        print(f"✅ 登录成功")
        print()
        
        # 4. 发布新版本
        print("正在发布版本 1.0.12...")
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        version_data = {
            "version_name": "1.0.12",
            "version_code": 112,
            "platform": "android",
            "update_type": "wgt",
            "download_url": "/uploads/app_updates/FleetManager-v1.0.12.wgt",
            "file_size": file_size,
            "md5": file_md5,
            "description": "测试热更新功能 - 第二次测试",
            "is_force_update": False,
            "min_compatible_version": 100
        }
        
        publish_response = requests.post(
            f"{API_BASE}/app/version",
            headers=headers,
            json=version_data
        )
        publish_response.raise_for_status()
        
        print('✅ 版本 1.0.12 发布成功！')
        print(f'   版本号: 1.0.12 (112)')
        print(f'   更新类型: wgt (热更新)')
        print(f'   文件大小: {file_size/1024:.1f} KB')
        print(f'   下载地址: /uploads/app_updates/FleetManager-v1.0.12.wgt')
        print(f'   强制更新: 否')
        print()
        print('现在可以在手机 APP 上测试热更新了！')
        print('1. 打开 APP（版本 1.0.11）')
        print('2. 等待 2 秒或点击"检查更新"')
        print('3. 应该会提示更新到 1.0.12')
        
    except requests.exceptions.RequestException as e:
        print(f'❌ 发布失败: {e}')
        if hasattr(e, 'response') and e.response is not None:
            print(f'   错误详情: {e.response.text}')
    except Exception as e:
        print(f'❌ 发布失败: {e}')

if __name__ == '__main__':
    publish_version()
