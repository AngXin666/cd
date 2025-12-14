#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复login文件的分号问题，保持UTF-8编码
"""

import re

# 读取文件
with open('src/pages/login/index.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 需要添加分号的行（基于行号和模式）
replacements = [
    # 第68-70行：handleLoginSuccess函数中的语句
    ("removeStorageCompat('loginSourcePage')\n    removeStorageCompat('isTestLogin')", 
     "removeStorageCompat('loginSourcePage');\n    removeStorageCompat('isTestLogin');"),
    
    # 第72-74行：try-catch中的语句
    ("switchTab({url: '/pages/index/index'})\n    } catch (_e) {\n      reLaunch({url: '/pages/index/index'})",
     "switchTab({url: '/pages/index/index'});\n    } catch (_e) {\n      reLaunch({url: '/pages/index/index'});"),
]

# 应用替换
for old, new in replacements:
    content = content.replace(old, new)

# 写回文件
with open('src/pages/login/index.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ 修复完成！")
