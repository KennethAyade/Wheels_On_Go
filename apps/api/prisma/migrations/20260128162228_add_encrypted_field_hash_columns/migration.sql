-- Add hash columns for searchable encrypted fields
-- These columns store HMAC-SHA256 hashes for fast lookups without decryption

-- Add phoneNumberHash column for User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneNumberHash" TEXT;

-- Add emailHash column for User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailHash" TEXT;

-- Create unique indexes for hash columns
CREATE UNIQUE INDEX IF NOT EXISTS "User_phoneNumberHash_key" ON "User"("phoneNumberHash");
CREATE UNIQUE INDEX IF NOT EXISTS "User_emailHash_key" ON "User"("emailHash");

-- Add comment to explain the purpose
COMMENT ON COLUMN "User"."phoneNumberHash" IS 'HMAC-SHA256 hash of phoneNumber for searchable encryption (normalized: lowercased and trimmed)';
COMMENT ON COLUMN "User"."emailHash" IS 'HMAC-SHA256 hash of email for searchable encryption (normalized: lowercased and trimmed)';
