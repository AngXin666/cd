<template>
  <!--
    老板端 - 考勤管理页面
    使用公共组件 AttendancePage，传入 role="boss"
    
    功能特性：
    - 显示所有仓库的仓库切换器
    - 考勤记录和计件统计
    
    @module pages/boss/attendance
    @requirements 1.5 - 替换原有页面使用公共组件
  -->
  <AttendancePage role="boss" />
</template>

<script setup lang="ts">
/**
 * 老板端 - 考勤管理页面
 * 
 * 使用公共组件 AttendancePage，传入 role="boss"
 * Boss 角色会显示所有仓库，支持仓库切换
 * 
 * @module pages/boss/attendance
 * @requirements 1.5 - 替换原有页面使用公共组件
 */

import { AttendancePage } from '@/components'
</script>

<style lang="scss" scoped>
/* 样式由公共组件提供 */
</style>
