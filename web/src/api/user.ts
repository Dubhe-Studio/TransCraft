import { get, post, put } from './client'
import type { ProfileInput, UserProfile, UserPublicProfile } from './types'

export function updateMe(input: ProfileInput): Promise<UserProfile> {
  return put<UserProfile>('/users/me', input)
}

export function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  return post<void>('/users/me/password', { oldPassword, newPassword })
}

export function userProfile(username: string): Promise<UserPublicProfile> {
  return get<UserPublicProfile>(`/users/${encodeURIComponent(username)}`)
}
