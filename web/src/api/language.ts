import { get } from './client'
import type { LanguageInfo } from './types'

export function supportedLanguages(): Promise<LanguageInfo[]> {
  return get<LanguageInfo[]>('/languages')
}
