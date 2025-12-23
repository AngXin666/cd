#!/usr/bin/env python3
"""
数据导出验证脚本
验证从 Supabase 导出的数据完整性和格式正确性

功能：
- 检查所有必需的数据文件是否存在
- 验证 JSON 格式是否正确
- 检查数据关联性（外键引用）
- 生成验证报告

使用方法：
    python validate_export.py

输出：
    验证报告（控制台输出 + validation_report.json）
"""

import os
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Set, Any


# ==================== 配置 ====================

# 导出目录
EXPORT_DIR = Path(__file__).parent.parent / "data" / "export"

# 必需的数据文件
REQUIRED_FILES = [
    "users.json",
    "warehouses.json",
    "warehouse_assignments.json",
    "attendance.json",
    "piece_work_records.json",
    "category_prices.json",
    "leave_applications.json",
    "vehicles.json",
    "notifications.json",
]

# 可选的数据文件
OPTIONAL_FILES = [
    "resignation_applications.json",
    "vehicle_documents.json",
    "piece_work_categories.json",
]


# ==================== 验证函数 ====================

def load_json_file(filepath: Path) -> tuple[Any, str]:
    """
    加载 JSON 文件
    
    Args:
        filepath: 文件路径
    
    Returns:
        tuple: (数据, 错误信息)
    """
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data, ""
    except FileNotFoundError:
        return None, f"文件不存在: {filepath}"
    except json.JSONDecodeError as e:
        return None, f"JSON 格式错误: {e}"
    except Exception as e:
        return None, f"读取失败: {e}"


def validate_file_exists(filename: str, required: bool = True) -> dict:
    """
    验证文件是否存在
    
    Args:
        filename: 文件名
        required: 是否必需
    
    Returns:
        dict: 验证结果
    """
    filepath = EXPORT_DIR / filename
    exists = filepath.exists()
    
    return {
        "file": filename,
        "exists": exists,
        "required": required,
        "status": "pass" if exists or not required else "fail",
        "message": "" if exists else ("文件不存在" if required else "可选文件不存在")
    }


def validate_json_format(filename: str) -> dict:
    """
    验证 JSON 格式
    
    Args:
        filename: 文件名
    
    Returns:
        dict: 验证结果
    """
    filepath = EXPORT_DIR / filename
    data, error = load_json_file(filepath)
    
    if error:
        return {
            "file": filename,
            "valid": False,
            "status": "fail",
            "message": error,
            "record_count": 0
        }
    
    # 检查是否为数组
    if not isinstance(data, list):
        return {
            "file": filename,
            "valid": False,
            "status": "fail",
            "message": "数据格式错误：应为数组",
            "record_count": 0
        }
    
    return {
        "file": filename,
        "valid": True,
        "status": "pass",
        "message": "",
        "record_count": len(data)
    }


def extract_ids(data: List[dict], id_field: str = "id") -> Set[str]:
    """
    提取数据中的 ID 集合
    
    Args:
        data: 数据列表
        id_field: ID 字段名
    
    Returns:
        Set[str]: ID 集合
    """
    ids = set()
    for item in data:
        if id_field in item and item[id_field]:
            ids.add(str(item[id_field]))
    return ids


def validate_foreign_keys(
    data: List[dict],
    fk_field: str,
    valid_ids: Set[str],
    table_name: str,
    ref_table: str
) -> dict:
    """
    验证外键引用
    
    Args:
        data: 数据列表
        fk_field: 外键字段名
        valid_ids: 有效的 ID 集合
        table_name: 当前表名
        ref_table: 引用表名
    
    Returns:
        dict: 验证结果
    """
    invalid_refs = []
    null_refs = 0
    valid_refs = 0
    
    for item in data:
        fk_value = item.get(fk_field)
        if fk_value is None:
            null_refs += 1
        elif str(fk_value) in valid_ids:
            valid_refs += 1
        else:
            invalid_refs.append({
                "id": item.get("id"),
                "invalid_fk": fk_value
            })
    
    return {
        "table": table_name,
        "fk_field": fk_field,
        "ref_table": ref_table,
        "valid_refs": valid_refs,
        "null_refs": null_refs,
        "invalid_refs": len(invalid_refs),
        "status": "pass" if len(invalid_refs) == 0 else "warning",
        "invalid_details": invalid_refs[:5]  # 只显示前5个
    }


