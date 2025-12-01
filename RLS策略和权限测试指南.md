# RLS 策略和权限测试指南

## 概述
本文档提供了全面测试 RLS（Row Level Security）策略和权限映射表的指南。

## 测试文件说明

### 1. 测试所有RLS策略和权限.sql
**用途**: 全面测试所有 RLS 策略和权限映射表

**测试内容**:
- 检查所有表的 RLS 状态
- 检查所有表的 RLS 策略
- 检查辅助函数
- 测试用户和角色数据
- 测试权限函数
- 测试数据访问权限
- 检查 profiles 视图
- 生成总结报告

**执行方式**:
```bash
# 在 Supabase SQL Editor 中执行
psql -h <host> -U <user> -d <database> -f 测试所有RLS策略和权限.sql
```

### 2. 权限矩阵测试.sql
**用途**: 详细测试每个角色对每个表的权限

**测试内容**:
- users 表权限矩阵
- user_roles 表权限矩阵
- warehouses 表权限矩阵
- warehouse_assignments 表权限矩阵
- vehicles 表权限矩阵
- attendance 表权限矩阵
- leave_requests 表权限矩阵
- piecework_records 表权限矩阵
- notifications 表权限矩阵
- 权限问题检测
- 总结报告

**执行方式**:
```bash
# 在 Supabase SQL Editor 中执行
psql -h <host> -U <user> -d <database> -f 权限矩阵测试.sql
```

## 权限矩阵

### 符号说明
- ✓ = 有权限
- ✗ = 无权限
- ⊙ = 部分权限（只能访问自己的数据或有管辖权的数据）

### 角色说明
- **BOSS**: 老板，拥有最高权限
- **PEER_ADMIN**: 平级管理员，与老板同级
- **MANAGER**: 车队长，管理司机和车辆
- **DRIVER**: 司机，基础用户

### 详细权限矩阵

#### 1. users 表
| 角色 | SELECT | INSERT | UPDATE | DELETE | 说明 |
|------|--------|--------|--------|--------|------|
| BOSS | ✓ | ✓ | ✓ | ✓ | 完全权限 |
| PEER_ADMIN | ✓ | ✓ | ✓ | ✓ | 完全权限 |
| MANAGER | ✓ | ✗ | ⊙ | ✗ | 可查看所有，只能更新自己 |
| DRIVER | ⊙ | ✗ | ⊙ | ✗ | 只能访问自己 |

#### 2. user_roles 表
| 角色 | SELECT | INSERT | UPDATE | DELETE | 说明 |
|------|--------|--------|--------|--------|------|
| BOSS | ✓ | ✓ | ✓ | ✓ | 完全权限 |
| PEER_ADMIN | ✓ | ✓ | ✓ | ✓ | 完全权限 |
| MANAGER | ✓ | ✗ | ✗ | ✗ | 只读 |
| DRIVER | ⊙ | ✗ | ✗ | ✗ | 只能查看自己 |

#### 3. warehouses 表
| 角色 | SELECT | INSERT | UPDATE | DELETE | 说明 |
|------|--------|--------|--------|--------|------|
| BOSS | ✓ | ✓ | ✓ | ✓ | 完全权限 |
| PEER_ADMIN | ✓ | ✓ | ✓ | ✓ | 完全权限 |
| MANAGER | ⊙ | ✗ | ⊙ | ✗ | 只能访问管辖的仓库 |
| DRIVER | ⊙ | ✗ | ✗ | ✗ | 只能查看分配的仓库 |

#### 4. warehouse_assignments 表
| 角色 | SELECT | INSERT | UPDATE | DELETE | 说明 |
|------|--------|--------|--------|--------|------|
| BOSS | ✓ | ✓ | ✓ | ✓ | 完全权限 |
| PEER_ADMIN | ✓ | ✓ | ✓ | ✓ | 完全权限 |
| MANAGER | ⊙ | ✗ | ✗ | ✗ | 只能查看相关分配 |
| DRIVER | ⊙ | ✗ | ✗ | ✗ | 只能查看自己的分配 |

