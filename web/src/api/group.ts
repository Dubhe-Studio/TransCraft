import { del, get, post, put } from './client'
import type { ProjectGroup, ProjectGroupInput } from './types'

export function projectGroups(projectId: number): Promise<ProjectGroup[]> {
  return get<ProjectGroup[]>(`/projects/${projectId}/groups`)
}

export function createProjectGroup(projectId: number, input: ProjectGroupInput): Promise<ProjectGroup[]> {
  return post<ProjectGroup[]>(`/projects/${projectId}/groups`, input)
}

export function updateProjectGroup(projectId: number, groupId: number, input: ProjectGroupInput): Promise<ProjectGroup[]> {
  return put<ProjectGroup[]>(`/projects/${projectId}/groups/${groupId}`, input)
}

export function deleteProjectGroup(projectId: number, groupId: number): Promise<void> {
  return del<void>(`/projects/${projectId}/groups/${groupId}`)
}
