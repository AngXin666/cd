#!/usr/bin/env python3
"""
Supabase 数据导出脚本
从现有 Supabase 数据库导出用户和业务数据到 JSON 文件

导出的数据表：
- users: 用户信息
- warehouses: 仓库信息
- warehouse_assignments: 用户-仓库关联
- attendance: 考勤记录
- piece_work_records: 计件记录
- piece_work_categories / category_prices: 计件分类和价格
- leave_applications: 请假申请
- vehicles: 车辆信息
- vehicle_documents: 车辆证件
- notifications: 通知消息

使用方法：
    python export_supabase_data.py

环境变量：
    SUPABASE_URL: Supabase 项目 URL
    SUPABASE_SERVICE_KEY: Supabase 服务密钥（需要有读取权限）

输出：
    data/export/: 导出的 JSON 文件目录
"""

import os
import json
import sys
from datetime import datetime
from pathlib import Path

# 添加父目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from supabase import create_client, Client
except ImportError:
    print("错误：请先安装 supabase 库")
    print("运行：pip install supabase")
    sys.exit(1)


# ==================== 配置 ====================

# Supabase 配置（从环境变量读取）
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# 导出目录
EXPORT_DIR = Path(__file__).parent.parent / "data" / "export"

# 需要导出的表
TABLES_TO_EXPORT = [
    "users",
    "warehouses", 
    "warehouse_assignments",
    "attendance",
    "piece_work_records",
    "piece_work_categories",
    "category_prices",
    "leave_applications",
    "resignation_applications",
    "vehicles",
    "vehicle_documents",
    "notifications",
]


# ==================== 工具函数 ====================

def create_supabase_client() -> Client:
    """
    创建 Supabase 客户端
    
    Returns:
        Client: Supabase 客户端实例
    
    Raises:
        ValueError: 如果环境变量未设置
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise ValueError(
            "请设置环境变量 SUPABASE_URL 和 SUPABASE_SERVICE_KEY\n"
            "例如：\n"
            "  export SUPABASE_URL='https://xxx.supabase.co'\n"
            "  export SUPABASE_SERVICE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'"
        )
    
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def export_table(client: Client, table_name: str) -> list:
    """
    导出单个表的所有数据
    
    Args:
        client: Supabase 客户端
        table_name: 表名
    
    Returns:
        list: 表中所有记录的列表
    """
    try:
        # 查询所有数据
        response = client.table(table_name).select("*").execute()
        data = response.data or []
        print(f"  ✓ {table_name}: {len(data)} 条记录")
        return data
    except Exception as e:
        print(f"  ✗ {table_name}: 导出失败 - {e}")
        return []


def save_to_json(data: dict, filename: str):
    """
    保存数据到 JSON 文件
    
    Args:
        data: 要保存的数据
        filename: 文件名
    """
    filepath = EXPORT_DIR / filename
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, default=str)
    print(f"  保存到: {filepath}")


def datetime_serializer(obj):
    """
    JSON 序列化器，处理 datetime 对象
    
    Args:
        obj: 要序列化的对象
    
    Returns:
        str: ISO 格式的日期时间字符串
    """
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


# ==================== 主函数 ====================

def main():
    """
    主函数：执行数据导出
    """
    print("=" * 60)
    print("Supabase 数据导出工具")
    print("=" * 60)
    
    # 创建导出目录
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"\n导出目录: {EXPORT_DIR}")
    
    # 创建 Supabase 客户端
    try:
        client = create_supabase_client()
        print("✓ Supabase 连接成功\n")
    except ValueError as e:
        print(f"✗ 错误: {e}")
        sys.exit(1)
    
    # 导出所有表
    print("开始导出数据...")
    all_data = {}
    total_records = 0
    
    for table_name in TABLES_TO_EXPORT:
        data = export_table(client, table_name)
        all_data[table_name] = data
        total_records += len(data)
    
    # 保存导出数据
    print("\n保存导出数据...")
    
    # 保存完整数据（所有表合并）
    export_time = datetime.now().strftime("%Y%m%d_%H%M%S")
    save_to_json(all_data, f"full_export_{export_time}.json")
    
    # 分别保存每个表
    for table_name, data in all_data.items():
        if data:  # 只保存有数据的表
            save_to_json(data, f"{table_name}.json")
    
    # 导出统计
    print("\n" + "=" * 60)
    print("导出完成！")
    print(f"  总记录数: {total_records}")
    print(f"  导出目录: {EXPORT_DIR}")
    print("=" * 60)
    
    return all_data


if __name__ == "__main__":
    main()