#### 5. vehicles 表
| 角色 | SELECT | INSERT | UPDATE | DELETE | 说明 |
|------|--------|--------|--------|--------|------|
| BOSS | ✓ | ✓ | ✓ | ✓ | 完全权限 |
| PEER_ADMIN | ✓ | ✓ | ✓ | ✓ | 完全权限 |
| MANAGER | ✓ | ✗ | ⊙ | ✗ | 可查看所有，只能更新审核 |
| DRIVER | ⊙ | ✗ | ⊙ | ✗ | 只能访问自己的车辆 |

#### 6. attendance 表
| 角色 | SELECT | INSERT | UPDATE | DELETE | 说明 |
|------|--------|--------|--------|--------|------|
| BOSS | ✓ | ✓ | ✓ | ✓ | 完全权限 |
| PEER_ADMIN | ✓ | ✓ | ✓ | ✓ | 完全权限 |
| MANAGER | ⊙ | ⊙ | ⊙ | ⊙ | 管辖范围内的考勤 |
| DRIVER | ⊙ | ⊙ | ⊙ | ⊙ | 只能访问自己的考勤 |

#### 7. leave_requests 表
| 角色 | SELECT | INSERT | UPDATE | DELETE | 说明 |
|------|--------|--------|--------|--------|------|
| BOSS | ✓ | ✓ | ✓ | ✓ | 完全权限 |
| PEER_ADMIN | ✓ | ✓ | ✓ | ✓ | 完全权限 |
| MANAGER | ⊙ | ✗ | ⊙ | ✗ | 管辖范围内的请假 |
| DRIVER | ⊙ | ⊙ | ⊙ | ⊙ | 只能访问自己的请假 |

#### 8. piecework_records 表
| 角色 | SELECT | INSERT | UPDATE | DELETE | 说明 |
|------|--------|--------|--------|--------|------|
| BOSS | ✓ | ✓ | ✓ | ✓ | 完全权限 |
| PEER_ADMIN | ✓ | ✓ | ✓ | ✓ | 完全权限 |
| MANAGER | ⊙ | ⊙ | ⊙ | ⊙ | 管辖范围内的计件 |
| DRIVER | ⊙ | ⊙ | ⊙ | ⊙ | 只能访问自己的计件 |

#### 9. notifications 表
| 角色 | SELECT | INSERT | UPDATE | DELETE | 说明 |
|------|--------|--------|--------|--------|------|
| BOSS | ✓ | ✓ | ✓ | ✓ | 完全权限 |
| PEER_ADMIN | ✓ | ✓ | ✓ | ✓ | 完全权限 |
| MANAGER | ✓ | ✓ | ✓ | ✓ | 完全权限（用于发送通知） |
| DRIVER | ⊙ | ✗ | ⊙ | ⊙ | 只能访问自己的通知 |

## 测试步骤

### 步骤 1: 准备测试环境
1. 确保有测试用户（BOSS、MANAGER、DRIVER）
2. 确保有测试数据（仓库、车辆等）
3. 备份数据库（可选）

### 步骤 2: 执行全面测试
```sql
-- 在 Supabase SQL Editor 中执行
\i 测试所有RLS策略和权限.sql
```

**预期输出**:
- 所有表的 RLS 状态
- 所有表的 RLS 策略列表
- 辅助函数列表
- 用户和角色统计
- 权限函数测试结果
- 数据访问权限测试结果
- profiles 视图信息
- 总结报告

### 步骤 3: 执行权限矩阵测试
```sql
-- 在 Supabase SQL Editor 中执行
\i 权限矩阵测试.sql
```

**预期输出**:
- 每个表的权限矩阵
- 权限问题检测结果
- 总结报告

### 步骤 4: 分析测试结果
检查以下关键指标：
1. ✅ 所有核心表都启用了 RLS
2. ✅ 所有 UPDATE 策略都有 WITH CHECK 子句
3. ✅ 权限函数返回正确的结果
4. ✅ 数据访问权限符合预期

## 常见问题排查

### 问题 1: 表未启用 RLS
**症状**: 测试显示某些表的 `rowsecurity` 为 `false`

**解决方法**:
```sql
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;
```

### 问题 2: UPDATE 策略缺少 WITH CHECK 子句
**症状**: 测试显示某些 UPDATE 策略没有 WITH CHECK

