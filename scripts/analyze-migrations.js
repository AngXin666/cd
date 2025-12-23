/**
 * 数据库迁移文件分析脚本
 * 分析 supabase/migrations 目录下的所有迁移文件
 * 识别废弃迁移、重复迁移、有效迁移
 * 生成分析报告
 * 
 * @module scripts/analyze-migrations
 * @requires fs
 * @requires path
 */

const fs = require('fs');
const path = require('path');

// 迁移目录路径
const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');

// 输出报告路径
const REPORT_PATH = path.join(__dirname, '..', 'supabase', 'migration-analysis-report.json');
const REPORT_MD_PATH = path.join(__dirname, '..', 'supabase', 'migration-analysis-report.md');

/**
 * 废弃迁移的匹配模式
 * 这些模式用于识别应该被删除的迁移文件
 * 
 * 分类说明：
 * 1. tempFix: 99999_* 系列临时修复迁移
 * 2. tenantId: 包含 tenant_id 的多租户迁移
 * 3. bossId: 包含 boss_id 的多租户迁移
 * 4. leaseAdmin: 租赁管理员相关迁移
 * 5. tenantSchema: 租户 schema 相关迁移
 * 6. multiTenant: 多租户系统相关迁移
 * 7. tenant: 其他租户相关迁移
 */
const DEPRECATED_PATTERNS = {
  // 99999_* 系列临时修复迁移（最高优先级）
  tempFix: /^99999_/,
  // 多租户相关迁移（项目已改为单用户系统）
  tenantId: /tenant_id/i,
  bossId: /boss_id/i,
  leaseAdmin: /lease_admin/i,
  tenantSchema: /tenant_schema/i,
  multiTenant: /multi_tenant/i,
  // 租户相关
  tenant: /tenant/i,
};

/**
 * 废弃迁移的文件名模式（仅匹配文件名，不匹配内容）
 * 用于识别特定系列的废弃迁移
 */
const DEPRECATED_FILENAME_PATTERNS = {
  // 99999_* 系列临时修复
  tempFix99999: /^99999_/,
  // 10000+ 系列（通常是租户配置相关）
  tenantConfig: /^1000[0-9]_/,
  // 20000+ 系列（中央管理系统相关）
  centralManagement: /^2000[0-9]_/,
  // 99990-99998 系列
  tempFix9999x: /^9999[0-8]_/,
};

/**
 * 迁移文件类型分类
 */
const MIGRATION_TYPES = {
  CORE_TABLE: 'core_table',           // 核心表结构
  RLS_POLICY: 'rls_policy',           // RLS 策略
  FUNCTION: 'function',               // 函数/触发器
  TEST_DATA: 'test_data',             // 测试数据
  FIX: 'fix',                         // 修复迁移
  DEPRECATED: 'deprecated',           // 废弃迁移
  FEATURE: 'feature',                 // 功能迁移
  PERMISSION: 'permission',           // 权限相关
  NOTIFICATION: 'notification',       // 通知相关
  VEHICLE: 'vehicle',                 // 车辆相关
  ATTENDANCE: 'attendance',           // 考勤相关
  PIECE_WORK: 'piece_work',           // 计件相关
  LEAVE: 'leave',                     // 请假相关
  OTHER: 'other',                     // 其他
};

/**
 * 分析单个迁移文件
 * @param {string} filename - 文件名
 * @param {string} content - 文件内容
 * @returns {Object} 迁移文件分析结果
 */
function analyzeMigrationFile(filename, content) {
  const result = {
    filename,
    number: extractMigrationNumber(filename),
    type: MIGRATION_TYPES.OTHER,
    description: extractDescription(filename),
    isDeprecated: false,
    deprecatedReason: null,
    isDuplicate: false,
    duplicateOf: null,
    contentKeywords: [],
    size: content.length,
  };

  // 检查是否为废弃迁移
  for (const [key, pattern] of Object.entries(DEPRECATED_PATTERNS)) {
    if (pattern.test(filename) || pattern.test(content)) {
      result.isDeprecated = true;
      result.deprecatedReason = key;
      result.type = MIGRATION_TYPES.DEPRECATED;
      break;
    }
  }

  // 如果不是废弃迁移，进一步分类
  if (!result.isDeprecated) {
    result.type = classifyMigration(filename, content);
  }

  // 提取内容关键词
  result.contentKeywords = extractKeywords(content);

  return result;
}

