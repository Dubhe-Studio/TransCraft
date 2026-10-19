// 项目与部件地址标识的格式约定，前端表单校验与后端契约共用同一口径
export const SLUG_PATTERN = /^[a-z0-9][a-z0-9.-]*$/

export const SLUG_MAX_LENGTH = 60

export function validSlug(value: string): boolean {
  return value.length > 0 && value.length <= SLUG_MAX_LENGTH && SLUG_PATTERN.test(value)
}
