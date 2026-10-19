<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message } from '@arco-design/web-vue'
import { supportedLanguages } from '../api/language'
import { changePassword, updateMe } from '../api/user'
import type { LanguageInfo } from '../api/types'
import { useAuthStore } from '../stores/auth'

const { t } = useI18n()

const auth = useAuthStore()

const languageList = ref<LanguageInfo[]>([])

const profileForm = reactive({
  displayName: '',
  avatarUrl: '',
  primaryLanguage: '',
  secondaryLanguages: [] as string[],
})
const profileSaving = ref(false)

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})
const passwordSaving = ref(false)

onMounted(async () => {
  try {
    languageList.value = await supportedLanguages()
  } catch (error) {
    console.error('加载语言列表失败:', error)
    Message.error(t('common.load_languages_failed'))
  }
})

// 会话用户可能晚于本页挂载到达（刷新直达时 MainLayout 的 fetchMe 未完成），
// 因此跟随 user 变化填表，immediate 覆盖用户已就绪的情形
watch(
  () => auth.user,
  (user) => {
    if (!user) return
    profileForm.displayName = user.displayName
    profileForm.avatarUrl = user.avatarUrl
    profileForm.primaryLanguage = user.primaryLanguage
    profileForm.secondaryLanguages = [...user.secondaryLanguages]
  },
  { immediate: true },
)

async function saveProfile() {
  profileSaving.value = true
  try {
    const updated = await updateMe({ ...profileForm })
    auth.applyLogin({ token: auth.token, user: updated })
    Message.success(t('settings.profile_saved'))
  } catch (error) {
    console.error('保存个人资料失败:', error)
    Message.error(error instanceof Error ? error.message : t('settings.save_failed'))
  } finally {
    profileSaving.value = false
  }
}

async function savePassword() {
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    Message.error(t('settings.password_mismatch'))
    return
  }
  passwordSaving.value = true
  try {
    await changePassword(passwordForm.oldPassword, passwordForm.newPassword)
    Message.success(t('settings.password_changed'))
    passwordForm.oldPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  } catch (error) {
    console.error('修改密码失败:', error)
    Message.error(error instanceof Error ? error.message : t('settings.password_failed'))
  } finally {
    passwordSaving.value = false
  }
}
</script>

<template>
  <div class="settings">
    <a-typography-title :heading="5">{{ $t('settings.title') }}</a-typography-title>

    <a-tabs default-active-key="profile">
      <a-tab-pane key="profile" :title="$t('settings.tab_profile')">
        <a-form :model="profileForm" layout="vertical" class="settings__form" @submit-success="saveProfile">
          <a-form-item :label="$t('settings.username')">
            <a-input :model-value="auth.user?.username ?? ''" disabled />
          </a-form-item>
          <a-form-item field="displayName" :label="$t('settings.display_name')">
            <a-input v-model="profileForm.displayName" allow-clear />
          </a-form-item>
          <a-form-item field="avatarUrl" :label="$t('settings.avatar_url')" :extra="$t('settings.avatar_hint')">
            <a-input v-model="profileForm.avatarUrl" placeholder="https://…" allow-clear />
          </a-form-item>
          <a-form-item field="primaryLanguage" :label="$t('settings.primary_language')">
            <a-select
              v-model="profileForm.primaryLanguage"
              :options="languageList.map((l) => ({ label: l.name, value: l.code }))"
            />
          </a-form-item>
          <a-form-item field="secondaryLanguages" :label="$t('settings.secondary_languages')" :extra="$t('settings.secondary_hint')">
            <a-select
              v-model="profileForm.secondaryLanguages"
              multiple
              :options="languageList.map((l) => ({ label: l.name, value: l.code }))"
            />
          </a-form-item>
          <a-form-item>
            <a-button type="primary" html-type="submit" :loading="profileSaving">{{ $t('settings.save_profile') }}</a-button>
          </a-form-item>
        </a-form>
      </a-tab-pane>

      <a-tab-pane key="security" :title="$t('settings.tab_security')">
        <a-form :model="passwordForm" layout="vertical" class="settings__form" @submit-success="savePassword">
          <a-form-item field="oldPassword" :label="$t('settings.old_password')" required :rules="[{ required: true, message: $t('settings.old_password_required') }]">
            <a-input-password v-model="passwordForm.oldPassword" allow-clear />
          </a-form-item>
          <a-form-item field="newPassword" :label="$t('settings.new_password')" required :rules="[{ required: true, message: $t('settings.new_password_required') }]">
            <a-input-password v-model="passwordForm.newPassword" allow-clear />
          </a-form-item>
          <a-form-item field="confirmPassword" :label="$t('settings.confirm_password')" required :rules="[{ required: true, message: $t('settings.confirm_password_required') }]">
            <a-input-password v-model="passwordForm.confirmPassword" allow-clear />
          </a-form-item>
          <a-form-item>
            <a-button type="primary" html-type="submit" :loading="passwordSaving">{{ $t('settings.change_password') }}</a-button>
          </a-form-item>
        </a-form>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<style scoped lang="scss">
.settings {
  &__form {
    max-width: 480px;
  }
}
</style>
