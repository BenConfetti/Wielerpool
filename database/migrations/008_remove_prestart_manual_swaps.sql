WITH cleaned AS (
  SELECT
    id,
    COALESCE((
      SELECT jsonb_agg(swap)
      FROM jsonb_array_elements(COALESCE(selection->'manualSwaps', '[]'::jsonb)) AS swap
      WHERE (swap->>'afterStage')::integer IN (9, 15)
    ), '[]'::jsonb) AS swaps
  FROM teams
  WHERE round_id = 'vuelta-2026'
)
UPDATE teams AS team
SET selection = CASE
  WHEN cleaned.swaps = '[]'::jsonb
    THEN jsonb_set(team.selection - 'initialRiders' - 'initialReserves', '{manualSwaps}', '[]'::jsonb, true)
  ELSE jsonb_set(team.selection, '{manualSwaps}', cleaned.swaps, true)
END
FROM cleaned
WHERE team.id = cleaned.id;

UPDATE round_runtime_state
SET state = jsonb_set(
      state,
      '{manualSwaps}',
      COALESCE((
        SELECT jsonb_agg(swap)
        FROM jsonb_array_elements(COALESCE(state->'manualSwaps', '[]'::jsonb)) AS swap
        WHERE (swap->>'afterStage')::integer IN (9, 15)
      ), '[]'::jsonb),
      true
    ),
    revision = revision + 1,
    updated_at = now()
WHERE round_id = 'vuelta-2026';