/**
 * 提取迁移编号
 * @param {string} filename - 文件名
 * @returns {string} 迁移编号
 */
function extractMigrationNumber(filename) {
  // 匹配开头的数字部分
  const match = filename.match(/^(\d+)/);
  return match ? match[1] : '';
}

/**
 * 提取迁移描述
 * @param {string} filename - 文件名
 * @returns {string} 迁移描述
 */
function extractDescription(filename) {
  // 移除编号和扩展名，获取描述部分
  return filename
    .replace(/^\d+_?/, '')
    .replace(/\.sql$/, '')
    .replace(/_/g, ' ');
}

/**
 * 分类迁移文件
 * @param {string} filename - 文件名
 * @param {string} content - 文件内容
 * @returns {string} 迁移类型
 */
function classifyMigration(filename, content) {
  const lowerFilename = filename.toLowerCase();
  const lowerContent = content.toLowerCase();

  // 核心表结构（001-009 系列）
  if (/^00[1-9]_/.test(filename)) {
    return MIGRATION_TYPES.CORE_TABLE;
  }

  // RLS 策略
  if (lowerFilename.includes('rls') || lowerFilename.includes('policy') || lowerFilename.includes('policies')) {
    return MIGRATION_TYPES.RLS_POLICY;
  }

  // 测试数据
  if (lowerFilename.includes('test_data') || lowerFilename.includes('test_accounts') || lowerFilename.includes('sample')) {
    return MIGRATION_TYPES.TEST_DATA;
  }

  // 修复迁移
  if (lowerFilename.includes('fix_') || lowerFilename.includes('_fix')) {
    return MIGRATION_TYPES.FIX;
  }

  // 函数/触发器
  if (lowerFilename.includes('function') || lowerFilename.includes('trigger') || 
      lowerContent.includes('create function') || lowerContent.includes('create or replace function')) {
    return MIGRATION_TYPES.FUNCTION;
  }

  // 权限相关
  if (lowerFilename.includes('permission') || lowerFilename.includes('role')) {
    return MIGRATION_TYPES.PERMISSION;
  }

  // 通知相关
  if (lowerFilename.includes('notification')) {
    return MIGRATION_TYPES.NOTIFICATION;
  }

  // 车辆相关
  if (lowerFilename.includes('vehicle')) {
    return MIGRATION_TYPES.VEHICLE;
  }

  // 考勤相关
  if (lowerFilename.includes('attendance')) {
    return MIGRATION_TYPES.ATTENDANCE;
  }

  // 计件相关
  if (lowerFilename.includes('piece_work')) {
    return MIGRATION_TYPES.PIECE_WORK;
  }

  // 请假相关
  if (lowerFilename.includes('leave') || lowerFilename.includes('resignation')) {
    return MIGRATION_TYPES.LEAVE;
  }

  return MIGRATION_TYPES.FEATURE;
}

/**
 * 提取内容关键词
 * @param {string} content - 文件内容
 * @returns {string[]} 关键词列表
 */
function extractKeywords(content) {
  const keywords = [];
  const lowerContent = content.toLowerCase();

  // 检查常见的 SQL 操作
  if (lowerContent.includes('create table')) keywords.push('CREATE_TABLE');
  if (lowerContent.includes('alter table')) keywords.push('ALTER_TABLE');
  if (lowerContent.includes('drop table')) keywords.push('DROP_TABLE');
  if (lowerContent.includes('create index')) keywords.push('CREATE_INDEX');
  if (lowerContent.includes('create function')) keywords.push('CREATE_FUNCTION');
  if (lowerContent.includes('create trigger')) keywords.push('CREATE_TRIGGER');
  if (lowerContent.includes('create policy')) keywords.push('CREATE_POLICY');
  if (lowerContent.includes('drop policy')) keywords.push('DROP_POLICY');
  if (lowerContent.includes('create type')) keywords.push('CREATE_TYPE');
  if (lowerContent.includes('insert into')) keywords.push('INSERT_DATA');
  if (lowerContent.includes('update ')) keywords.push('UPDATE_DATA');
  if (lowerContent.includes('delete from')) keywords.push('DELETE_DATA');

  return keywords;
}

/**
 * 查找重复编号的迁移
 * @param {Object[]} migrations - 迁移文件列表
 * @returns {Object} 重复迁移映射
 */
