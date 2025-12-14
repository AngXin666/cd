#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
全局扫描并修复项目中的编码问题
"""
import os
import re
from pathlib import Path

# 定义需要扫描的文件扩展名
EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.md', '.json']

# 定义需要排除的目录
EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', '.kiro']

# 常见的乱码模式和修复
ENCODING_FIXES = {
    # 中文乱码修复
    '环�?': '环境',
    '失�?': '失败',
    '错�?': '错误',
    '系�?': '系统',
    '请输�?': '请输入',
    '账�?': '账号',
    '支持�?': '支持',
    '密�?': '密码',
    '登�?': '登录',
    '�?位': '6位',
    '按钮�?': '按钮',
    '登录�?..': '登录中...',
    '验证码登�?': '验证码登录',
    '快速登�?': '快速登录',
    '开发测�?': '开发测试',
    '�?收起': '▲ 收起',
    '�?展开': '▼ 展开',
    '点击填充 �?': '点击填充 ▶',
    '车队长账�?': '车队长账号',
    '车队�?': '车队长',
    '使用说明�?': '使用说明：',
    '登录方式说明�?': '登录方式说明：',
    '�?密码登录': '• 密码登录',
    '�?验证码登录': '• 验证码登录',
    '验证�?': '验证码',
    '�?admin': '• admin',
    '仓库�?': '仓库',
    '司机�?': '司机',
    '管理�?': '管理',
    '车辆�?': '车辆',
    '考勤�?': '考勤',
    '请假�?': '请假',
    '计件�?': '计件',
    '统计�?': '统计',
    '通知�?': '通知',
    '权限�?': '权限',
    '用户�?': '用户',
    '数据�?': '数据',
    '信息�?': '信息',
    '状态�?': '状态',
    '操作�?': '操作',
    '查询�?': '查询',
    '添加�?': '添加',
    '删除�?': '删除',
    '修改�?': '修改',
    '更新�?': '更新',
    '保存�?': '保存',
    '取消�?': '取消',
    '确定�?': '确定',
    '提交�?': '提交',
    '审批�?': '审批',
    '通过�?': '通过',
    '拒绝�?': '拒绝',
    '成功�?': '成功',
    '详情�?': '详情',
    '列表�?': '列表',
    '搜索�?': '搜索',
    '筛选�?': '筛选',
    '排序�?': '排序',
    '导出�?': '导出',
    '导入�?': '导入',
    '打印�?': '打印',
    '刷新�?': '刷新',
    '返回�?': '返回',
    '下一步�?': '下一步',
    '上一步�?': '上一步',
    '完成�?': '完成',
    '跳过�?': '跳过',
    '重试�?': '重试',
    '关闭�?': '关闭',
    '展开�?': '展开',
    '收起�?': '收起',
    '全选�?': '全选',
    '反选�?': '反选',
    '清空�?': '清空',
    '重置�?': '重置',
    '设置�?': '设置',
    '配置�?': '配置',
    '帮助�?': '帮助',
    '关于�?': '关于',
    '退出�?': '退出',
}

def should_process_file(file_path):
    """判断文件是否需要处理"""
    # 检查扩展名
    if not any(file_path.endswith(ext) for ext in EXTENSIONS):
        return False
    
    # 检查是否在排除目录中
    path_parts = Path(file_path).parts
    if any(excluded in path_parts for excluded in EXCLUDE_DIRS):
        return False
    
    return True

def detect_encoding_issues(content):
    """检测内容中是否存在编码问题"""
    # 检查是否包含乱码字符
    if '�' in content:
        return True
    
    # 检查是否包含已知的乱码模式
    for pattern in ENCODING_FIXES.keys():
        if pattern in content:
            return True
    
    return False

def fix_encoding(content):
    """修复内容中的编码问题"""
    original_content = content
    
    # 应用所有已知的修复
    for old, new in ENCODING_FIXES.items():
        content = content.replace(old, new)
    
    return content, content != original_content

def scan_and_fix_directory(root_dir='.'):
    """扫描并修复目录中的所有文件"""
    fixed_files = []
    error_files = []
    
    print(f"🔍 开始扫描目录: {root_dir}")
    print(f"📝 扫描文件类型: {', '.join(EXTENSIONS)}")
    print(f"🚫 排除目录: {', '.join(EXCLUDE_DIRS)}")
    print("-" * 60)
    
    for root, dirs, files in os.walk(root_dir):
        # 过滤排除的目录
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        
        for file in files:
            file_path = os.path.join(root, file)
            
            if not should_process_file(file_path):
                continue
            
            try:
                # 尝试读取文件
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                # 检测编码问题
                if detect_encoding_issues(content):
                    print(f"🔧 发现编码问题: {file_path}")
                    
                    # 修复编码
                    fixed_content, was_fixed = fix_encoding(content)
                    
                    if was_fixed:
                        # 写回文件
                        with open(file_path, 'w', encoding='utf-8') as f:
                            f.write(fixed_content)
                        
                        fixed_files.append(file_path)
                        print(f"   ✅ 已修复")
                    
            except Exception as e:
                error_files.append((file_path, str(e)))
                print(f"   ❌ 错误: {e}")
    
    # 打印总结
    print("-" * 60)
    print(f"\n📊 扫描完成!")
    print(f"✅ 成功修复: {len(fixed_files)} 个文件")
    
    if fixed_files:
        print("\n修复的文件列表:")
        for file in fixed_files:
            print(f"  - {file}")
    
    if error_files:
        print(f"\n❌ 错误: {len(error_files)} 个文件")
        for file, error in error_files:
            print(f"  - {file}: {error}")
    
    if not fixed_files and not error_files:
        print("✨ 没有发现编码问题，所有文件都正常！")
    
    return fixed_files, error_files

if __name__ == '__main__':
    fixed, errors = scan_and_fix_directory('.')
    
    if errors:
        exit(1)
    else:
        exit(0)
