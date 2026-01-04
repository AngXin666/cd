/**
 * WelcomeCard 组件类型定义
 * 欢迎卡片组件，用于三端首页顶部展示
 * 
 * @module components/WelcomeCard
 */

/**
 * WelcomeCard 组件属性
 */
export interface WelcomeCardProps {
  /** 标题（如：老板控制台、司机工作台、车队长工作台） */
  title: string
  /** 副标题（如：欢迎回来，张三） */
  subtitle: string
}