**解决方法**:
```sql
-- 删除旧策略
DROP POLICY IF EXISTS "<policy_name>" ON <table_name>;

-- 创建新策略（包含 WITH CHECK）
CREATE POLICY "<policy_name>" ON <table_name>
  FOR UPDATE
  TO authenticated
  USING (<condition>)
  WITH CHECK (<condition>);
```

### 问题 3: 权限函数返回错误结果
**症状**: `is_admin()` 或 `get_user_role()` 返回错误

**解决方法**:
1. 检查 `user_roles` 表数据
   ```sql
   SELECT * FROM user_roles WHERE user_id = '<user_id>';
   ```

2. 重新创建函数
   ```sql
   -- 参考 99999_fix_notification_rls_final.sql
   ```

### 问题 4: 数据访问权限测试失败
**症状**: 无法创建或更新测试数据

**解决方法**:
1. 检查当前用户角色
   ```sql
   SELECT * FROM user_roles WHERE user_id = auth.uid();
   ```

2. 检查 RLS 策略
   ```sql
   SELECT * FROM pg_policies WHERE tablename = '<table_name>';
   ```

3. 临时禁用 RLS 进行测试（仅用于调试）
   ```sql
   ALTER TABLE <table_name> DISABLE ROW LEVEL SECURITY;
   -- 测试
   ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;
   ```

## 测试清单

### 基础检查
- [ ] 所有核心表都存在
- [ ] 所有核心表都启用了 RLS
- [ ] 所有表都有至少一个 RLS 策略
- [ ] 所有 UPDATE 策略都有 WITH CHECK 子句

### 函数检查
- [ ] `is_admin()` 函数存在且正确
- [ ] `get_user_role()` 函数存在且正确
- [ ] `is_boss()` 函数存在且正确（如果有）
- [ ] `is_manager()` 函数存在且正确（如果有）

### 权限检查
- [ ] BOSS 可以访问所有数据
- [ ] PEER_ADMIN 可以访问所有数据
- [ ] MANAGER 可以访问管辖范围内的数据
- [ ] DRIVER 只能访问自己的数据

### 通知系统检查
- [ ] 管理员可以创建通知
- [ ] 管理员可以更新所有通知
- [ ] 用户可以查看自己的通知
- [ ] 用户可以更新自己的通知

## 性能考虑

### RLS 策略性能优化
1. **使用索引**: 确保 RLS 策略中使用的字段有索引
   ```sql
   CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
   CREATE INDEX idx_user_roles_role ON user_roles(role);
   ```

2. **简化策略**: 避免复杂的子查询
   ```sql
   -- 不好
   USING (EXISTS (SELECT 1 FROM user_roles WHERE ...))
   
   -- 好
   USING (is_admin(auth.uid()))
   ```

3. **使用 SECURITY DEFINER 函数**: 减少权限检查开销
   ```sql
   CREATE FUNCTION is_admin(uid uuid)
   RETURNS boolean
   LANGUAGE sql
   SECURITY DEFINER
   STABLE
   AS $$
       SELECT EXISTS (
           SELECT 1 FROM user_roles
           WHERE user_id = uid AND role IN ('BOSS', 'MANAGER')
       );
   $$;
   ```

## 安全建议

### 1. 定期审查权限
- 每月审查一次 RLS 策略
- 检查是否有不必要的权限
- 确保权限符合业务需求

### 2. 最小权限原则
- 只授予必要的权限
- 避免使用 `USING (true)` 这样的宽松策略
- 对敏感数据使用更严格的策略

### 3. 审计日志
- 记录所有权限变更
- 监控异常的数据访问
- 定期检查审计日志

### 4. 测试环境
- 在测试环境中验证所有权限变更
- 使用不同角色的用户进行测试
- 确保不会影响生产数据

## 总结

### 关键要点
1. ✅ RLS 是数据安全的第一道防线
2. ✅ 所有表都应该启用 RLS
3. ✅ UPDATE 策略必须有 WITH CHECK 子句
4. ✅ 定期测试和审查权限策略

### 最佳实践
1. 使用辅助函数简化策略
2. 为策略添加详细注释
3. 使用一致的命名规范
4. 定期备份策略配置

### 下一步
1. 执行测试脚本
2. 分析测试结果
3. 修复发现的问题
4. 重新测试验证

---

**文档版本**: 1.0  
**创建时间**: 2025-11-05  
**适用范围**: 车队管家小程序 RLS 策略和权限测试
