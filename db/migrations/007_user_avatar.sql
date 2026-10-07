-- User avatar selection: persists the learner's chosen developer avatar across their profile.
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar text DEFAULT 'mascot-green';
