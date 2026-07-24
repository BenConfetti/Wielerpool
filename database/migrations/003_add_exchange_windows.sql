BEGIN;

CREATE TABLE exchange_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id text NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  label text NOT NULL,
  after_stage integer NOT NULL CHECK (after_stage >= 0),
  opens_at timestamptz,
  closes_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exchange_windows_valid_range
    CHECK (opens_at IS NULL OR closes_at IS NULL OR closes_at > opens_at),
  UNIQUE (round_id, after_stage, label)
);

CREATE INDEX exchange_windows_round_order_idx
  ON exchange_windows (round_id, sort_order, after_stage);

COMMIT;
