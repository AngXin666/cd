/*
# 添加 profiles 表的 SELECT 策略

## 问题
profiles 表只有 UPDATE 策略，没有 SELECT 策略，导致用户无法读取自己的档案信息。

## 解决方案
添加 SELECT 策略，允许：
1. 用户可以查看自己的档案
2. 超级管理员可以查看所有档案
*/

-- 创建辅助函数：检查用户是否为超级管理员
CREATE OR REPLACE FUNCTION is_super_admin(uid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = uid AND p.role = 'super_admin'
    );
$$;

-- 添加 SELECT 策略：用户可以查看自己的档案
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- 添加 SELECT 策略：超级管理员可以查看所有档案
CREATE POLICY "Super admins can view all profiles" ON public.profiles
    FOR SELECT
    TO authenticated
    USING (is_super_admin(auth.uid()));

-- 添加 INSERT 策略：超级管理员可以创建档案
CREATE POLICY "Super admins can insert profiles" ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (is_super_admin(auth.uid()));

-- 添加 UPDATE 策略：超级管理员可以更新所有档案
CREATE POLICY "Super admins can update all profiles" ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- 添加 DELETE 策略：超级管理员可以删除档案
CREATE POLICY "Super admins can delete profiles" ON public.profiles
    FOR DELETE
    TO authenticated
    USING (is_super_admin(auth.uid()));