def validate_data_integrity() -> dict:
    """
    验证数据完整性和关联性
    
    Returns:
        dict: 验证结果
    """
    results = {
        "file_checks": [],
        "format_checks": [],
        "fk_checks": [],
        "summary": {}
    }
    
    # 1. 检查文件存在性
    print("\n1. 检查文件存在性...")
    for filename in REQUIRED_FILES:
        result = validate_file_exists(filename, required=True)
        results["file_checks"].append(result)
        status = "✓" if result["status"] == "pass" else "✗"
        print(f"  {status} {filename}")
    
    for filename in OPTIONAL_FILES:
        result = validate_file_exists(filename, required=False)
        results["file_checks"].append(result)
        status = "✓" if result["exists"] else "○"
        print(f"  {status} {filename} (可选)")
    
    # 2. 检查 JSON 格式
    print("\n2. 检查 JSON 格式...")
    all_files = REQUIRED_FILES + OPTIONAL_FILES
    for filename in all_files:
        filepath = EXPORT_DIR / filename
        if filepath.exists():
            result = validate_json_format(filename)
            results["format_checks"].append(result)
            status = "✓" if result["status"] == "pass" else "✗"
            print(f"  {status} {filename}: {result['record_count']} 条记录")
    
    # 3. 加载数据用于外键验证
    print("\n3. 检查外键关联...")
    
    # 加载所有数据
    users_data, _ = load_json_file(EXPORT_DIR / "users.json")
    warehouses_data, _ = load_json_file(EXPORT_DIR / "warehouses.json")
    categories_data, _ = load_json_file(EXPORT_DIR / "category_prices.json")
    
    users_data = users_data or []
    warehouses_data = warehouses_data or []
    categories_data = categories_data or []
    
    # 提取 ID 集合
    user_ids = extract_ids(users_data)
    warehouse_ids = extract_ids(warehouses_data)
    category_ids = extract_ids(categories_data, "category_id")
    
    print(f"  用户 ID 数量: {len(user_ids)}")
    print(f"  仓库 ID 数量: {len(warehouse_ids)}")
    print(f"  分类 ID 数量: {len(category_ids)}")
    
    # 验证各表的外键
    fk_validations = [
        ("warehouse_assignments.json", "user_id", user_ids, "users"),
        ("warehouse_assignments.json", "warehouse_id", warehouse_ids, "warehouses"),
        ("attendance.json", "user_id", user_ids, "users"),
        ("attendance.json", "warehouse_id", warehouse_ids, "warehouses"),
        ("piece_work_records.json", "user_id", user_ids, "users"),
        ("piece_work_records.json", "warehouse_id", warehouse_ids, "warehouses"),
        ("leave_applications.json", "user_id", user_ids, "users"),
        ("leave_applications.json", "warehouse_id", warehouse_ids, "warehouses"),
        ("vehicles.json", "user_id", user_ids, "users"),
        ("notifications.json", "recipient_id", user_ids, "users"),
    ]
    
    for filename, fk_field, valid_ids, ref_table in fk_validations:
        filepath = EXPORT_DIR / filename
        if filepath.exists():
            data, _ = load_json_file(filepath)
            if data:
                result = validate_foreign_keys(
                    data, fk_field, valid_ids,
                    filename.replace(".json", ""), ref_table
                )
                results["fk_checks"].append(result)
                
                status = "✓" if result["status"] == "pass" else "⚠"
                invalid_count = result["invalid_refs"]
                if invalid_count > 0:
                    print(f"  {status} {filename}.{fk_field} -> {ref_table}: {invalid_count} 个无效引用")
                else:
                    print(f"  {status} {filename}.{fk_field} -> {ref_table}: 全部有效")
    
    # 4. 生成摘要
    # 只统计必需文件的通过情况
    required_checks = [r for r in results["file_checks"] if r["required"]]
    file_pass = sum(1 for r in required_checks if r["status"] == "pass")
    file_total = len(required_checks)
    
    format_pass = sum(1 for r in results["format_checks"] if r["status"] == "pass")
    format_total = len(results["format_checks"])
    
    fk_pass = sum(1 for r in results["fk_checks"] if r["status"] == "pass")
    fk_total = len(results["fk_checks"])
    
    total_records = sum(r["record_count"] for r in results["format_checks"])
    
    # 整体状态：必需文件全部通过且格式检查全部通过
    overall_pass = file_pass == file_total and format_pass == format_total
    
    results["summary"] = {
        "validation_time": datetime.now().isoformat(),
        "file_checks": f"{file_pass}/{file_total}",
        "format_checks": f"{format_pass}/{format_total}",
        "fk_checks": f"{fk_pass}/{fk_total}",
        "total_records": total_records,
        "overall_status": "pass" if overall_pass else "fail"
    }
    
    return results


# ==================== 主函数 ====================

def main():
    """
    主函数：执行数据验证
    """
    print("=" * 60)
    print("数据导出验证工具")
    print("=" * 60)
    
    # 检查导出目录
    if not EXPORT_DIR.exists():
        print(f"\n✗ 错误：导出目录不存在: {EXPORT_DIR}")
        print("请先运行数据导出脚本")
        sys.exit(1)
    
    print(f"\n导出目录: {EXPORT_DIR}")
    
    # 执行验证
    results = validate_data_integrity()
    
    # 保存验证报告
    report_path = EXPORT_DIR / "validation_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2, default=str)
    
    # 打印摘要
    summary = results["summary"]
    print("\n" + "=" * 60)
    print("验证完成！")
    print("=" * 60)
    print(f"  验证时间: {summary['validation_time']}")
    print(f"  文件检查: {summary['file_checks']}")
    print(f"  格式检查: {summary['format_checks']}")
    print(f"  外键检查: {summary['fk_checks']}")
    print(f"  总记录数: {summary['total_records']}")
    print(f"  整体状态: {'✓ 通过' if summary['overall_status'] == 'pass' else '✗ 失败'}")
    print(f"\n验证报告: {report_path}")
    print("=" * 60)
    
    return 0 if summary["overall_status"] == "pass" else 1


if __name__ == "__main__":
    sys.exit(main())
