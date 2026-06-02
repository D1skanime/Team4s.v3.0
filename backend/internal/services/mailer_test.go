package services

import (
	"bufio"
	"context"
	"net"
	"strings"
	"testing"
	"time"
)

// fakeSMTPServer ist ein minimaler SMTP-Server für Tests. Er akzeptiert eine
// einzelne Sitzung, sammelt die DATA-Zeilen und stellt sie über done bereit.
type fakeSMTPServer struct {
	ln     net.Listener
	dataCh chan string
	mailCh chan string
}

func newFakeSMTPServer(t *testing.T) *fakeSMTPServer {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("konnte Test-SMTP-Server nicht starten: %v", err)
	}
	srv := &fakeSMTPServer{ln: ln, dataCh: make(chan string, 1), mailCh: make(chan string, 1)}
	go srv.serveOnce(t)
	return srv
}

func (s *fakeSMTPServer) addr() (string, int) {
	host, portStr, _ := net.SplitHostPort(s.ln.Addr().String())
	var port int
	for _, c := range portStr {
		port = port*10 + int(c-'0')
	}
	return host, port
}

func (s *fakeSMTPServer) serveOnce(t *testing.T) {
	conn, err := s.ln.Accept()
	if err != nil {
		return
	}
	defer conn.Close()
	r := bufio.NewReader(conn)
	w := bufio.NewWriter(conn)
	write := func(line string) {
		_, _ = w.WriteString(line + "\r\n")
		_ = w.Flush()
	}
	write("220 fake ESMTP")
	var body strings.Builder
	inData := false
	for {
		_ = conn.SetReadDeadline(time.Now().Add(2 * time.Second))
		line, err := r.ReadString('\n')
		if err != nil {
			return
		}
		trimmed := strings.TrimRight(line, "\r\n")
		if inData {
			if trimmed == "." {
				inData = false
				s.dataCh <- body.String()
				write("250 OK queued")
				continue
			}
			body.WriteString(trimmed + "\n")
			continue
		}
		upper := strings.ToUpper(trimmed)
		switch {
		case strings.HasPrefix(upper, "EHLO"), strings.HasPrefix(upper, "HELO"):
			write("250-fake")
			write("250 OK")
		case strings.HasPrefix(upper, "MAIL FROM"):
			s.mailCh <- trimmed
			write("250 OK")
		case strings.HasPrefix(upper, "RCPT TO"):
			write("250 OK")
		case strings.HasPrefix(upper, "DATA"):
			write("354 End data with <CR><LF>.<CR><LF>")
			inData = true
		case strings.HasPrefix(upper, "QUIT"):
			write("221 Bye")
			return
		default:
			write("250 OK")
		}
	}
}

// TestSMTPMailerSendUsesPerMessageFromOverride deckt die per-Message-Overrides
// FromEmail/FromName ab (IN-03) und prüft zugleich den erfolgreichen Send-Pfad
// inklusive DATA-Close und QUIT (WR-01/WR-04).
func TestSMTPMailerSendUsesPerMessageFromOverride(t *testing.T) {
	srv := newFakeSMTPServer(t)
	host, port := srv.addr()

	m := NewSMTPMailer(MailerConfig{
		Host:      host,
		Port:      port,
		FromEmail: "default@team4s.local",
		FromName:  "Default",
	})
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err := m.Send(ctx, MailMessage{
		To:        "user@example.local",
		Subject:   "Hallo",
		BodyText:  "Inhalt",
		FromEmail: "override@team4s.de",
		FromName:  "Override",
	})
	if err != nil {
		t.Fatalf("Send sollte erfolgreich sein, bekam: %v", err)
	}

	select {
	case mailFrom := <-srv.mailCh:
		if !strings.Contains(mailFrom, "override@team4s.de") {
			t.Fatalf("erwartete Override-Absender in MAIL FROM, bekam: %q", mailFrom)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("kein MAIL FROM empfangen")
	}

	select {
	case data := <-srv.dataCh:
		if !strings.Contains(data, "Override <override@team4s.de>") {
			t.Fatalf("erwartete Override-From-Header, bekam:\n%s", data)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("keine DATA empfangen")
	}
}

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

func TestSMTPMailerRejectsCRLFInRecipient(t *testing.T) {
	m := NewSMTPMailer(MailerConfig{
		Host:      "localhost",
		Port:      1025,
		FromEmail: "noreply@team4s.local",
	})
	err := m.Send(context.Background(), MailMessage{
		To:       "a@b.com\r\nBcc: victim@x.com",
		Subject:  "Test",
		BodyText: "Inhalt",
	})
	if err == nil {
		t.Fatal("SMTPMailer.Send sollte CRLF im Empfaenger ablehnen")
	}
}

func TestSMTPMailerRejectsInvalidRecipient(t *testing.T) {
	m := NewSMTPMailer(MailerConfig{Host: "localhost", Port: 1025, FromEmail: "noreply@team4s.local"})
	err := m.Send(context.Background(), MailMessage{
		To:       "kein-valides-format",
		Subject:  "Test",
		BodyText: "Inhalt",
	})
	if err == nil {
		t.Fatal("SMTPMailer.Send sollte ungueltige Empfaenger-Adresse ablehnen")
	}
}

func TestBuildRawMessageEncodesUmlautSubject(t *testing.T) {
	msg := buildRawMessage("Team4s <noreply@team4s.local>", "user@example.local", "Einladung für Müller", "Text", "")
	// Roher UTF-8-Umlaut darf NICHT im Subject-Header stehen; stattdessen RFC-2047.
	if strings.Contains(msg, "Subject: Einladung für Müller") {
		t.Fatalf("erwartete RFC-2047-kodierten Subject, bekam roh:\n%s", msg)
	}
	if !strings.Contains(msg, "Subject: =?utf-8?q?") {
		t.Fatalf("erwartete RFC-2047 encoded-word im Subject, bekam:\n%s", msg)
	}
}

func TestBuildRawMessageStripsCRLFFromSubject(t *testing.T) {
	msg := buildRawMessage("Team4s <noreply@team4s.local>", "user@example.local", "Zeile1\r\nInjected: x", "Text", "")
	// Der injizierte Teil darf nicht als eigene Header-Zeile erscheinen, d.h.
	// es darf kein CRLF unmittelbar vor "Injected:" stehen.
	if strings.Contains(msg, "\r\nInjected: x") {
		t.Fatalf("Subject-Header-Injection nicht verhindert, bekam:\n%s", msg)
	}
	// Der gesamte Subject-Inhalt muss auf einer einzigen Header-Zeile bleiben.
	if !strings.Contains(msg, "Subject: Zeile1  Injected: x\r\n") {
		t.Fatalf("erwartete gefalteten Subject auf einer Zeile, bekam:\n%s", msg)
	}
}

func TestMailerInterfaceCompliance(t *testing.T) {
	// Sicherstellen, dass beide Implementierungen das Mailer-Interface erfüllen.
	var _ Mailer = &SMTPMailer{}
	var _ Mailer = &NoopMailer{}
}
