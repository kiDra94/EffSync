-- Set default deadline (created_at + 7 days) for all tasks without a deadline
UPDATE "tasks"
SET "deadline" = CASE 
  WHEN "created_at" IS NOT NULL THEN "created_at" + INTERVAL '7 days'
  ELSE NOW() + INTERVAL '7 days'
END
WHERE "deadline" IS NULL;
