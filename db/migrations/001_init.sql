-- Users, sessions and challenge progress.
-- Challenge content stays in code (data/challenges); rows reference it by its string id.

CREATE TABLE users (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         text        NOT NULL UNIQUE CHECK (email = lower(email)),
  name          text        NOT NULL,
  password_hash text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- The cookie holds a random token; only its SHA-256 is stored, so a leaked table can't be replayed.
CREATE TABLE sessions (
  token_hash bytea       PRIMARY KEY,
  user_id    bigint      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_id_idx ON sessions (user_id);

-- One row per (user, challenge): the hot path for "resume" and "best score" reads.
CREATE TABLE challenge_progress (
  user_id             bigint      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  challenge_id        text        NOT NULL,
  draft_slots         text[]      NOT NULL DEFAULT '{}',
  attempts            integer     NOT NULL DEFAULT 0,
  best_score          smallint,
  best_time_seconds   integer,
  completed_at        timestamptz,
  predictions_correct integer     NOT NULL DEFAULT 0,
  predictions_total   integer     NOT NULL DEFAULT 0,
  updated_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, challenge_id)
);

-- Append-only history of every Check, for analytics and replaying how someone reasoned.
CREATE TABLE challenge_attempts (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         bigint      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  challenge_id    text        NOT NULL,
  stack           text        NOT NULL,
  submitted_order text[]      NOT NULL,
  correct         boolean     NOT NULL,
  score           smallint,
  hints_used      smallint    NOT NULL DEFAULT 0,
  elapsed_seconds integer     NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX challenge_attempts_user_challenge_idx ON challenge_attempts (user_id, challenge_id, created_at DESC);
