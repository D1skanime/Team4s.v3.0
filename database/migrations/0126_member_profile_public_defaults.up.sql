ALTER TABLE members
    ALTER COLUMN profile_visibility SET DEFAULT 'public',
    ALTER COLUMN noindex SET DEFAULT false;
