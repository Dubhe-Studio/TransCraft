// Package httpapi 定义 HTTP 服务的路由与处理器。
package httpapi

import (
	"context"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/app/server"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

// Deps 聚合处理器运行所需的下游依赖。
type Deps struct {
	DB    *gorm.DB
	Redis *redis.Client
}

// NewServer 构建注册全部路由的 Hertz 服务实例。
func NewServer(address string, deps *Deps) *server.Hertz {
	srv := server.Default(server.WithHostPorts(address))

	srv.GET("/ping", func(_ context.Context, c *app.RequestContext) {
		c.JSON(consts.StatusOK, utils.H{"message": "pong"})
	})

	api := srv.Group("/api")
	api.GET("/health", deps.Health)

	registerWeb(srv)

	return srv
}
