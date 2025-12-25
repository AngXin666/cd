/**
 * 确认对话框工具函数模块
 * 提供各种确认对话框的封装函数
 * @module utils/confirm
 * 
 * Requirements: 2.8
 */

/**
 * 删除确认对话框选项
 */
export interface DeleteConfirmOptions {
  /** 对话框标题，默认 '确认删除' */
  title?: string
  /** 对话框内容 */
  content: string
  /** 确认按钮文字，默认 '删除' */
  confirmText?: string
  /** 取消按钮文字，默认 '取消' */
  cancelText?: string
  /** 确认按钮颜色，默认 '#ff4d4f'（红色） */
  confirmColor?: string
}

/**
 * 显示删除确认对话框
 * 
 * @param title - 对话框标题
 * @param content - 对话框内容
 * @returns Promise，用户确认返回 true，取消返回 false
 * 
 * @example
 * const confirmed = await confirmDelete('确认删除', '确定要删除这条记录吗？')
 * if (confirmed) {
 *   // 执行删除操作
 * }
 */
export function confirmDelete(title: string, content: string): Promise<boolean> {
  return new Promise((resolve) => {
    uni.showModal({
      title,
      content,
      confirmText: '删除',
      confirmColor: '#ff4d4f',
      cancelText: '取消',
      success: (res) => {
        resolve(res.confirm)
      },
      fail: () => {
        resolve(false)
      },
    })
  })
}

/**
 * 显示删除确认对话框（带详细选项）
 * 
 * @param options - 对话框选项
 * @returns Promise，用户确认返回 true，取消返回 false
 * 
 * @example
 * const confirmed = await confirmDeleteWithOptions({
 *   title: '删除计件记录',
 *   content: '仓库：北京仓库\n品类：快递\n件数：100\n金额：¥500.00',
 *   confirmText: '确认删除',
 * })
 */
export function confirmDeleteWithOptions(options: DeleteConfirmOptions): Promise<boolean> {
  const {
    title = '确认删除',
    content,
    confirmText = '删除',
    cancelText = '取消',
    confirmColor = '#ff4d4f',
  } = options
  
  return new Promise((resolve) => {
    uni.showModal({
      title,
      content,
      confirmText,
      confirmColor,
      cancelText,
      success: (res) => {
        resolve(res.confirm)
      },
      fail: () => {
        resolve(false)
      },
    })
  })
}

/**
 * 显示通用确认对话框
 * 
 * @param title - 对话框标题
 * @param content - 对话框内容
 * @param confirmText - 确认按钮文字，默认 '确定'
 * @param cancelText - 取消按钮文字，默认 '取消'
 * @returns Promise，用户确认返回 true，取消返回 false
 * 
 * @example
 * const confirmed = await confirm('提示', '确定要执行此操作吗？')
 * if (confirmed) {
 *   // 执行操作
 * }
 */
export function confirm(
  title: string,
  content: string,
  confirmText = '确定',
  cancelText = '取消'
): Promise<boolean> {
  return new Promise((resolve) => {
    uni.showModal({
      title,
      content,
      confirmText,
      cancelText,
      success: (res) => {
        resolve(res.confirm)
      },
      fail: () => {
        resolve(false)
      },
    })
  })
}

/**
 * 显示警告对话框（只有确认按钮）
 * 
 * @param title - 对话框标题
 * @param content - 对话框内容
 * @param confirmText - 确认按钮文字，默认 '我知道了'
 * @returns Promise，用户点击确认后 resolve
 * 
 * @example
 * await alert('提示', '操作已完成')
 */
export function alert(
  title: string,
  content: string,
  confirmText = '我知道了'
): Promise<void> {
  return new Promise((resolve) => {
    uni.showModal({
      title,
      content,
      showCancel: false,
      confirmText,
      success: () => {
        resolve()
      },
      fail: () => {
        resolve()
      },
    })
  })
}

