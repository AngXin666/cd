/**
 * 微信小程序类型声明
 * 为 WeappStorageAdapter 提供必要的类型定义
 * @module utils/storage/weapp.d.ts
 */

/** 微信小程序全局对象声明 */
declare const wx: {
  /** 获取文件系统管理器 */
  getFileSystemManager(): WechatMiniprogram.FileSystemManager
  /** 环境信息 */
  env: {
    /** 用户数据目录 */
    USER_DATA_PATH: string
  }
  /** 获取存储信息 */
  getStorageInfo(options: {
    success?: (res: { currentSize: number; limitSize: number }) => void
    fail?: (error: { errMsg: string }) => void
  }): void
}

/** 微信小程序命名空间 */
declare namespace WechatMiniprogram {
  /** 文件系统管理器接口 */
  interface FileSystemManager {
    /** 创建目录 */
    mkdir(options: {
      dirPath: string
      recursive?: boolean
      success?: () => void
      fail?: (error: { errMsg: string }) => void
    }): void
    /** 写入文件 */
    writeFile(options: {
      filePath: string
      data: ArrayBuffer | string
      encoding?: 'binary' | 'utf8' | 'base64'
      success?: () => void
      fail?: (error: { errMsg: string }) => void
    }): void
    /** 读取文件 */
    readFile(options: {
      filePath: string
      encoding?: 'binary' | 'utf8' | 'base64'
      success?: (res: { data: ArrayBuffer | string }) => void
      fail?: (error: { errMsg: string }) => void
    }): void
    /** 删除文件 */
    unlink(options: {
      filePath: string
      success?: () => void
      fail?: (error: { errMsg: string }) => void
    }): void
    /** 检查文件/目录是否存在 */
    access(options: {
      path: string
      success?: () => void
      fail?: (error: { errMsg: string }) => void
    }): void
    /** 获取文件/目录状态 */
    stat(options: {
      path: string
      success?: (res: { stats: Stats }) => void
      fail?: (error: { errMsg: string }) => void
    }): void
    /** 读取目录内容 */
    readdir(options: {
      dirPath: string
      success?: (res: { files: string[] }) => void
      fail?: (error: { errMsg: string }) => void
    }): void
    /** 删除目录 */
    rmdir(options: {
      dirPath: string
      recursive?: boolean
      success?: () => void
      fail?: (error: { errMsg: string }) => void
    }): void
    /** 复制文件 */
    copyFile(options: {
      srcPath: string
      destPath: string
      success?: () => void
      fail?: (error: { errMsg: string }) => void
    }): void
    /** 重命名/移动文件 */
    rename(options: {
      oldPath: string
      newPath: string
      success?: () => void
      fail?: (error: { errMsg: string }) => void
    }): void
  }

  /** 文件/目录状态信息 */
  interface Stats {
    /** 文件大小（字节） */
    size: number
    /** 最后访问时间 */
    lastAccessedTime: number
    /** 最后修改时间 */
    lastModifiedTime: number
    /** 是否为文件 */
    isFile(): boolean
    /** 是否为目录 */
    isDirectory(): boolean
  }
}
