-- Add unique constraint on username column for profiles table
-- This ensures usernames are unique across all users

-- First, handle any existing duplicate usernames by appending a random suffix
-- (Only needed if there are existing duplicates)
DO $$
DECLARE
    dup_record RECORD;
    new_username TEXT;
BEGIN
    FOR dup_record IN
        SELECT id, username, ROW_NUMBER() OVER (PARTITION BY LOWER(username) ORDER BY created_at) as rn
        FROM profiles
        WHERE username IS NOT NULL
    LOOP
        IF dup_record.rn > 1 THEN
            new_username := dup_record.username || '_' || SUBSTR(MD5(RANDOM()::TEXT), 1, 4);
            UPDATE profiles SET username = new_username WHERE id = dup_record.id;
        END IF;
    END LOOP;
END $$;

-- Create unique index on lowercase username (case-insensitive uniqueness)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx 
ON profiles (LOWER(username)) 
WHERE username IS NOT NULL;
