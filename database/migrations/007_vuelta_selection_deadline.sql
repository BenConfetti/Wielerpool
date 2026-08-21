UPDATE rounds
SET config = jsonb_set(COALESCE(config, '{}'::jsonb), '{selectionDeadline}', '"2026-08-22T16:00:00+02:00"'::jsonb, true),
    updated_at = now()
WHERE id = 'vuelta-2026';
