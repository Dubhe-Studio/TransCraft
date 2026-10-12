<script setup lang="ts">
</script>

<template>
  <div class="about">
    <a-typography>
      <a-typography-title :heading="4">关于 TransCraft</a-typography-title>
      <a-typography-paragraph>
        TransCraft 是一个面向 Minecraft 模组社区的协作翻译管理平台，支持多用户、多项目的语言文件翻译与进度跟踪。
      </a-typography-paragraph>

      <a-typography-title :heading="6">开源许可</a-typography-title>
      <a-typography-paragraph>
        本项目以 GNU Affero General Public License v3.0（AGPL-3.0）协议开源。
      </a-typography-paragraph>

      <a-typography-title :heading="6">源代码</a-typography-title>
      <a-typography-paragraph>
        <a-link href="https://github.com/Dubhe-Studio/TransCraft" target="_blank">
          github.com/Dubhe-Studio/TransCraft
        </a-link>
      </a-typography-paragraph>

      <a-typography-title :heading="6">技术栈</a-typography-title>
      <a-typography-paragraph>
        前端 Vite + Vue 3 + Arco Design + TypeScript；后端 Go + Hertz；数据存储 MySQL / PostgreSQL 与 Redis。前端构建产物内嵌于 Go 二进制，同源部署。
      </a-typography-paragraph>
    </a-typography>
  </div>
</template>

<style scoped lang="scss">
.about {
  max-width: 640px;
}
</style>
