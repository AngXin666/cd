-- 测试车队长仓库分配修复

-- 1. 查看所有用户和角色
SELECT u.id, u.name, u.phone, ur.role
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
ORDER BY ur.role, u.name;

-- 2. 查看所有仓库
SELECT id, name, address, status
FROM warehouses
ORDER BY name;

-- 3. 查看所有仓库分配（warehouse_assignments表）
SELECT wa.id, wa.user_id, u.name as user_name, ur.role, wa.warehouse_id, w.name as warehouse_name, wa.created_at
FROM warehouse_assignments wa
LEFT JOIN users u ON wa.user_id = u.id
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN warehouses w ON wa.warehouse_id = w.id
ORDER BY wa.created_at DESC;

-- 4. 检查是否还有manager_warehouses表（应该不存在）
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'manager_warehouses'
) as manager_warehouses_exists;
