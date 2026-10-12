// Package config 负责加载与校验服务运行所需的配置。
package config

import (
	"fmt"
	"os"

	"gopkg.in/yaml.v3"
)

// Server 配置 HTTP 服务监听参数。
type Server struct {
	Address string `yaml:"address"`
}

// Database 配置数据库连接，Driver 决定使用 MySQL 还是 PostgreSQL。
type Database struct {
	Driver string `yaml:"driver"`
	DSN    string `yaml:"dsn"`
}

// Redis 配置缓存连接参数。
type Redis struct {
	Address  string `yaml:"address"`
	Password string `yaml:"password"`
	DB       int    `yaml:"db"`
}

// Config 聚合服务的全部配置项。
type Config struct {
	Server   Server   `yaml:"server"`
	Database Database `yaml:"database"`
	Redis    Redis    `yaml:"redis"`
}

// Load 从指定路径读取 YAML 配置并做基础校验。
func Load(path string) (*Config, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("读取配置文件失败: %w", err)
	}
	cfg := &Config{}
	if err := yaml.Unmarshal(raw, cfg); err != nil {
		return nil, fmt.Errorf("解析配置文件失败: %w", err)
	}
	if cfg.Server.Address == "" {
		return nil, fmt.Errorf("配置缺失: server.address")
	}
	switch cfg.Database.Driver {
	case "mysql", "postgres":
	default:
		return nil, fmt.Errorf("不支持的数据库驱动: %q（仅支持 mysql / postgres）", cfg.Database.Driver)
	}
	if cfg.Database.DSN == "" {
		return nil, fmt.Errorf("配置缺失: database.dsn")
	}
	if cfg.Redis.Address == "" {
		return nil, fmt.Errorf("配置缺失: redis.address")
	}
	return cfg, nil
}
