/**
 * 生成自定义图标集配置
 * 从完整的 MDI 图标库中提取项目使用的图标，生成精简配置
 * 可将内存消耗从 ~1GB 降至 ~10MB
 * @module scripts/generate-custom-icons
 */

const fs = require('fs')
const path = require('path')

/**
 * 从 @iconify-json/mdi 包中读取图标数据
 * @returns {Object} 图标数据对象
 */
function loadMdiIcons() {
  try {
    // 尝试加载 @iconify-json/mdi 包
    const mdiPath = require.resolve('@iconify-json/mdi/icons.json')
    const mdiData = JSON.parse(fs.readFileSync(mdiPath, 'utf-8'))
    return mdiData
  } catch (error) {
    console.error('❌ 无法加载 @iconify-json/mdi 包')
    console.error('请确保已安装: pnpm add -D @iconify-json/mdi')
    process.exit(1)
  }
}

/**
 * 读取项目使用的图标列表
 * @returns {string[]} 图标名称数组
 */
function loadUsedIcons() {
  const usedIconsPath = path.join(__dirname, '..', 'src', 'assets', 'used-icons.json')
  
  if (!fs.existsSync(usedIconsPath)) {
    console.error('❌ 未找到 used-icons.json 文件')
    console.error('请先运行: node scripts/extract-used-icons.js')
    process.exit(1)
  }
  
  return JSON.parse(fs.readFileSync(usedIconsPath, 'utf-8'))
}

/**
 * 生成精简的图标集配置
 */
function generateCustomIconsConfig() {
  console.log('🔧 生成自定义图标集配置...\n')
  
  // 加载完整的 MDI 图标数据
  const mdiData = loadMdiIcons()
  console.log(`📦 MDI 图标库版本: ${mdiData.info?.version || '未知'}`)
  console.log(`📦 MDI 图标总数: ${Object.keys(mdiData.icons).length}`)
  
  // 加载项目使用的图标列表
  const usedIcons = loadUsedIcons()
  console.log(`📋 项目使用图标数: ${usedIcons.length}\n`)
  
  // 提取使用的图标数据
  const customIcons = {}
  const missingIcons = []
  
  for (const iconName of usedIcons) {
    if (mdiData.icons[iconName]) {
      customIcons[iconName] = mdiData.icons[iconName]
    } else {
      missingIcons.push(iconName)
    }
  }
  
  // 报告缺失的图标
  if (missingIcons.length > 0) {
    console.log('⚠️ 以下图标在 MDI 库中未找到:')
    missingIcons.forEach(icon => console.log(`   - ${icon}`))
    console.log('')
  }
  
  // 生成自定义图标集配置
  const customCollection = {
    prefix: 'mdi',
    info: {
      name: 'Material Design Icons (Custom)',
      version: mdiData.info?.version || '1.0.0',
      author: 'Custom subset for project'
    },
    icons: customIcons,
    width: mdiData.width || 24,
    height: mdiData.height || 24
  }
  
  // 保存配置文件
  const outputPath = path.join(__dirname, '..', 'src', 'assets', 'custom-mdi-icons.json')
  fs.writeFileSync(outputPath, JSON.stringify(customCollection, null, 2))
  
  // 计算大小
  const fullSize = JSON.stringify(mdiData).length
  const customSize = JSON.stringify(customCollection).length
  const savedPercent = ((1 - customSize / fullSize) * 100).toFixed(1)
  
  console.log('✅ 自定义图标集已生成!')
  console.log(`📄 输出文件: src/assets/custom-mdi-icons.json`)
  console.log(`📊 大小对比:`)
  console.log(`   - 完整 MDI: ${(fullSize / 1024 / 1024).toFixed(2)} MB`)
  console.log(`   - 自定义集: ${(customSize / 1024).toFixed(2)} KB`)
  console.log(`   - 节省: ${savedPercent}%`)
  
  // 生成 tailwind 配置代码片段
  console.log('\n📝 请更新 tailwind.config.js:')
  console.log('```javascript')
  console.log(`// 使用自定义图标集（精简版，只包含项目使用的 ${Object.keys(customIcons).length} 个图标）`)
  console.log(`const customMdiIcons = require('./src/assets/custom-mdi-icons.json')`)
  console.log('')
  console.log('module.exports = {')
  console.log('  plugins: [')
  console.log('    iconsPlugin({')
  console.log('      collections: {')
  console.log('        mdi: customMdiIcons')
  console.log('      }')
  console.log('    })')
  console.log('  ]')
  console.log('}')
  console.log('```')
}

// 运行主函数
generateCustomIconsConfig()
