-- Journeys: projects built level by level, editable by admins, and each learner's way through them.

-- The tech stack a learner follows. The home page only shows that track's journeys.
ALTER TABLE users ADD COLUMN IF NOT EXISTS track text CHECK (track IN ('mern', 'django', 'spring'));

-- Journeys created or edited in the admin. A row replaces the bundled journey with the same id
-- (data/journeys); deleting the row brings the bundled one back.
CREATE TABLE IF NOT EXISTS journey_projects (
  id         text        PRIMARY KEY,
  track      text        NOT NULL CHECK (track IN ('mern', 'django', 'spring')),
  title      text        NOT NULL,
  position   integer     NOT NULL DEFAULT 0,
  published  boolean     NOT NULL DEFAULT false,
  -- The whole definition (worlds, levels, files). Validated by lib/journeys/validate.ts on every write.
  definition jsonb       NOT NULL,
  updated_by bigint      REFERENCES users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS journey_projects_track_idx ON journey_projects (track, position);

-- One row per passed level. The solution is what the learner submitted; the files they wrote
-- also go to user_project_files, which is what the GitHub integration pushes.
CREATE TABLE IF NOT EXISTS level_progress (
  user_id      bigint      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  project_id   text        NOT NULL,
  level_id     text        NOT NULL,
  stars        smallint    NOT NULL CHECK (stars BETWEEN 1 AND 3),
  xp           integer     NOT NULL,
  attempts     integer     NOT NULL DEFAULT 1,
  hints_used   smallint    NOT NULL DEFAULT 0,
  solution     jsonb       NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, project_id, level_id)
);
