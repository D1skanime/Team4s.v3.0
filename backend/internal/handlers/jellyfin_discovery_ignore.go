package handlers

// Ignore/Unignore-Endpunkte fuer die Jellyfin-Library-Discovery-Liste (165-02/165-06, D-17/D-21).
// Beide Mutationen sind idempotent (165-02's ON CONFLICT DO NOTHING / DELETE-ohne-Fehler) und
// schreiben je einen audit_logs-Eintrag (D-21); ein fehlgeschlagener Audit-Write blockiert die
// erfolgreiche Mutations-Antwort nie (bestehende Repo-Konvention, `_ = h.auditLogRepo.Write(...)`).
// Der Audit-Write ist mit `h.auditLogRepo != nil` abgesichert (Nil-Interface-Panic-Schutz) und
// baut den Actor ueber actorPointersFromIdentity (jellyfin_source_folder_management.go) auf, damit
// ein zero-wertiges AppUserID (noch nicht mit app_users verknuepfte Legacy-Identitaet) nicht an die
// FK-constraint-gebundene Spalte audit_logs.actor_app_user_id geschrieben wird.

import (
	"log"
	"net/http"
	"strings"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// jellyfinDiscoveryIgnoreRequest ist der Request-Body von POST /admin/jellyfin/discovery/ignore.
type jellyfinDiscoveryIgnoreRequest struct {
	JellyfinItemID string `json:"jellyfin_item_id"`
}

// IgnoreJellyfinDiscoveryItem handelt POST /admin/jellyfin/discovery/ignore.
func (h *AdminContentHandler) IgnoreJellyfinDiscoveryItem(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	var req jellyfinDiscoveryIgnoreRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültiger request body")
		return
	}
	itemID := strings.TrimSpace(req.JellyfinItemID)
	if itemID == "" {
		badRequest(c, "jellyfin_item_id ist erforderlich")
		return
	}

	if h.libraryDiscoveryIgnoreRepo == nil {
		writeInternalErrorResponse(c, "interner serverfehler", nil, "Jellyfin-Discovery-Ignore-Repository ist nicht konfiguriert.")
		return
	}

	if err := h.libraryDiscoveryIgnoreRepo.InsertLibraryDiscoveryIgnore(c.Request.Context(), itemID, &identity.AppUserID); err != nil {
		log.Printf("admin_content jellyfin_discovery_ignore: insert failed (user_id=%d, item_id=%q): %v", identity.UserID, itemID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Jellyfin-Eintrag konnte nicht ignoriert werden.")
		return
	}

	if h.auditLogRepo != nil {
		appUserID, legacyUserID := actorPointersFromIdentity(identity)
		_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
			ActorAppUserID:    appUserID,
			ActorLegacyUserID: legacyUserID,
			EventType:         "jellyfin_discovery.ignored",
			TargetType:        "jellyfin_item",
			Action:            "ignore",
			Outcome:           "allowed",
			Payload:           map[string]any{"jellyfin_item_id": itemID, "server_key": "default"},
		})
	}

	c.JSON(http.StatusOK, gin.H{"message": "Jellyfin-Eintrag ignoriert."})
}

// UnignoreJellyfinDiscoveryItem handelt DELETE /admin/jellyfin/discovery/ignore/:itemID.
func (h *AdminContentHandler) UnignoreJellyfinDiscoveryItem(c *gin.Context) {
	identity, ok := h.requireAdmin(c)
	if !ok {
		return
	}

	itemID := strings.TrimSpace(c.Param("itemID"))
	if itemID == "" {
		badRequest(c, "itemID ist erforderlich")
		return
	}

	if h.libraryDiscoveryIgnoreRepo == nil {
		writeInternalErrorResponse(c, "interner serverfehler", nil, "Jellyfin-Discovery-Ignore-Repository ist nicht konfiguriert.")
		return
	}

	if err := h.libraryDiscoveryIgnoreRepo.RemoveLibraryDiscoveryIgnore(c.Request.Context(), itemID); err != nil {
		log.Printf("admin_content jellyfin_discovery_ignore: remove failed (user_id=%d, item_id=%q): %v", identity.UserID, itemID, err)
		writeInternalErrorResponse(c, "interner serverfehler", err, "Jellyfin-Eintrag konnte nicht entignoriert werden.")
		return
	}

	if h.auditLogRepo != nil {
		appUserID, legacyUserID := actorPointersFromIdentity(identity)
		_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
			ActorAppUserID:    appUserID,
			ActorLegacyUserID: legacyUserID,
			EventType:         "jellyfin_discovery.unignored",
			TargetType:        "jellyfin_item",
			Action:            "unignore",
			Outcome:           "allowed",
			Payload:           map[string]any{"jellyfin_item_id": itemID, "server_key": "default"},
		})
	}

	c.JSON(http.StatusOK, gin.H{"message": "Jellyfin-Eintrag nicht mehr ignoriert."})
}
