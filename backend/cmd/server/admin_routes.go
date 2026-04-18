package main

import (
	"team4s.v3/backend/internal/handlers"

	"github.com/gin-gonic/gin"
)

type adminRouteHandlers struct {
	adminContentHandler *handlers.AdminContentHandler
	fansubHandler       *handlers.FansubHandler
	mediaUploadHandler  *handlers.MediaUploadHandler
}

func registerAdminRoutes(v1 *gin.RouterGroup, auth gin.HandlerFunc, deps adminRouteHandlers) {
	v1.POST("/admin/anime", auth, deps.adminContentHandler.CreateAnime)
	v1.PATCH("/admin/anime/:id", auth, deps.adminContentHandler.UpdateAnime)
	v1.DELETE("/admin/anime/:id", auth, deps.adminContentHandler.DeleteAnime)
	v1.GET("/admin/anime/:id/relations", auth, deps.adminContentHandler.ListAnimeRelations)
	v1.GET("/admin/anime/:id/relation-targets", auth, deps.adminContentHandler.SearchAnimeRelationTargets)
	v1.POST("/admin/anime/:id/relations", auth, deps.adminContentHandler.CreateAnimeRelation)
	v1.PATCH("/admin/anime/:id/relations/:targetAnimeId", auth, deps.adminContentHandler.UpdateAnimeRelation)
	v1.DELETE("/admin/anime/:id/relations/:targetAnimeId", auth, deps.adminContentHandler.DeleteAnimeRelation)
	v1.PUT("/admin/anime/:id/assets/cover", auth, deps.adminContentHandler.AssignAnimeCoverAsset)
	v1.DELETE("/admin/anime/:id/assets/cover", auth, deps.adminContentHandler.DeleteAnimeCoverAsset)
	v1.PUT("/admin/anime/:id/assets/banner", auth, deps.adminContentHandler.AssignAnimeBannerAsset)
	v1.DELETE("/admin/anime/:id/assets/banner", auth, deps.adminContentHandler.DeleteAnimeBannerAsset)
	v1.PUT("/admin/anime/:id/assets/logo", auth, deps.adminContentHandler.AssignAnimeLogoAsset)
	v1.DELETE("/admin/anime/:id/assets/logo", auth, deps.adminContentHandler.DeleteAnimeLogoAsset)
	v1.PUT("/admin/anime/:id/assets/background_video", auth, deps.adminContentHandler.AssignAnimeBackgroundVideoAsset)
	v1.DELETE("/admin/anime/:id/assets/background_video", auth, deps.adminContentHandler.DeleteAnimeBackgroundVideoAsset)
	v1.POST("/admin/anime/:id/assets/background_videos", auth, deps.adminContentHandler.AddAnimeBackgroundVideoAsset)
	v1.POST("/admin/anime/:id/assets/backgrounds", auth, deps.adminContentHandler.AddAnimeBackgroundAsset)
	v1.DELETE("/admin/anime/:id/assets/backgrounds/:backgroundId", auth, deps.adminContentHandler.DeleteAnimeBackgroundAsset)
	v1.GET("/admin/anime/assets/search", auth, deps.adminContentHandler.SearchAnimeCreateAssetCandidates)
	v1.POST("/admin/anime/enrichment/anisearch", auth, deps.adminContentHandler.LoadAnimeCreateAniSearchEnrichment)
	v1.GET("/admin/anime/enrichment/anisearch/search", auth, deps.adminContentHandler.SearchAnimeCreateAniSearchCandidates)
	v1.POST("/admin/anime/:id/enrichment/anisearch", auth, deps.adminContentHandler.LoadAnimeAniSearchEnrichment)
	v1.GET("/admin/anime/:id/jellyfin/context", auth, deps.adminContentHandler.GetAnimeJellyfinContext)
	v1.POST("/admin/anime/:id/jellyfin/metadata/preview", auth, deps.adminContentHandler.PreviewAnimeMetadataFromJellyfin)
	v1.POST("/admin/anime/:id/jellyfin/metadata/apply", auth, deps.adminContentHandler.ApplyAnimeMetadataFromJellyfin)
	v1.POST("/admin/anime/:id/jellyfin/sync", auth, deps.adminContentHandler.SyncAnimeFromJellyfin)
	v1.POST("/admin/anime/:id/episodes/:episodeId/sync", auth, deps.adminContentHandler.SyncEpisodeFromJellyfin)
	v1.GET("/admin/anime/:id/episode-import/context", auth, deps.adminContentHandler.GetEpisodeImportContext)
	v1.POST("/admin/anime/:id/episode-import/preview", auth, deps.adminContentHandler.PreviewEpisodeImport)
	v1.POST("/admin/anime/:id/episode-import/apply", auth, deps.adminContentHandler.ApplyEpisodeImport)
	v1.GET("/admin/jellyfin/series", auth, deps.adminContentHandler.SearchJellyfinSeries)
	v1.POST("/admin/jellyfin/intake/preview", auth, deps.adminContentHandler.PreviewAnimeIntakeFromJellyfin)
	v1.POST("/admin/anime/:id/jellyfin/preview", auth, deps.adminContentHandler.PreviewAnimeFromJellyfin)
	v1.GET("/admin/episode-versions/:versionId/editor-context", auth, deps.adminContentHandler.GetEpisodeVersionEditorContext)
	v1.POST("/admin/episode-versions/:versionId/folder-scan", auth, deps.adminContentHandler.ScanEpisodeVersionFolder)
	v1.POST("/admin/episodes", auth, deps.adminContentHandler.CreateEpisode)
	v1.GET("/admin/genres", auth, deps.adminContentHandler.ListGenreTokens)
	v1.GET("/admin/tags", auth, deps.adminContentHandler.ListTagTokens)
	v1.PATCH("/admin/episodes/:id", auth, deps.adminContentHandler.UpdateEpisode)
	v1.DELETE("/admin/episodes/:id", auth, deps.adminContentHandler.DeleteEpisode)
	v1.POST("/admin/fansubs/:id/media", auth, deps.fansubHandler.UploadFansubMedia)
	v1.DELETE("/admin/fansubs/:id/media/:kind", auth, deps.fansubHandler.DeleteFansubMedia)
	v1.POST("/fansubs", auth, deps.fansubHandler.CreateFansub)
	v1.PATCH("/fansubs/:id", auth, deps.fansubHandler.UpdateFansub)
	v1.DELETE("/fansubs/:id", auth, deps.fansubHandler.DeleteFansub)
	v1.POST("/fansubs/:id/aliases", auth, deps.fansubHandler.CreateFansubAlias)
	v1.DELETE("/fansubs/:id/aliases/:aliasId", auth, deps.fansubHandler.DeleteFansubAlias)
	v1.POST("/fansubs/:id/members", auth, deps.fansubHandler.CreateFansubMember)
	v1.PATCH("/fansubs/:id/members/:memberId", auth, deps.fansubHandler.UpdateFansubMember)
	v1.DELETE("/fansubs/:id/members/:memberId", auth, deps.fansubHandler.DeleteFansubMember)
	v1.POST("/anime/:id/fansubs/:fansubId", auth, deps.fansubHandler.AttachAnimeFansub)
	v1.DELETE("/anime/:id/fansubs/:fansubId", auth, deps.fansubHandler.DetachAnimeFansub)
	v1.POST("/anime/:id/episodes/:episodeNumber/versions", auth, deps.fansubHandler.CreateEpisodeVersion)
	v1.PATCH("/episode-versions/:versionId", auth, deps.fansubHandler.UpdateEpisodeVersion)
	v1.DELETE("/episode-versions/:versionId", auth, deps.fansubHandler.DeleteEpisodeVersion)
	v1.POST("/admin/fansubs/merge", auth, deps.fansubHandler.MergeFansubs)
	v1.POST("/admin/fansubs/merge/preview", auth, deps.fansubHandler.MergeFansubsPreview)
	v1.POST("/admin/upload", auth, deps.mediaUploadHandler.Upload)
	v1.DELETE("/admin/media/:id", auth, deps.mediaUploadHandler.Delete)
}
