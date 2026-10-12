// 语言代码与地址段的互转：存储口径为 zh_cn 形态，地址里沿用 BCP 47 习惯的 zh-CN 形态。
// 契约仅覆盖「主语言_地区」两段式代码（平台语言列表均为该形态），三段式代码不在支持范围。
export function toLangSegment(code: string): string {
  const [primary, region] = code.split('_')
  return region ? `${primary}-${region.toUpperCase()}` : primary
}

export function fromLangSegment(segment: string): string {
  return segment.replace('-', '_').toLowerCase()
}
