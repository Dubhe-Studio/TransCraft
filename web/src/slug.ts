// 项目与部件地址标识的格式约定，前端表单校验与后端契约共用同一口径
export const SLUG_PATTERN = /^[a-z0-9][a-z0-9.-]*$/

export const SLUG_MAX_LENGTH = 60

export function validSlug(value: string): boolean {
  return value.length > 0 && value.length <= SLUG_MAX_LENGTH && SLUG_PATTERN.test(value)
}

export const SLUG_MESSAGE = '只能包含小写字母、数字、点与连字符，以字母或数字开头，最长 60 个字符'
