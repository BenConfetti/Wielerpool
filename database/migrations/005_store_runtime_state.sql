BEGIN;

CREATE TABLE round_runtime_state (
  round_id text PRIMARY KEY REFERENCES rounds(id) ON DELETE CASCADE,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  feedback jsonb NOT NULL DEFAULT '[]'::jsonb,
  admin_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE round_client_state (
  round_id text NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  participant_access jsonb,
  ui_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (round_id, client_id)
);

COMMIT;
