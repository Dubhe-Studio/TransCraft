package httpapi

import (
	"context"
	"time"

	"github.com/cloudwego/hertz/pkg/app"
	"github.com/cloudwego/hertz/pkg/common/utils"
	"github.com/cloudwego/hertz/pkg/protocol/consts"
)

// Health 检查数据库与 Redis 的连通状态，任一依赖异常时返回 503。
func (d *Deps) Health(ctx context.Context, c *app.RequestContext) {
	checkCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	dbStatus := "up"
	sqlDB, err := d.DB.DB()
	if err != nil {
		dbStatus = "down: " + err.Error()
	} else if err := sqlDB.PingContext(checkCtx); err != nil {
		dbStatus = "down: " + err.Error()
	}

	redisStatus := "up"
	if err := d.Redis.Ping(checkCtx).Err(); err != nil {
		redisStatus = "down: " + err.Error()
	}

	status := consts.StatusOK
	if dbStatus != "up" || redisStatus != "up" {
		status = consts.StatusServiceUnavailable
	}
	c.JSON(status, utils.H{
		"database": dbStatus,
		"redis":    redisStatus,
	})
}
