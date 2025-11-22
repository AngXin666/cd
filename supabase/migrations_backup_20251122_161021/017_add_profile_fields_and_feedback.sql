/*
# 扩展用户档案表和创建反馈表

1. 扩展profiles表
    - 添加字段：
        - `avatar_url` (text) - 头像URL
        - `nickname` (text) - 昵称
        - `address_province` (text) - 省份
        - `address_city` (text) - 城市
        - `address_district` (text) - 区县
        - `address_detail` (text) - 详细地址
        - `emergency_contact_name` (text) - 紧急联系人姓名
        - `emergency_contact_phone` (text) - 紧急联系人电话

2. 创建feedback表（意见反馈）
    - `id` (uuid, 主键)
    - `user_id` (uuid, 外键关联profiles)
    - `type` (text) - 反馈类型
    - `content` (text) - 反馈内容
    - `contact` (text) - 联系方式
    - `status` (text) - 状态：pending/processing/resolved
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

3. 安全策略
    - profiles表：用户可以更新自己的个人信息
    - feedback表：用户可以创建和查看自己的反馈，管理员可以查看所有反馈
*/

-- 扩展profiles表
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nickname text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_province text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_city text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_district text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_detail text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact_phone text;

-- 创建反馈表
CREATE TABLE IF NOT EXISTS feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type text NOT NULL,
    content text NOT NULL,
    contact text,
    status text DEFAULT 'pending' NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 为feedback表启用RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- 用户可以创建自己的反馈
CREATE POLICY "用户可以创建反馈" ON feedback
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 用户可以查看自己的反馈
CREATE POLICY "用户可以查看自己的反馈" ON feedback
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- 管理员可以查看所有反馈
CREATE POLICY "管理员可以查看所有反馈" ON feedback
    FOR SELECT TO authenticated
    USING (is_manager_or_above(auth.uid()));

-- 管理员可以更新反馈状态
CREATE POLICY "管理员可以更新反馈" ON feedback
    FOR UPDATE TO authenticated
    USING (is_manager_or_above(auth.uid()));

-- 为feedback表添加更新时间戳触发器
CREATE TRIGGER update_feedback_updated_at BEFORE UPDATE ON feedback
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
