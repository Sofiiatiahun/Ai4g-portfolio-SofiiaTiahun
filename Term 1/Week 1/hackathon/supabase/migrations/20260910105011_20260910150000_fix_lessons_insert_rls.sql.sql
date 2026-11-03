/*
# Fix lessons INSERT RLS policy

## Problem
The `insert_own_lessons` policy only checks `auth.uid() = teacher_id`,
but the insert is still rejected with RLS error 42501. The policy needs
to also verify the user has a teacher profile.

## Fix
1. Create a SECURITY DEFINER helper `is_teacher()` that checks the
   profiles table (bypassing RLS) for role = 'teacher'.
2. Rewrite the INSERT policy to require both:
   - teacher_id = auth.uid()
   - is_teacher() returns true
*/

CREATE OR REPLACE FUNCTION is_teacher()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher'
  );
$$;

GRANT EXECUTE ON FUNCTION is_teacher() TO authenticated;

DROP POLICY IF EXISTS "insert_own_lessons" ON lessons;
CREATE POLICY "insert_own_lessons" ON lessons FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = teacher_id AND is_teacher()
  );
