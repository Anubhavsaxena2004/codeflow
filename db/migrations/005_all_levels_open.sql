-- A learner who can open every level in any order, for demos and reviewers. Levels still have to
-- be solved to count as passed; this only lifts the "pass the level before it" rule.
-- Switched per learner in /admin → Learners. users already has row level security (004).
ALTER TABLE users ADD COLUMN IF NOT EXISTS all_levels_open boolean NOT NULL DEFAULT false;
