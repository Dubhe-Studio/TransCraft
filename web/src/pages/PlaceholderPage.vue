<!-- TODO: 用户确认的占位页。原因：该功能尚未实现；完成条件：对应业务页面开发完成后从路由中移除此组件；跟踪：TODO.md 第一阶段 -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const title = computed(() => route.meta.title ?? '页面')
</script>

<template>
  <a-result status="info" :title="`${title} 功能开发中`">
    <template #subtitle>该功能将在后续迭代中提供，规划见仓库 TODO.md。</template>
  </a-result>
</template>
