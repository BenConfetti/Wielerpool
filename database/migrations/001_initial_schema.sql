BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('participant', 'admin');
CREATE TYPE round_status AS ENUM ('setup', 'test', 'registration', 'active', 'finished', 'archived');
CREATE TYPE roster_role AS ENUM ('starter', 'reserve');
CREATE TYPE swap_type AS ENUM ('automatic', 'manual');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  display_name text NOT NULL,
  password_hash text NOT NULL,
  role user_role NOT NULL DEFAULT 'participant',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_normalized CHECK (email = lower(trim(email)))
);
CREATE UNIQUE INDEX users_email_unique ON users (lower(email));

CREATE TABLE rounds (
  id text PRIMARY KEY,
  name text NOT NULL,
  competition text NOT NULL,
  year integer NOT NULL CHECK (year BETWEEN 1900 AND 2200),
  status round_status NOT NULL DEFAULT 'setup',
  currency char(3) NOT NULL DEFAULT 'EUR',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE round_settings (
  round_id text PRIMARY KEY REFERENCES rounds(id) ON DELETE CASCADE,
  stake numeric(12,2) NOT NULL DEFAULT 0 CHECK (stake >= 0),
  budget numeric(14,3) NOT NULL DEFAULT 0 CHECK (budget >= 0),
  stage_count integer NOT NULL DEFAULT 1 CHECK (stage_count > 0),
  starter_count integer NOT NULL DEFAULT 10 CHECK (starter_count > 0),
  reserve_count integer NOT NULL DEFAULT 10 CHECK (reserve_count >= 0),
  scoring_depth jsonb NOT NULL DEFAULT '{}'::jsonb,
  prize_weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id text NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  display_name text NOT NULL,
  team_name text NOT NULL DEFAULT '',
  color_primary text NOT NULL DEFAULT '#1d4ed8',
  color_secondary text NOT NULL DEFAULT '#ffffff',
  paid_at timestamptz,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (round_id, user_id),
  UNIQUE (round_id, display_name)
);
CREATE INDEX participants_round_idx ON participants (round_id);

CREATE TABLE riders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id text NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  external_id text,
  name text NOT NULL,
  display_name text NOT NULL,
  cycling_team text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (round_id, name),
  UNIQUE (round_id, external_id)
);

CREATE TABLE rider_prices (
  round_id text NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  rider_id uuid NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
  price numeric(14,3) NOT NULL CHECK (price >= 0),
  source text NOT NULL DEFAULT 'admin',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (round_id, rider_id)
);

CREATE TABLE teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id text NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  submitted_at timestamptz,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (round_id, participant_id)
);

CREATE TABLE team_riders (
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  rider_id uuid NOT NULL REFERENCES riders(id) ON DELETE RESTRICT,
  role roster_role NOT NULL,
  position integer NOT NULL CHECK (position > 0),
  purchase_price numeric(14,3) NOT NULL CHECK (purchase_price >= 0),
  active_from_stage integer NOT NULL DEFAULT 1 CHECK (active_from_stage > 0),
  active_until_stage integer CHECK (active_until_stage IS NULL OR active_until_stage >= active_from_stage),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, rider_id, active_from_stage),
  UNIQUE (team_id, role, position, active_from_stage)
);

CREATE TABLE stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id text NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  number integer NOT NULL CHECK (number > 0),
  name text NOT NULL,
  stage_date date,
  stage_type text,
  route text NOT NULL DEFAULT '',
  distance_km numeric(8,2) CHECK (distance_km IS NULL OR distance_km >= 0),
  status text NOT NULL DEFAULT 'scheduled',
  source_file text,
  imported_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (round_id, number)
);

CREATE TABLE stage_results (
  id bigserial PRIMARY KEY,
  round_id text NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  rider_id uuid NOT NULL REFERENCES riders(id) ON DELETE RESTRICT,
  general_value numeric,
  points_value numeric,
  mountain_value numeric,
  youth_value numeric,
  is_stage_winner boolean NOT NULL DEFAULT false,
  status_code text,
  raw_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stage_id, rider_id)
);

CREATE TABLE withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id text NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  rider_id uuid NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
  code text NOT NULL CHECK (code IN ('DNS', 'DNF', 'DSQ', 'OTL', 'OUT')),
  stage_number integer NOT NULL CHECK (stage_number > 0),
  effective_stage integer NOT NULL CHECK (effective_stage > 0),
  reason text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (round_id, rider_id, stage_number, code)
);

CREATE TABLE swaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id text NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  outgoing_rider_id uuid REFERENCES riders(id) ON DELETE RESTRICT,
  incoming_rider_id uuid REFERENCES riders(id) ON DELETE RESTRICT,
  swap_type swap_type NOT NULL,
  after_stage integer NOT NULL CHECK (after_stage >= 0),
  reason text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id text NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  stage_id uuid REFERENCES stages(id) ON DELETE CASCADE,
  participant_id uuid REFERENCES participants(id) ON DELETE CASCADE,
  classification text,
  amount numeric NOT NULL,
  reason text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE admin_log (
  id bigserial PRIMARY KEY,
  round_id text REFERENCES rounds(id) ON DELETE SET NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  category text NOT NULL,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX riders_round_name_idx ON riders (round_id, name);
CREATE INDEX teams_round_idx ON teams (round_id);
CREATE INDEX stages_round_idx ON stages (round_id, number);
CREATE INDEX stage_results_round_stage_idx ON stage_results (round_id, stage_id);
CREATE INDEX swaps_round_team_stage_idx ON swaps (round_id, team_id, after_stage);
CREATE INDEX corrections_round_idx ON corrections (round_id, stage_id);
CREATE INDEX admin_log_round_created_idx ON admin_log (round_id, created_at DESC);
CREATE INDEX user_sessions_user_idx ON user_sessions (user_id, expires_at);
COMMIT;
