ALTER TABLE anime_contributions
    ALTER COLUMN is_public_on_anime_page SET DEFAULT false,
    ALTER COLUMN is_public_on_member_profile SET DEFAULT false;
