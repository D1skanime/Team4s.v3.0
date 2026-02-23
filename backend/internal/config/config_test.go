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
