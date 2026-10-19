// 日期与数字必须显式传入界面语言：toLocale* 的默认值跟随浏览器区域设置，
// 可能与用户选择的界面语言不一致（例如浏览器是 de-DE、界面语言是英文）。

export function formatDate(value: string, locale: string): string {
  return new Date(value).toLocaleDateString(locale)
}

export function formatNumber(value: number, locale: string): string {
  return value.toLocaleString(locale)
}
