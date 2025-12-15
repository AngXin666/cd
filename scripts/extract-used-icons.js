/**
 * 提取项目中使用的 MDI 图标
 * 生成精简的图标集配置，大幅减少内存消耗
 * @module scripts/extract-used-icons
 */

const fs = require('fs')
const path = require('path')

/**
 * 递归获取目录下所有 tsx 文件
 * @param {string} dir - 目录路径
 * @returns {string[]} 文件路径数组
 */
function getTsxFiles(dir) {
  const files = []
  const items = fs.readdirSync(dir)
  
  for (const item of items) {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)
    
    if (stat.isDirectory()) {
      // 跳过 node_modules 和测试目录
      if (item !== 'node_modules' && item !== 'test' && item !== '__tests__') {
        files.push(...getTsxFiles(fullPath))
      }
    } else if (item.endsWith('.tsx') && !item.includes('.test.') && !item.includes('.spec.')) {
      files.push(fullPath)
    }
  }
  
  return files
}

/**
 * 从文件内容中提取 mdi 图标名称
 * @param {string} content - 文件内容
 * @returns {Set<string>} 图标名称集合
 */
function extractIconNames(content) {
  const icons = new Set()
  // 匹配 i-mdi-xxx 格式的图标类名
  const regex = /i-mdi-([a-z0-9-]+)/g
  let match
  
  while ((match = regex.exec(content)) !== null) {
    icons.add(match[1])
  }
  
  return icons
}

/**
 * 主函数：提取所有使用的图标
 */
function main() {
  console.log('🔍 扫描项目中使用的 MDI 图标...\n')
  
  const srcDir = path.join(__dirname, '..', 'src')
  const files = getTsxFiles(srcDir)
  const allIcons = new Set()
  
  console.log(`📁 找到 ${files.length} 个 tsx 文件\n`)
  
  // 遍历所有文件提取图标
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8')
    const icons = extractIconNames(content)
    
    if (icons.size > 0) {
      const relativePath = path.relative(path.join(__dirname, '..'), file)
      console.log(`  ${relativePath}: ${icons.size} 个图标`)
      icons.forEach(icon => allIcons.add(icon))
    }
  }
  
  // 排序图标名称
  const sortedIcons = Array.from(allIcons).sort()
  
  console.log('\n' + '='.repeat(50))
  console.log(`\n✅ 共找到 ${sortedIcons.length} 个不同的图标\n`)
  console.log('图标列表：')
  console.log(sortedIcons.join('\n'))
  
  // 生成图标列表文件
  const outputPath = path.join(__dirname, '..', 'src', 'assets', 'used-icons.json')
  const outputDir = path.dirname(outputPath)
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(sortedIcons, null, 2))
  console.log(`\n📄 图标列表已保存到: src/assets/used-icons.json`)
  
  // 生成统计信息
  console.log('\n📊 统计信息：')
  console.log(`  - 完整 MDI 图标库: ~7000 个图标`)
  console.log(`  - 项目实际使用: ${sortedIcons.length} 个图标`)
  console.log(`  - 可节省: ${((1 - sortedIcons.length / 7000) * 100).toFixed(1)}% 的图标加载`)
}

main()
