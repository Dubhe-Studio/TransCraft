import { get, post, put } from './client'
import type { Part, PartDetail, PartInput, TranslationEntry } from './types'

export function createPart(input: PartInput): Promise<Part> {
  return post<Part>('/parts', input)
}

export function partDetail(id: number): Promise<PartDetail> {
  return get<PartDetail>(`/parts/${id}`)
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

// 建议与译文分开存放，第一阶段只负责提交，浏览与处理属后续规划
export function saveSuggestion(id: number, language: string, key: string, text: string): Promise<void> {
  return post<void>(`/parts/${id}/entries/${encodeURIComponent(key)}/suggestions?lang=${encodeURIComponent(language)}`, { text })
}
