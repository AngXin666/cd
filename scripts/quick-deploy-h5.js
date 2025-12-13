/**
 * 快速部署H5热更新
 * 运行: node scripts/quick-deploy-h5.js [版本号] [更新说明]
 * 示例: node scripts/quick-deploy-h5.js 1.0.5 "优化顶部安全区域"
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const SUPABASE_URL = 'https://wxvrwkpkioalqdsfswwu.supabase.co';
// Service Role Key - 用于绕过 RLS 策略
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dnJ3a3BraW9hbHFkc2Zzd3d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc1MDM1NCwiZXhwIjoyMDgwMzI2MzU0fQ.XoPzVOJtqwl2ftmE6Xh_TYwq_3p9T2ml8pfbWaU7i24';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// 获取命令行参数
const version = process.argv[2] || '1.0.5';
const releaseNotes = process.argv[3] || '优化顶部安全区域';

async function uploadFile(filePath, storagePath) {
  const fileContent = fs.readFileSync(filePath);
  const contentType = getContentType(filePath);
  
  const { data, error } = await supabase.storage
    .from('h5-app')
    .upload(storagePath, fileContent, {
      contentType,
      upsert: true
    });
  
  if (error) {
    console.log(`  ❌ 上传失败: ${storagePath}`, error.message);
    return false;
  }
  console.log(`  ✅ ${storagePath}`);
  return true;
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
  };
  return types[ext] || 'application/octet-stream';
}

async function uploadDirectory(localDir, remoteDir) {
  const files = fs.readdirSync(localDir);
  let success = 0;
  let failed = 0;
  
  for (const file of files) {
    const localPath = path.join(localDir, file);
    const remotePath = `${remoteDir}/${file}`;
    const stat = fs.statSync(localPath);
    
    if (stat.isDirectory()) {
      const result = await uploadDirectory(localPath, remotePath);
      success += result.success;
      failed += result.failed;
    } else {
      const ok = await uploadFile(localPath, remotePath);
      if (ok) success++; else failed++;
    }
  }
  
  return { success, failed };
}

/**
 * 创建 bundle.zip 文件
 */
async function createBundleZip(distDir, outputPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`   ✅ bundle.zip 创建成功 (${(archive.pointer() / 1024).toFixed(1)} KB)`);
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);
    archive.directory(distDir, false);
    archive.finalize();
  });
}

async function deploy() {
  console.log('========================================');
  console.log('H5 热更新部署');
  console.log('========================================');
  console.log(`版本: ${version}`);
  console.log(`说明: ${releaseNotes}`);
  console.log('');

  // 1. 检查 dist 目录
  const distDir = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(distDir)) {
    console.log('❌ dist 目录不存在，请先运行 npm run build:h5');
    process.exit(1);
  }

  // 2. 创建 bundle.zip
  console.log('1. 创建 bundle.zip...');
  const bundleZipPath = path.join(__dirname, '..', 'bundle.zip');
  await createBundleZip(distDir, bundleZipPath);
  console.log('');

  // 3. 上传 bundle.zip 到 Storage
  console.log('2. 上传 bundle.zip 到 Supabase Storage...');
  const remoteDir = `v${version}`;
  const bundleUploaded = await uploadFile(bundleZipPath, `${remoteDir}/bundle.zip`);
  if (!bundleUploaded) {
    console.log('❌ bundle.zip 上传失败');
    process.exit(1);
  }
  console.log('');

  // 4. 上传其他文件到 Storage（可选，用于浏览器访问）
  console.log('3. 上传其他文件到 Supabase Storage...');
  const result = await uploadDirectory(distDir, remoteDir);
  console.log(`   上传完成: ${result.success} 成功, ${result.failed} 失败`);
  console.log('');

  // 清理临时文件
  fs.unlinkSync(bundleZipPath);

  if (result.failed > 0) {
    console.log('⚠️ 部分文件上传失败，请检查');
  }

  // 5. 更新数据库版本记录
  console.log('4. 更新数据库版本记录...');
  const h5Url = `${SUPABASE_URL}/storage/v1/object/public/h5-app/v${version}/`;
  
  // 先将其他版本设为非激活
  await supabase
    .from('h5_versions')
    .update({ is_active: false })
    .neq('version', version);

  // 检查版本是否存在
  const { data: existing } = await supabase
    .from('h5_versions')
    .select('id')
    .eq('version', version)
    .single();

  let error;
  if (existing) {
    // 更新现有版本
    const result = await supabase
      .from('h5_versions')
      .update({
        h5_url: h5Url,
        release_notes: releaseNotes,
        is_force_update: false,
        is_active: true
      })
      .eq('version', version);
    error = result.error;
  } else {
    // 插入新版本
    const result = await supabase
      .from('h5_versions')
      .insert({
        version,
        h5_url: h5Url,
        release_notes: releaseNotes,
        is_force_update: false,
        is_active: true
      });
    error = result.error;
  }

  if (error) {
    console.log('   ❌ 数据库更新失败:', error.message);
  } else {
    console.log('   ✅ 数据库更新成功');
  }

  console.log('');
  console.log('========================================');
  console.log('部署完成！');
  console.log('========================================');
  console.log(`H5 URL: ${h5Url}`);
  console.log('');
  console.log('APP 会自动检测到新版本并提示更新');
}

deploy().catch(console.error);
