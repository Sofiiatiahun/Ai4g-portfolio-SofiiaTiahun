/*
# Fix infinite recursion in profiles SELECT policy

## Problem
The previous migration created a profiles SELECT policy that references
the profiles table itself to check if the caller is a teacher. This
causes infinite recursion: the policy check queries profiles, which
triggers the policy, which queries profiles again, etc.

## Fix
1. Create a SECURITY DEFINER function `is_current_user_teacher()` that
   checks the caller's role without going through RLS. This function
   reads the profiles table with the owner's privileges (bypassing RLS),
   so it does not recurse.
2. Replace the recursive profiles SELECT policy with one that uses
   this function instead of a self-referencing subquery.
3. Revoke EXECUTE from anon; grant to authenticated only.

## Security
- `is_current_user_teacher()` only returns a boolean — no data leak.
- profiles SELECT: users read their own row; teachers can read student rows.
- No destructive operations.
*/

CREATE OR REPLACE FUNCTION is_current_user_teacher()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'teacher'
  );
$$;

REVOKE EXECUTE ON FUNCTION is_current_user_teacher() FROM anon;
GRANT EXECUTE ON FUNCTION is_current_user_teacher() TO authenticated;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;

CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (
    auth.uid() = id
    OR (is_current_user_teacher() AND role = 'student')
  );
