package main

import (
	"context"
	"flag"
	"log"
	"os/signal"
	"syscall"
	"time"

	"transcraft/internal/config"
	"transcraft/internal/data"
	"transcraft/internal/httpapi"
)

func main() {
	configPath := flag.String("config", "configs/config.yaml", "配置文件路径")
	flag.Parse()

	cfg, err := config.Load(*configPath)
	if err != nil {
		log.Fatalf("加载配置失败: %v", err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	db, err := data.OpenDB(cfg.Database)
	if err != nil {
		log.Fatalf("初始化数据库失败: %v", err)
	}
	redisClient, err := data.OpenRedis(ctx, cfg.Redis)
	if err != nil {
		log.Fatalf("初始化 Redis 失败: %v", err)
	}

	srv := httpapi.NewServer(cfg.Server.Address, &httpapi.Deps{DB: db, Redis: redisClient})
	go srv.Spin()

	log.Printf("服务已启动，监听 %s", cfg.Server.Address)
	<-ctx.Done()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("服务关闭异常: %v", err)
	}
	if err := redisClient.Close(); err != nil {
		log.Printf("关闭 Redis 客户端异常: %v", err)
	}
	log.Println("服务已停止")
}
