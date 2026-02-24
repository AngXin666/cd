#!/usr/bin/env python3
"""
测试 GitHub Release 下载链接
"""
import requests

# GitHub Release 下载链接
DOWNLOAD_URL = 'https://github.com/AngXin666/cd/releases/download/v1.2/fleet-manager-v1.2.apk'

def test_download():
    """测试下载链接"""
    print("=" * 60)
    print("测试 GitHub Release 下载链接")
    print("=" * 60)
    print(f"\n📥 测试链接: {DOWNLOAD_URL}")
    
    try:
        # 发送 HEAD 请求检查文件是否存在
        print("\n🔍 检查文件是否存在...")
        response = requests.head(DOWNLOAD_URL, allow_redirects=True, timeout=10)
        
        if response.status_code == 200:
            print("✅ 文件存在！")
            
            # 获取文件信息
            content_type = response.headers.get('Content-Type', 'unknown')
            content_length = response.headers.get('Content-Length', 'unknown')
            
            print(f"\n📋 文件信息:")
            print(f"   Content-Type: {content_type}")
            if content_length != 'unknown':
                size_mb = int(content_length) / 1024 / 1024
                print(f"   文件大小: {size_mb:.1f} MB")
            
            # 检查 Content-Type 是否正确
            if 'application' in content_type or 'octet-stream' in content_type:
                print("\n✅ Content-Type 正确，Android 可以识别")
            else:
                print(f"\n⚠️  Content-Type 可能不正确: {content_type}")
            
            print(f"\n🎉 下载链接可用！")
            print(f"\n📱 手机访问此链接即可下载:")
            print(f"   {DOWNLOAD_URL}")
            
            return True
            
        elif response.status_code == 404:
            print("❌ 文件不存在 (404)")
            print("\n可能的原因:")
            print("1. Release 还未创建")
            print("2. APK 文件还未上传")
            print("3. 文件名不匹配")
            print("\n请检查 GitHub Release 页面:")
            print("https://github.com/AngXin666/cd/releases/tag/v1.2")
            return False
            
        else:
            print(f"❌ 请求失败: HTTP {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ 网络错误: {e}")
        return False

if __name__ == '__main__':
    test_download()
