package handlers

import (
	"strings"
	"testing"
)

func TestValidateCreateCommentRequest(t *testing.T) {
	tests := []struct {
		name           string
		req            createCommentRequest
		authorName     string
		wantMessage    string
		wantAuthorName string
		wantContent    string
	}{
		{
			name: "valid and trimmed",
			req: createCommentRequest{
				Content: "  Gute Folge!  ",
			},
			authorName:     "  Nico  ",
			wantAuthorName: "Nico",
			wantContent:    "Gute Folge!",
		},
		{
			name: "missing author name",
			req: createCommentRequest{
				Content: "Text",
			},
			authorName:  "   ",
			wantMessage: "author_name ist erforderlich",
		},
		{
			name: "author name too long",
			req: createCommentRequest{
				Content: "Text",
			},
			authorName:  strings.Repeat("a", maxCommentAuthorNameLength+1),
			wantMessage: "author_name ist zu lang (max 80 zeichen)",
		},
		{
			name: "missing content",
			req: createCommentRequest{
				Content: "   ",
			},
			authorName:  "Nico",
			wantMessage: "content ist erforderlich",
		},
		{
			name: "content too long",
			req: createCommentRequest{
				Content: strings.Repeat("x", maxCommentContentLength+1),
			},
			authorName:  "Nico",
			wantMessage: "content ist zu lang (max 4000 zeichen)",
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			input, message := validateCreateCommentRequest(tc.req, tc.authorName)
			if message != tc.wantMessage {
				t.Fatalf("expected message %q, got %q", tc.wantMessage, message)
			}

			if tc.wantMessage != "" {
				return
			}

			if input.AuthorName != tc.wantAuthorName {
				t.Fatalf("expected author_name %q, got %q", tc.wantAuthorName, input.AuthorName)
			}
			if input.Content != tc.wantContent {
				t.Fatalf("expected content %q, got %q", tc.wantContent, input.Content)
			}
		})
	}
}
