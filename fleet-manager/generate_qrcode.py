#!/usr/bin/env python3
"""
生成下载链接的二维码
"""
try:
    import qrcode
    HAS_QRCODE = True
except ImportError:
    HAS_QRCODE = False
    print("⚠️  未安装 qrcode 库")
    print("   安装命令: pip3 install qrcode[pil]")

DOWNLOAD_URL = 'https://github.com/AngXin666/cd/releases/download/v1.2/fleet-manager-v1.2.apk'

def generate_qrcode():
    """生成二维码"""
    if not HAS_QRCODE:
        print("\n📱 请手动访问下载链接:")
        print(f"   {DOWNLOAD_URL}")
        return
    
    print("=" * 60)
    print("生成下载二维码")
    print("=" * 60)
    print(f"\n📥 下载链接: {DOWNLOAD_URL}")
    
    # 生成二维码
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(DOWNLOAD_URL)
    qr.make(fit=True)
    
    # 保存为图片
    img = qr.make_image(fill_color="black", back_color="white")
    output_file = 'fleet-manager/download-qrcode.png'
    img.save(output_file)
    
    print(f"\n✅ 二维码已生成: {output_file}")
    print("\n📱 使用方法:")
    print("   1. 用手机扫描二维码")
    print("   2. 自动跳转到下载页面")
    print("   3. 点击下载并安装")
    
    # 在终端显示二维码（可选）
    print("\n" + "=" * 60)
    print("终端二维码（手机扫描）:")
    print("=" * 60)
    qr.print_ascii(invert=True)

if __name__ == '__main__':
    generate_qrcode()
