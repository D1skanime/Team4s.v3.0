package handlers

import "testing"

func TestNormalizeJellyfinResponseEncoding_Windows1252Body(t *testing.T) {
	raw := []byte("{\"Overview\":\"Kr\xe4ften und Pr\xfcfung\"}")

	decoded := normalizeJellyfinResponseEncoding(raw, "application/json")

	expected := "{\"Overview\":\"Kräften und Prüfung\"}"
	if string(decoded) != expected {
		t.Fatalf("expected %q, got %q", expected, string(decoded))
	}
}

func TestNormalizeJellyfinResponseEncoding_ValidUTF8Unchanged(t *testing.T) {
	raw := []byte("{\"Overview\":\"Kräften und Prüfung\"}")

	decoded := normalizeJellyfinResponseEncoding(raw, "application/json; charset=utf-8")

	if string(decoded) != string(raw) {
		t.Fatalf("expected body to remain unchanged, got %q", string(decoded))
	}
}
