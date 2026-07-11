ALTER TABLE members
    ALTER COLUMN profile_visibility SET DEFAULT 'members_only',
    ALTER COLUMN noindex SET DEFAULT true;
