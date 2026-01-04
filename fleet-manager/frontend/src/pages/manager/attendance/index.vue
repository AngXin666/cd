<template>
  <!--
    车队长端 - 考勤管理页面
    使用公共组件 AttendancePage，传入 role="manager"
    
    功能特性：
    - 显示车队长管辖的仓库（支持多仓库）
    - 考勤记录和计件统计
    
    @module pages/manager/attendance
    @requirements 1.5 - 替换原有页面使用公共组件
  -->
  <AttendancePage role="manager" />
</template>

<script setup lang="ts">
/**
 * 车队长端 - 考勤管理页面
 * 
 * 使用公共组件 AttendancePage，传入 role="manager"
 * Manager 角色会显示用户管辖的仓库（支持多仓库），支持仓库切换
 * 修复了原有页面"只支持单仓库"的 bug
 * 
 * @module pages/manager/attendance
 * @requirements 1.5 - 替换原有页面使用公共组件
 */

import { AttendancePage } from '@/components'
</script>

<style lang="scss" scoped>
/* 样式由公共组件提供 */
</style>
