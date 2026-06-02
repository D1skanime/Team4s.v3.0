package config

import "testing"

func TestGetEnvInt64List(t *testing.T) {
	t.Setenv("AUTH_ADMIN_BOOTSTRAP_USER_IDS", "1, 2,2, invalid, -1, 3")

	items := getEnvInt64List("AUTH_ADMIN_BOOTSTRAP_USER_IDS", []int64{99})
	if len(items) != 3 {
		t.Fatalf("expected 3 items, got %d", len(items))
	}
	if items[0] != 1 || items[1] != 2 || items[2] != 3 {
		t.Fatalf("unexpected values: %+v", items)
	}
}

func TestGetEnvInt64ListFallback(t *testing.T) {
	t.Setenv("AUTH_ADMIN_BOOTSTRAP_USER_IDS", "")

	items := getEnvInt64List("AUTH_ADMIN_BOOTSTRAP_USER_IDS", []int64{7})
	if len(items) != 1 || items[0] != 7 {
		t.Fatalf("unexpected fallback values: %+v", items)
	}
}

func TestLoad_ParsesBootstrapAdminUserIDs(t *testing.T) {
	t.Setenv("AUTH_ADMIN_BOOTSTRAP_USER_IDS", "5, 7, invalid, 7")

	cfg := Load()
	if len(cfg.AuthAdminBootstrapUserIDs) != 2 {
		t.Fatalf("expected 2 bootstrap ids, got %d", len(cfg.AuthAdminBootstrapUserIDs))
	}
	if cfg.AuthAdminBootstrapUserIDs[0] != 5 || cfg.AuthAdminBootstrapUserIDs[1] != 7 {
		t.Fatalf("unexpected bootstrap ids: %+v", cfg.AuthAdminBootstrapUserIDs)
	}
}

func TestLoad_IgnoresLegacyAdminBootstrapEnv(t *testing.T) {
	t.Setenv("AUTH_ADMIN_BOOTSTRAP_USER_IDS", "")
	t.Setenv("AUTH_ADMIN_USER_IDS", "1,2")

	cfg := Load()
	if len(cfg.AuthAdminBootstrapUserIDs) != 0 {
		t.Fatalf("expected no bootstrap ids when only legacy env is set, got %+v", cfg.AuthAdminBootstrapUserIDs)
	}
}

// TestLoad_ParsesCanonicalSMTPEnv prüft, dass die kanonischen Deployment-Namen
// (SMTP_FROM / SMTP_USER) korrekt in die Config übernommen werden. Diese Namen
// werden von docker-compose.yml und .env.example gesetzt (Regression CR-01).
func TestLoad_ParsesCanonicalSMTPEnv(t *testing.T) {
	t.Setenv("SMTP_ENABLED", "true")
	t.Setenv("SMTP_HOST", "in-v3.mailjet.com")
	t.Setenv("SMTP_PORT", "587")
	t.Setenv("SMTP_FROM", "noreply@team4s.de")
	t.Setenv("SMTP_FROM_NAME", "Team4s")
	t.Setenv("SMTP_USER", "mailjet-api-key")
	t.Setenv("SMTP_PASSWORD", "mailjet-secret")
	t.Setenv("SMTP_STARTTLS", "true")
	t.Setenv("APP_PUBLIC_URL", "https://team4s.de")

	cfg := Load()
	if !cfg.SMTPEnabled {
		t.Fatalf("expected SMTPEnabled true")
	}
	if cfg.SMTPHost != "in-v3.mailjet.com" {
		t.Fatalf("unexpected SMTPHost: %q", cfg.SMTPHost)
	}
	if cfg.SMTPPort != 587 {
		t.Fatalf("unexpected SMTPPort: %d", cfg.SMTPPort)
	}
	if cfg.SMTPFromEmail != "noreply@team4s.de" {
		t.Fatalf("SMTP_FROM nicht übernommen, bekam: %q", cfg.SMTPFromEmail)
	}
	if cfg.SMTPUsername != "mailjet-api-key" {
		t.Fatalf("SMTP_USER nicht übernommen, bekam: %q", cfg.SMTPUsername)
	}
	if cfg.SMTPPassword != "mailjet-secret" {
		t.Fatalf("SMTP_PASSWORD nicht übernommen, bekam: %q", cfg.SMTPPassword)
	}
	if !cfg.SMTPStartTLS {
		t.Fatalf("expected SMTPStartTLS true")
	}
	if cfg.AppPublicURL != "https://team4s.de" {
		t.Fatalf("unexpected AppPublicURL: %q", cfg.AppPublicURL)
	}
}

// TestLoad_FallsBackToLegacySMTPNames stellt sicher, dass die alten Namen
// (SMTP_FROM_EMAIL / SMTP_USERNAME) weiterhin akzeptiert werden, wenn die
// kanonischen Namen nicht gesetzt sind (Abwärtskompatibilität, CR-01).
func TestLoad_FallsBackToLegacySMTPNames(t *testing.T) {
	t.Setenv("SMTP_FROM_EMAIL", "legacy@team4s.local")
	t.Setenv("SMTP_USERNAME", "legacy-user")

	cfg := Load()
	if cfg.SMTPFromEmail != "legacy@team4s.local" {
		t.Fatalf("SMTP_FROM_EMAIL-Fallback nicht aktiv, bekam: %q", cfg.SMTPFromEmail)
	}
	if cfg.SMTPUsername != "legacy-user" {
		t.Fatalf("SMTP_USERNAME-Fallback nicht aktiv, bekam: %q", cfg.SMTPUsername)
	}
}

// TestLoad_PrefersCanonicalOverLegacySMTPNames prüft, dass bei gleichzeitig
// gesetzten kanonischen und alten Namen der kanonische Name gewinnt.
func TestLoad_PrefersCanonicalOverLegacySMTPNames(t *testing.T) {
	t.Setenv("SMTP_FROM", "canonical@team4s.de")
	t.Setenv("SMTP_FROM_EMAIL", "legacy@team4s.local")
	t.Setenv("SMTP_USER", "canonical-user")
	t.Setenv("SMTP_USERNAME", "legacy-user")

	cfg := Load()
	if cfg.SMTPFromEmail != "canonical@team4s.de" {
		t.Fatalf("SMTP_FROM sollte Vorrang haben, bekam: %q", cfg.SMTPFromEmail)
	}
	if cfg.SMTPUsername != "canonical-user" {
		t.Fatalf("SMTP_USER sollte Vorrang haben, bekam: %q", cfg.SMTPUsername)
	}
}