function findDuplicateNumbers(migrations) {
  const numberMap = {};
  const duplicates = {};

  for (const migration of migrations) {
    const num = migration.number;
    if (!num) continue;

    if (!numberMap[num]) {
      numberMap[num] = [];
    }
    numberMap[num].push(migration.filename);
  }

  // 找出有多个文件的编号
  for (const [num, files] of Object.entries(numberMap)) {
    if (files.length > 1) {
      duplicates[num] = files;
    }
  }

  return duplicates;
}

/**
 * 生成分析报告
 * @param {Object[]} migrations - 迁移文件分析结果
 * @param {Object} duplicates - 重复迁移映射
 * @returns {Object} 分析报告
 */
function generateReport(migrations, duplicates) {
  // 按类型统计
  const typeStats = {};
  for (const type of Object.values(MIGRATION_TYPES)) {
    typeStats[type] = 0;
  }

  // 废弃原因统计
  const deprecatedReasons = {};

  // 待删除和待保留列表
  const toDelete = [];
  const toKeep = [];

  for (const migration of migrations) {
    typeStats[migration.type]++;

    if (migration.isDeprecated) {
      toDelete.push(migration.filename);
      if (migration.deprecatedReason) {
        deprecatedReasons[migration.deprecatedReason] = 
          (deprecatedReasons[migration.deprecatedReason] || 0) + 1;
      }
    } else {
      toKeep.push(migration.filename);
    }
  }

  // 统计重复迁移数量
  let duplicateCount = 0;
  for (const files of Object.values(duplicates)) {
    duplicateCount += files.length - 1; // 每组重复只保留一个
  }

  return {
    summary: {
      total: migrations.length,
      deprecated: toDelete.length,
      valid: toKeep.length,
      duplicateNumbers: Object.keys(duplicates).length,
      duplicateFiles: duplicateCount,
    },
    typeStats,
    deprecatedReasons,
    duplicates,
    toDelete,
    toKeep,
    migrations,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * 生成 Markdown 格式的报告
 * @param {Object} report - 分析报告
 * @returns {string} Markdown 格式的报告
 */
function generateMarkdownReport(report) {
  let md = `# 数据库迁移文件分析报告

生成时间: ${report.generatedAt}

## 概览

| 指标 | 数量 |
|------|------|
| 总迁移文件数 | ${report.summary.total} |
| 废弃迁移数 | ${report.summary.deprecated} |
| 有效迁移数 | ${report.summary.valid} |
| 重复编号数 | ${report.summary.duplicateNumbers} |
| 重复文件数 | ${report.summary.duplicateFiles} |

## 按类型统计

| 类型 | 数量 |
|------|------|
`;

  for (const [type, count] of Object.entries(report.typeStats)) {
    md += `| ${type} | ${count} |\n`;
  }

  md += `
## 废弃原因统计

| 原因 | 数量 | 说明 |
|------|------|------|
`;

  const reasonDescriptions = {
    tempFix: '99999_* 系列临时修复迁移',
    tenantId: '包含 tenant_id 的多租户迁移',
    bossId: '包含 boss_id 的多租户迁移',
    leaseAdmin: '租赁管理员相关迁移',
    tenantSchema: '租户 schema 相关迁移',
    multiTenant: '多租户系统相关迁移',
    tenant: '其他租户相关迁移',
  };

  for (const [reason, count] of Object.entries(report.deprecatedReasons)) {
    const desc = reasonDescriptions[reason] || reason;
    md += `| ${reason} | ${count} | ${desc} |\n`;
  }

  md += `
## 重复编号迁移

以下编号存在多个迁移文件（共 ${report.summary.duplicateNumbers} 组，${report.summary.duplicateFiles} 个重复文件）：

`;

  for (const [num, files] of Object.entries(report.duplicates)) {
    md += `### 编号 ${num}\n`;
    for (const file of files) {
      md += `- ${file}\n`;
    }
    md += '\n';
  }

  // 按废弃原因分组显示待删除文件
  md += `
## 待删除文件列表 (${report.toDelete.length} 个)

### 按废弃原因分组

`;

  // 按原因分组
  const deleteByReason = {};
  for (const migration of report.migrations) {
    if (migration.isDeprecated) {
      const reason = migration.deprecatedReason || 'unknown';
      if (!deleteByReason[reason]) {
        deleteByReason[reason] = [];
      }
      deleteByReason[reason].push(migration.filename);
    }
  }

  for (const [reason, files] of Object.entries(deleteByReason)) {
    const desc = reasonDescriptions[reason] || reason;
    md += `#### ${reason} (${files.length} 个) - ${desc}\n\n`;
    md += '```\n';
    md += files.join('\n');
    md += '\n```\n\n';
  }

  // 按类型分组显示待保留文件
  md += `
## 待保留文件列表 (${report.toKeep.length} 个)

### 按类型分组

`;

  // 按类型分组
  const keepByType = {};
  for (const migration of report.migrations) {
    if (!migration.isDeprecated) {
      const type = migration.type;
      if (!keepByType[type]) {
        keepByType[type] = [];
      }
      keepByType[type].push(migration.filename);
    }
  }

  for (const [type, files] of Object.entries(keepByType)) {
    md += `#### ${type} (${files.length} 个)\n\n`;
    md += '```\n';
    md += files.join('\n');
    md += '\n```\n\n';
  }

  // 添加核心表结构迁移详情
  md += `
## 核心表结构迁移详情 (001-009 系列)

以下是核心表结构迁移，这些是数据库的基础：

`;

  const coreMigrations = report.migrations.filter(m => m.type === 'core_table');
  for (const m of coreMigrations) {
    md += `- **${m.filename}**: ${m.description}\n`;
  }

  // 添加建议
  md += `
## 整理建议

### 第一批删除：99999_* 系列 (${deleteByReason['tempFix']?.length || 0} 个)
这些是临时修复迁移，应该首先删除。

### 第二批删除：多租户相关 (${(deleteByReason['tenantId']?.length || 0) + (deleteByReason['bossId']?.length || 0) + (deleteByReason['leaseAdmin']?.length || 0)} 个)
包括 tenant_id、boss_id、lease_admin 相关的迁移。

### 第三批删除：重复编号 (${report.summary.duplicateFiles} 个)
保留最新版本，删除旧版本。

### 第四批删除：历史修复迁移
检查 fix_* 迁移，删除已被后续迁移覆盖的。

### 预期结果
- 整理前：${report.summary.total} 个迁移文件
- 整理后目标：< 50 个迁移文件
- 预计删除：${report.summary.deprecated + report.summary.duplicateFiles} 个以上
`;

  return md;
}

/**
 * 主函数：执行迁移分析
 */
async function main() {
  console.log('开始分析迁移文件...\n');

  // 读取所有迁移文件
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`找到 ${files.length} 个 SQL 迁移文件\n`);

  // 分析每个文件
  const migrations = [];
  for (const filename of files) {
    const filepath = path.join(MIGRATIONS_DIR, filename);
    const content = fs.readFileSync(filepath, 'utf-8');
    const analysis = analyzeMigrationFile(filename, content);
    migrations.push(analysis);
  }

  // 查找重复编号
  const duplicates = findDuplicateNumbers(migrations);

  // 标记重复迁移
  for (const files of Object.values(duplicates)) {
    for (let i = 0; i < files.length; i++) {
      const migration = migrations.find(m => m.filename === files[i]);
      if (migration && i > 0) {
        migration.isDuplicate = true;
        migration.duplicateOf = files[0];
      }
    }
  }

  // 生成报告
  const report = generateReport(migrations, duplicates);

  // 保存 JSON 报告
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`JSON 报告已保存到: ${REPORT_PATH}`);

  // 保存 Markdown 报告
  const mdReport = generateMarkdownReport(report);
  fs.writeFileSync(REPORT_MD_PATH, mdReport, 'utf-8');
  console.log(`Markdown 报告已保存到: ${REPORT_MD_PATH}`);

  // 打印概览
  console.log('\n========== 分析概览 ==========\n');
  console.log(`总迁移文件数: ${report.summary.total}`);
  console.log(`废弃迁移数: ${report.summary.deprecated}`);
  console.log(`有效迁移数: ${report.summary.valid}`);
  console.log(`重复编号数: ${report.summary.duplicateNumbers}`);
  console.log(`重复文件数: ${report.summary.duplicateFiles}`);

  console.log('\n========== 按类型统计 ==========\n');
  for (const [type, count] of Object.entries(report.typeStats)) {
    if (count > 0) {
      console.log(`${type}: ${count}`);
    }
  }

  console.log('\n========== 废弃原因统计 ==========\n');
  for (const [reason, count] of Object.entries(report.deprecatedReasons)) {
    console.log(`${reason}: ${count}`);
  }

  console.log('\n分析完成！');
}

// 执行主函数
main().catch(console.error);
