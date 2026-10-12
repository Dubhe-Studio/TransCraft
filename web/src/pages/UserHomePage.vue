<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { userProfile } from '../api/user'
import type { UserPublicProfile } from '../api/types'

const route = useRoute()
const router = useRouter()

const username = String(route.params.name)

const profile = ref<UserPublicProfile | null>(null)
const loading = ref(true)
const loadError = ref('')

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    profile.value = await userProfile(username)
  } catch (error) {
    console.error('加载用户主页失败:', error)
    loadError.value = error instanceof Error ? error.message : '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="user-home">
    <a-spin :loading="loading" class="user-home__spin">
      <a-result v-if="loadError" status="error" :title="loadError">
        <template #extra>
          <a-button type="primary" @click="load">重试</a-button>
        </template>
      </a-result>

      <template v-else-if="profile">
        <div class="user-home__card">
          <a-avatar :size="64" :image-url="profile.avatarUrl || undefined">
            {{ profile.displayName.slice(0, 1) }}
          </a-avatar>
          <div>
            <a-typography-title :heading="5" style="margin: 0">
              {{ profile.displayName }}
              <a-typography-text type="secondary">@{{ profile.username }}</a-typography-text>
            </a-typography-title>
            <a-typography-text type="secondary">
              首要语言 {{ profile.primaryLanguage }}
              <template v-if="profile.secondaryLanguages.length > 0">
                · 次要语言 {{ profile.secondaryLanguages.join('、') }}
              </template>
            </a-typography-text>
          </div>
        </div>

        <a-typography-title :heading="6">关注的项目</a-typography-title>
        <a-empty v-if="profile.followed.length === 0" description="还没有关注的项目" />
        <a-list v-else :data="profile.followed" :bordered="false">
          <template #item="{ item }">
            <a-list-item class="user-home__project" @click="router.push({ name: 'project-detail', params: { id: item.id } })">
              <a-list-item-meta :title="item.name" :description="item.description">
                <template #avatar>
                  <icon-folder class="user-home__folder" />
                </template>
              </a-list-item-meta>
            </a-list-item>
          </template>
        </a-list>
      </template>
    </a-spin>
  </div>
</template>

<style scoped lang="scss">
.user-home {
  max-width: 720px;

  &__spin {
    width: 100%;
  }

  &__card {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
  }

  &__project {
    cursor: pointer;

    &:hover {
      background-color: var(--color-fill-1);
    }
  }

  &__folder {
    color: rgb(var(--primary-6));
    font-size: 24px;
  }
}
</style>
