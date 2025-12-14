/**
 * 复制登录页背景图到 dist 目录
 * 在 build:h5 之后自动运行
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src', 'assets', 'images');
const destDir = path.join(__dirname, '..', 'dist', 'assets', 'images');

// 创建目标目录
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// 复制背景图
const images = ['login-bg-1.jpg', 'login-bg-2.jpg', 'login-bg-3.jpg', 'truck-bg.jpg'];
images.forEach(img => {
  const src = path.join(srcDir, img);
  const dest = path.join(destDir, img);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✅ 复制: ${img}`);
  }
});

console.log('登录页背景图复制完成');
