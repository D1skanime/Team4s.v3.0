package services

import (
	"context"
	"fmt"
	"log"
	"strings"
)

// EmailService defines the interface for sending emails
// This allows easy switching between providers (Console, SendGrid, SES, etc.)
type EmailService interface {
	SendVerificationEmail(ctx context.Context, to, username, token string) error
	SendPasswordResetEmail(ctx context.Context, to, username, token string) error
}

// ConsoleEmailService implements EmailService by logging to console
// Used for development/testing - no actual emails sent
type ConsoleEmailService struct {
	baseURL string // Frontend URL for building links
}

// NewConsoleEmailService creates a new console email service
func NewConsoleEmailService(frontendBaseURL string) *ConsoleEmailService {
	// Ensure no trailing slash
	baseURL := strings.TrimSuffix(frontendBaseURL, "/")
	return &ConsoleEmailService{
		baseURL: baseURL,
	}
}

// SendVerificationEmail logs the verification email to console
func (s *ConsoleEmailService) SendVerificationEmail(ctx context.Context, to, username, token string) error {
	verificationLink := fmt.Sprintf("%s/verify-email?token=%s", s.baseURL, token)

	log.Println("========================================")
	log.Println("       EMAIL VERIFICATION EMAIL")
	log.Println("========================================")
	log.Printf("To: %s", to)
	log.Printf("Username: %s", username)
	log.Println("----------------------------------------")
	log.Println("Subject: Bestaetigen deine E-Mail-Adresse - Team4s")
	log.Println("")
	log.Printf("Hallo %s,", username)
	log.Println("")
	log.Println("Willkommen bei Team4s! Bitte bestaetigen deine E-Mail-Adresse,")
	log.Println("indem du auf den folgenden Link klickst:")
	log.Println("")
	log.Printf("  %s", verificationLink)
	log.Println("")
	log.Println("Dieser Link ist 24 Stunden gueltig.")
	log.Println("")
	log.Println("Falls du dich nicht bei Team4s registriert hast,")
	log.Println("ignoriere bitte diese E-Mail.")
	log.Println("")
	log.Println("Viele Gruesse,")
	log.Println("Dein Team4s Team")
	log.Println("========================================")

	return nil
}

// SendPasswordResetEmail logs the password reset email to console
func (s *ConsoleEmailService) SendPasswordResetEmail(ctx context.Context, to, username, token string) error {
	resetLink := fmt.Sprintf("%s/reset-password?token=%s", s.baseURL, token)

	log.Println("========================================")
	log.Println("       PASSWORD RESET EMAIL")
	log.Println("========================================")
	log.Printf("To: %s", to)
	log.Printf("Username: %s", username)
	log.Println("----------------------------------------")
	log.Println("Subject: Passwort zuruecksetzen - Team4s")
	log.Println("")
	log.Printf("Hallo %s,", username)
	log.Println("")
	log.Println("Du hast ein neues Passwort angefordert.")
	log.Println("Klicke auf den folgenden Link um dein Passwort zurueckzusetzen:")
	log.Println("")
	log.Printf("  %s", resetLink)
	log.Println("")
	log.Println("Dieser Link ist 1 Stunde gueltig.")
	log.Println("")
	log.Println("Falls du kein neues Passwort angefordert hast,")
	log.Println("ignoriere bitte diese E-Mail.")
	log.Println("")
	log.Println("Viele Gruesse,")
	log.Println("Dein Team4s Team")
	log.Println("========================================")

	return nil
}

// VerificationEmailTemplate holds the template data for verification emails
// This can be used when implementing real email providers
type VerificationEmailTemplate struct {
	To               string
	Username         string
	VerificationLink string
	ExpiresIn        string // e.g., "24 Stunden"
}

// PasswordResetEmailTemplate holds the template data for password reset emails
type PasswordResetEmailTemplate struct {
	To        string
	Username  string
	ResetLink string
	ExpiresIn string // e.g., "1 Stunde"
}

// BuildVerificationEmailHTML returns HTML content for verification email
// Can be used by real email providers
func BuildVerificationEmailHTML(data VerificationEmailTemplate) string {
	return fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Team4s</h1>
        </div>
        <div class="content">
            <h2>Hallo %s!</h2>
            <p>Willkommen bei Team4s! Bitte bestaetigen deine E-Mail-Adresse, um dein Konto zu aktivieren.</p>
            <p style="text-align: center;">
                <a href="%s" class="button">E-Mail bestaetigen</a>
            </p>
            <p>Oder kopiere diesen Link in deinen Browser:</p>
            <p style="word-break: break-all; color: #667eea;">%s</p>
            <p><strong>Dieser Link ist %s gueltig.</strong></p>
            <p>Falls du dich nicht bei Team4s registriert hast, ignoriere bitte diese E-Mail.</p>
        </div>
        <div class="footer">
            <p>Diese E-Mail wurde automatisch generiert. Bitte antworte nicht darauf.</p>
        </div>
    </div>
</body>
</html>
`, data.Username, data.VerificationLink, data.VerificationLink, data.ExpiresIn)
}

// BuildVerificationEmailText returns plain text content for verification email
func BuildVerificationEmailText(data VerificationEmailTemplate) string {
	return fmt.Sprintf(`Hallo %s,

Willkommen bei Team4s! Bitte bestaetigen deine E-Mail-Adresse, indem du auf den folgenden Link klickst:

%s

Dieser Link ist %s gueltig.

Falls du dich nicht bei Team4s registriert hast, ignoriere bitte diese E-Mail.

Viele Gruesse,
Dein Team4s Team
`, data.Username, data.VerificationLink, data.ExpiresIn)
}
