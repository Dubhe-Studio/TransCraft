import { get } from './client'
import type { ProjectSummary } from './types'

export function followedProjects(): Promise<ProjectSummary[]> {
  return get<ProjectSummary[]>('/projects/followed')
}
