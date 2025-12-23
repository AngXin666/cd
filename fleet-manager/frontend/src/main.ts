/**
 * main.ts - 应用入口文件
 * 初始化 Vue 应用和 Pinia 状态管理
 */

import { createSSRApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { useUserStore } from './store/user';
import { useAppStore } from './store/app';

/**
 * 创建应用实例
 * UniApp 使用 SSR 模式创建应用
 * 
 * @returns 应用实例对象
 */
export function createApp() {
  // 创建 Vue 应用实例
  const app = createSSRApp(App);
  
  // 创建 Pinia 状态管理实例
  const pinia = createPinia();
  
  // 注册 Pinia
  app.use(pinia);
  
  // 初始化应用状态
  const appStore = useAppStore(pinia);
  appStore.init();
  
  // 从本地存储恢复用户状态
  const userStore = useUserStore(pinia);
  userStore.initFromStorage();
  
  return {
    app,
    pinia,
  };
}
