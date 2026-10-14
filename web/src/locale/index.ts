import en from './en.json'
import zh from './zh.json'

// 语言包按语言代码聚合，界面语言代码即此对象的键，新增语言时同时补上对应的 json 文件
export const messages = { zh, en }

export type LocaleCode = keyof typeof messages
