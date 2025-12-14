/**
 * 编码工具模块
 * 提供统一的文件读写和命令执行接口，确保使用 UTF-8 编码
 * 解决 Windows 系统上的编码问题
 * @module scripts/encoding-utils
 */

const fs = require('fs').promises;
const { exec } = require('child_process');
const util = require('util');
const path = require('path');

// 将 exec 转换为 Promise
const execPromise = util.promisify(exec);

/**
 * 读取文件内容（UTF-8 编码）
 * @param {string} filePath - 文件路径（相对或绝对路径）
 * @returns {Promise<string>} 文件内容
 * @throws {Error} 当文件不存在或读取失败时抛出错误
 * @example
 * const content = await readFileUTF8('package.json');
 * console.log(content);
 */
async function readFileUTF8(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    throw new Error(`读取文件失败 [${filePath}]: ${error.message}`);
  }
}

/**
 * 写入文件内容（UTF-8 编码）
 * @param {string} filePath - 文件路径（相对或绝对路径）
 * @param {string} content - 要写入的内容
 * @returns {Promise<void>}
 * @throws {Error} 当写入失败时抛出错误
 * @example
 * await writeFileUTF8('output.txt', '你好，世界！');
 */
async function writeFileUTF8(filePath, content) {
  try {
    // 确保目录存在
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    
    // 写入文件
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    throw new Error(`写入文件失败 [${filePath}]: ${error.message}`);
  }
}

/**
 * 追加内容到文件（UTF-8 编码）
 * @param {string} filePath - 文件路径（相对或绝对路径）
 * @param {string} content - 要追加的内容
 * @returns {Promise<void>}
 * @throws {Error} 当追加失败时抛出错误
 * @example
 * await appendFileUTF8('log.txt', '新的日志行\n');
 */
async function appendFileUTF8(filePath, content) {
  try {
    await fs.appendFile(filePath, content, 'utf-8');
  } catch (error) {
    throw new Error(`追加文件失败 [${filePath}]: ${error.message}`);
  }
}

/**
 * 检查文件是否存在
 * @param {string} filePath - 文件路径
 * @returns {Promise<boolean>} 文件是否存在
 * @example
 * if (await fileExists('config.json')) {
 *   console.log('配置文件存在');
 * }
 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 执行命令并正确处理编码（UTF-8）
 * @param {string} command - 要执行的命令
 * @param {Object} options - 执行选项
 * @param {string} options.cwd - 工作目录
 * @param {number} options.timeout - 超时时间（毫秒）
 * @returns {Promise<{stdout: string, stderr: string}>} 命令输出
 * @throws {Error} 当命令执行失败时抛出错误
 * @example
 * const { stdout } = await execUTF8('git status');
 * console.log(stdout);
 */
async function execUTF8(command, options = {}) {
  try {
    // 设置环境变量，确保使用 UTF-8 编码
    const env = {
      ...process.env,
      CHCP: '65001',
      PYTHONIOENCODING: 'utf-8',
      LANG: 'zh_CN.UTF-8',
      LC_ALL: 'zh_CN.UTF-8'
    };
    
    // 执行命令
    const result = await execPromise(command, {
      encoding: 'utf-8',
      env,
      ...options
    });
    
    return result;
  } catch (error) {
    // 即使命令失败，也返回输出（某些命令会在 stderr 中输出有用信息）
    throw new Error(`命令执行失败 [${command}]: ${error.message}\nstdout: ${error.stdout}\nstderr: ${error.stderr}`);
  }
}

/**
 * 读取 JSON 文件（UTF-8 编码）
 * @param {string} filePath - JSON 文件路径
 * @returns {Promise<any>} 解析后的 JSON 对象
 * @throws {Error} 当文件不存在、读取失败或 JSON 解析失败时抛出错误
 * @example
 * const config = await readJSONFileUTF8('config.json');
 * console.log(config.version);
 */
async function readJSONFileUTF8(filePath) {
  try {
    const content = await readFileUTF8(filePath);
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`读取 JSON 文件失败 [${filePath}]: ${error.message}`);
  }
}

/**
 * 写入 JSON 文件（UTF-8 编码，格式化输出）
 * @param {string} filePath - JSON 文件路径
 * @param {any} data - 要写入的数据对象
 * @param {number} indent - 缩进空格数（默认 2）
 * @returns {Promise<void>}
 * @throws {Error} 当写入失败时抛出错误
 * @example
 * await writeJSONFileUTF8('config.json', { version: '1.0.0' });
 */
async function writeJSONFileUTF8(filePath, data, indent = 2) {
  try {
    const content = JSON.stringify(data, null, indent);
    await writeFileUTF8(filePath, content);
  } catch (error) {
    throw new Error(`写入 JSON 文件失败 [${filePath}]: ${error.message}`);
  }
}

/**
 * 复制文件（保持 UTF-8 编码）
 * @param {string} sourcePath - 源文件路径
 * @param {string} destPath - 目标文件路径
 * @returns {Promise<void>}
 * @throws {Error} 当复制失败时抛出错误
 * @example
 * await copyFileUTF8('template.txt', 'output.txt');
 */
async function copyFileUTF8(sourcePath, destPath) {
  try {
    // 确保目标目录存在
    const destDir = path.dirname(destPath);
    await fs.mkdir(destDir, { recursive: true });
    
    // 复制文件
    await fs.copyFile(sourcePath, destPath);
  } catch (error) {
    throw new Error(`复制文件失败 [${sourcePath} -> ${destPath}]: ${error.message}`);
  }
}

/**
 * 读取目录中的所有文件
 * @param {string} dirPath - 目录路径
 * @param {Object} options - 选项
 * @param {boolean} options.recursive - 是否递归读取子目录（默认 false）
 * @param {string[]} options.extensions - 文件扩展名过滤（例如 ['.js', '.ts']）
 * @returns {Promise<string[]>} 文件路径数组
 * @throws {Error} 当读取失败时抛出错误
 * @example
 * const files = await readDirectoryUTF8('./src', { recursive: true, extensions: ['.js', '.ts'] });
 * console.log(files);
 */
async function readDirectoryUTF8(dirPath, options = {}) {
  const { recursive = false, extensions = [] } = options;
  const files = [];
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        // 递归读取子目录
        if (recursive) {
          const subFiles = await readDirectoryUTF8(fullPath, options);
          files.push(...subFiles);
        }
      } else if (entry.isFile()) {
        // 检查文件扩展名
        if (extensions.length === 0 || extensions.some(ext => fullPath.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    }
    
    return files;
  } catch (error) {
    throw new Error(`读取目录失败 [${dirPath}]: ${error.message}`);
  }
}

// 导出所有函数
module.exports = {
  readFileUTF8,
  writeFileUTF8,
  appendFileUTF8,
  fileExists,
  execUTF8,
  readJSONFileUTF8,
  writeJSONFileUTF8,
  copyFileUTF8,
  readDirectoryUTF8
};
