package handlers

import (
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"
)

// WithMedia registriert das Media-Repository und den Media-Service beim FansubHandler für Upload- und Asset-Funktionen.
func (h *FansubHandler) WithMedia(mediaRepo *repository.MediaRepository, mediaService *services.MediaService) *FansubHandler {
	h.mediaRepo = mediaRepo
	h.mediaService = mediaService
	return h
}
