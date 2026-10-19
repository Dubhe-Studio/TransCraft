<script setup lang="ts">
</script>

<template>
  <div class="about">
    <a-typography>
      <a-typography-title :heading="4">{{ $t('about.title') }}</a-typography-title>
      <a-typography-paragraph>
        {{ $t('about.intro') }}
      </a-typography-paragraph>

      <a-typography-title :heading="6">{{ $t('about.license_title') }}</a-typography-title>
      <a-typography-paragraph>
        {{ $t('about.license') }}
      </a-typography-paragraph>

      <a-typography-title :heading="6">{{ $t('about.source_code_title') }}</a-typography-title>
      <a-typography-paragraph>
        <a-link href="https://github.com/Dubhe-Studio/TransCraft" target="_blank">
          github.com/Dubhe-Studio/TransCraft
        </a-link>
      </a-typography-paragraph>

      <a-typography-title :heading="6">{{ $t('about.tech_stack_title') }}</a-typography-title>
      <a-typography-paragraph>
        {{ $t('about.tech_stack') }}
      </a-typography-paragraph>
    </a-typography>
  </div>
</template>

<style scoped lang="scss">
.about {
  max-width: 640px;
}
</style>
