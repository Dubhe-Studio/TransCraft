import { del, get, post, put } from './client'
import type {
  PartProgress,
  ProjectDetail,
  ProjectInput,
  ProjectMember,
  ProjectProgress,
  ProjectRole,
  ProjectSummary,
} from './types'

export function followedProjects(): Promise<ProjectSummary[]> {
  return get<ProjectSummary[]>('/projects/followed')
}

// 进度统计与当前工作语言挂钩，切换语言需重新拉取
export function followedProgress(language: string): Promise<ProjectProgress[]> {
  return get<ProjectProgress[]>(`/projects/followed/progress?lang=${encodeURIComponent(language)}`)
}

export function createProject(input: ProjectInput): Promise<ProjectDetail> {
  return post<ProjectDetail>('/projects', input)
}

export function projectDetail(id: number): Promise<ProjectDetail> {
  return get<ProjectDetail>(`/projects/${id}`)
}

export function updateProject(id: number, input: ProjectInput): Promise<ProjectDetail> {
  return put<ProjectDetail>(`/projects/${id}`, input)
}

export function projectProgress(id: number, language: string): Promise<PartProgress[]> {
  return get<PartProgress[]>(`/projects/${id}/progress?lang=${encodeURIComponent(language)}`)
}

export function projectMembers(id: number): Promise<ProjectMember[]> {
  return get<ProjectMember[]>(`/projects/${id}/members`)
}

export function addMember(id: number, username: string, role: ProjectRole): Promise<ProjectMember[]> {
  return post<ProjectMember[]>(`/projects/${id}/members`, { username, role })
}

export function removeMember(id: number, username: string): Promise<void> {
  return del<void>(`/projects/${id}/members/${encodeURIComponent(username)}`)
}
