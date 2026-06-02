package services

import (
	"context"
	"crypto/tls"
	"fmt"
	"net"
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
	StartTLS  bool
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
	if strings.TrimSpace(msg.To) == "" {
		return fmt.Errorf("mailer: Empfänger-Adresse fehlt")
	}

	fromEmail := m.cfg.FromEmail
	if strings.TrimSpace(msg.FromEmail) != "" {
		fromEmail = strings.TrimSpace(msg.FromEmail)
	}
	fromName := m.cfg.FromName
	if strings.TrimSpace(msg.FromName) != "" {
		fromName = strings.TrimSpace(msg.FromName)
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

	var conn net.Conn
	var dialErr error
	dialer := &net.Dialer{Timeout: timeout}
	if m.cfg.StartTLS {
		conn, dialErr = tls.DialWithDialer(dialer, "tcp", addr, &tls.Config{ServerName: m.cfg.Host})
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

	if !m.cfg.StartTLS {
		// STARTTLS anbieten wenn der Server es unterstützt (best-effort für Mailpit-Kompatibilität)
		if ok, _ := client.Extension("STARTTLS"); ok {
			if err := client.StartTLS(&tls.Config{ServerName: m.cfg.Host}); err != nil {
				return fmt.Errorf("mailer: STARTTLS-Upgrade fehlgeschlagen: %w", err)
			}
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
	if err := client.Rcpt(strings.TrimSpace(msg.To)); err != nil {
		return fmt.Errorf("mailer: RCPT TO fehlgeschlagen: %w", err)
	}

	wc, err := client.Data()
	if err != nil {
		return fmt.Errorf("mailer: DATA-Befehl fehlgeschlagen: %w", err)
	}
	defer wc.Close()

	rawMsg := buildRawMessage(fromHeader, strings.TrimSpace(msg.To), msg.Subject, msg.BodyText, msg.BodyHTML)
	if _, err := wc.Write([]byte(rawMsg)); err != nil {
		return fmt.Errorf("mailer: Nachricht konnte nicht gesendet werden: %w", err)
	}

	return nil
}

// buildRawMessage erstellt einen MIME-formatierten E-Mail-String.
// Wenn ein HTML-Body vorhanden ist, wird multipart/alternative verwendet.
func buildRawMessage(from, to, subject, bodyText, bodyHTML string) string {
	var sb strings.Builder
	sb.WriteString("From: " + from + "\r\n")
	sb.WriteString("To: " + to + "\r\n")
	sb.WriteString("Subject: " + strings.ReplaceAll(subject, "\r\n", " ") + "\r\n")
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
func formatMailAddress(name, email string) string {
	name = strings.TrimSpace(name)
	email = strings.TrimSpace(email)
	if name == "" {
		return email
	}
	return fmt.Sprintf("%s <%s>", name, email)
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
