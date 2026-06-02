package services

import (
	"context"
	"strings"
	"testing"
)

func TestNoopMailerNeverReturnsError(t *testing.T) {
	m := NewNoopMailer()
	err := m.Send(context.Background(), MailMessage{
		To:       "test@example.local",
		Subject:  "Hallo",
		BodyText: "Testnachricht",
	})
	if err != nil {
		t.Fatalf("NoopMailer.Send sollte keinen Fehler zurueckgeben, bekam: %v", err)
	}
}

func TestNoopMailerAcceptsEmptyRecipient(t *testing.T) {
	m := NewNoopMailer()
	err := m.Send(context.Background(), MailMessage{
		To:       "",
		Subject:  "Leer",
		BodyText: "Inhalt",
	})
	if err != nil {
		t.Fatalf("NoopMailer sollte leer sein ohne Fehler, bekam: %v", err)
	}
}

func TestSMTPMailerRejectsEmptyRecipient(t *testing.T) {
	m := NewSMTPMailer(MailerConfig{
		Host:      "localhost",
		Port:      1025,
		FromEmail: "noreply@team4s.local",
	})
	err := m.Send(context.Background(), MailMessage{
		To:       "",
		Subject:  "Test",
		BodyText: "Inhalt",
	})
	if err == nil {
		t.Fatal("SMTPMailer.Send sollte einen Fehler zurueckgeben wenn Empfaenger fehlt")
	}
	if !strings.Contains(err.Error(), "Empfänger-Adresse fehlt") {
		t.Fatalf("erwartete Fehlermeldung 'Empfaenger-Adresse fehlt', bekam: %v", err)
	}
}

func TestBuildRawMessagePlainTextOnly(t *testing.T) {
	msg := buildRawMessage("Team4s <noreply@team4s.local>", "user@example.local", "Einladung", "Klicke hier.", "")
	if !strings.Contains(msg, "From: Team4s <noreply@team4s.local>") {
		t.Fatalf("erwartete From-Header, bekam:\n%s", msg)
	}
	if !strings.Contains(msg, "To: user@example.local") {
		t.Fatalf("erwartete To-Header, bekam:\n%s", msg)
	}
	if !strings.Contains(msg, "Subject: Einladung") {
		t.Fatalf("erwartete Subject-Header, bekam:\n%s", msg)
	}
	if !strings.Contains(msg, "Content-Type: text/plain") {
		t.Fatalf("erwartete text/plain Content-Type, bekam:\n%s", msg)
	}
	if strings.Contains(msg, "multipart") {
		t.Fatalf("erwartete kein multipart ohne HTML-Body, bekam:\n%s", msg)
	}
	if !strings.Contains(msg, "Klicke hier.") {
		t.Fatalf("erwartete Body-Inhalt, bekam:\n%s", msg)
	}
}

func TestBuildRawMessageMultipartWithHTML(t *testing.T) {
	msg := buildRawMessage("Team4s <noreply@team4s.local>", "user@example.local", "Einladung", "Klicke hier.", "<p>Klicke <a href=\"/x\">hier</a>.</p>")
	if !strings.Contains(msg, "multipart/alternative") {
		t.Fatalf("erwartete multipart/alternative wenn HTML vorhanden, bekam:\n%s", msg)
	}
	if !strings.Contains(msg, "text/plain") {
		t.Fatalf("erwartete text/plain-Teil, bekam:\n%s", msg)
	}
	if !strings.Contains(msg, "text/html") {
		t.Fatalf("erwartete text/html-Teil, bekam:\n%s", msg)
	}
	if !strings.Contains(msg, "<p>Klicke") {
		t.Fatalf("erwartete HTML-Inhalt, bekam:\n%s", msg)
	}
}

func TestFormatMailAddress(t *testing.T) {
	cases := []struct {
		name     string
		email    string
		expected string
	}{
		{"Team4s", "noreply@team4s.local", "Team4s <noreply@team4s.local>"},
		{"", "noreply@team4s.local", "noreply@team4s.local"},
		{"  ", "test@example.com", "test@example.com"},
	}
	for _, tc := range cases {
		got := formatMailAddress(tc.name, tc.email)
		if got != tc.expected {
			t.Errorf("formatMailAddress(%q, %q) = %q, erwartet %q", tc.name, tc.email, got, tc.expected)
		}
	}
}

func TestMailerInterfaceCompliance(t *testing.T) {
	// Sicherstellen, dass beide Implementierungen das Mailer-Interface erfüllen.
	var _ Mailer = &SMTPMailer{}
	var _ Mailer = &NoopMailer{}
}
