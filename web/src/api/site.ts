import { get, put } from './client'
import type { SiteLinks } from './types'

export function siteLinks(): Promise<SiteLinks> {
  return get<SiteLinks>('/site/links')
}

export function updateSiteLinks(links: SiteLinks): Promise<SiteLinks> {
  return put<SiteLinks>('/admin/site-links', links)
}
