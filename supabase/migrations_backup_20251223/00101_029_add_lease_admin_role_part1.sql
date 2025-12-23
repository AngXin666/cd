-- 添加新的角色类型
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'lease_admin';

COMMENT ON TYPE user_role IS '用户角色：driver(司机), manager(车队长), super_admin(超级管理员), lease_admin(租赁管理员)';