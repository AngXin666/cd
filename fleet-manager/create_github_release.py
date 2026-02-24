#!/usr/bin/env python3
"""
创建 GitHub Release 并上传 APK 文件
"""
import os
import requests
import json

# GitHub 配置
GITHUB_TOKEN = os.getenv('GITHUB_TOKEN', '')  # 需要设置环境变量
REPO_OWNER = 'AngXin666'
REPO_NAME = 'cd'
TAG_NAME = 'v1.2'
RELEASE_NAME = '车队管家 v1.2'
RELEASE_BODY = '''## 车队管家 v1.2 版本

### 更新内容
- 修复 API 路径前缀问题
- 优化登录流程
- 添加用户协议和隐私政策
- 修复司机端数据刷新问题

### 安装说明
1. 下载 APK 文件
2. 允许安装未知来源应用
3. 安装并授予必要权限

### 测试账号
- 老板：admin / admin123
- 车队长：manager / manager123
- 司机：driver / driver123
'''

APK_FILE = 'fleet-manager/fleet-manager-v1.2.apk'

def create_release():
    """创建 GitHub Release"""
    if not GITHUB_TOKEN:
        print("❌ 错误：未设置 GITHUB_TOKEN 环境变量")
        print("\n请按以下步骤操作：")
        print("1. 访问 https://github.com/settings/tokens")
        print("2. 点击 'Generate new token (classic)'")
        print("3. 勾选 'repo' 权限")
        print("4. 生成 token 并复制")
        print("5. 运行: export GITHUB_TOKEN='你的token'")
        print("6. 重新运行此脚本")
        return False
    
    # 创建 Release
    url = f'https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/releases'
    headers = {
        'Authorization': f'token {GITHUB_TOKEN}',
        'Accept': 'application/vnd.github.v3+json'
    }
    data = {
        'tag_name': TAG_NAME,
        'name': RELEASE_NAME,
        'body': RELEASE_BODY,
        'draft': False,
        'prerelease': False
    }
    
    print(f"📦 正在创建 Release {TAG_NAME}...")
    response = requests.post(url, headers=headers, json=data)
    
    if response.status_code == 201:
        release_data = response.json()
        print(f"✅ Release 创建成功！")
        print(f"   URL: {release_data['html_url']}")
        
        # 上传 APK 文件
        upload_url = release_data['upload_url'].replace('{?name,label}', '')
        upload_apk(upload_url, headers)
        return True
    elif response.status_code == 422:
        print(f"⚠️  Release {TAG_NAME} 已存在，尝试获取...")
        # 获取已存在的 Release
        get_url = f'https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/releases/tags/{TAG_NAME}'
        response = requests.get(get_url, headers=headers)
        if response.status_code == 200:
            release_data = response.json()
            print(f"✅ 找到已存在的 Release")
            print(f"   URL: {release_data['html_url']}")
            upload_url = release_data['upload_url'].replace('{?name,label}', '')
            upload_apk(upload_url, headers)
            return True
    else:
        print(f"❌ 创建 Release 失败: {response.status_code}")
        print(f"   {response.text}")
        return False

def upload_apk(upload_url, headers):
    """上传 APK 文件到 Release"""
    if not os.path.exists(APK_FILE):
        print(f"❌ 错误：找不到 APK 文件 {APK_FILE}")
        return False
    
    file_size = os.path.getsize(APK_FILE)
    print(f"\n📤 正在上传 APK 文件 ({file_size / 1024 / 1024:.1f} MB)...")
    
    filename = 'fleet-manager-v1.2.apk'
    url = f'{upload_url}?name={filename}'
    
    headers_upload = headers.copy()
    headers_upload['Content-Type'] = 'application/vnd.android.package-archive'
    
    with open(APK_FILE, 'rb') as f:
        response = requests.post(url, headers=headers_upload, data=f)
    
    if response.status_code == 201:
        asset_data = response.json()
        print(f"✅ APK 上传成功！")
        print(f"   下载链接: {asset_data['browser_download_url']}")
        print(f"\n🎉 完成！现在可以使用以下链接下载：")
        print(f"   {asset_data['browser_download_url']}")
        return True
    else:
        print(f"❌ 上传 APK 失败: {response.status_code}")
        print(f"   {response.text}")
        return False

if __name__ == '__main__':
    print("=" * 60)
    print("GitHub Release 创建工具")
    print("=" * 60)
    create_release()
