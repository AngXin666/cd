/**
 * 步骤指示器组件 - 优化版
 * 显示多步骤流程的当前进度
 */

import {Text, View} from '@tarojs/components'
import type React from 'react'

export interface Step {
  title: string
  description?: string
}

interface StepIndicatorProps {
  steps: Step[]
  currentStep: number // 当前步骤索引（从0开始）
}

const StepIndicator: React.FC<StepIndicatorProps> = ({steps, currentStep}) => {
  return (
    <View className="bg-white rounded-2xl p-5 mb-4 shadow-md">
      <View className="flex items-center justify-between">
        {steps.map((step, index) => (
          <View key={index} className="flex-1 flex items-center">
            {/* 步骤圆圈 */}
            <View className="flex flex-col items-center flex-1">
              <View
                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all ${
                  index < currentStep
                    ? 'bg-gradient-to-br from-green-500 to-green-600'
                    : index === currentStep
                      ? 'bg-gradient-to-br from-blue-600 to-blue-700'
                      : 'bg-gray-200'
                }`}>
                {index < currentStep ? (
                  <View className="i-mdi-check-circle text-2xl text-white"></View>
                ) : (
                  <Text className={`text-base font-bold ${index === currentStep ? 'text-white' : 'text-gray-500'}`}>
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text
                className={`text-xs mt-2 text-center font-medium ${
                  index === currentStep ? 'text-blue-600' : index < currentStep ? 'text-green-600' : 'text-gray-400'
                }`}>
                {step.title}
              </Text>
            </View>

            {/* 连接线 */}
            {index < steps.length - 1 && (
              <View
                className={`h-1 flex-1 mx-2 rounded-full transition-all ${
                  index < currentStep ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gray-200'
                }`}></View>
            )}
          </View>
        ))}
      </View>
    </View>
  )
}

export default StepIndicator
