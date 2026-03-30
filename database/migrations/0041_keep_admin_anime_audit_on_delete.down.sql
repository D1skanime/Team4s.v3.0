ALTER TABLE admin_anime_mutation_audit
ADD CONSTRAINT admin_anime_mutation_audit_anime_id_fkey
FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE;
