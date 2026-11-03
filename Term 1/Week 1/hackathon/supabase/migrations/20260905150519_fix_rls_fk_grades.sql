/*
# Fix Class RLS + Submissions FK + Grades

## 1. Fix classes SELECT policy
The previous policy only allowed seeing classes you're already a member of, which made invite code lookup impossible — a student can't join a class they can't see. Now all authenticated users can read classes (invite codes are meant to be shared, and class info is not sensitive).

## 2. Fix class_enrollments policies
Replace direct subqueries on classes with is_class_teacher() to eliminate any remaining recursion paths.

## 3. Add FK from homework_submissions.student_id → profiles.id
PostgREST needs a direct FK to join homework_submissions with profiles. Same fix for class_enrollments.

## 4. Add grade column to homework_submissions
Teachers can assign grades: O (Outstanding), V (Very Good), G (Good), or custom.
*/

-- ==================== FIX CLASSES SELECT ====================
-- Allow all authenticated users to read classes (needed for invite code lookup)
DROP POLICY IF EXISTS "select_classes" ON classes;
CREATE POLICY "select_classes" ON classes FOR SELECT
  TO authenticated USING (true);

-- ==================== FIX CLASS_ENROLLMENTS DELETE ====================
-- Use is_class_teacher instead of direct subquery on classes
DROP POLICY IF EXISTS "delete_enrollments" ON class_enrollments;
CREATE POLICY "delete_enrollments" ON class_enrollments FOR DELETE
  TO authenticated USING (
    student_id = auth.uid()
    OR is_class_teacher(class_id, auth.uid())
  );

-- ==================== ADD FK TO PROFILES ====================
-- homework_submissions: add FK to profiles so PostgREST can join
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

-- class_enrollments: add FK to profiles so PostgREST can join
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

-- ==================== ADD GRADE COLUMN ====================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'homework_submissions' AND column_name = 'grade'
  ) THEN
    ALTER TABLE homework_submissions ADD COLUMN grade text;
  END IF;
END $$;
