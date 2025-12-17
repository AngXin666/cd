# APK 热更新问题修复设计文档

## Overview

修复 APK 热更新不提示的问题。主要通过增强日志来诊断问题根因。

## 问题分析

可能原因：
1. 数据库中没有 `is_active = true` 的版本记录，或版本号 ≤ 1.2.8
2. 平台检测未正确识别为 Android
3. `isDevelopmentMode()` 在 APK 中返回 true 导致跳过检查

## 解决方案

在关键位置添加日志，帮助定位问题：
- `h5UpdateService.ts` - 添加版本查询和比较日志
- `unifiedUpdateService.ts` - 添加环境检测日志

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system.*

### Property 1: Platform Detection
*For any* environment where `window.Capacitor` exists, `getCurrentPlatform()` SHALL return `ANDROID`.
**Validates: Requirements 3.1, 3.2**

### Property 2: Environment Detection
*For any* `NODE_ENV` value, `isDevelopmentMode()` SHALL return `true` only when `NODE_ENV === 'development'`.
**Validates: Requirements 4.1, 4.3**

## Testing Strategy

在 APK 中查看控制台日志验证修复效果。

