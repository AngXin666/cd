/**
 * 添加补录照片元数据字段到 vehicle_documents 表
 * 
 * 功能说明：
 * 该字段用于记录补录照片的元数据，包括：
 * - 照片字段名（如 pickup_photos）
 * - 照片索引
 * - 补录时间戳
 * - 原始照片URL
 * - 补录次数
 * 
 * 数据结构示例：
 * {
 *   "pickup_photos_0": {
 *     "field": "pickup_photos",
 *     "index": 0,
 *     "supplemented_at": "2024-12-17T10:30:00Z",
 *     "original_url": "https://xxx/old_photo.jpg",
 *     "supplement_count": 1
 *   }
 * }
 * 
 * Requirements: 1.1, 3.1
 */

-- ============================================
-- 添加 supplemented_photos 字段
-- ============================================

-- 添加 JSONB 类型的 supplemented_photos 字段
ALTER TABLE vehicle_documents
ADD COLUMN IF NOT EXISTS supplemented_photos JSONB DEFAULT '{}'::jsonb;

-- 添加字段注释
COMMENT ON COLUMN vehicle_documents.supplemented_photos IS '补录照片元数据，键为 "{field}_{index}"，值包含 field(字段名)、index(索引)、supplemented_at(补录时间)、original_url(原始URL)、supplement_count(补录次数)';

-- ============================================
-- 验证字段添加成功
-- ============================================

DO $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  -- 检查字段是否存在
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'vehicle_documents' 
    AND column_name = 'supplemented_photos'
  ) INTO column_exists;
  
  IF column_exists THEN
    RAISE NOTICE '✅ supplemented_photos 字段添加成功';
  ELSE
    RAISE WARNING '❌ supplemented_photos 字段添加失败';
  END IF;
END $$;
