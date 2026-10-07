package repository

import "context"

// checkMemorialNotClaimable ist der gemeinsame Guard für beide Claim-Pfade --
// SubmitClaim (member_claims_submit_repository.go) und AcceptInvitation
// (member_claim_invitations_repository.go). Ein als "memorial" markiertes
// Mitgliedsprofil kann nicht beansprucht werden (D-21: vorher byte-nah-identischer
// Code in beiden Repositories, der bei künftigen Änderungen stillschweigend hätte
// auseinanderlaufen können).
//
// Der jeweilige Aufrufer fragt profileStatus selbst über seinen eigenen
// DB-Handle ab (Pool bei SubmitClaim, Transaktion bei AcceptInvitation) --
// dieser Helper führt keine eigene SQL-Abfrage aus, sondern wertet das bereits
// ermittelte Ergebnis aus und schreibt bei Bedarf den denied-Audit-Eintrag
// (D-15) best-effort über den gemeinsam genutzten AuditLogRepository.
//
// actorAppUserID ist optional (SubmitClaim kennt den anfragenden app-user,
// AcceptInvitation schrieb den Audit-Eintrag bisher ohne Actor-Zuordnung --
// dieses bestehende Verhalten bleibt an beiden Call-Sites unverändert).
func checkMemorialNotClaimable(
	ctx context.Context,
	auditLogRepo *AuditLogRepository,
	memberID int64,
	actorAppUserID *int64,
	action string,
	profileStatus string,
) *ClaimMutationError {
	if profileStatus != "memorial" {
		return nil
	}

	// denied-Audit schreiben (D-15). Fehlertolerant via _ = (blockiert den Fehler-Return nicht).
	_ = func() error {
		if auditLogRepo == nil {
			return nil
		}
		return auditLogRepo.Write(ctx, AuditLogEntry{
			ActorAppUserID: actorAppUserID,
			EventType:      "member_claim.memorial_blocked",
			TargetType:     "member",
			TargetID:       &memberID,
			Action:         action,
			Outcome:        "denied",
		})
	}()

	return &ClaimMutationError{
		Code:       "memorial_not_claimable",
		Message:    "Dieses Profil wird als Gedenkprofil geführt und kann nicht beansprucht werden.",
		HTTPStatus: 409,
	}
}
