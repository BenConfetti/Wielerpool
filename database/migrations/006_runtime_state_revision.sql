ALTER TABLE round_runtime_state
  ADD COLUMN IF NOT EXISTS revision bigint NOT NULL DEFAULT 1;