/**
 * 显示计件记录删除确认对话框
 * 包含仓库、品类、件数、金额等详细信息
 * 
 * @param record - 计件记录信息
 * @param record.warehouseName - 仓库名称
 * @param record.categoryName - 品类名称
 * @param record.quantity - 件数
 * @param record.amount - 金额
 * @returns Promise，用户确认返回 true，取消返回 false
 * 
 * @example
 * const confirmed = await confirmDeletePieceWorkRecord({
 *   warehouseName: '北京仓库',
 *   categoryName: '快递',
 *   quantity: 100,
 *   amount: 500.00,
 * })
 */
export function confirmDeletePieceWorkRecord(record: {
  warehouseName: string
  categoryName: string
  quantity: number
  amount: number
}): Promise<boolean> {
  const { warehouseName, categoryName, quantity, amount } = record
  
  // 构建详细的确认内容
  const content = [
    `仓库：${warehouseName}`,
    `品类：${categoryName}`,
    `件数：${quantity}`,
    `金额：¥${amount.toFixed(2)}`,
    '',
    '删除后无法恢复，确定要删除吗？',
  ].join('\n')
  
  return confirmDelete('删除计件记录', content)
}

/**
 * 显示编辑确认对话框
 * 
 * @param title - 对话框标题，默认 '确认修改'
 * @param content - 对话框内容，默认 '确定要保存修改吗？'
 * @returns Promise，用户确认返回 true，取消返回 false
 * 
 * @example
 * const confirmed = await confirmEdit()
 * if (confirmed) {
 *   // 保存修改
 * }
 */
export function confirmEdit(
  title = '确认修改',
  content = '确定要保存修改吗？'
): Promise<boolean> {
  return confirm(title, content, '保存', '取消')
}

/**
 * 显示重复记录处理对话框
 * 用于计件录入时发现重复记录的处理
 * 
 * @param existingQuantity - 已存在记录的件数
 * @param newQuantity - 新录入的件数
 * @returns Promise，返回用户选择：'accumulate'（累计）、'new'（新增）、'cancel'（取消）
 * 
 * @example
 * const choice = await confirmDuplicateRecord(100, 50)
 * if (choice === 'accumulate') {
 *   // 累计到现有记录
 * } else if (choice === 'new') {
 *   // 创建新记录
 * }
 */
export function confirmDuplicateRecord(
  existingQuantity: number,
  newQuantity: number
): Promise<'accumulate' | 'new' | 'cancel'> {
  return new Promise((resolve) => {
    // 使用 uni.showActionSheet 显示选项
    uni.showActionSheet({
      itemList: [
        `累计到现有记录（${existingQuantity} + ${newQuantity} = ${existingQuantity + newQuantity}件）`,
        '创建新记录',
      ],
      success: (res) => {
        if (res.tapIndex === 0) {
          resolve('accumulate')
        } else if (res.tapIndex === 1) {
          resolve('new')
        }
      },
      fail: () => {
        resolve('cancel')
      },
    })
  })
}

/**
 * 显示重复记录处理对话框（使用 Modal）
 * 
 * @param warehouseName - 仓库名称
 * @param categoryName - 品类名称
 * @param existingQuantity - 已存在记录的件数
 * @param newQuantity - 新录入的件数
 * @returns Promise，返回用户选择：'accumulate'（累计）、'cancel'（取消）
 * 
 * @example
 * const choice = await confirmDuplicateRecordModal('北京仓库', '快递', 100, 50)
 */
export function confirmDuplicateRecordModal(
  warehouseName: string,
  categoryName: string,
  existingQuantity: number,
  newQuantity: number
): Promise<'accumulate' | 'cancel'> {
  const content = [
    `发现相同日期、仓库、品类的记录：`,
    `仓库：${warehouseName}`,
    `品类：${categoryName}`,
    `已有件数：${existingQuantity}`,
    `新增件数：${newQuantity}`,
    '',
    `是否累计到现有记录？`,
    `累计后：${existingQuantity + newQuantity}件`,
  ].join('\n')
  
  return new Promise((resolve) => {
    uni.showModal({
      title: '发现重复记录',
      content,
      confirmText: '累计',
      cancelText: '取消',
      success: (res) => {
        resolve(res.confirm ? 'accumulate' : 'cancel')
      },
      fail: () => {
        resolve('cancel')
      },
    })
  })
}
