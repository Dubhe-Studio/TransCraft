package httpapi

import (
	"bytes"
	"io/fs"
	"strings"
	"testing"

	"github.com/cloudwego/hertz/pkg/common/ut"
	"github.com/cloudwego/hertz/pkg/protocol/consts"

	"transcraft/internal/webassets"
)

// 静态资源请求与前端路由回退都应返回应用首页。
func TestSPAIndexAndFallback(t *testing.T) {
	srv := NewServer("127.0.0.1:0", &Deps{})

	index := ut.PerformRequest(srv.Engine, "GET", "/", nil).Result()
	if index.StatusCode() != consts.StatusOK {
		t.Fatalf("GET / 状态码 = %d，期望 200", index.StatusCode())
	}
	if !bytes.Contains(index.Body(), []byte(`id="app"`)) {
		t.Fatalf("GET / 响应不是应用首页: %s", index.Body())
	}

	fallback := ut.PerformRequest(srv.Engine, "GET", "/not/exist/route", nil).Result()
	if fallback.StatusCode() != consts.StatusOK {
		t.Fatalf("GET /not/exist/route 状态码 = %d，期望 200", fallback.StatusCode())
	}
	if !bytes.Equal(fallback.Body(), index.Body()) {
		t.Fatal("未命中的前端路由应回退到应用首页")
	}
}

// API 路由不应被静态资源托管捕获。
func TestAPIRoutePriority(t *testing.T) {
	srv := NewServer("127.0.0.1:0", &Deps{})

	resp := ut.PerformRequest(srv.Engine, "GET", "/ping", nil).Result()
	if resp.StatusCode() != consts.StatusOK {
		t.Fatalf("GET /ping 状态码 = %d，期望 200", resp.StatusCode())
	}
	if !bytes.Contains(resp.Body(), []byte("pong")) {
		t.Fatalf("GET /ping 响应异常: %s", resp.Body())
	}
}

// 产物内的静态文件应能按扩展名返回正确的内容类型。
func TestSPAStaticAsset(t *testing.T) {
	srv := NewServer("127.0.0.1:0", &Deps{})

	var asset string
	err := fs.WalkDir(webassets.Dist, "dist", func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if asset == "" && !d.IsDir() && strings.HasSuffix(p, ".js") {
			asset = strings.TrimPrefix(p, "dist/")
		}
		return nil
	})
	if err != nil || asset == "" {
		t.Fatalf("遍历内嵌产物失败或未找到 JS 文件: asset=%q err=%v", asset, err)
	}

	resp := ut.PerformRequest(srv.Engine, "GET", "/"+asset, nil).Result()
	if resp.StatusCode() != consts.StatusOK {
		t.Fatalf("GET /%s 状态码 = %d，期望 200", asset, resp.StatusCode())
	}
	if ct := string(resp.Header.ContentType()); !strings.HasPrefix(ct, "text/javascript") && !strings.HasPrefix(ct, "application/javascript") {
		t.Fatalf("GET /%s Content-Type = %q，期望 JavaScript 类型", asset, ct)
	}
}
