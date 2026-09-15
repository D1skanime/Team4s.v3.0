package handlers

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

const jellyfin12TestKey = "synthetic-jellyfin12-secret"

func jellyfin12MetadataCaller(owner string, client *http.Client, base string) func(context.Context, any) (int, error) {
	query := url.Values{"Fields": {"Path"}}
	switch owner {
	case "admin":
		h := &AdminContentHandler{httpClient: client, jellyfinBaseURL: base, jellyfinAPIKey: jellyfin12TestKey}
		return func(ctx context.Context, target any) (int, error) {
			return h.fetchJellyfinJSON(ctx, "/Items", query, target)
		}
	case "anime-json":
		h := &AnimeHandler{httpClient: client, jellyfinBaseURL: base, jellyfinAPIKey: jellyfin12TestKey}
		return func(ctx context.Context, target any) (int, error) {
			return h.fetchJellyfinJSON(ctx, "/Items", query, target)
		}
	case "anime-status":
		h := &AnimeHandler{httpClient: client, jellyfinBaseURL: base, jellyfinAPIKey: jellyfin12TestKey}
		return func(ctx context.Context, target any) (int, error) { return h.fetchJellyfinStatus(ctx, "/Items", query) }
	default:
		h := &GroupAssetsHandler{httpClient: client, jellyfinBaseURL: base, jellyfinAPIKey: jellyfin12TestKey}
		return func(ctx context.Context, target any) (int, error) {
			return 0, h.fetchGroupAssetsJSON(ctx, "/Items", query, target)
		}
	}
}

func TestJellyfin12MetadataOwnersAuthenticateAndPreserveStatuses(t *testing.T) {
	for _, owner := range []string{"admin", "anime-json", "anime-status", "group"} {
		for _, status := range []int{200, 401, 503} {
			t.Run(fmt.Sprintf("%s/%d", owner, status), func(t *testing.T) {
				count := 0
				server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					count++
					if r.Header.Get("Authorization") != "MediaBrowser Token=\""+jellyfin12TestKey+"\"" {
						t.Error("modern header missing")
					}
					if strings.Contains(r.URL.String(), jellyfin12TestKey) || r.URL.Query().Has("api_key") {
						t.Error("query credential leaked")
					}
					if r.URL.Path != "/prefix/Items" || r.URL.Query().Get("Fields") != "Path" {
						t.Error("query/path changed")
					}
					w.WriteHeader(status)
					io.WriteString(w, `{"Name":"fixture"}`)
				}))
				defer server.Close()
				var target struct{ Name string }
				got, err := jellyfin12MetadataCaller(owner, server.Client(), server.URL+"/prefix")(context.Background(), &target)
				wantError := status >= 400 && !(owner == "anime-status" && status == 401)
				if (err != nil) != wantError {
					t.Fatalf("error=%v status=%d", err, status)
				}
				if owner != "group" && got != status {
					t.Fatalf("status=%d want=%d", got, status)
				}
				if status == 200 && owner != "anime-status" && target.Name != "fixture" {
					t.Fatal("body not decoded")
				}
				if count != 1 {
					t.Fatalf("request count=%d want=1", count)
				}
			})
		}
	}
}

func TestJellyfin12MetadataMalformedAndTransportErrorsStaySafe(t *testing.T) {
	for _, owner := range []string{"admin", "anime-json", "anime-status", "group"} {
		for _, transportFailure := range []bool{false, true} {
			t.Run(fmt.Sprintf("%s/transport=%t", owner, transportFailure), func(t *testing.T) {
				var diagnostics bytes.Buffer
				previous := log.Writer()
				log.SetOutput(&diagnostics)
				defer log.SetOutput(previous)
				client := &http.Client{Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
					if transportFailure {
						return nil, &url.Error{Op: "Get", URL: "https://example.test/?api_key=" + jellyfin12TestKey, Err: fmt.Errorf("%s: %w", jellyfin12TestKey, context.Canceled)}
					}
					return jsonResponse(`{"Name":`), nil
				})}
				var target struct{ Name string }
				got, err := jellyfin12MetadataCaller(owner, client, "https://example.test")(context.Background(), &target)
				if owner == "anime-status" && !transportFailure {
					if got != 200 || err != nil {
						t.Fatalf("status-only body handling changed: %d %v", got, err)
					}
					return
				}
				if err == nil {
					t.Fatal("expected error")
				}
				if strings.Contains(err.Error()+diagnostics.String(), jellyfin12TestKey) {
					t.Fatal("key leaked in error or diagnostics")
				}
				if transportFailure && !errors.Is(err, context.Canceled) {
					t.Fatal("lost cancellation identity")
				}
				if !transportFailure && owner != "group" && got != 200 {
					t.Fatal("decode status changed")
				}
			})
		}
	}
}

func TestJellyfin12MetadataAdminPreservesLegacyEncoding(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=windows-1252")
		w.Write([]byte("{\"Name\":\"Pr\xfcfung\"}"))
	}))
	defer server.Close()
	var target struct{ Name string }
	_, err := jellyfin12MetadataCaller("admin", server.Client(), server.URL)(context.Background(), &target)
	if err != nil || target.Name != "Prüfung" {
		t.Fatalf("normalization changed: %q %v", target.Name, err)
	}
}
