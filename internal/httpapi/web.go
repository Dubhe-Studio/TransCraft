package httpapi

import (
	"context"
	"io/fs"
	"mime"
	"path"
	"strings"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/protocol/consts"

	"transcraft/internal/webassets"
)

// registerWeb 将内嵌的前端产物挂载到服务上。
// 所有未被 API 命中的请求按静态文件处理；文件不存在时回退到 index.html，
// 以支持前端 history 路由。
func registerWeb(srv *server.Hertz) {
	sub, err := fs.Sub(webassets.Dist, "dist")
	if err != nil {
		// embed 的目录结构固定，此处只会因代码改动出错，启动即暴露
		panic("加载内嵌前端产物失败: " + err.Error())
	}
	srv.NoRoute(serveSPA(sub))
}

// serveSPA 优先返回命中的静态文件，未命中时回退到 index.html。
func serveSPA(fsys fs.FS) app.HandlerFunc {
	return func(_ context.Context, c *app.RequestContext) {
		// 清洗路径并去掉前导斜杠，保证只能访问 FS 根内的文件
		name := strings.TrimPrefix(path.Clean("/"+string(c.Path())), "/")
		if name == "" {
			name = "index.html"
		}
		content, err := fs.ReadFile(fsys, name)
		if err != nil {
			name = "index.html"
			content, err = fs.ReadFile(fsys, name)
			if err != nil {
				c.String(consts.StatusNotFound, "前端产物缺失，请先执行 pnpm build")
				return
			}
		}
		c.Data(consts.StatusOK, mime.TypeByExtension(path.Ext(name)), content)
	}
}
