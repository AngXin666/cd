<template>
  <!-- 
    请假详情页面（车队长端）
    使用 LeaveDetail 公共组件
    Requirements: 2.3
  -->
  <LeaveDetail 
    :leaveId="leaveId"
    :showNavBar="false"
    :navigateBackOnApprove="false"
  />
</template>

<script setup lang="ts">
/**
 * 请假详情页面（车队长端）
 * 使用 LeaveDetail 公共组件实现
 * 
 * @requirements 2.3 - 使用公共组件替换原有页面
 */

import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import LeaveDetail from '@/components/LeaveDetail/index.vue'

/** 请假申请 ID */
const leaveId = ref<number>(0)

onLoad((options) => {
  if (options?.id) {
    leaveId.value = parseInt(options.id as string, 10)
  }
})
</script>
