-- Supabase exposes the public schema through its Data API, and by default grants the anon and
-- authenticated roles (anyone holding the publishable key) full access to every new table.
-- CodeFlow only reaches these tables from the server, so lock them down: row level security
-- with no policies denies those roles, and their grants are revoked as well. The app connects
-- as the table owner, which row level security does not apply to.
-- Harmless on plain PostgreSQL. Every future migration that adds a table should do the same.

DO $$
DECLARE
  t text;
  api_role text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users', 'sessions', 'challenge_progress', 'challenge_attempts',
    'user_project_files', 'github_connections', 'github_repos', 'github_oauth_states',
    'journey_projects', 'level_progress', 'schema_migrations'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
        EXECUTE format('REVOKE ALL ON TABLE %I FROM %I', t, api_role);
      END IF;
    END LOOP;
  END LOOP;
END $$;
