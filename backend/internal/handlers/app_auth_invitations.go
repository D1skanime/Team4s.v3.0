package handlers

import (
	"context"
	"fmt"
	"html"
	"net/http"
	"net/url"
	"strings"
	"time"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/gin-gonic/gin"
)

type createFansubGroupInvitationRequest struct {
	Email            string   `json:"email"`
	InvitedRoleCodes []string `json:"invited_role_codes"`
}

type acceptFansubGroupInvitationRequest struct {
	Token string `json:"token"`
}

func (h *AppAuthHandler) ListFansubGroupInvitations(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	if h.invitationRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungueltige fansub-id"}})
		return
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupInvitationsView, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Einladungsberechtigung konnte nicht geprÃ¼ft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "fansub_group_invitations.view.denied", &fansubID, "fansub_group", &fansubID, permissions.ActionFansubGroupInvitationsView, result)
		writePermissionDenied(c, result)
		return
	}

	invitations, err := h.invitationRepo.ListByFansubGroup(c.Request.Context(), fansubID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": invitations})
}

func (h *AppAuthHandler) CreateFansubGroupInvitation(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	if h.invitationRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungueltige fansub-id"}})
		return
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupInvitationsCreate, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Einladungsberechtigung konnte nicht geprÃ¼ft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "fansub_group_invitations.create.denied", &fansubID, "fansub_group", &fansubID, permissions.ActionFansubGroupInvitationsCreate, result)
		writePermissionDenied(c, result)
		return
	}

	var req createFansubGroupInvitationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungueltige anfrage"}})
		return
	}

	created, err := h.invitationRepo.Create(c.Request.Context(), fansubID, models.FansubGroupInvitationCreateInput{
		Email:              req.Email,
		InvitedRoleCodes:   req.InvitedRoleCodes,
		CreatedByAppUserID: &identity.AppUserID,
	})
	if err != nil {
		if err == repository.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "fansubgruppe nicht gefunden"}})
			return
		}
		if mutationErr, ok := repository.AsInvitationMutationError(err); ok {
			c.JSON(mutationErr.HTTPStatus, gin.H{"error": gin.H{"message": mutationErr.Message, "reason_code": mutationErr.Code}})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	// Einladungsmail senden wenn ein Mailer konfiguriert ist.
	// D-10: Absoluter Link aus AppPublicURL + InviteLink.
	// D-11: Nur der Roh-Token landet im Mail-Link, nicht in DB oder Audit-Log.
	// D-12: Bei SMTP-Fehler wird die Einladung sofort storniert (kein stiller fail).
	if h.mailer != nil {
		inviteURL := strings.TrimRight(h.appPublicURL, "/") + created.InviteLink
		mailCtx, mailCancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
		defer mailCancel()

		// D-03: Gruppenname aus fansubRepo aufloesen; ein Lookup-Fehler blockiert die
		// Einladung nie, sondern faellt nur auf die generische Formulierung zurueck.
		groupName := "deiner Fansub-Gruppe"
		if h.fansubRepo != nil {
			if group, groupErr := h.fansubRepo.GetGroupByID(mailCtx, fansubID); groupErr == nil && group != nil && strings.TrimSpace(group.Name) != "" {
				groupName = group.Name
			}
		}

		inviterName := strings.TrimSpace(identity.DisplayName)
		if inviterName == "" {
			inviterName = "Die Gruppenleitung"
		}

		roleLabel := strings.Join(created.Invitation.InvitedRoleCodes, ", ")
		var roleSuffixText, roleSuffixHTML string
		if roleLabel != "" {
			roleSuffixText = fmt.Sprintf(" -- als %s", roleLabel)
			roleSuffixHTML = fmt.Sprintf(" &mdash; als <strong>%s</strong>", roleLabel)
		}

		// D-08: mediierter Fallback -- die E-Mail des Eingeladenen wird als nicht-autoritativer
		// Hinweis im Link mitgegeben, damit das Frontend (135-05) sie als Keycloak login_hint
		// nutzen kann. Die eigentliche Zuordnungspruefung bleibt serverseitig in Accept().
		mailURL := inviteURL
		if created.Invitation.Email != "" {
			mailURL = inviteURL + "&email=" + url.QueryEscape(created.Invitation.Email)
		}

		expiresLabel := created.Invitation.ExpiresAt.Format("02.01.2006")

		subject := fmt.Sprintf("%s lädt dich in die Fansub-Gruppe \"%s\" ein", inviterName, groupName)

		bodyText := fmt.Sprintf(
			"%s hat dich eingeladen, der Fansub-Gruppe \"%s\" auf Team4s beizutreten%s.\n\n"+
				"Team4s ist die Plattform, auf der \"%s\" ihr Team und ihre Fansub-Arbeit verwaltet.\n\n"+
				"Wenn du annimmst, wirst du Mitglied der Gruppe. Noch kein Team4s-Konto? Du kannst dir beim Annehmen direkt eins anlegen.\n\n"+
				"Bitte verwende dabei genau diese E-Mail-Adresse (%s) -- sonst kann die Einladung nicht zugeordnet werden.\n\n"+
				"Einladung annehmen: %s\n\n"+
				"Der Link ist 7 Tage gültig (bis %s).\n\n"+
				"Du kennst \"%s\" nicht oder hast das nicht erwartet? Dann ignoriere diese Mail einfach.",
			inviterName, groupName, roleSuffixText,
			groupName,
			created.Invitation.Email,
			mailURL,
			expiresLabel,
			groupName,
		)

		bodyHTML := fmt.Sprintf(
			`<p>%s hat dich eingeladen, der Fansub-Gruppe <strong>"%s"</strong> auf Team4s beizutreten%s.</p>`+
				`<p>Team4s ist die Plattform, auf der "%s" ihr Team und ihre Fansub-Arbeit verwaltet.</p>`+
				`<p>Wenn du annimmst, wirst du Mitglied der Gruppe. Noch kein Team4s-Konto? Du kannst dir beim Annehmen direkt eins anlegen.</p>`+
				`<p><strong>Bitte verwende dabei genau diese E-Mail-Adresse (%s)</strong> -- sonst kann die Einladung nicht zugeordnet werden.</p>`+
				`<p><a href="%s">Einladung annehmen</a></p>`+
				`<p>Der Link ist 7 Tage gültig (bis %s).</p>`+
				`<p>Du kennst "%s" nicht oder hast das nicht erwartet? Dann ignoriere diese Mail einfach.</p>`,
			html.EscapeString(inviterName), html.EscapeString(groupName), roleSuffixHTML,
			html.EscapeString(groupName),
			created.Invitation.Email, // bereits validiert via net/mail.ParseAddress
			mailURL,                  // builder-kontrolliert, kein Freitext
			expiresLabel,
			html.EscapeString(groupName),
		)

		mailErr := h.mailer.Send(mailCtx, services.MailMessage{
			To:       created.Invitation.Email,
			Subject:  subject,
			BodyText: bodyText,
			BodyHTML: bodyHTML,
		})
		if mailErr != nil {
			// Einladung stornieren damit kein stiller pending-Record verbleibt.
			_, _ = h.invitationRepo.Cancel(c.Request.Context(), fansubID, created.Invitation.ID, models.FansubGroupInvitationCancelInput{
				CancelledByAppUserID: &identity.AppUserID,
			})
			_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
				ActorAppUserID: &identity.AppUserID,
				EventType:      "fansub_group_invitation.mail_failed",
				ScopeType:      permissions.ScopeTypeGroup,
				ScopeID:        &fansubID,
				TargetType:     "fansub_group_invitation",
				TargetID:       &created.Invitation.ID,
				Action:         string(permissions.ActionFansubGroupInvitationsCreate),
				Outcome:        "error",
				Payload: map[string]any{
					"email": created.Invitation.Email,
					// Kein Token im Audit-Log (D-11).
				},
			})
			c.JSON(http.StatusBadGateway, gin.H{"error": gin.H{
				"message":     "Einladung konnte nicht gesendet werden. Bitte prÃ¼fe die SMTP-Konfiguration.",
				"reason_code": "mail_delivery_failed",
			}})
			return
		}
	}

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "fansub_group_invitation.created",
		ScopeType:      permissions.ScopeTypeGroup,
		ScopeID:        &fansubID,
		TargetType:     "fansub_group_invitation",
		TargetID:       &created.Invitation.ID,
		Action:         string(permissions.ActionFansubGroupInvitationsCreate),
		Outcome:        "allowed",
		Payload: map[string]any{
			"email":              created.Invitation.Email,
			"invited_role_codes": created.Invitation.InvitedRoleCodes,
			// Kein Roh-Token im Audit-Log (D-11).
		},
	})

	c.JSON(http.StatusCreated, gin.H{
		"data": gin.H{
			"id":                 created.Invitation.ID,
			"email":              created.Invitation.Email,
			"invited_role_codes": created.Invitation.InvitedRoleCodes,
			"status":             created.Invitation.Status,
			"expires_at":         created.Invitation.ExpiresAt,
			"invite_link":        created.InviteLink,
		},
	})
}

