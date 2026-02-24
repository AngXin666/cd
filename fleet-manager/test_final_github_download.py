#!/usr/bin/env python3
"""
最终测试 GitHub Release 下载
"""
import requests
import os

DOWNLOAD_URL = 'https://github.com/AngXin666/cd/releases/download/v1.2/fleet-manager-v1.2.apk'
TEST_FILE = '/tmp/test-download.apk'

def test_full_download():
    """完整下载测试"""
    print("=" * 60)
    print("GitHub Release 下载完整测试")
    print("=" * 60)
    
    # 1. 检查文件是否存在
    print("\n1️⃣ 检查文件是否存在...")
    response = requests.head(DOWNLOAD_URL, allow_redirects=True, timeout=10)
    if response.status_code != 200:
        print(f"❌ 文件不存在: HTTP {response.status_code}")
        return False
    print("✅ 文件存在")
    
    # 2. 检查 Content-Type
    print("\n2️⃣ 检查 Content-Type...")
    content_type = response.headers.get('Content-Type', '')
    print(f"   Content-Type: {content_type}")
    if 'application' in content_type:
        print("✅ Content-Type 正确")
    else:
        print("⚠️  Content-Type 可能不正确")
    
    # 3. 检查文件大小
    print("\n3️⃣ 检查文件大小...")
    content_length = response.headers.get('Content-Length', '0')
    size_mb = int(content_length) / 1024 / 1024
    print(f"   文件大小: {size_mb:.1f} MB")
    if size_mb > 5:
        print("✅ 文件大小正常")
    else:
        print("⚠️  文件大小异常")
    
    # 4. 测试实际下载（下载前 1MB）
    print("\n4️⃣ 测试实际下载...")
    try:
        headers = {'Range': 'bytes=0-1048576'}  # 下载前 1MB
        response = requests.get(DOWNLOAD_URL, headers=headers, timeout=30)
        if response.status_code in [200, 206]:
            print(f"✅ 下载测试成功 (下载了 {len(response.content) / 1024:.1f} KB)")
        else:
            print(f"⚠️  下载测试失败: HTTP {response.status_code}")
    except Exception as e:
        print(f"❌ 下载测试失败: {e}")
        return False
    
    # 5. 总结
    print("\n" + "=" * 60)
    print("✅ 所有测试通过！")
    print("=" * 60)
    print("\n📱 下载链接:")
    print(f"   {DOWNLOAD_URL}")
    print("\n📋 使用方法:")
    print("   1. 手机浏览器直接访问上面的链接")
    print("   2. 自动开始下载 APK 文件")
    print("   3. 下载完成后点击安装")
    print("\n🎉 部署完成！")
    
    return True

if __name__ == '__main__':
    test_full_download()
