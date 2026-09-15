package jellyfin

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

const testKey = "synthetic-private-token"

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

func TestRequestHeaderAndBasePath(t *testing.T) {
	var calls atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		if r.Header.Get("Authorization") != "MediaBrowser Token=\""+testKey+"\"" {
			t.Error("missing modern authorization")
		}
		if strings.Contains(r.URL.String(), testKey) {
			t.Error("credential in request URL")
		}
		if r.URL.Path != "/jellyfin/Items/an item" || r.URL.Query().Get("Fields") != "Path" || r.URL.Query().Get("base") != "kept" {
			t.Errorf("unexpected target: %s", r.URL)
		}
		for key := range r.URL.Query() {
			if strings.EqualFold(key, "api_key") || strings.EqualFold(key, "X-Emby-Token") {
				t.Error("legacy query authentication retained")
			}
		}
		w.WriteHeader(http.StatusNoContent)
	}))
	defer server.Close()
	query := url.Values{"Fields": {"Path"}, "api_key": {testKey}, "X-Emby-Token": {testKey}}
	target, err := BuildURL(server.URL+"/jellyfin/?base=kept&Api_Key="+testKey, "/Items/an%20item", query)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(target.String(), testKey) {
		t.Fatal("credential in built URL")
	}
	req, err := NewRequest(context.Background(), http.MethodGet, target.String(), server.URL, testKey)
	if err != nil {
		t.Fatal(err)
	}
	resp, err := Do(server.Client(), req, server.URL)
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	if calls.Load() != 1 || query.Get("api_key") != testKey {
		t.Fatal("request count or caller query mutated")
	}
}

func TestRequestRejectsForeignOriginAndMalformedCredentials(t *testing.T) {
	for _, target := range []string{"https://foreign.test/Items", "http://jellyfin.test/Items", "https://jellyfin.test:444/Items", "https://user:pass@jellyfin.test/Items", "://" + testKey} {
		_, err := NewRequest(context.Background(), "GET", target, "https://jellyfin.test", testKey)
		if err == nil || strings.Contains(err.Error(), testKey) {
			t.Errorf("unsafe target not rejected safely: %s", target)
		}
	}
	for _, key := range []string{"", "abc\r\nInjected: yes", " abc\n"} {
		if _, err := NewRequest(context.Background(), "GET", "https://jellyfin.test/Items", "https://jellyfin.test", key); err == nil {
			t.Error("unsafe credential accepted")
		}
	}
	// Host case and explicit default port refer to the same origin.
	req, err := NewRequest(context.Background(), "GET", "https://JELLYFIN.test:443/Items?api_key="+testKey, "https://jellyfin.test", testKey)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(req.URL.String(), testKey) {
		t.Fatal("legacy URL credential retained")
	}
}

func TestRequestRedirectBoundary(t *testing.T) {
	var foreignCalls atomic.Int32
	foreign := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { foreignCalls.Add(1) }))
	defer foreign.Close()
	for _, crossOrigin := range []bool{false, true} {
		t.Run(fmt.Sprint(crossOrigin), func(t *testing.T) {
			calls := 0
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				calls++
				if r.URL.Path == "/start" {
					target := "/end?api_key=" + testKey
					if crossOrigin {
						target = foreign.URL + "/end"
					}
					http.Redirect(w, r, target, http.StatusFound)
					return
				}
				if r.Header.Get("Authorization") != "MediaBrowser Token=\""+testKey+"\"" || strings.Contains(r.URL.String(), testKey) {
					t.Error("unsafe same-origin redirect")
				}
			}))
			defer server.Close()
			req, err := NewRequest(context.Background(), "GET", server.URL+"/start", server.URL, testKey)
			if err != nil {
				t.Fatal(err)
			}
			resp, err := Do(server.Client(), req, server.URL)
			if crossOrigin {
				if err == nil {
					t.Fatal("foreign redirect followed")
				}
				if strings.Contains(err.Error(), testKey) {
					t.Fatal("redirect error leaked key")
				}
			} else {
				if err != nil {
					t.Fatal(err)
				}
				resp.Body.Close()
				if calls != 2 {
					t.Fatalf("calls=%d", calls)
				}
			}
		})
	}
	if foreignCalls.Load() != 0 {
		t.Fatal("foreign origin received redirect request")
	}
}

