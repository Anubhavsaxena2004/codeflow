-- GitHub integration (additive). Applied by scripts/db-migrate.mjs in filename order.

-- Project files as saved by the learner. Source of truth for every GitHub push.
CREATE TABLE IF NOT EXISTS user_project_files (
  user_id     bigint       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  journey_id  text         NOT NULL,
  path        text         NOT NULL,
  content     text         NOT NULL,
  unlocked_at timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, journey_id, path)
);
CREATE INDEX IF NOT EXISTS user_project_files_user_journey_idx ON user_project_files (user_id, journey_id);

-- One GitHub connection per user. The token is AES-256-GCM encrypted with a key
-- derived from TOKEN_ENCRYPTION_KEY; the plaintext never leaves the server.
CREATE TABLE IF NOT EXISTS github_connections (
  user_id        bigint       PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  github_user_id bigint       NOT NULL,
  github_login   text         NOT NULL,
  token_enc      text         NOT NULL,
  created_at     timestamptz  NOT NULL DEFAULT now(),
  updated_at     timestamptz  NOT NULL DEFAULT now()
);

-- Linked GitHub repo per (user, journey), plus the sha of our last push.
-- A remote sha that differs from last_commit_sha means the user edited on
-- GitHub, so we refuse to overwrite and report a conflict instead.
CREATE TABLE IF NOT EXISTS github_repos (
  user_id         bigint       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  journey_id      text         NOT NULL,
  owner           text         NOT NULL,
  repo            text         NOT NULL,
  branch          text         NOT NULL DEFAULT 'main',
  last_commit_sha text,
  created_at      timestamptz  NOT NULL DEFAULT now(),
  updated_at      timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, journey_id)
);

-- Short-lived OAuth state, bound to the signed-in user (CSRF protection).
CREATE TABLE IF NOT EXISTS github_oauth_states (
  state      text         PRIMARY KEY,
  user_id    bigint       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at timestamptz  NOT NULL
);
CREATE INDEX IF NOT EXISTS github_oauth_states_expires_idx ON github_oauth_states (expires_at);
