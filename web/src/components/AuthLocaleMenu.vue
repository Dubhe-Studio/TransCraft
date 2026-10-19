<script setup lang="ts">
// 游客页（登录 / 注册）右上角的界面语言入口，两页共用，避免下拉与语言表各自维护
import { useLocaleStore } from '@/i18n'

const localeStore = useLocaleStore()
</script>

<template>
  <div class="auth-locale">
    <a-dropdown trigger="hover">
      <a-button type="text">
        <template #icon>
          <icon-language />
        </template>
        {{ localeStore.current.label }} <icon-down />
      </a-button>
      <template #content>
        <a-doption
          v-for="item in localeStore.locales"
          :key="item.code"
          :disabled="item.code === localeStore.locale"
          @click="localeStore.setLocale(item.code)"
        >
          {{ item.label }}
        </a-doption>
      </template>
    </a-dropdown>
  </div>
</template>

<style scoped lang="scss">
// 贴页面右上角，定位基准由外层 .auth-page 的 position: relative 提供
.auth-locale {
  position: absolute;
  top: 24px;
  right: 24px;
}
</style>
