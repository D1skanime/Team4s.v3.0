package services

import (
	"context"
	"crypto/tls"
	"fmt"
	"mime"
	"net"
	"net/mail"
	"net/smtp"
	"strings"
	"time"
)

// MailMessage beschreibt eine ausgehende E-Mail.
type MailMessage struct {
	To          string // Empfänger-Adresse
	Subject     string // Betreffzeile
	BodyText    string // Klartext-Body (Fallback)
	BodyHTML    string // HTML-Body (bevorzugt)
	FromEmail   string // Absender-Adresse (überschreibt Service-Default)
	FromName    string // Absender-Anzeigename (überschreibt Service-Default)
}

// Mailer ist die Schnittstelle für den Mailversand.
// Eine Noop-Implementierung wird für Tests bereitgestellt.
type Mailer interface {
	Send(ctx context.Context, msg MailMessage) error
}

// MailerConfig enthält die SMTP-Verbindungsparameter.
type MailerConfig struct {
	Host      string
	Port      int
	Username  string
	Password  string
	FromEmail string
	FromName  string
	// StartTLS erzwingt nach dem Klartext-Verbindungsaufbau ein explizites
	// STARTTLS-Upgrade. Bietet der Server kein STARTTLS an, wird die
	// Verbindung abgebrochen (kein stiller Klartext-Fallback).
	StartTLS bool
	// ImplicitTLS öffnet direkt eine TLS-Verbindung (SMTPS, typ. Port 465).
	// Schließt sich mit StartTLS gegenseitig aus.
	ImplicitTLS bool
}

// SMTPMailer sendet E-Mails über einen echten SMTP-Server.
type SMTPMailer struct {
	cfg MailerConfig
}

// NewSMTPMailer erstellt einen SMTPMailer mit den übergebenen Parametern.
func NewSMTPMailer(cfg MailerConfig) *SMTPMailer {
	return &SMTPMailer{cfg: cfg}
}

// Send sendet eine E-Mail über den konfigurierten SMTP-Server.
// Der Context-Timeout wird als Dial-Timeout genutzt.
func (m *SMTPMailer) Send(ctx context.Context, msg MailMessage) error {
	to := strings.TrimSpace(msg.To)
	if to == "" {
		return fmt.Errorf("mailer: Empfänger-Adresse fehlt")
	}
	// Empfänger validieren und gegen CRLF-Header-Injection absichern (WR-02).
	if _, err := mail.ParseAddress(to); err != nil {
		return fmt.Errorf("mailer: ungültige Empfänger-Adresse: %w", err)
	}
	if containsCRLF(to) {
		return fmt.Errorf("mailer: Empfänger-Adresse enthält unzulässige Steuerzeichen")
	}

	fromEmail := m.cfg.FromEmail
	if strings.TrimSpace(msg.FromEmail) != "" {
		fromEmail = strings.TrimSpace(msg.FromEmail)
	}
	fromName := m.cfg.FromName
	if strings.TrimSpace(msg.FromName) != "" {
		fromName = strings.TrimSpace(msg.FromName)
	}
	if containsCRLF(fromEmail) || containsCRLF(fromName) {
		return fmt.Errorf("mailer: Absender enthält unzulässige Steuerzeichen")
	}

	addr := fmt.Sprintf("%s:%d", m.cfg.Host, m.cfg.Port)

	// Verbindungs-Timeout aus Context ableiten, mindestens 10 Sekunden.
	deadline, ok := ctx.Deadline()
	timeout := 10 * time.Second
	if ok {
		remaining := time.Until(deadline)
		if remaining > 0 && remaining < timeout {
			timeout = remaining
		}
	}

	tlsConfig := &tls.Config{ServerName: m.cfg.Host, MinVersion: tls.VersionTLS12}

	var conn net.Conn
	var dialErr error
	dialer := &net.Dialer{Timeout: timeout}
	if m.cfg.ImplicitTLS {
		// Implizites TLS (SMTPS, typ. Port 465): direkt TLS-Handshake.
		conn, dialErr = tls.DialWithDialer(dialer, "tcp", addr, tlsConfig)
	} else {
		conn, dialErr = dialer.DialContext(ctx, "tcp", addr)
	}
	if dialErr != nil {
		return fmt.Errorf("mailer: Verbindung zu %s fehlgeschlagen: %w", addr, dialErr)
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, m.cfg.Host)
	if err != nil {
		return fmt.Errorf("mailer: SMTP-Client konnte nicht erstellt werden: %w", err)
	}
	defer client.Close()

	if m.cfg.StartTLS {
		// STARTTLS ist erzwungen: Bietet der Server es nicht an, wird die
		// Verbindung abgebrochen statt im Klartext weiterzusenden (CR-02).
		if ok, _ := client.Extension("STARTTLS"); !ok {
			return fmt.Errorf("mailer: Server bietet kein STARTTLS an, Verbindung abgebrochen")
		}
		if err := client.StartTLS(tlsConfig); err != nil {
			return fmt.Errorf("mailer: STARTTLS-Upgrade fehlgeschlagen: %w", err)
		}
	}

	if strings.TrimSpace(m.cfg.Username) != "" {
		auth := smtp.PlainAuth("", m.cfg.Username, m.cfg.Password, m.cfg.Host)
		if err := client.Auth(auth); err != nil {
			return fmt.Errorf("mailer: SMTP-Auth fehlgeschlagen: %w", err)
		}
	}

	fromHeader := formatMailAddress(fromName, fromEmail)
	if err := client.Mail(fromEmail); err != nil {
		return fmt.Errorf("mailer: MAIL FROM fehlgeschlagen: %w", err)
	}
	if err := client.Rcpt(to); err != nil {
		return fmt.Errorf("mailer: RCPT TO fehlgeschlagen: %w", err)
	}

	wc, err := client.Data()
	if err != nil {
		return fmt.Errorf("mailer: DATA-Befehl fehlgeschlagen: %w", err)
	}

	rawMsg := buildRawMessage(fromHeader, to, msg.Subject, msg.BodyText, msg.BodyHTML)
	if _, err := wc.Write([]byte(rawMsg)); err != nil {
		_ = wc.Close()
		return fmt.Errorf("mailer: Nachricht konnte nicht gesendet werden: %w", err)
	}
	// Die finale Server-Antwort (Annehmen/Ablehnen) kommt erst beim Close des
	// DATA-Writers. Wird der Fehler ignoriert, gilt eine abgelehnte Mail
	// faelschlich als gesendet (WR-01, D-12).
	if err := wc.Close(); err != nil {
		return fmt.Errorf("mailer: Nachricht wurde vom Server abgelehnt: %w", err)
	}

	// Sitzung sauber mit QUIT beenden, damit die letzte Server-Bestaetigung
	// beobachtet wird (WR-04).
	if err := client.Quit(); err != nil {
		return fmt.Errorf("mailer: QUIT fehlgeschlagen: %w", err)
	}

	return nil
}