func TestRequestSanitizesTransportErrors(t *testing.T) {
	for _, cause := range []error{context.Canceled, context.DeadlineExceeded, errors.New("connection refused")} {
		raw := &url.Error{Op: "Get", URL: "https://jellyfin.test/Items?api_key=" + testKey, Err: fmt.Errorf("%s: %w", testKey, cause)}
		client := &http.Client{Transport: roundTripFunc(func(*http.Request) (*http.Response, error) { return nil, raw })}
		req, err := NewRequest(context.Background(), "GET", "https://jellyfin.test/Items", "https://jellyfin.test", testKey)
		if err != nil {
			t.Fatal(err)
		}
		_, err = Do(client, req, "https://jellyfin.test")
		if err == nil || strings.Contains(fmt.Sprintf("diagnostic: %+v", err), testKey) {
			t.Fatal("unsafe transport diagnostic")
		}
		if !errors.Is(err, cause) {
			t.Fatal("lost error identity")
		}
		if cause == context.DeadlineExceeded {
			var timeout net.Error
			if !errors.As(err, &timeout) || !timeout.Timeout() {
				t.Fatal("lost timeout classification")
			}
		}
	}
}

func TestRequestCancellationTimeoutAndConcurrentClientReuse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/slow" {
			<-r.Context().Done()
			return
		}
		io.WriteString(w, "ok")
	}))
	defer server.Close()
	client := server.Client()
	client.Timeout = 25 * time.Millisecond
	redirectCalls := atomic.Int32{}
	client.CheckRedirect = func(*http.Request, []*http.Request) error { redirectCalls.Add(1); return http.ErrUseLastResponse }
	originalTransport := client.Transport
	var wg sync.WaitGroup
	for i := 0; i < 12; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			req, err := NewRequest(context.Background(), "GET", server.URL+"/fast", server.URL, testKey)
			if err != nil {
				t.Error(err)
				return
			}
			resp, err := Do(client, req, server.URL)
			if err != nil {
				t.Error(err)
				return
			}
			resp.Body.Close()
		}()
	}
	wg.Wait()
	for _, canceled := range []bool{false, true} {
		ctx, cancel := context.WithCancel(context.Background())
		if canceled {
			cancel()
		}
		req, err := NewRequest(ctx, "GET", server.URL+"/slow", server.URL, testKey)
		if err != nil {
			t.Fatal(err)
		}
		_, err = Do(client, req, server.URL)
		cancel()
		if canceled && !errors.Is(err, context.Canceled) {
			t.Fatalf("cancellation lost: %v", err)
		}
		if !canceled {
			var timeout net.Error
			if !errors.As(err, &timeout) || !timeout.Timeout() {
				t.Fatalf("timeout lost: %v", err)
			}
		}
	}
	if client.Timeout != 25*time.Millisecond || client.Transport != originalTransport || client.CheckRedirect == nil || redirectCalls.Load() != 0 {
		t.Fatal("shared client mutated")
	}
}

func TestRequestPreservesRedirectCallbackAndBlocksDowngrade(t *testing.T) {
	var targetCalls atomic.Int32
	plain := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { targetCalls.Add(1) }))
	defer plain.Close()
	secure := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, plain.URL, http.StatusFound)
	}))
	defer secure.Close()
	req, err := NewRequest(context.Background(), "GET", secure.URL, secure.URL, testKey)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = Do(secure.Client(), req, secure.URL); err == nil {
		t.Fatal("HTTPS downgrade followed")
	}
	if targetCalls.Load() != 0 {
		t.Fatal("downgrade sent request")
	}

	calls := 0
	same := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/next", http.StatusFound)
	}))
	defer same.Close()
	client := same.Client()
	client.CheckRedirect = func(*http.Request, []*http.Request) error { calls++; return http.ErrUseLastResponse }
	req, err = NewRequest(context.Background(), "GET", same.URL, same.URL, testKey)
	if err != nil {
		t.Fatal(err)
	}
	resp, err := Do(client, req, same.URL)
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	if calls != 1 || resp.StatusCode != http.StatusFound {
		t.Fatal("caller redirect policy changed")
	}
}

