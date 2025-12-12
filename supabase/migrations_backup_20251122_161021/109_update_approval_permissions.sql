/*
# 更新审批权限策略

## 1. 权限规则调整
### 超级管理员审批权限：
- 只能查看和审批未分配管理员的仓库的申请
- 已分配管理员的仓库，超级管理员无权审批

### 普通管理员审批权限：
- 只能查看和审批自己管辖仓库的申请

## 2. 修改内容
- 删除原有的超级管理员全局查看和审批策略
- 创建新的超级管理员限制性审批策略
- 确保草稿不会被管理员看到

## 3. 安全考虑
- 草稿只能由创建者查看
- 正式申请才能被管理员看到
- 权限检查在数据库层面强制执行
*/

-- ============================================
-- 请假申请表权限策略更新
-- ============================================

-- 删除原有的超级管理员策略
DROP POLICY IF EXISTS "Super admins can view all leave applications" ON leave_applications;
DROP POLICY IF EXISTS "Super admins can update all leave applications" ON leave_applications;

-- 创建新的超级管理员策略：只能查看未分配管理员的仓库的非草稿申请
CREATE POLICY "Super admins can view unassigned warehouse leave applications" ON leave_applications
    FOR SELECT USING (
        is_super_admin(auth.uid()) 
        AND is_draft = false
        AND NOT EXISTS (
            SELECT 1 FROM manager_warehouses mw
            WHERE mw.warehouse_id = leave_applications.warehouse_id
        )
    );

-- 创建新的超级管理员策略：只能审批未分配管理员的仓库的非草稿申请
CREATE POLICY "Super admins can update unassigned warehouse leave applications" ON leave_applications
    FOR UPDATE USING (
        is_super_admin(auth.uid()) 
        AND is_draft = false
        AND NOT EXISTS (
            SELECT 1 FROM manager_warehouses mw
            WHERE mw.warehouse_id = leave_applications.warehouse_id
        )
    );

-- 更新管理员查看策略：只能查看非草稿申请
DROP POLICY IF EXISTS "Managers can view warehouse leave applications" ON leave_applications;
CREATE POLICY "Managers can view warehouse leave applications" ON leave_applications
    FOR SELECT USING (
        is_draft = false
        AND EXISTS (
            SELECT 1 FROM manager_warehouses mw
            JOIN profiles p ON p.id = auth.uid()
            WHERE mw.manager_id = auth.uid()
            AND mw.warehouse_id = leave_applications.warehouse_id
            AND p.role IN ('manager', 'super_admin')
        )
    );

-- 更新管理员审批策略：只能审批非草稿申请
DROP POLICY IF EXISTS "Managers can update warehouse leave applications" ON leave_applications;
CREATE POLICY "Managers can update warehouse leave applications" ON leave_applications
    FOR UPDATE USING (
        is_draft = false
        AND EXISTS (
            SELECT 1 FROM manager_warehouses mw
            JOIN profiles p ON p.id = auth.uid()
            WHERE mw.manager_id = auth.uid()
            AND mw.warehouse_id = leave_applications.warehouse_id
            AND p.role IN ('manager', 'super_admin')
        )
    );

-- 司机可以更新自己的草稿
CREATE POLICY "Drivers can update own draft leave applications" ON leave_applications
    FOR UPDATE USING (auth.uid() = user_id AND is_draft = true);

-- 司机可以删除自己的草稿
CREATE POLICY "Drivers can delete own draft leave applications" ON leave_applications
    FOR DELETE USING (auth.uid() = user_id AND is_draft = true);

-- ============================================
-- 离职申请表权限策略更新
-- ============================================

-- 删除原有的超级管理员策略
DROP POLICY IF EXISTS "Super admins can view all resignation applications" ON resignation_applications;
DROP POLICY IF EXISTS "Super admins can update all resignation applications" ON resignation_applications;

-- 创建新的超级管理员策略：只能查看未分配管理员的仓库的非草稿申请
CREATE POLICY "Super admins can view unassigned warehouse resignation applications" ON resignation_applications
    FOR SELECT USING (
        is_super_admin(auth.uid()) 
        AND is_draft = false
        AND NOT EXISTS (
            SELECT 1 FROM manager_warehouses mw
            WHERE mw.warehouse_id = resignation_applications.warehouse_id
        )
    );

-- 创建新的超级管理员策略：只能审批未分配管理员的仓库的非草稿申请
CREATE POLICY "Super admins can update unassigned warehouse resignation applications" ON resignation_applications
    FOR UPDATE USING (
        is_super_admin(auth.uid()) 
        AND is_draft = false
        AND NOT EXISTS (
            SELECT 1 FROM manager_warehouses mw
            WHERE mw.warehouse_id = resignation_applications.warehouse_id
        )
    );

-- 更新管理员查看策略：只能查看非草稿申请
DROP POLICY IF EXISTS "Managers can view warehouse resignation applications" ON resignation_applications;
CREATE POLICY "Managers can view warehouse resignation applications" ON resignation_applications
    FOR SELECT USING (
        is_draft = false
        AND EXISTS (
            SELECT 1 FROM manager_warehouses mw
            JOIN profiles p ON p.id = auth.uid()
            WHERE mw.manager_id = auth.uid()
            AND mw.warehouse_id = resignation_applications.warehouse_id
            AND p.role IN ('manager', 'super_admin')
        )
    );

-- 更新管理员审批策略：只能审批非草稿申请
DROP POLICY IF EXISTS "Managers can update warehouse resignation applications" ON resignation_applications;
CREATE POLICY "Managers can update warehouse resignation applications" ON resignation_applications
    FOR UPDATE USING (
        is_draft = false
        AND EXISTS (
            SELECT 1 FROM manager_warehouses mw
            JOIN profiles p ON p.id = auth.uid()
            WHERE mw.manager_id = auth.uid()
            AND mw.warehouse_id = resignation_applications.warehouse_id
            AND p.role IN ('manager', 'super_admin')
        )
    );

-- 司机可以更新自己的草稿
CREATE POLICY "Drivers can update own draft resignation applications" ON resignation_applications
    FOR UPDATE USING (auth.uid() = user_id AND is_draft = true);

-- 司机可以删除自己的草稿
CREATE POLICY "Drivers can delete own draft resignation applications" ON resignation_applications
    FOR DELETE USING (auth.uid() = user_id AND is_draft = true);
