BEGIN;

ALTER TABLE round_settings
  ADD COLUMN final_prize_percentage numeric(5,2) NOT NULL DEFAULT 50,
  ADD COLUMN daily_prize_percentage numeric(5,2) NOT NULL DEFAULT 50;

ALTER TABLE round_settings
  ADD CONSTRAINT round_settings_prize_percentages_range
    CHECK (
      final_prize_percentage BETWEEN 0 AND 100
      AND daily_prize_percentage BETWEEN 0 AND 100
    ),
  ADD CONSTRAINT round_settings_prize_percentages_total
    CHECK (final_prize_percentage + daily_prize_percentage = 100);

COMMIT;