func (h *AppAuthHandler) CancelFansubGroupInvitation(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	if h.invitationRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	fansubID, err := parseFansubID(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungueltige fansub-id"}})
		return
	}
	invitationID, err := parseFansubID(c.Param("invitationId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungueltige invitation-id"}})
		return
	}

	result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupInvitationsCancel, fansubID)
	if err != nil {
		writePermissionInternalError(c, err, "Einladungsberechtigung konnte nicht geprÃ¼ft werden.")
		return
	}
	if !result.Allowed {
		auditPermissionDenied(c, h.auditLogRepo, identity, "fansub_group_invitations.cancel.denied", &fansubID, "fansub_group_invitation", &invitationID, permissions.ActionFansubGroupInvitationsCancel, result)
		writePermissionDenied(c, result)
		return
	}

	invitation, err := h.invitationRepo.Cancel(c.Request.Context(), fansubID, invitationID, models.FansubGroupInvitationCancelInput{
		CancelledByAppUserID: &identity.AppUserID,
	})
	if err != nil {
		if err == repository.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "einladung nicht gefunden"}})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "fansub_group_invitation.cancelled",
		ScopeType:      permissions.ScopeTypeGroup,
		ScopeID:        &fansubID,
		TargetType:     "fansub_group_invitation",
		TargetID:       &invitation.ID,
		Action:         string(permissions.ActionFansubGroupInvitationsCancel),
		Outcome:        "allowed",
		Payload:        map[string]any{"email": invitation.Email},
	})

	c.JSON(http.StatusOK, gin.H{"data": invitation})
}

