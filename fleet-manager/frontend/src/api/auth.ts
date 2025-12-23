/**
 * 认证相关 API
 * 登录、获取用户信息、修改密码
 */

import { post, get, put } from './request'
import type { User, LoginResponse } from '@/types'

/**
 * 用户登录
 * 
 * @param username - 用户名
 * @param password - 密码
 * @returns 登录响应（包含 Token 和用户信息）
 */
export function login(username: string, password: string): Promise<LoginResponse> {
  // 登录不需要认证
  return post<LoginResponse>('/auth/login', {
    username,
    password
  }, false)
}

/**
 * 获取当前用户信息
 * 
 * @returns 用户信息
 */
export function getCurrentUser(): Promise<User> {
  return get<User>('/auth/me')
}

/**
 * 修改密码
 * 
 * @param oldPassword - 旧密码
 * @param newPassword - 新密码
 * @returns 操作结果
 */
export function changePassword(oldPassword: string, newPassword: string): Promise<{ message: string }> {
  return put<{ message: string }>('/auth/password', {
    old_password: oldPassword,
    new_password: newPassword
  })
}
