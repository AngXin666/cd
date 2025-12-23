#!/usr/bin/env python3
"""
数据迁移主脚本
整合导出、导入、验证三个步骤，实现一键数据迁移

使用方法：
    python migrate_data.py [--export-only] [--import-only] [--verify-only] [--skip-verify]

参数：
    --export-only: 只执行导出步骤
    --import-only: 只执行导入步骤（使用最新的导出文件）
    --verify-only: 只执行验证步骤
    --skip-verify: 跳过验证步骤
    --export-file: 指定导出文件路径（用于导入和验证）

环境变量：
    SUPABASE_URL: Supabase 项目 URL
    SUPABASE_SERVICE_KEY: Supabase 服务密钥
    IMPORT_DEFAULT_PASSWORD: 导入用户的默认密码（默认：123456）

输出：
    data/export/: 导出的 JSON 文件
    data/app.db: SQLite 数据库文件
    data/export/id_mapping.json: ID 映射文件
    data/export/import_report.json: 导入报告
    data/export/migration_report.json: 迁移总报告
"""

import os
import sys
import json
import argparse
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional

# 脚本目录
SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / "data"
EXPORT_DIR = DATA_DIR / "export"


def print_header(title: str):
    """打印标题"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def print_step(step: int, total: int, description: str):
    """打印步骤"""
    print(f"\n[{step}/{total}] {description}")
    print("-" * 40)


def run_script(script_name: str, args: list = None) -> tuple:
    """
    运行 Python 脚本
    
    Args:
        script_name: 脚本名称
        args: 命令行参数
    
    Returns:
        tuple: (成功标志, 输出内容)
    """
    script_path = SCRIPT_DIR / script_name
    cmd = [sys.executable, str(script_path)]
    if args:
        cmd.extend(args)
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=str(SCRIPT_DIR),
            env={**os.environ, "PYTHONPATH": str(SCRIPT_DIR.parent / "backend")}
        )
        
        # 打印输出
        if result.stdout:
            print(result.stdout)
        if result.stderr:
            print(result.stderr, file=sys.stderr)
        
        return result.returncode == 0, result.stdout + result.stderr
    except Exception as e:
        print(f"运行脚本失败: {e}")
        return False, str(e)


def find_latest_export() -> Optional[Path]:
    """查找最新的导出文件"""
    if not EXPORT_DIR.exists():
        return None
    
    export_files = list(EXPORT_DIR.glob("full_export_*.json"))
    if not export_files:
        return None
    
    return max(export_files, key=lambda p: p.stat().st_mtime)


def check_environment() -> Dict[str, bool]:
    """
    检查环境配置
    
    Returns:
        Dict: 环境检查结果
    """
    checks = {
        "supabase_url": bool(os.getenv("SUPABASE_URL")),
        "supabase_key": bool(os.getenv("SUPABASE_SERVICE_KEY")),
        "python_deps": True,
    }
    
    # 检查 Python 依赖
    try:
        import supabase
        import sqlmodel
        import passlib
    except ImportError as e:
        checks["python_deps"] = False
        print(f"缺少依赖: {e}")
    
    return checks


def save_migration_report(results: Dict[str, Any]):
    """
    保存迁移报告
    
    Args:
        results: 迁移结果
    """
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    
    report = {
        "migration_time": datetime.now().isoformat(),
        "results": results,
    }
    
    report_file = EXPORT_DIR / "migration_report.json"
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    print(f"\n迁移报告已保存到: {report_file}")


def main():
    """主函数"""
    # 解析命令行参数
    parser = argparse.ArgumentParser(description="数据迁移工具")
    parser.add_argument("--export-only", action="store_true", help="只执行导出")
    parser.add_argument("--import-only", action="store_true", help="只执行导入")
    parser.add_argument("--verify-only", action="store_true", help="只执行验证")
    parser.add_argument("--skip-verify", action="store_true", help="跳过验证")
    parser.add_argument("--export-file", type=str, help="指定导出文件路径")
    args = parser.parse_args()
    
    print_header("车队管家数据迁移工具")
    print(f"时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 确定执行步骤
    do_export = not args.import_only and not args.verify_only
    do_import = not args.export_only and not args.verify_only
    do_verify = not args.export_only and not args.import_only and not args.skip_verify
    
    if args.export_only:
        do_export = True
        do_import = False
        do_verify = False
    elif args.import_only:
        do_export = False
        do_import = True
        do_verify = not args.skip_verify
    elif args.verify_only:
        do_export = False
        do_import = False
        do_verify = True
    
    # 计算总步骤数
    total_steps = sum([do_export, do_import, do_verify])
    current_step = 0
    
    # 迁移结果
    results = {
        "export": {"status": "skipped"},
        "import": {"status": "skipped"},
        "verify": {"status": "skipped"},
    }
    
    # 检查环境
    print("\n检查环境配置...")
    env_checks = check_environment()
    
    if do_export and not env_checks["supabase_url"]:
        print("⚠ 警告: 未设置 SUPABASE_URL 环境变量")
        print("  导出步骤需要 Supabase 配置")
        if not args.import_only and not args.verify_only:
            print("  请设置环境变量后重试，或使用 --import-only 跳过导出")
            sys.exit(1)
    
    if not env_checks["python_deps"]:
        print("✗ 错误: 缺少 Python 依赖")
        print("  请运行: pip install -r ../backend/requirements.txt")
        sys.exit(1)
    
    print("✓ 环境检查通过")
    
    # 步骤 1: 导出数据
    if do_export:
        current_step += 1
        print_step(current_step, total_steps, "导出 Supabase 数据")
        
        success, output = run_script("export_supabase_data.py")
        results["export"] = {
            "status": "success" if success else "failed",
            "output": output[:1000] if output else "",
        }
        
        if not success:
            print("✗ 导出失败")
            if do_import:
                print("  无法继续导入步骤")
                save_migration_report(results)
                sys.exit(1)
    
    # 确定导出文件
    export_file = None
    if args.export_file:
        export_file = Path(args.export_file)
    else:
        export_file = find_latest_export()
    
    if (do_import or do_verify) and not export_file:
        print("✗ 错误: 未找到导出文件")
        print("  请先运行导出步骤，或使用 --export-file 指定文件")
        save_migration_report(results)
        sys.exit(1)
    
    # 步骤 2: 导入数据
    if do_import:
        current_step += 1
        print_step(current_step, total_steps, "导入数据到新系统")
        
        import_args = [str(export_file)] if export_file else []
        success, output = run_script("import_to_new_system.py", import_args)
        results["import"] = {
            "status": "success" if success else "failed",
            "export_file": str(export_file) if export_file else None,
            "output": output[:1000] if output else "",
        }
        
        if not success:
            print("✗ 导入失败")
            if do_verify:
                print("  仍将执行验证步骤以检查部分导入的数据")
    
    # 步骤 3: 验证数据
    if do_verify:
        current_step += 1
        print_step(current_step, total_steps, "验证数据完整性")
        
        verify_args = [str(export_file)] if export_file else []
        success, output = run_script("verify_migration.py", verify_args)
        results["verify"] = {
            "status": "success" if success else "failed",
            "output": output[:1000] if output else "",
        }
        
        if not success:
            print("⚠ 验证发现问题，请检查验证报告")
    
    # 保存迁移报告
    save_migration_report(results)
    
    # 输出总结
    print_header("迁移总结")
    
    all_success = True
    for step, result in results.items():
        status = result.get("status", "skipped")
        if status == "success":
            icon = "✓"
        elif status == "failed":
            icon = "✗"
            all_success = False
        else:
            icon = "-"
        
        step_name = {"export": "导出", "import": "导入", "verify": "验证"}[step]
        print(f"  {icon} {step_name}: {status}")
    
    print()
    if all_success:
        print("✓ 数据迁移成功完成！")
        print("\n下一步：")
        print("  1. 启动后端服务：")
        print("     cd ../backend && python main.py")
        print("  2. 访问 API 文档：")
        print("     http://localhost:8000/docs")
        print("  3. 使用默认账户登录：")
        print("     用户名: admin, 密码: admin123")
    else:
        print("⚠ 迁移过程中存在问题，请检查上述报告")
        sys.exit(1)


if __name__ == "__main__":
    main()
