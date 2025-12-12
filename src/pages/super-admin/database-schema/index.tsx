/**
 * 老板端 - 数据库结构查看器
 * 功能：查看和管理数据库表结构、字段信息、约束等
 */

import {Input, ScrollView, Text, View} from '@tarojs/components'
import Taro, {showLoading, showToast, useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import type {DatabaseColumn, DatabaseConstraint, DatabaseTable} from '@/db/api/users'
import * as UsersAPI from '@/db/api/users'

const DatabaseSchema: React.FC = () => {
  const {user: _user} = useAuth({guard: true})

  // 状态管理
  const [tables, setTables] = useState<DatabaseTable[]>([])
  const [selectedTable, setSelectedTable] = useState<string>('')
  const [columns, setColumns] = useState<DatabaseColumn[]>([])
  const [constraints, setConstraints] = useState<DatabaseConstraint[]>([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [_loading, setLoading] = useState(false)

  // 加载所有表
  const loadTables = useCallback(async () => {
    setLoading(true)
    try {
      const data = await UsersAPI.getDatabaseTables()
      setTables(data)
    } catch (error) {
      console.error('❌ 加载数据库表列表失败:', error)
      showToast({title: '加载失败', icon: 'error'})
    } finally {
      setLoading(false)
    }
  }, [])

  // 加载表详情
  const loadTableDetails = useCallback(async (tableName: string) => {
    showLoading({title: '加载中...'})
    try {
      const [columnsData, constraintsData] = await Promise.all([
        UsersAPI.getTableColumns(tableName),
        UsersAPI.getTableConstraints(tableName)
      ])
      setColumns(columnsData)
      setConstraints(constraintsData)
      setSelectedTable(tableName)
    } catch (error) {
      console.error('❌ 加载表详情失败:', error)
      showToast({title: '加载失败', icon: 'error'})
    } finally {
      Taro.hideLoading()
    }
  }, [])

  // 页面显示时加载数据
  useDidShow(() => {
    loadTables()
  })

  // 过滤表列表
  const filteredTables = tables.filter((table) => table.table_name.toLowerCase().includes(searchKeyword.toLowerCase()))

  // 获取约束类型的中文名称
  const getConstraintTypeName = (type: string): string => {
    const typeMap: Record<string, string> = {
      'PRIMARY KEY': '主键',
      'FOREIGN KEY': '外键',
      UNIQUE: '唯一',
      CHECK: '检查约束'
    }
    return typeMap[type] || type
  }

  // 获取数据类型的显示文本
  const getDataTypeDisplay = (column: DatabaseColumn): string => {
    let display = column.data_type
    if (column.character_maximum_length) {
      display += `(${column.character_maximum_length})`
    } else if (column.numeric_precision && column.numeric_scale !== null) {
      display += `(${column.numeric_precision},${column.numeric_scale})`
    }
    return display
  }

  return (
    <View className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
      {/* 顶部标题栏 */}
      <View className="bg-gradient-to-r from-blue-900 to-blue-700 px-6 pt-12 pb-6 shadow-lg">
        <View className="flex items-center justify-between mb-2">
          <View className="flex items-center">
            <View className="i-mdi-database text-3xl text-white mr-3" />
            <Text className="text-2xl font-bold text-white">数据库结构</Text>
          </View>
          <View className="bg-white/20 px-3 py-1 rounded-full">
            <Text className="text-xs text-white">{tables.length} 个表</Text>
          </View>
        </View>
        <Text className="text-sm text-blue-100">查看和管理数据库表结构</Text>
      </View>

      <ScrollView scrollY className="h-screen box-border" style={{paddingBottom: '120px'}}>
        <View className="p-4">
          {/* 搜索框 */}
          <View className="mb-4">
            <View className="bg-white rounded-xl shadow-md p-4">
              <View className="flex items-center">
                <View className="i-mdi-magnify text-xl text-gray-400 mr-2" />
                <View style={{overflow: 'hidden', flex: 1}}>
                  <Input
                    className="flex-1 text-base"
                    placeholder="搜索表名..."
                    value={searchKeyword}
                    onInput={(e) => setSearchKeyword(e.detail.value)}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* 表列表 */}
          {!selectedTable && (
            <View className="space-y-3">
              {filteredTables.map((table) => (
                <View
                  key={table.table_name}
                  className="bg-white rounded-xl shadow-md p-4 active:bg-gray-50"
                  onClick={() => loadTableDetails(table.table_name)}>
                  <View className="flex items-center justify-between">
                    <View className="flex items-center flex-1">
                      <View className="i-mdi-table text-2xl text-blue-600 mr-3" />
                      <View className="flex-1">
                        <Text className="text-base font-bold text-gray-800 block mb-1">{table.table_name}</Text>
                        <Text className="text-xs text-gray-500">{table.table_schema}</Text>
                      </View>
                    </View>
                    <View className="i-mdi-chevron-right text-xl text-gray-400" />
                  </View>
                </View>
              ))}

              {filteredTables.length === 0 && (
                <View className="text-center py-12">
                  <View className="i-mdi-database-off text-6xl text-gray-300 mb-4" />
                  <Text className="text-gray-400">未找到匹配的表</Text>
                </View>
              )}
            </View>
          )}

          {/* 表详情 */}
          {selectedTable && (
            <View>
              {/* 返回按钮 */}
              <View
                className="bg-white rounded-xl shadow-md p-4 mb-4 active:bg-gray-50"
                onClick={() => setSelectedTable('')}>
                <View className="flex items-center">
                  <View className="i-mdi-arrow-left text-xl text-blue-600 mr-2" />
                  <Text className="text-base text-blue-600 font-medium">返回表列表</Text>
                </View>
              </View>

              {/* 表名 */}
              <View className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl shadow-lg p-6 mb-4">
                <View className="flex items-center mb-2">
                  <View className="i-mdi-table text-3xl text-white mr-3" />
                  <Text className="text-2xl font-bold text-white">{selectedTable}</Text>
                </View>
                <View className="flex items-center space-x-4">
                  <View className="bg-white/20 px-3 py-1 rounded-full">
                    <Text className="text-xs text-white">{columns.length} 个字段</Text>
                  </View>
                  <View className="bg-white/20 px-3 py-1 rounded-full">
                    <Text className="text-xs text-white">{constraints.length} 个约束</Text>
                  </View>
                </View>
              </View>

              {/* 字段列表 */}
              <View className="mb-4">
                <View className="flex items-center mb-3">
                  <View className="i-mdi-format-list-bulleted text-xl text-blue-900 mr-2" />
                  <Text className="text-lg font-bold text-gray-800">字段列表</Text>
                </View>
                <View className="bg-white rounded-xl shadow-md overflow-hidden">
                  {columns.map((column, index) => (
                    <View
                      key={column.column_name}
                      className={`p-4 ${index < columns.length - 1 ? 'border-b border-gray-100' : ''}`}>
                      <View className="flex items-start justify-between mb-2">
                        <View className="flex items-center flex-1">
                          <View className="i-mdi-key-variant text-lg text-blue-600 mr-2" />
                          <Text className="text-base font-bold text-gray-800">{column.column_name}</Text>
                        </View>
                        <View
                          className={`px-2 py-1 rounded ${column.is_nullable === 'YES' ? 'bg-gray-100' : 'bg-red-100'}`}>
                          <Text
                            className={`text-xs ${column.is_nullable === 'YES' ? 'text-gray-600' : 'text-red-600'}`}>
                            {column.is_nullable === 'YES' ? '可空' : '必填'}
                          </Text>
                        </View>
                      </View>
                      <View className="ml-7 space-y-1">
                        <View>
                          <Text className="text-sm text-gray-600">
                            类型：
                            <Text className="font-medium text-blue-600">{getDataTypeDisplay(column)}</Text>
                          </Text>
                        </View>
                        {column.column_default && (
                          <View>
                            <Text className="text-sm text-gray-600">
                              默认值：
                              <Text className="font-mono text-xs text-gray-800">{column.column_default}</Text>
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* 约束列表 */}
              {constraints.length > 0 && (
                <View>
                  <View className="flex items-center mb-3">
                    <View className="i-mdi-shield-check text-xl text-blue-900 mr-2" />
                    <Text className="text-lg font-bold text-gray-800">约束列表</Text>
                  </View>
                  <View className="bg-white rounded-xl shadow-md overflow-hidden">
                    {constraints.map((constraint, index) => (
                      <View
                        key={constraint.constraint_name}
                        className={`p-4 ${index < constraints.length - 1 ? 'border-b border-gray-100' : ''}`}>
                        <View className="flex items-start justify-between mb-2">
                          <View className="flex-1">
                            <Text className="text-sm font-bold text-gray-800 mb-1">{constraint.constraint_name}</Text>
                            <View className="flex items-center">
                              <View
                                className={`px-2 py-1 rounded mr-2 ${
                                  constraint.constraint_type === 'PRIMARY KEY'
                                    ? 'bg-blue-100'
                                    : constraint.constraint_type === 'FOREIGN KEY'
                                      ? 'bg-green-100'
                                      : constraint.constraint_type === 'UNIQUE'
                                        ? 'bg-purple-100'
                                        : 'bg-gray-100'
                                }`}>
                                <Text
                                  className={`text-xs ${
                                    constraint.constraint_type === 'PRIMARY KEY'
                                      ? 'text-blue-600'
                                      : constraint.constraint_type === 'FOREIGN KEY'
                                        ? 'text-green-600'
                                        : constraint.constraint_type === 'UNIQUE'
                                          ? 'text-purple-600'
                                          : 'text-gray-600'
                                  }`}>
                                  {getConstraintTypeName(constraint.constraint_type)}
                                </Text>
                              </View>
                              {constraint.column_name && (
                                <Text className="text-sm text-gray-600">列：{constraint.column_name}</Text>
                              )}
                            </View>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

export default DatabaseSchema
