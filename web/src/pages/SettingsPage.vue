<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { Message } from '@arco-design/web-vue'
import { supportedLanguages } from '../api/language'
import { changePassword, updateMe } from '../api/user'
import type { LanguageInfo } from '../api/types'
import { useAuthStore } from '../stores/auth'

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
  languageList.value = await supportedLanguages()
  if (auth.user) {
    profileForm.displayName = auth.user.displayName
    profileForm.avatarUrl = auth.user.avatarUrl
    profileForm.primaryLanguage = auth.user.primaryLanguage
    profileForm.secondaryLanguages = [...auth.user.secondaryLanguages]
  }
})

async function saveProfile() {
  profileSaving.value = true
  try {
    const updated = await updateMe({ ...profileForm })
    auth.applyLogin({ token: auth.token, user: updated })
    Message.success('个人资料已保存')
  } catch (error) {
    console.error('保存个人资料失败:', error)
    Message.error(error instanceof Error ? error.message : '保存失败')
  } finally {
    profileSaving.value = false
  }
}

async function savePassword() {
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    Message.error('两次输入的新密码不一致')
    return
  }
  passwordSaving.value = true
  try {
    await changePassword(passwordForm.oldPassword, passwordForm.newPassword)
    Message.success('密码已修改')
    passwordForm.oldPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  } catch (error) {
    console.error('修改密码失败:', error)
    Message.error(error instanceof Error ? error.message : '修改失败')
  } finally {
    passwordSaving.value = false
  }
}
</script>

<template>
  <div class="settings">
    <a-typography-title :heading="5">设置</a-typography-title>

    <a-tabs default-active-key="profile">
      <a-tab-pane key="profile" title="个人资料">
        <a-form :model="profileForm" layout="vertical" class="settings__form" @submit-success="saveProfile">
          <a-form-item label="用户名">
            <a-input :model-value="auth.user?.username ?? ''" disabled />
          </a-form-item>
          <a-form-item field="displayName" label="显示名">
            <a-input v-model="profileForm.displayName" allow-clear />
          </a-form-item>
          <a-form-item field="avatarUrl" label="头像地址" extra="留空使用默认头像">
            <a-input v-model="profileForm.avatarUrl" placeholder="https://…" allow-clear />
          </a-form-item>
          <a-form-item field="primaryLanguage" label="首要语言">
            <a-select
              v-model="profileForm.primaryLanguage"
              :options="languageList.map((l) => ({ label: l.name, value: l.code }))"
            />
          </a-form-item>
          <a-form-item field="secondaryLanguages" label="次要语言" extra="次要语言用于参考对照，可多选">
            <a-select
              v-model="profileForm.secondaryLanguages"
              multiple
              :options="languageList.map((l) => ({ label: l.name, value: l.code }))"
            />
          </a-form-item>
          <a-form-item>
            <a-button type="primary" html-type="submit" :loading="profileSaving">保存资料</a-button>
          </a-form-item>
        </a-form>
      </a-tab-pane>

      <a-tab-pane key="security" title="账号安全">
        <a-form :model="passwordForm" layout="vertical" class="settings__form" @submit-success="savePassword">
          <a-form-item field="oldPassword" label="原密码" required :rules="[{ required: true, message: '原密码不能为空' }]">
            <a-input-password v-model="passwordForm.oldPassword" allow-clear />
          </a-form-item>
          <a-form-item field="newPassword" label="新密码" required :rules="[{ required: true, message: '新密码不能为空' }]">
            <a-input-password v-model="passwordForm.newPassword" allow-clear />
          </a-form-item>
          <a-form-item field="confirmPassword" label="确认新密码" required :rules="[{ required: true, message: '请再次输入新密码' }]">
            <a-input-password v-model="passwordForm.confirmPassword" allow-clear />
          </a-form-item>
          <a-form-item>
            <a-button type="primary" html-type="submit" :loading="passwordSaving">修改密码</a-button>
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