func (h *AppAuthHandler) AcceptFansubInvitation(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	if h.invitationRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	result := h.permissionSvc.CanAcceptInvitation(actor)
	if !result.Allowed {
		writePermissionDenied(c, result)
		return
	}

	var req acceptFansubGroupInvitationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "ungueltige anfrage"}})
		return
	}

	invitation, member, err := h.invitationRepo.Accept(c.Request.Context(), models.AcceptFansubInvitationInput{
		Token: req.Token,
		ActorAppUser: models.AppUser{
			ID:    identity.AppUserID,
			Email: identity.Email,
		},
	})
	if err != nil {
		if err == repository.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "einladung nicht gefunden"}})
			return
		}
		if mutationErr, ok := repository.AsInvitationMutationError(err); ok {
			var scopeID *int64
			var targetID *int64
			if invitation != nil {
				scopeID = &invitation.FansubGroupID
				targetID = &invitation.ID
			}
			_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
				ActorAppUserID: &identity.AppUserID,
				EventType:      "fansub_group_invitation.accept.blocked",
				ScopeType:      permissions.ScopeTypeGroup,
				ScopeID:        scopeID,
				TargetType:     "fansub_group_invitation",
				TargetID:       targetID,
				Action:         string(permissions.ActionFansubGroupInvitationsAccept),
				Outcome:        "denied",
				ReasonCode:     &mutationErr.Code,
			})
			c.JSON(mutationErr.HTTPStatus, gin.H{"error": gin.H{"message": mutationErr.Message, "reason_code": mutationErr.Code}})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
		return
	}

	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "fansub_group_invitation.accepted",
		ScopeType:      permissions.ScopeTypeGroup,
		ScopeID:        &invitation.FansubGroupID,
		TargetType:     "fansub_group_invitation",
		TargetID:       &invitation.ID,
		Action:         string(permissions.ActionFansubGroupInvitationsAccept),
		Outcome:        "allowed",
		Payload: map[string]any{
			"member_id":          member.ID,
			"fansub_group_id":    member.FansubGroupID,
			"invited_role_codes": invitation.InvitedRoleCodes,
		},
	})

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"accepted":        true,
			"fansub_group_id": invitation.FansubGroupID,
		},
	})
}
