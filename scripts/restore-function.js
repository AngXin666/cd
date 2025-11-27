/**
 * 恢复 create_tenant_schema 函数的脚本
 */

const fs = require('fs');
const path = require('path');

// 读取迁移文件 20005
const migrationPath = path.join(__dirname, '../supabase/migrations/20005_update_rls_policies_for_role_permissions.sql');
const migrationContent = fs.readFileSync(migrationPath, 'utf8');

// 提取函数定义（从第 57 行开始）
const lines = migrationContent.split('\n');
const functionLines = lines.slice(56); // 从第 57 行开始（索引 56）

// 输出函数定义
const functionSQL = functionLines.join('\n');

// 将函数定义写入临时文件
const outputPath = path.join(__dirname, '../supabase/migrations/20009_restore_create_tenant_schema_final.sql');
fs.writeFileSync(outputPath, `/*
# 恢复 create_tenant_schema 函数

本迁移恢复完整的 create_tenant_schema 函数，包含所有表和 RLS 策略。
*/

${functionSQL}
`);

console.log('✅ 函数定义已写入:', outputPath);
console.log('📝 文件行数:', functionLines.length);
