package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"team4s.v3/backend/internal/config"
)

func main() {
	cfg := config.Load()
	validateRuntimeConfig(cfg)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	infra := bootstrapInfra(ctx, cfg)
	defer infra.dbPool.Close()
	defer infra.redisClient.Close()
	router := infra.router
	dbPool := infra.dbPool
	redisClient := infra.redisClient

	core := bootstrapCatalog(ctx, cfg, dbPool, redisClient)

	v1 := router.Group("/api/v1")

	registerPublicRoutesPart1(v1, dbPool, core)

	contrib := wireFansubContributionsAndAdminRoutes(dbPool, cfg, v1, core.authMiddleware, core)

	registerPublicRoutesPart2(v1, dbPool, cfg, core, contrib)

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		log.Printf("server listening on :%s", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server failed: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("graceful shutdown failed: %v", err)
	}
}
