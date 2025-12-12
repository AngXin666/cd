#!/usr/bin/env node

/**
 * 自动替换 console.log 为 Logger 调用的脚本
 * 
 * 使用方法:
 * node scripts/replace-console-log.js [目录路径]
 * 
 * 示例:
 * node scripts/replace-console-log.js src/pages/manager
 */

const fs = require('fs')
const path = require('path')

// 配置
const config = {
  // 需要处理的文件扩展名
  extensions: ['.ts', '.tsx', '.js', '.jsx'],
  // 排除的目录
  excludeDirs: ['node_modules', 'dist', '.git', 'build'],
  // 是否实际修改文件（false 为预览模式）
  dryRun: process.argv.includes('--dry-run'),
  // 是否显示详细信息
  verbose: process.argv.includes('--verbose')
}

// 统计信息
const stats = {
  filesScanned: 0,
  filesModified: 0,
  replacements: 0
}

/**
 * 检查文件是否需要处理
 */
function shouldProcessFile(filePath) {
  const ext = path.extname(filePath)
  return config.extensions.includes(ext)
}

/**
 * 检查目录是否需要排除
 */
function shouldExcludeDir(dirName) {
  return config.excludeDirs.includes(dirName)
}

/**
 * 递归扫描目录
 */
function scanDirectory(dirPath, callback) {
  const items = fs.readdirSync(dirPath)

  for (const item of items) {
    const fullPath = path.join(dirPath, item)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      if (!shouldExcludeDir(item)) {
        scanDirectory(fullPath, callback)
      }
    } else if (stat.isFile() && shouldProcessFile(fullPath)) {
      callback(fullPath)
    }
  }
}

/**
 * 提取模块名（从文件路径）
 */
function extractModuleName(filePath) {
  // 从文件路径提取有意义的模块名
  const relativePath = path.relative(process.cwd(), filePath)
  const parts = relativePath.split(path.sep)
  
  // 移除 src 和文件扩展名
  const filtered = parts.filter(p => p !== 'src')
  const fileName = filtered[filtered.length - 1].replace(/\.(ts|tsx|js|jsx)$/, '')
  
  // 如果是 index 文件，使用父目录名
  if (fileName === 'index' && filtered.length > 1) {
    return filtered[filtered.length - 2]
  }
  
  return fileName
}

/**
 * 处理文件内容
 */
function processFileContent(content, filePath) {
  let modified = false
  let replacementCount = 0
  const moduleName = extractModuleName(filePath)

  // 检查是否已经导入了 Logger
  const hasLoggerImport = /import.*createLogger.*from.*@\/utils\/logger/.test(content)
  
  // 检查是否有 console.log 调用
  const hasConsoleLog = /console\.log\(/.test(content)
  
  if (!hasConsoleLog) {
    return { content, modified: false, replacementCount: 0 }
  }

  let newContent = content

  // 如果没有导入 Logger，添加导入语句
  if (!hasLoggerImport) {
    // 找到第一个 import 语句的位置
    const importMatch = newContent.match(/^import\s/m)
    if (importMatch) {
      const insertPos = importMatch.index
      const loggerImport = `import { createLogger } from '@/utils/logger'\n`
      newContent = newContent.slice(0, insertPos) + loggerImport + newContent.slice(insertPos)
      modified = true
    }
  }

  // 检查是否已经创建了 logger 实例
  const hasLoggerInstance = /const logger = createLogger\(/.test(newContent)
  
  if (!hasLoggerInstance && hasConsoleLog) {
    // 在导入语句后添加 logger 实例
    const lastImportMatch = newContent.match(/^import.*$/gm)
    if (lastImportMatch) {
      const lastImport = lastImportMatch[lastImportMatch.length - 1]
      const insertPos = newContent.indexOf(lastImport) + lastImport.length
      const loggerInstance = `\n\nconst logger = createLogger('${moduleName}')\n`
      newContent = newContent.slice(0, insertPos) + loggerInstance + newContent.slice(insertPos)
      modified = true
    }
  }

  // 替换 console.log 为 logger.debug
  // 注意：这是一个简单的替换，可能需要手动调整
  const consoleLogPattern = /console\.log\(/g
  if (consoleLogPattern.test(newContent)) {
    newContent = newContent.replace(consoleLogPattern, 'logger.debug(')
    const matches = content.match(consoleLogPattern)
    replacementCount = matches ? matches.length : 0
    modified = true
  }

  return { content: newContent, modified, replacementCount }
}

/**
 * 处理单个文件
 */
function processFile(filePath) {
  stats.filesScanned++

  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const result = processFileContent(content, filePath)

    if (result.modified) {
      stats.filesModified++
      stats.replacements += result.replacementCount

      if (config.dryRun) {
        console.log(`[DRY RUN] 将修改: ${filePath}`)
        console.log(`  - 替换 ${result.replacementCount} 个 console.log`)
      } else {
        fs.writeFileSync(filePath, result.content, 'utf8')
        console.log(`✅ 已修改: ${filePath}`)
        console.log(`  - 替换了 ${result.replacementCount} 个 console.log`)
      }

      if (config.verbose) {
        console.log('---')
      }
    } else if (config.verbose) {
      console.log(`⏭️  跳过: ${filePath} (无需修改)`)
    }
  } catch (error) {
    console.error(`❌ 处理文件失败: ${filePath}`)
    console.error(`   错误: ${error.message}`)
  }
}

/**
 * 主函数
 */
function main() {
  console.log('🔍 开始扫描文件...\n')

  // 获取目标目录
  const targetDir = process.argv[2] || 'src'
  const fullPath = path.resolve(process.cwd(), targetDir)

  if (!fs.existsSync(fullPath)) {
    console.error(`❌ 目录不存在: ${fullPath}`)
    process.exit(1)
  }

  if (config.dryRun) {
    console.log('⚠️  预览模式 (不会实际修改文件)')
    console.log('   使用 --dry-run=false 来实际修改文件\n')
  }

  // 扫描并处理文件
  scanDirectory(fullPath, processFile)

  // 输出统计信息
  console.log('\n📊 处理完成！')
  console.log('---')
  console.log(`扫描文件数: ${stats.filesScanned}`)
  console.log(`修改文件数: ${stats.filesModified}`)
  console.log(`替换次数: ${stats.replacements}`)
  
  if (config.dryRun) {
    console.log('\n💡 提示: 这是预览模式，文件未被实际修改')
    console.log('   移除 --dry-run 参数来实际修改文件')
  }
}

// 运行脚本
main()
