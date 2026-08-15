ALTER TABLE participants
  DROP CONSTRAINT IF EXISTS participants_round_id_display_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS participants_round_identity_idx
  ON participants (round_id, lower(btrim(display_name)), lower(btrim(team_name)));

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS selection jsonb NOT NULL DEFAULT '{}'::jsonb;
