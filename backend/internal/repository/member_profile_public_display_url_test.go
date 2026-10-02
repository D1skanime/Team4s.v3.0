package repository

import (
	"context"
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"
)

// TestGetPublicMemberProfile_AvatarBackgroundDisplayURLFallback proves Task 2 of
// 173-10 (D-02): GetPublicMemberProfileByID's avatar/background gain a NEW,
// purely additive display_url field, with public_url (the true original) left
// completely unchanged. A member whose avatar/background media_asset has a
// 'display' media_files row gets display_url pointing at the display path while
// public_url still points at the original; a member with NO display row yet
// (pre-backfill) gets display_url == public_url (fallback), never nil/empty once
// an avatar/background exists. Reuses the Phase-152 full-real-schema guarded
// fixture (same DSN/pattern as TestGetPublicGroupBase_PrefersDisplayVariant).
func TestGetPublicMemberProfile_AvatarBackgroundDisplayURLFallback(t *testing.T) {
	pool, _ := openPhase152Postgres(t)

	const memberWithDisplayID int64 = 1522000
	const memberWithoutDisplayID int64 = 1522001
	const avatarAssetID int64 = 1522010
	const backgroundAssetID int64 = 1522011
	const legacyAvatarAssetID int64 = 1522012
	const legacyBackgroundAssetID int64 = 1522013

	mustExecPhase152(t, pool, fmt.Sprintf(`
		DELETE FROM media_files WHERE media_id IN (%d, %d, %d, %d);
		DELETE FROM members WHERE id IN (%d, %d);
		DELETE FROM media_assets WHERE id IN (%d, %d, %d, %d);
	`, avatarAssetID, backgroundAssetID, legacyAvatarAssetID, legacyBackgroundAssetID,
		memberWithDisplayID, memberWithoutDisplayID,
		avatarAssetID, backgroundAssetID, legacyAvatarAssetID, legacyBackgroundAssetID,
	))

	mustExecPhase152(t, pool, fmt.Sprintf(`
		-- Member WITH display rows for both avatar and background.
		INSERT INTO media_assets (id, file_path, mime_type, status)
			VALUES
				(%d, '/phase152/avatar-%d-original.jpg', 'image/jpeg', 'ready'),
				(%d, '/phase152/background-%d-original.jpg', 'image/jpeg', 'ready');
		INSERT INTO media_files (media_id, variant, path, status) VALUES
			(%d, 'original', '/phase152/avatar-%d-original.jpg', 'ready'),
			(%d, 'display', '/phase152/avatar-%d-display.jpg', 'ready'),
			(%d, 'original', '/phase152/background-%d-original.jpg', 'ready'),
			(%d, 'display', '/phase152/background-%d-display.jpg', 'ready');
		INSERT INTO members (id, nickname, public_slug, avatar_media_id, background_media_id)
			VALUES (%d, 'Phase152 With Display', 'phase152-member-with-display', %d, %d);

		-- Member with NO display rows yet (pre-backfill state).
		INSERT INTO media_assets (id, file_path, mime_type, status)
			VALUES
				(%d, '/phase152/legacy-avatar-%d-original.jpg', 'image/jpeg', 'ready'),
				(%d, '/phase152/legacy-background-%d-original.jpg', 'image/jpeg', 'ready');
		INSERT INTO media_files (media_id, variant, path, status) VALUES
			(%d, 'original', '/phase152/legacy-avatar-%d-original.jpg', 'ready'),
			(%d, 'original', '/phase152/legacy-background-%d-original.jpg', 'ready');
		INSERT INTO members (id, nickname, public_slug, avatar_media_id, background_media_id)
			VALUES (%d, 'Phase152 Without Display', 'phase152-member-without-display', %d, %d);
	`,
		avatarAssetID, avatarAssetID,
		backgroundAssetID, backgroundAssetID,
		avatarAssetID, avatarAssetID,
		avatarAssetID, avatarAssetID,
		backgroundAssetID, backgroundAssetID,
		backgroundAssetID, backgroundAssetID,
		memberWithDisplayID, avatarAssetID, backgroundAssetID,
		legacyAvatarAssetID, legacyAvatarAssetID,
		legacyBackgroundAssetID, legacyBackgroundAssetID,
		legacyAvatarAssetID, legacyAvatarAssetID,
		legacyBackgroundAssetID, legacyBackgroundAssetID,
		memberWithoutDisplayID, legacyAvatarAssetID, legacyBackgroundAssetID,
	))

	repo := NewMemberProfileRepository(pool, "")

	withDisplay, err := repo.GetPublicMemberProfileByID(context.Background(), memberWithDisplayID)
	require.NoError(t, err)
	require.NotNil(t, withDisplay.Avatar)
	require.NotNil(t, withDisplay.BackgroundImage)

	require.Contains(t, withDisplay.Avatar.PublicURL, fmt.Sprintf("avatar-%d-original.jpg", avatarAssetID),
		"public_url (true original) must stay unchanged, never swapped to the display variant")
	require.Contains(t, withDisplay.Avatar.DisplayURL, fmt.Sprintf("avatar-%d-display.jpg", avatarAssetID),
		"display_url must point at the display-derived URL when a display row exists")

	require.Contains(t, withDisplay.BackgroundImage.PublicURL, fmt.Sprintf("background-%d-original.jpg", backgroundAssetID))
	require.Contains(t, withDisplay.BackgroundImage.DisplayURL, fmt.Sprintf("background-%d-display.jpg", backgroundAssetID))

	withoutDisplay, err := repo.GetPublicMemberProfileByID(context.Background(), memberWithoutDisplayID)
	require.NoError(t, err)
	require.NotNil(t, withoutDisplay.Avatar)
	require.NotNil(t, withoutDisplay.BackgroundImage)

	require.NotEmpty(t, withoutDisplay.Avatar.DisplayURL, "display_url must never be empty once an avatar exists")
	require.Equal(t, withoutDisplay.Avatar.PublicURL, withoutDisplay.Avatar.DisplayURL,
		"no display row yet -> avatar display_url must fall back to public_url (the true original)")

	require.NotEmpty(t, withoutDisplay.BackgroundImage.DisplayURL, "display_url must never be empty once a background image exists")
	require.Equal(t, withoutDisplay.BackgroundImage.PublicURL, withoutDisplay.BackgroundImage.DisplayURL,
		"no display row yet -> background display_url must fall back to public_url (the true original)")
}
