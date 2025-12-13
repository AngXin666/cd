/**
 * 批量为所有页面添加 TopNavBar 组件
 */
const fs = require('fs');
const path = require('path');

// 需要处理的页面目录
const pagesDir = path.join(__dirname, '..', 'src', 'pages');

// 已经处理过的页面（跳过）
const alreadyProcessed = [
  'src/pages/index/index.tsx',
  'src/pages/login/index.tsx',
  'src/pages/driver/index.tsx',
  'src/pages/manager/index.tsx',
  'src/pages/profile/index.tsx',
  'src/pages/super-admin/index.tsx'
];

// 不是页面的文件（组件）
const skipFiles = [
  'components'
];

// 递归获取所有 index.tsx 文件
function getAllPageFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      // 跳过 components 目录
      if (!skipFiles.includes(item)) {
        getAllPageFiles(fullPath, files);
      }
    } else if (item === 'index.tsx') {
      files.push(fullPath);
    }
  }
  return files;
}

// 处理单个文件
function processFile(filePath) {
  const relativePath = filePath.replace(path.join(__dirname, '..') + path.sep, '').replace(/\\/g, '/');
  
  // 跳过已处理的文件
  if (alreadyProcessed.includes(relativePath)) {
    console.log(`跳过已处理: ${relativePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  
  // 检查是否已经有 TopNavBar
  if (content.includes('TopNavBar')) {
    console.log(`已有TopNavBar: ${relativePath}`);
    return;
  }

  // 检查是否有 View 和 ScrollView 的 import
  if (!content.includes("from '@tarojs/components'")) {
    console.log(`非Taro页面: ${relativePath}`);
    return;
  }

  // 1. 添加 TopNavBar import
  // 找到最后一个 import 语句
  const importRegex = /^import .+ from ['"][^'"]+['"];?\s*$/gm;
  let lastImportMatch;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    lastImportMatch = match;
  }

  if (lastImportMatch) {
    const insertPos = lastImportMatch.index + lastImportMatch[0].length;
    const importStatement = "\nimport TopNavBar from '@/components/TopNavBar'";
    
    // 检查是否已经有这个 import
    if (!content.includes("import TopNavBar from '@/components/TopNavBar'")) {
      content = content.slice(0, insertPos) + importStatement + content.slice(insertPos);
    }
  }

  // 2. 在 return 语句的第一个 View 后添加 TopNavBar
  // 查找 return ( 后的第一个 <View
  const returnViewRegex = /return\s*\(\s*\n?\s*<View([^>]*)>/;
  const returnMatch = content.match(returnViewRegex);
  
  if (returnMatch) {
    const fullMatch = returnMatch[0];
    const viewAttrs = returnMatch[1];
    
    // 在 <View...> 后添加 TopNavBar
    const replacement = fullMatch + '\n      {/* 顶部导航栏 */}\n      <TopNavBar />';
    content = content.replace(fullMatch, replacement);
    
    console.log(`已处理: ${relativePath}`);
    fs.writeFileSync(filePath, content, 'utf-8');
  } else {
    console.log(`未找到return View: ${relativePath}`);
  }
}

// 主函数
function main() {
  console.log('开始批量添加 TopNavBar...\n');
  
  const files = getAllPageFiles(pagesDir);
  console.log(`找到 ${files.length} 个页面文件\n`);
  
  for (const file of files) {
    processFile(file);
  }
  
  console.log('\n完成!');
}

main();
