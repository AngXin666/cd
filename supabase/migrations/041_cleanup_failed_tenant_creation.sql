/*
# 清理创建失败的老板账号记录

## 问题
firmed_at 为 NULL），
> handle_new_user() 不会执行，导致 profiles 记录没有被创建。
profiles 记录的未确认 auth.users 记录。

## 注意
#
auth.users 记录
DELETE FROM auth.users
WHERE confirmed_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.users.id
  );
