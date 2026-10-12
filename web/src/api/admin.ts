import { del, get, post, put } from './client'
import type { AdminUser, InviteCode, UserRole } from './types'

export function adminUsers(): Promise<AdminUser[]> {
  return get<AdminUser[]>('/admin/users')
}

export function updateUserRole(username: string, role: UserRole): Promise<void> {
  return put<void>(`/admin/users/${encodeURIComponent(username)}/role`, { role })
}

export function invites(): Promise<InviteCode[]> {
  return get<InviteCode[]>('/admin/invites')
}

export function createInvite(): Promise<InviteCode> {
  return post<InviteCode>('/admin/invites')
}

export function deleteInvite(code: string): Promise<void> {
  return del<void>(`/admin/invites/${encodeURIComponent(code)}`)
}
