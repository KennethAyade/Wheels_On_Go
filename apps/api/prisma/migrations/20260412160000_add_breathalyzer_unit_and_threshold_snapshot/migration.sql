-- Add unit-safe breathalyzer fields: raw unit extracted by AI, the normalized
-- value in g/L (canonical unit used for comparison), and a snapshot of the
-- threshold that was in effect at decision time. Enables auditing of past
-- PASS/FAIL decisions after the threshold env var changes.

ALTER TABLE "BlowbagetsChecklist"
  ADD COLUMN "breathalyzerBacUnit" TEXT,
  ADD COLUMN "breathalyzerBacNormalizedGPerL" DOUBLE PRECISION,
  ADD COLUMN "breathalyzerThresholdGPerL" DOUBLE PRECISION;
