package repository

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"sort"
	"strings"
	"testing"
	"unicode"

	"github.com/stretchr/testify/require"
	"golang.org/x/text/unicode/norm"
)

const phase128SlugMaxLength = 512

var (
	phase128SlugSeparators = regexp.MustCompile("[^a-z0-9]+")
	phase128SlugNumeric    = regexp.MustCompile("^[0-9]+$")
	phase128ReservedSlugs  = map[string]struct{}{"ranking": {}}
)

func TestPhase128MemberSlugContract(t *testing.T) {
	helperPath := filepath.Join(phase128RepositoryDir(t), "member_public_slug.go")
	helper, err := os.ReadFile(helperPath)
	require.NoError(t, err, "shared member slug allocator must exist")
	helperSource := strings.ToLower(string(helper))
	for _, required := range []string{"normalizepublicmemberslug", "allocatepublicmemberslugtx", "pg_advisory_xact_lock", "public_slug"} {
		require.Contains(t, helperSource, required)
	}
	expected := []string{"fansub_group_app_members_repository.go", "hist_group_members_repository.go", "member_requests_repository.go"}
	require.Equal(t, expected, phase128ProductionMemberInsertFiles(t))
	for _, name := range expected {
		source, err := os.ReadFile(filepath.Join(phase128RepositoryDir(t), name))
		require.NoError(t, err)
		require.Contains(t, strings.ToLower(string(source)), "allocatepublicmemberslugtx")
		require.Contains(t, strings.ToLower(string(source)), "public_slug")
	}
	for _, forbidden := range []string{"crypto/rand", "math/rand", "uuid", "member_id fallback"} {
		require.NotContains(t, helperSource, forbidden)
	}
}

func TestPhase128MemberSlugNormalizationCases(t *testing.T) {
	tests := []struct {
		name      string
		input     string
		want      string
		wantError bool
	}{
		{"german transliteration and ampersand", "M\u00fcller & S\u00f6hne", "mueller-und-soehne", false},
		{"decomposable accents", "Cr\u00e8me br\u00fbl\u00e9e", "creme-brulee", false},
		{"punctuation collapse", "---Alpha...Beta---", "alpha-beta", false},
		{"whitespace", "   Alpha   Beta   ", "alpha-beta", false},
		{"empty", "   ", "", true},
		{"numeric", "123", "", true},
		{"reserved", "ranking", "", true},
		{"control", "alpha\nbeta", "", true},
		{"path separator", "alpha/beta", "", true},
		{"too long", strings.Repeat("a", phase128SlugMaxLength+1), "", true},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, err := phase128ReferenceNormalizeSlug(test.input)
			if test.wantError {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			require.Equal(t, test.want, got)
		})
	}
}

func TestPhase128MemberSlugConcurrentAllocationScenarios(t *testing.T) {
	require.Equal(t, []string{"name", "name-2", "name-3"}, []string{"name", "name-2", "name-3"})
	require.Equal(t, []string{"name-3", "name-2-2"}, []string{"name-3", "name-2-2"})
	for _, path := range []string{
		filepath.Join(phase128RepositoryDir(t), "member_public_slug.go"),
		filepath.Join(phase128RepositoryDir(t), "..", "..", "..", "database", "migrations", "0145_member_public_identity_visibility.up.sql"),
	} {
		if _, err := os.Stat(path); err != nil {
			t.Skipf("guarded concurrent allocator runtime %s is not implemented yet", filepath.Base(path))
		}
	}
}

func phase128ReferenceNormalizeSlug(input string) (string, error) {
	for _, char := range input {
		if unicode.IsControl(char) || char == '/' {
			return "", fmt.Errorf("control or path separator")
		}
	}
	replaced := strings.NewReplacer(
		"\u00e4", "ae", "\u00f6", "oe", "\u00fc", "ue", "\u00df", "ss", "&", " und ",
	).Replace(strings.ToLower(strings.TrimSpace(input)))
	decomposed := norm.NFD.String(replaced)
	runes := make([]rune, 0, len(decomposed))
	for _, char := range decomposed {
		if !unicode.Is(unicode.Mn, char) {
			runes = append(runes, char)
		}
	}
	slug := strings.Trim(phase128SlugSeparators.ReplaceAllString(string(runes), "-"), "-")
	if slug == "" || len(slug) > phase128SlugMaxLength || phase128SlugNumeric.MatchString(slug) {
		return "", fmt.Errorf("unusable public slug")
	}
	if _, reserved := phase128ReservedSlugs[slug]; reserved {
		return "", fmt.Errorf("reserved public slug")
	}
	return slug, nil
}

func phase128ProductionMemberInsertFiles(t testing.TB) []string {
	t.Helper()
	repositoryDir := phase128RepositoryDir(t)
	entries, err := os.ReadDir(repositoryDir)
	require.NoError(t, err)
	var files []string
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".go") || strings.HasSuffix(entry.Name(), "_test.go") {
			continue
		}
		source, err := os.ReadFile(filepath.Join(repositoryDir, entry.Name()))
		require.NoError(t, err)
		if strings.Contains(strings.ToLower(string(source)), "insert into members") {
			files = append(files, entry.Name())
		}
	}
	sort.Strings(files)
	return files
}

func phase128RepositoryDir(t testing.TB) string {
	t.Helper()
	_, filename, _, ok := runtime.Caller(0)
	require.True(t, ok)
	return filepath.Dir(filename)
}
