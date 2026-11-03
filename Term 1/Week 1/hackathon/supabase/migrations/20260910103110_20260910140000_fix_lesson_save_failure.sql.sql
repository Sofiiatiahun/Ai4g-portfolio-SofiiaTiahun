/*
# Fix lesson save failure

## Problem
The SECURITY DEFINER helper functions created in the previous migration
were missing `row_security=off`. Without this, RLS can still apply
inside the functions, causing policy evaluation to fail.

A duplicate 1-arg `is_class_teacher` overload was created alongside
the existing 2-arg version, causing function resolution ambiguity.

## Fix
1. Drop policies that depend on the 1-arg overload
2. Drop the 1-arg `is_class_teacher` overload
3. Recreate `is_lesson_teacher` and `is_student_in_lesson_class` with
   `row_security=off`
4. Recreate `lesson_classes` policies using the 2-arg
   `is_class_teacher(class_id, auth.uid())`
5. Recreate `lessons` SELECT policy
*/

-- Drop policies that reference the 1-arg overload
DROP POLICY IF EXISTS "select_lesson_classes" ON lesson_classes;
DROP POLICY IF EXISTS "insert_lesson_classes" ON lesson_classes;
DROP POLICY IF EXISTS "delete_lesson_classes" ON lesson_classes;

-- Now safe to drop the 1-arg overload
DROP FUNCTION IF EXISTS is_class_teacher(uuid);

-- Recreate is_lesson_teacher with row_security=off
CREATE OR REPLACE FUNCTION is_lesson_teacher(p_lesson_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM lessons WHERE id = p_lesson_id AND teacher_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION is_lesson_teacher(uuid) TO authenticated;

-- Recreate is_student_in_lesson_class with row_security=off
CREATE OR REPLACE FUNCTION is_student_in_lesson_class(p_lesson_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM lesson_classes lc
    JOIN class_enrollments ce ON ce.class_id = lc.class_id
    WHERE lc.lesson_id = p_lesson_id AND ce.student_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION is_student_in_lesson_class(uuid) TO authenticated;

-- Ensure the 2-arg is_class_teacher has EXECUTE granted to authenticated
GRANT EXECUTE ON FUNCTION is_class_teacher(uuid, uuid) TO authenticated;

-- ==================== UPDATE LESSONS SELECT POLICY ====================
DROP POLICY IF EXISTS "select_lessons" ON lessons;
CREATE POLICY "select_lessons" ON lessons FOR SELECT
  TO authenticated USING (
    is_lesson_teacher(id)
    OR is_student_in_lesson_class(id)
  );

-- ==================== RECREATE LESSON_CLASSES POLICIES ====================
CREATE POLICY "select_lesson_classes" ON lesson_classes FOR SELECT
  TO authenticated USING (
    is_lesson_teacher(lesson_id)
    OR is_class_teacher(class_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM class_enrollments ce
      WHERE ce.class_id = lesson_classes.class_id AND ce.student_id = auth.uid()
    )
  );

CREATE POLICY "insert_lesson_classes" ON lesson_classes FOR INSERT
  TO authenticated WITH CHECK (
    is_lesson_teacher(lesson_id)
    AND is_class_teacher(class_id, auth.uid())
  );

CREATE POLICY "delete_lesson_classes" ON lesson_classes FOR DELETE
  TO authenticated USING (
    is_lesson_teacher(lesson_id)
  );
