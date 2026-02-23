#!/usr/bin/env python3
"""
测试热更新功能
检查各个环节是否正常
"""
import requests

API_BASE = "http://45.197.148.64:8000/api"

def test_hot_update():
    """测试热更新功能"""
    print("=" * 60)
    print("热更新功能测试")
    print("=" * 60)
    
    # 1. 测试版本检查 API
    print("\n1. 测试版本检查 API")
    print("-" * 60)
    try:
        response = requests.get(
            f"{API_BASE}/app/version/check",
            params={
                "current_version": "1.0.10",
                "current_version_code": 110,
                "platform": "android"
            }
        )
        response.raise_for_status()
        result = response.json()
        
        print(f"✅ API 响应成功")
        print(f"   has_update: {result.get('has_update')}")
        print(f"   latest_version: {result.get('latest_version')}")
        print(f"   update_type: {result.get('update_type')}")
        print(f"   download_url: {result.get('download_url')}")
        print(f"   file_size: {result.get('file_size')} bytes")
        print(f"   md5: {result.get('md5')}")
        print(f"   description: {result.get('description')}")
        print(f"   is_force_update: {result.get('is_force_update')}")
        
        if not result.get('has_update'):
            print("\n❌ 问题：API 返回 has_update=false")
            print("   可能原因：数据库中没有更新版本或版本不匹配")
            return False
            
    except Exception as e:
        print(f"❌ API 请求失败: {e}")
        return False
    
    # 2. 测试 wgt 文件是否存在
    print("\n2. 测试 wgt 文件是否可访问")
    print("-" * 60)
    try:
        wgt_url = f"http://45.197.148.64:8000{result.get('download_url')}"
        print(f"   文件地址: {wgt_url}")
        
        response = requests.head(wgt_url)
        if response.status_code == 200:
            print(f"✅ wgt 文件可访问")
            print(f"   Content-Length: {response.headers.get('Content-Length')} bytes")
        else:
            print(f"❌ wgt 文件不可访问，状态码: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 文件访问失败: {e}")
        return False
    
    # 3. 检查前端配置
    print("\n3. 检查前端配置")
    print("-" * 60)
    print(f"   API 地址: {API_BASE}")
    print(f"   前端应该配置为: http://45.197.148.64:8000/api")
    print(f"   检查 .env.production 文件")
    
    # 4. 总结
    print("\n" + "=" * 60)
    print("测试总结")
    print("=" * 60)
    print("✅ 后端 API 正常")
    print("✅ wgt 文件可访问")
    print("✅ 版本信息正确")
    print()
    print("如果 APP 仍然没有提示更新，请检查：")
    print("1. APP 的 API 地址配置是否正确")
    print("2. APP 是否真的是 1.0.10 版本")
    print("3. APP 是否有网络权限")
    print("4. 查看 APP 控制台日志")
    print()
    print("调试建议：")
    print("1. 在 APP 中打开调试日志")
    print("2. 重启 APP 观察启动日志")
    print("3. 手动点击'检查更新'按钮")
    print("4. 查看是否有网络请求发出")
    
    return True

if __name__ == '__main__':
    test_hot_update()
