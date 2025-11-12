/**
 * 步骤指示器组件
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
    <View className="bg-card p-4 mb-4">
      <View className="flex items-center justify-between">
        {steps.map((step, index) => (
          <View key={index} className="flex-1 flex items-center">
            {/* 步骤圆圈 */}
            <View className="flex flex-col items-center flex-1">
              <View
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  index < currentStep ? 'bg-primary' : index === currentStep ? 'bg-primary' : 'bg-muted'
                }`}>
                {index < currentStep ? (
                  <View className="i-mdi-check text-xl text-primary-foreground"></View>
                ) : (
                  <Text
                    className={`text-sm font-medium ${
                      index === currentStep ? 'text-primary-foreground' : 'text-muted-foreground'
                    }`}>
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text
                className={`text-xs mt-1 text-center ${
                  index === currentStep ? 'text-primary font-medium' : 'text-muted-foreground'
                }`}>
                {step.title}
              </Text>
            </View>

            {/* 连接线 */}
            {index < steps.length - 1 && (
              <View className={`h-0.5 flex-1 mx-2 ${index < currentStep ? 'bg-primary' : 'bg-muted'}`}></View>
            )}
          </View>
        ))}
      </View>
    </View>
  )
}

export default StepIndicator
