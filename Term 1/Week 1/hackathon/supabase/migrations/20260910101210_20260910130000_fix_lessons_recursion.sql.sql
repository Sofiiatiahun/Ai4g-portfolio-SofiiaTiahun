/*
# Fix infinite recursion in lessons/lesson_classes RLS policies

## Problem
The `select_lessons` policy subqueries `lesson_classes`, which has RLS that
subqueries back to `lessons` — creating an infinite recursion.

## Fix
Create SECURITY DEFINER functions that bypass RLS to check relationships,
then use them in the policies instead of direct table joins.
*/

-- ==================== HELPER FUNCTIONS (SECURITY DEFINER, bypass RLS) ====================

-- Check if the current user is the teacher of a lesson
CREATE OR REPLACE FUNCTION is_lesson_teacher(p_lesson_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM lessons WHERE id = p_lesson_id AND teacher_id = auth.uid()
  );
$$;

-- Check if the current user is the teacher of a class
CREATE OR REPLACE FUNCTION is_class_teacher(p_class_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM classes WHERE id = p_class_id AND teacher_id = auth.uid()
  );
$$;

-- Check if the current user is enrolled in any class assigned to a lesson
CREATE OR REPLACE FUNCTION is_student_in_lesson_class(p_lesson_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM lesson_classes lc
    JOIN class_enrollments ce ON ce.class_id = lc.class_id
    WHERE lc.lesson_id = p_lesson_id AND ce.student_id = auth.uid()
  );
$$;

-- Grant execute to authenticated
GRANT EXECUTE ON FUNCTION is_lesson_teacher(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_class_teacher(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_student_in_lesson_class(uuid) TO authenticated;

-- ==================== FIX LESSONS SELECT POLICY ====================
DROP POLICY IF EXISTS "select_lessons" ON lessons;
CREATE POLICY "select_lessons" ON lessons FOR SELECT
  TO authenticated USING (
    is_lesson_teacher(id)
    OR is_student_in_lesson_class(id)
  );

-- ==================== FIX LESSON_CLASSES POLICIES ====================
DROP POLICY IF EXISTS "select_lesson_classes" ON lesson_classes;
CREATE POLICY "select_lesson_classes" ON lesson_classes FOR SELECT
  TO authenticated USING (
    is_lesson_teacher(lesson_id)
    OR is_class_teacher(class_id)
    OR EXISTS (
      SELECT 1 FROM class_enrollments ce
      WHERE ce.class_id = lesson_classes.class_id AND ce.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_lesson_classes" ON lesson_classes;
CREATE POLICY "insert_lesson_classes" ON lesson_classes FOR INSERT
  TO authenticated WITH CHECK (
    is_lesson_teacher(lesson_id)
    AND is_class_teacher(class_id)
  );

DROP POLICY IF EXISTS "delete_lesson_classes" ON lesson_classes;
CREATE POLICY "delete_lesson_classes" ON lesson_classes FOR DELETE
  TO authenticated USING (
    is_lesson_teacher(lesson_id)
  );
