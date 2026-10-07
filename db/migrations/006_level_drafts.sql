-- Resume where you left off: what a learner has done inside a level that is not finished (or the
-- finished state, after passing), and the files and folders they created in the explorer.
-- Without these a refresh or a trip to the map threw the level's progress away.

-- One row per (learner, journey, level). `state` is lib/journeys/draft.ts → LevelDraft; it is
-- never trusted, a level still only passes when the server verifies the submission.
CREATE TABLE IF NOT EXISTS level_drafts (
  user_id    bigint      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  project_id text        NOT NULL,
  level_id   text        NOT NULL,
  state      jsonb       NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, project_id, level_id)
);

-- Files and folders the learner made with New File / New Folder, per journey or challenge
-- (`scope` is the journey id, or "challenge:<id>"). `files` is lib/journeys/draft.ts → LearnerFiles.
CREATE TABLE IF NOT EXISTS learner_files (
  user_id    bigint      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  scope      text        NOT NULL,
  files      jsonb       NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, scope)
);

-- Same lock-down as 004: only the server (the table owner) reads these, never the Data API.
DO $$
DECLARE
  t text;
  api_role text;
BEGIN
  FOREACH t IN ARRAY ARRAY['level_drafts', 'learner_files'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
        EXECUTE format('REVOKE ALL ON TABLE %I FROM %I', t, api_role);
      END IF;
    END LOOP;
  END LOOP;
END $$;
