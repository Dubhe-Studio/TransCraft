import { del, get, post, put } from './client'
import type {
  LanguageMember,
  LanguageProgress,
  LanguageRole,
  MemberInput,
  Part,
  PartDetail,
  PartInput,
  PartMember,
  PartRole,
  TranslationEntry,
} from './types'

export function createPart(input: PartInput): Promise<Part> {
  return post<Part>('/parts', input)
}

export function partDetail(id: number): Promise<PartDetail> {
  return get<PartDetail>(`/parts/${id}`)
}

// 部件页面一律以项目 slug + 部件 slug 寻址，内部接口再按返回的 id 调用
export function partDetailBySlug(projectSlug: string, partSlug: string): Promise<PartDetail> {
  return get<PartDetail>(`/projects/${encodeURIComponent(projectSlug)}/parts/${encodeURIComponent(partSlug)}`)
}

export function partLanguageProgressBySlug(projectSlug: string, partSlug: string): Promise<LanguageProgress[]> {
  return get<LanguageProgress[]>(
    `/projects/${encodeURIComponent(projectSlug)}/parts/${encodeURIComponent(partSlug)}/languages`,
  )
}

export function updatePart(id: number, input: PartInput): Promise<Part> {
  return put<Part>(`/parts/${id}`, input)
}

export function partLanguageProgress(id: number): Promise<LanguageProgress[]> {
  return get<LanguageProgress[]>(`/parts/${id}/languages`)
}

export function partMembers(id: number): Promise<PartMember[]> {
  return get<PartMember[]>(`/parts/${id}/members`)
}

export function addPartMember(id: number, input: MemberInput<PartRole>): Promise<PartMember[]> {
  return post<PartMember[]>(`/parts/${id}/members`, input)
}

export function removePartMember(id: number, username: string): Promise<void> {
  return del<void>(`/parts/${id}/members/${encodeURIComponent(username)}`)
}

// 语言级成员以 部件 + 语言代码 定位，只在该部件的该语言下生效
export function languageMembers(partId: number, language: string): Promise<LanguageMember[]> {
  return get<LanguageMember[]>(`/parts/${partId}/languages/${encodeURIComponent(language)}/members`)
}

export function addLanguageMember(partId: number, language: string, input: MemberInput<LanguageRole>): Promise<LanguageMember[]> {
  return post<LanguageMember[]>(`/parts/${partId}/languages/${encodeURIComponent(language)}/members`, input)
}

export function removeLanguageMember(partId: number, language: string, username: string): Promise<void> {
  return del<void>(`/parts/${partId}/languages/${encodeURIComponent(language)}/members/${encodeURIComponent(username)}`)
}

// 条目按工作语言返回译文，参考语言原文始终随条目下发
export function partEntries(id: number, language: string): Promise<TranslationEntry[]> {
  return get<TranslationEntry[]>(`/parts/${id}/entries?lang=${encodeURIComponent(language)}`)
}

export function saveTranslation(id: number, language: string, key: string, text: string): Promise<void> {
  return put<void>(`/parts/${id}/entries/${encodeURIComponent(key)}?lang=${encodeURIComponent(language)}`, { text })
}

export function approveEntry(id: number, language: string, key: string): Promise<void> {
  return post<void>(`/parts/${id}/entries/${encodeURIComponent(key)}/approve?lang=${encodeURIComponent(language)}`)
}

// 建议与译文分开存放，提交后不改动译文本身
// TODO: 建议的浏览与处理界面尚未实现，完成条件为有批准权限的成员能查看并采纳/驳回建议
export function saveSuggestion(id: number, language: string, key: string, text: string): Promise<void> {
  return post<void>(`/parts/${id}/entries/${encodeURIComponent(key)}/suggestions?lang=${encodeURIComponent(language)}`, { text })
}
