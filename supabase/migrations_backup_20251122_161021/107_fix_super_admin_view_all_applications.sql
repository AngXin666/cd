/*
# 修复超级管理员查看所有审批记录的权限

## 1. 问题描述
当前RLS策略限制了超级管理员只能查看未分配管理员的仓库的申请，导致超级管理员无法查看所有历史审批数据和实时数据。

## 2. 解决方案
- 删除超级管理员的限制性查看策略
- 创建新的超级管理员全局查看策略，允许查看所有非草稿申请
- 保持超级管理员的审批权限限制（只能审批未分配管理员的仓库）

## 3. 权限规则
### 超级管理员权限：
- 可以查看所有非草稿申请（包括历史和实时数据）
- 只能审批未分配管理员的仓库的申请

### 普通管理员权限：
- 只能查看自己管辖仓库的非草稿申请
- 只能审批自己管辖仓库的申请
*/

-- ============================================
-- 请假申请表权限策略更新
-- ============================================

-- 删除原有的超级管理员限制性查看策略
DROP POLICY IF EXISTS "Super admins can view unassigned warehouse leave applications" ON leave_applications;

-- 创建新的超级管理员全局查看策略：可以查看所有非草稿申请
CREATE POLICY "Super admins can view all leave applications" ON leave_applications
    FOR SELECT USING (
        is_super_admin(auth.uid()) 
        AND is_draft = false
    );

-- 保持超级管理员的审批权限限制：只能审批未分配管理员的仓库的非草稿申请
-- （这个策略已经存在，不需要修改）

-- ============================================
-- 离职申请表权限策略更新
-- ============================================

-- 删除原有的超级管理员限制性查看策略
DROP POLICY IF EXISTS "Super admins can view unassigned warehouse resignation applications" ON resignation_applications;

-- 创建新的超级管理员全局查看策略：可以查看所有非草稿申请
CREATE POLICY "Super admins can view all resignation applications" ON resignation_applications
    FOR SELECT USING (
        is_super_admin(auth.uid()) 
        AND is_draft = false
    );

-- 保持超级管理员的审批权限限制：只能审批未分配管理员的仓库的非草稿申请
-- （这个策略已经存在，不需要修改）
