/**
 * 日志工具
 * 将日志同时输出到 console 和本地存储
 */

interface LogEntry {
  timestamp: string
  level: 'log' | 'info' | 'warn' | 'error'
  message: string
  data?: any
}

class Logger {
  private logs: LogEntry[] = []
  private maxLogs = 1000 // 最多保存 1000 条日志
  private storageKey = 'app_debug_logs'

  constructor() {
    // 从本地存储加载历史日志
    this.loadLogs()
  }

  /**
   * 从本地存储加载日志
   */
  private loadLogs() {
    try {
      const stored = uni.getStorageSync(this.storageKey)
      if (stored) {
        this.logs = JSON.parse(stored)
      }
    } catch (error) {
      console.error('加载日志失败:', error)
    }
  }

  /**
   * 保存日志到本地存储
   */
  private saveLogs() {
    try {
      // 只保留最新的 maxLogs 条日志
      if (this.logs.length > this.maxLogs) {
        this.logs = this.logs.slice(-this.maxLogs)
      }
      uni.setStorageSync(this.storageKey, JSON.stringify(this.logs))
    } catch (error) {
      console.error('保存日志失败:', error)
    }
  }

  /**
   * 添加日志条目
   */
  private addLog(level: LogEntry['level'], message: string, data?: any) {
    const timestamp = new Date().toISOString()
    const entry: LogEntry = {
      timestamp,
      level,
      message,
      data: data !== undefined ? data : undefined
    }
    
    this.logs.push(entry)
    this.saveLogs()
  }

  /**
   * 普通日志
   */
  log(message: string, ...args: any[]) {
    console.log(message, ...args)
    this.addLog('log', message, args.length > 0 ? args : undefined)
  }

  /**
   * 信息日志
   */
  info(message: string, ...args: any[]) {
    console.info(message, ...args)
    this.addLog('info', message, args.length > 0 ? args : undefined)
  }

  /**
   * 警告日志
   */
  warn(message: string, ...args: any[]) {
    console.warn(message, ...args)
    this.addLog('warn', message, args.length > 0 ? args : undefined)
  }

  /**
   * 错误日志
   */
  error(message: string, ...args: any[]) {
    console.error(message, ...args)
    this.addLog('error', message, args.length > 0 ? args : undefined)
  }

  /**
   * 获取所有日志
   */
  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  /**
   * 获取格式化的日志文本
   */
  getLogsText(): string {
    return this.logs.map(entry => {
      const time = new Date(entry.timestamp).toLocaleString('zh-CN')
      const dataStr = entry.data ? ` | ${JSON.stringify(entry.data)}` : ''
      return `[${time}] [${entry.level.toUpperCase()}] ${entry.message}${dataStr}`
    }).join('\n')
  }

  /**
   * 清空日志
   */
  clearLogs() {
    this.logs = []
    try {
      uni.removeStorageSync(this.storageKey)
    } catch (error) {
      console.error('清空日志失败:', error)
    }
  }

  /**
   * 导出日志到剪贴板
   */
  exportToClipboard() {
    const text = this.getLogsText()
    uni.setClipboardData({
      data: text,
      success: () => {
        uni.showToast({
          title: '日志已复制到剪贴板',
          icon: 'success'
        })
      },
      fail: () => {
        uni.showToast({
          title: '复制失败',
          icon: 'none'
        })
      }
    })
  }

  /**
   * 下载日志文件 (H5 环境)
   */
  downloadLogs() {
    // #ifdef H5
    const text = this.getLogsText()
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `app-logs-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    uni.showToast({
      title: '日志已下载',
      icon: 'success'
    })
    // #endif
    
    // #ifndef H5
    uni.showToast({
      title: '仅 H5 环境支持下载',
      icon: 'none'
    })
    // #endif
  }
}

// 创建全局日志实例
export const logger = new Logger()

// 导出类型
export type { LogEntry }
