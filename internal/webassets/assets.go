// Package webassets 内嵌前端构建产物，使后端二进制可独立提供静态资源。
package webassets

import "embed"

// Dist 为 Vite 构建产物（web/dist 构建后输出到本目录下的 dist）。
// dist/.gitkeep 仅用于保证前端未构建时目录非空，go:embed 才能通过编译。
//
//go:embed all:dist
var Dist embed.FS
