/*
# Add explicit FKs to profiles for PostgREST joins

## Problem
PostgREST (Supabase's REST API) can only detect relationships when there is a direct
foreign key between two tables. `homework_submissions.student_id` and
`class_enrollments.student_id` reference `auth.users(id)`, NOT `profiles(id)`.
So queries like `.select('*, profiles!..._fkey(name)')` fail with
"Could not find a relationship between 'homework_submissions' and 'profiles'".

## Fix
Add explicit foreign key constraints from:
1. `homework_submissions.student_id` → `profiles(id)`
2. `class_enrollments.student_id` → `profiles(id)`

These are additional FK constraints alongside the existing ones to `auth.users`.
They don't affect data integrity (profiles.id already references auth.users.id)
but they DO make PostgREST aware of the join path.

## No data changes
No columns added, removed, or modified. No data is lost.
*/

-- Add FK from homework_submissions.student_id to profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'homework_submissions_student_id_profiles_fkey'
  ) THEN
    ALTER TABLE homework_submissions
      ADD CONSTRAINT homework_submissions_student_id_profiles_fkey
      FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add FK from class_enrollments.student_id to profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'class_enrollments_student_id_profiles_fkey'
  ) THEN
    ALTER TABLE class_enrollments
      ADD CONSTRAINT class_enrollments_student_id_profiles_fkey
      FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;
