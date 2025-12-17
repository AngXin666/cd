-- =====================================================
-- 迁移文件：添加补录照片元数据字段
-- 版本：00049
-- 描述：在 vehicle_documents 表中添加 supplemented_photos 字段
--       用于记录补录照片的元数据（补录时间、原始URL、补录次数等）
-- =====================================================

-- 添加 supplemented_photos 字段到 vehicle_documents 表
-- 类型：JSONB，存储补录照片的元数据
-- 格式：{ "field_index": { field, index, supplemented_at, original_url, supplement_count } }
ALTER TABLE vehicle_documents
ADD COLUMN IF NOT EXISTS supplemented_photos JSONB DEFAULT '{}'::jsonb;

-- 添加字段注释
COMMENT ON COLUMN vehicle_documents.supplemented_photos IS '补录照片元数据，键为 "{field}_{index}"，值包含 field(字段名)、index(索引)、supplemented_at(补录时间)、original_url(原始URL)、supplement_count(补录次数)';