type failingBody struct{}

func (failingBody) Read([]byte) (int, error) {
	return 0, fmt.Errorf("read %s: %w", testKey, context.Canceled)
}
func (failingBody) Close() error { return fmt.Errorf("close %s", testKey) }

func TestRequestSanitizesBodyErrors(t *testing.T) {
	client := &http.Client{Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: 200, Header: make(http.Header), Body: failingBody{}}, nil
	})}
	req, err := NewRequest(context.Background(), "GET", "https://jellyfin.test", "https://jellyfin.test", testKey)
	if err != nil {
		t.Fatal(err)
	}
	resp, err := Do(client, req, "https://jellyfin.test")
	if err != nil {
		t.Fatal(err)
	}
	_, err = io.ReadAll(resp.Body)
	if !errors.Is(err, context.Canceled) || strings.Contains(err.Error(), testKey) {
		t.Fatal("unsafe read error")
	}
	if err = resp.Body.Close(); err == nil || strings.Contains(err.Error(), testKey) {
		t.Fatal("unsafe close error")
	}
}

func TestIsConfiguredOriginUsesSharedEffectivePortPolicy(t *testing.T) {
	for _, tt := range []struct {
		target string
		want   bool
	}{
		{"https://JELLYFIN.test:443/prefix/stream", true},
		{"https://jellyfin.test/elsewhere", true},
		{"http://jellyfin.test:443/stream", false},
		{"https://jellyfin.test:444/stream", false},
		{"https://foreign.test/stream", false},
		{"https://user:pass@jellyfin.test/stream", false},
		{"/relative", false},
	} {
		if got := IsConfiguredOrigin(tt.target, "https://jellyfin.test/prefix"); got != tt.want {
			t.Errorf("origin %s: got %t", tt.target, got)
		}
	}
}

func TestSanitizeURLStoredProjection(t *testing.T) {
	for _, credential := range []string{"api_key", "ApiKey", "X-Emby-Token", "X-MediaBrowser-Token", "access_token", "api%5fkey"} {
		t.Run(credential, func(t *testing.T) {
			raw := "https://media.fixture/base/Videos/item/stream?" + credential + "=" + testKey + "&MediaSourceId=B&static=true&custom=one&custom=two#" + testKey
			got, err := SanitizeURL(raw)
			if err != nil {
				t.Fatal(err)
			}
			if strings.Contains(got, testKey) {
				t.Fatal("credential retained")
			}
			parsed, err := url.Parse(got)
			if err != nil {
				t.Fatal(err)
			}
			if parsed.Path != "/base/Videos/item/stream" || parsed.Query().Get("MediaSourceId") != "B" || parsed.Query().Get("static") != "true" || len(parsed.Query()["custom"]) != 2 {
				t.Fatal("non-credential URL fields changed")
			}
			if !strings.Contains(raw, testKey) {
				t.Fatal("caller input mutated")
			}
		})
	}
	for _, raw := range []string{"://" + testKey, "https://media.fixture/stream?api_key=" + testKey + "&bad=%ZZ", "https://media.fixture/stream?api_key=" + testKey + ";static=true", "https://user:" + testKey + "@media.fixture/stream", "/stream?api_key=" + testKey} {
		got, err := SanitizeURL(raw)
		if err == nil || got != "" || strings.Contains(err.Error(), testKey) {
			t.Fatal("malformed URL did not fail closed safely")
		}
	}
}
