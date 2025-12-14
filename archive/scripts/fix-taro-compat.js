/**
 * 批量修复Taro API兼容性问题
 * 替换所有Taro.showLoading, Taro.hideLoading, Taro.showToast为兼容层函数
 */

const fs = require('fs');
const path = require('path');

// 需要修复的文件列表
const filesToFix = [
  'src/pages/driver/add-vehicle/index.tsx',
  'src/pages/driver/clock-in/index.tsx',
  'src/pages/driver/edit-vehicle/index.tsx',
  'src/pages/driver/license-ocr/index.tsx',
  'src/pages/driver/profile/index.tsx',
  'src/pages/driver/return-vehicle/index.tsx',
  'src/pages/super-admin/vehicle-review-detail/index.tsx',
  'src/pages/profile/change-password/index.tsx',
  'src/utils/hotUpdate.ts'
];

function fixFile(filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  文件不存在: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  // 检查是否已经导入了兼容层
  const hasCompatImport = content.includes("from '@/utils/taroCompat'");
  
  // 检查是否需要修复
  const needsFix = content.includes('Taro.showLoading') || 
                   content.includes('Taro.hideLoading') || 
                   content.includes('Taro.showToast');

  if (!needsFix) {
    console.log(`✅ ${filePath} - 无需修复`);
    return false;
  }

  // 1. 添加兼容层导入(如果还没有)
  if (!hasCompatImport) {
    // 查找Taro导入行
    const taroImportRegex = /import\s+(?:(?:\{[^}]+\})|(?:\w+))?\s*,?\s*(?:\{[^}]+\})?\s*from\s+['"]@tarojs\/taro['"]/;
    const match = content.match(taroImportRegex);
    
    if (match) {
      const taroImportLine = match[0];
      const taroImportIndex = content.indexOf(taroImportLine);
      const nextLineIndex = content.indexOf('\n', taroImportIndex);
      
      // 在Taro导入后添加兼容层导入
      const compatImport = "import {showLoading, hideLoading, showToast} from '@/utils/taroCompat'";
      content = content.slice(0, nextLineIndex + 1) + compatImport + '\n' + content.slice(nextLineIndex + 1);
      modified = true;
    }
  }

  // 2. 替换 Taro.showLoading({
  content = content.replace(/Taro\.showLoading\({/g, 'showLoading({');
  
  // 3. 替换 Taro.hideLoading()
  content = content.replace(/Taro\.hideLoading\(\)/g, 'hideLoading()');
  
  // 4. 替换 Taro.showToast({
  content = content.replace(/Taro\.showToast\({/g, 'showToast({');

  modified = true;

  // 写回文件
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`✅ ${filePath} - 已修复`);
  
  return true;
}

// 执行修复
console.log('开始批量修复Taro API兼容性问题...\n');

let fixedCount = 0;
filesToFix.forEach(file => {
  if (fixFile(file)) {
    fixedCount++;
  }
});

console.log(`\n完成! 共修复 ${fixedCount}/${filesToFix.length} 个文件`);
