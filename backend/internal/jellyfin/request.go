// Package jellyfin owns the server-side Jellyfin authentication boundary.
package jellyfin

import (
	"context"
	"errors"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
)

// BuildURL joins an API path to the configured base prefix without query credentials.
// It copies query values, leaving caller-owned maps unchanged.
func BuildURL(baseURL, apiPath string, query url.Values) (*url.URL, error) {
	base, err := parseHTTPURL(baseURL)
	if err != nil {
		return nil, errors.New("invalid jellyfin base url")
	}
	relative, err := url.Parse(apiPath)
	if err != nil || relative.IsAbs() || relative.Host != "" || relative.RawQuery != "" || relative.Fragment != "" {
		return nil, errors.New("invalid jellyfin api path")
	}
	escapedPath := strings.TrimRight(base.EscapedPath(), "/") + "/" + strings.TrimLeft(relative.EscapedPath(), "/")
	base.Path, err = url.PathUnescape(escapedPath)
	if err != nil {
		return nil, errors.New("invalid jellyfin api path")
	}
	base.RawPath = escapedPath
	values := base.Query()
	for key, entries := range query {
		values[key] = append([]string(nil), entries...)
	}
	stripQueryCredentials(values)
	base.RawQuery = values.Encode()
	base.Fragment = ""
	return base, nil
}

// NewRequest authenticates only URLs at the configured scheme, host and effective port.
// A foreign stored fallback URL must use its existing uncredentialed request path.
func NewRequest(ctx context.Context, method, targetURL, baseURL, apiKey string) (*http.Request, error) {
	if strings.ContainsAny(apiKey, "\r\n") {
		return nil, errors.New("invalid jellyfin api key")
	}
	apiKey = strings.TrimSpace(apiKey)
	if apiKey == "" {
		return nil, errors.New("jellyfin api key missing")
	}
	base, err := parseHTTPURL(baseURL)
	if err != nil {
		return nil, errors.New("invalid jellyfin base url")
	}
	target, err := parseHTTPURL(targetURL)
	if err != nil || !sameOrigin(base, target) {
		return nil, errors.New("jellyfin request origin rejected")
	}
	stripURLCredentials(target)
	req, err := http.NewRequestWithContext(ctx, method, target.String(), nil)
	if err != nil {
		return nil, safeError(err, apiKey)
	}
	// Escape HTTP quoted-string characters; reject line breaks above before trimming.
	token := strings.NewReplacer("\\", "\\\\", "\"", "\\\"").Replace(apiKey)
	req.Header.Set("Authorization", "MediaBrowser Token=\""+token+"\"")
	return req.WithContext(context.WithValue(req.Context(), credentialKey{}, apiKey)), nil
}

// Do preserves the caller's client settings without mutating a shared http.Client.
// Redirect policy and returned diagnostics cannot forward or expose credentials.
func Do(client *http.Client, req *http.Request, baseURL string) (*http.Response, error) {
	base, err := parseHTTPURL(baseURL)
	if err != nil {
		return nil, errors.New("invalid jellyfin base url")
	}
	key, _ := req.Context().Value(credentialKey{}).(string)
	if !sameOrigin(base, req.URL) {
		return nil, errors.New("jellyfin request origin rejected")
	}
	if client == nil {
		client = http.DefaultClient
	}
	local := *client
	previousRedirect := client.CheckRedirect
	local.CheckRedirect = func(next *http.Request, via []*http.Request) error {
		if !sameOrigin(base, next.URL) {
			return errors.New("jellyfin redirect origin rejected")
		}
		stripURLCredentials(next.URL)
		if previousRedirect != nil {
			if err := previousRedirect(next, via); err != nil {
				return err
			}
		} else if len(via) >= 10 {
			return errors.New("stopped after 10 jellyfin redirects")
		}
		// Custom redirect callbacks must not be able to redirect an authenticated call elsewhere.
		if !sameOrigin(base, next.URL) {
			return errors.New("jellyfin redirect origin rejected")
		}
		stripURLCredentials(next.URL)
		next.Header.Set("Authorization", req.Header.Get("Authorization"))
		return nil
	}
	outbound := req.Clone(req.Context())
	stripURLCredentials(outbound.URL)
	resp, err := local.Do(outbound)
	if err != nil {
		return resp, safeError(err, key)
	}
	resp.Body = &safeBody{ReadCloser: resp.Body, key: key}
	return resp, nil
}

type credentialKey struct{}

func parseHTTPURL(raw string) (*url.URL, error) {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return nil, errors.New("invalid jellyfin url")
	}
	parsed.Scheme = strings.ToLower(parsed.Scheme)
	if (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Hostname() == "" || parsed.User != nil || parsed.Opaque != "" {
		return nil, errors.New("invalid jellyfin url")
	}
	return parsed, nil
}

func sameOrigin(base, target *url.URL) bool {
	return target != nil && target.User == nil &&
		strings.EqualFold(base.Scheme, target.Scheme) &&
		strings.EqualFold(base.Hostname(), target.Hostname()) &&
		effectivePort(base) == effectivePort(target)
}

func effectivePort(target *url.URL) string {
	if port := target.Port(); port != "" {
		return port
	}
	if strings.EqualFold(target.Scheme, "https") {
		return "443"
	}
	return "80"
}

func stripURLCredentials(target *url.URL) {
	values := target.Query()
	stripQueryCredentials(values)
	target.RawQuery = values.Encode()
	target.Fragment = ""
}

func stripQueryCredentials(values url.Values) {
	for key := range values {
		switch strings.ToLower(key) {
		case "api_key", "apikey", "x-emby-token", "x-mediabrowser-token", "access_token":
			delete(values, key)
		}
	}
}

// sanitizedError keeps errors.Is and net.Error classification without unwrapping
// into an unsafe url.Error that a caller could print with the original URL.
type sanitizedError struct {
	message string
	cause   error
	timeout bool
}

func (e *sanitizedError) Error() string        { return e.message }
func (e *sanitizedError) Is(target error) bool { return errors.Is(e.cause, target) }
func (e *sanitizedError) Timeout() bool        { return e.timeout }
func (e *sanitizedError) Temporary() bool      { return false }

func safeError(err error, key string) error {
	if err == nil || err == io.EOF {
		return err
	}
	message := err.Error()
	if key != "" {
		for _, secret := range []string{key, url.QueryEscape(key), url.PathEscape(key), strings.NewReplacer("\\", "\\\\", "\"", "\\\"").Replace(key)} {
			message = strings.ReplaceAll(message, secret, "[redacted]")
		}
	}
	var networkError net.Error
	timeout := errors.Is(err, context.DeadlineExceeded) || (errors.As(err, &networkError) && networkError.Timeout())
	return &sanitizedError{message: message, cause: err, timeout: timeout}
}

type safeBody struct {
	io.ReadCloser
	key string
}

func (b *safeBody) Read(p []byte) (int, error) {
	n, err := b.ReadCloser.Read(p)
	return n, safeError(err, b.key)
}
func (b *safeBody) Close() error { return safeError(b.ReadCloser.Close(), b.key) }
