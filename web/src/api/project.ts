import { get } from './client'
import type { ProjectProgress, ProjectSummary } from './types'

export function followedProjects(): Promise<ProjectSummary[]> {
  return get<ProjectSummary[]>('/projects/followed')
}

// 进度统计与当前工作语言挂钩，切换语言需重新拉取
export function followedProgress(language: string): Promise<ProjectProgress[]> {
  return get<ProjectProgress[]>(`/projects/followed/progress?lang=${encodeURIComponent(language)}`)
}
