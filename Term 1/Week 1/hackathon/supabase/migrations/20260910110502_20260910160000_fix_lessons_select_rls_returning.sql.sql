/*
# Fix lessons SELECT RLS policy — INSERT ... RETURNING failure

## Root Cause
The `select_lessons` policy used `is_lesson_teacher(id)`, a SECURITY DEFINER
function that queries the `lessons` table itself. During `INSERT ... RETURNING`
(which PostgREST sends when the client chains `.select('id')`), the SELECT
policy is evaluated on the newly inserted row. The function tries to query
`lessons` to find the row, but the row is not yet visible within the same
RLS evaluation context, causing a 42501 "new row violates row-level security
policy" error.

## Fix
Replace the `is_lesson_teacher(id)` function call in the SELECT policy with
a direct inline check: `auth.uid() = teacher_id`. This avoids the recursive
table lookup and allows the RETURNING clause to evaluate correctly.

Student access via `is_student_in_lesson_class(id)` is unchanged (that function
queries `lesson_classes` and `class_enrollments`, not `lessons`, so no recursion).
*/

DROP POLICY IF EXISTS "select_lessons" ON lessons;
CREATE POLICY "select_lessons" ON lessons FOR SELECT
  TO authenticated USING (
    auth.uid() = teacher_id OR is_student_in_lesson_class(id)
  );
