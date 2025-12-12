#!/usr/bin/env node

/**
 * 批量删除前端代码中的 boss_id 相关代码
 */

const fs = require('fs')
const path = require('path')

// 需要处理的文件列表
const filesToProcess = [
  'src/db/api.ts',
  'src/db/notificationApi.ts',
  'src/db/tenantQuery.ts',
  'src/db/batchQuery.ts',
  'src/db/tenant-utils.ts',
  'src/client/tenant-supabase.ts',
  'src/contexts/TenantContext.tsx',
  'src/services/notificationService.ts',
  'src/utils/behaviorTracker.ts',
  'src/utils/performanceMonitor.ts',
  'src/pages/driver/leave/apply/index.tsx',
  'src/pages/lease-admin/tenant-form/index.tsx',
  'src/pages/lease-admin/lease-list/index.tsx',
  'src/pages/super-admin/user-management/index.tsx'
]

// 正则表达式模式
const patterns = {
  // 删除 getCurrentUserBossId 函数定义
  functionDef: /export\s+async\s+function\s+getCurrentUserBossId\s*\([^)]*\)[^{]*\{[\s\S]*?\n\}/gm,
  
  // 删除 getCurrentUserBossId 调用及其赋值
  functionCall: /const\s+\w*[Bb]oss[Ii]d\w*\s*=\s*await\s+getCurrentUserBossId\([^)]*\)[^\n]*\n/g,
  
  // 删除 boss_id 检查
  bossIdCheck: /if\s*\(!.*boss_id.*\)\s*\{[\s\S]*?\n\s*\}/g,
  
  // 删除 .eq('boss_id', ...) 过滤条件
  eqBossId: /\.eq\(['"]boss_id['"],\s*[^)]+\)/g,
  
  // 删除插入数据时的 boss_id 字段
  insertBossId: /,?\s*boss_id:\s*[^,\n}]+/g,
  
  // 删除函数参数中的 bossId
  paramBossId: /,?\s*bossId:\s*string[^,)]*/g,
  
  // 删除 select('boss_id')
  selectBossId: /\.select\(['"]boss_id['"]\)/g,
  
  // 删除 boss_id 相关的注释
  commentBossId: /\/\/.*boss_id.*\n/gi
}

function processFile(filePath) {
  console.log(`处理文件: ${filePath}`)
  
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    const originalContent = content
    
    // 应用所有替换模式
    Object.entries(patterns).forEach(([name, pattern]) => {
      const matches = content.match(pattern)
      if (matches) {
        console.log(`  - 找到 ${matches.length} 个 ${name} 匹配`)
        content = content.replace(pattern, '')
      }
    })
    
    // 清理多余的空行
    content = content.replace(/\n{3,}/g, '\n\n')
    
    // 清理多余的逗号
    content = content.replace(/,\s*,/g, ',')
    content = content.replace(/,\s*\)/g, ')')
    content = content.replace(/,\s*\}/g, '}')
    
    // 如果内容有变化，写回文件
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8')
      console.log(`  ✅ 文件已更新`)
    } else {
      console.log(`  ℹ️  文件无需更新`)
    }
  } catch (error) {
    console.error(`  ❌ 处理文件失败: ${error.message}`)
  }
}

function main() {
  console.log('开始批量删除 boss_id 相关代码...\n')
  
  filesToProcess.forEach(file => {
    const filePath = path.join(process.cwd(), file)
    if (fs.existsSync(filePath)) {
      processFile(filePath)
    } else {
      console.log(`⚠️  文件不存在: ${file}`)
    }
    console.log('')
  })
  
  console.log('✅ 批量处理完成！')
  console.log('\n⚠️  注意：请手动检查以下内容：')
  console.log('1. 函数签名是否正确（删除 bossId 参数后）')
  console.log('2. 函数调用是否正确（删除 bossId 参数后）')
  console.log('3. 是否有遗漏的 boss_id 相关代码')
  console.log('4. 运行 pnpm run lint 检查代码')
}

main()