// containsCRLF prüft, ob ein String CR- oder LF-Zeichen enthält. Solche Werte
// dürfen nicht in SMTP-Header geschrieben werden (Header-Injection, WR-02).
func containsCRLF(s string) bool {
	return strings.ContainsAny(s, "\r\n")
}

// buildRawMessage erstellt einen MIME-formatierten E-Mail-String.
// Wenn ein HTML-Body vorhanden ist, wird multipart/alternative verwendet.
func buildRawMessage(from, to, subject, bodyText, bodyHTML string) string {
	var sb strings.Builder
	sb.WriteString("From: " + from + "\r\n")
	sb.WriteString("To: " + to + "\r\n")
	// CR/LF im Subject zuerst neutralisieren, dann RFC-2047-kodieren, damit
	// Umlaute korrekt übertragen werden (WR-02 + WR-03).
	cleanSubject := strings.ReplaceAll(strings.ReplaceAll(subject, "\r", " "), "\n", " ")
	sb.WriteString("Subject: " + mime.QEncoding.Encode("utf-8", cleanSubject) + "\r\n")
	sb.WriteString("MIME-Version: 1.0\r\n")

	if strings.TrimSpace(bodyHTML) != "" {
		boundary := "team4s_boundary_" + fmt.Sprintf("%d", time.Now().UnixNano())
		sb.WriteString("Content-Type: multipart/alternative; boundary=\"" + boundary + "\"\r\n")
		sb.WriteString("\r\n")

		// Klartext-Teil
		sb.WriteString("--" + boundary + "\r\n")
		sb.WriteString("Content-Type: text/plain; charset=UTF-8\r\n")
		sb.WriteString("\r\n")
		sb.WriteString(bodyText + "\r\n")

		// HTML-Teil
		sb.WriteString("--" + boundary + "\r\n")
		sb.WriteString("Content-Type: text/html; charset=UTF-8\r\n")
		sb.WriteString("\r\n")
		sb.WriteString(bodyHTML + "\r\n")

		sb.WriteString("--" + boundary + "--\r\n")
	} else {
		sb.WriteString("Content-Type: text/plain; charset=UTF-8\r\n")
		sb.WriteString("\r\n")
		sb.WriteString(bodyText + "\r\n")
	}

	return sb.String()
}

// formatMailAddress erstellt einen "Name <email>"-Header-Wert.
// Der Anzeigename wird bei Bedarf RFC-2047-kodiert, damit Umlaute korrekt
// im From-Header landen (WR-03).
func formatMailAddress(name, email string) string {
	name = strings.TrimSpace(name)
	email = strings.TrimSpace(email)
	if name == "" {
		return email
	}
	return fmt.Sprintf("%s <%s>", mime.QEncoding.Encode("utf-8", name), email)
}

// NoopMailer verwirft alle E-Mails ohne Versand. Geeignet für Tests und deaktivierten SMTP-Betrieb.
type NoopMailer struct{}

// NewNoopMailer erstellt einen NoopMailer.
func NewNoopMailer() *NoopMailer {
	return &NoopMailer{}
}

// Send verwirft die Nachricht lautlos.
func (m *NoopMailer) Send(_ context.Context, _ MailMessage) error {
	return nil
}
