/*
# Add email to profiles, allow teachers to search students and manually enroll them

## Changes

### 1. profiles table — add email column
- New column `email` (text, nullable) on `profiles`.
- Backfilled from `auth.users.email` for all existing profiles.
- No data loss — existing rows get their auth email value.

### 2. profiles SELECT policy — broaden for teachers
- Users can still read their own profile.
- Teachers (role = 'teacher') can now SELECT student profiles (role = 'student')
  so they can search for students by name/email and see real names in class lists.
- Teachers cannot read other teacher profiles.

### 3. class_enrollments INSERT policy — allow teacher enrollment
- Students can still self-enroll (student_id = auth.uid()).
- Teachers can now INSERT enrollments for students into classes they own.
- The WITH CHECK verifies the class belongs to the calling teacher.

## Security
- profiles SELECT: teachers see only student profiles, not other teachers.
- class_enrollments INSERT: teacher can only enroll into their own classes.
- No destructive operations. No data removed.
*/

-- 1. Add email column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email text;
  END IF;
END $$;

-- Backfill email from auth.users
UPDATE profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id AND p.email IS NULL;

-- 2. Update profiles SELECT policy
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (
    auth.uid() = id
    OR (EXISTS (
      SELECT 1 FROM profiles tp
      WHERE tp.id = auth.uid() AND tp.role = 'teacher'
    ) AND role = 'student')
  );

-- 3. Update class_enrollments INSERT policy
DROP POLICY IF EXISTS "insert_enrollments" ON class_enrollments;
CREATE POLICY "insert_enrollments" ON class_enrollments FOR INSERT
  TO authenticated WITH CHECK (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = class_enrollments.class_id
      AND c.teacher_id = auth.uid()
    )
  );
