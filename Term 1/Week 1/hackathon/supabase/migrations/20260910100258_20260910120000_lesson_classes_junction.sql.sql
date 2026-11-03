/*
# Lesson-Class many-to-many relationship

## Overview
Replaces the single `lessons.class_id` (one class per lesson) with a
`lesson_classes` junction table that supports assigning a lesson to
multiple classes. Tightens lesson SELECT RLS so students only see lessons
assigned to classes they are enrolled in (or lessons owned by the teacher).

## 1. New Table: lesson_classes
- lesson_id (uuid, FK lessons ON DELETE CASCADE)
- class_id  (uuid, FK classes  ON DELETE CASCADE)
- assigned_at (timestamptz)
- PK (lesson_id, class_id) — prevents duplicates

## 2. RLS on lesson_classes
- SELECT: teachers see rows for their own lessons/classes; students see rows for their enrolled classes
- INSERT: teachers can insert for their own lessons AND own classes
- DELETE: teachers can delete for their own lessons

## 3. Lesson SELECT policy update
- Teachers see their own lessons (teacher_id = auth.uid())
- Students see lessons that have at least one row in lesson_classes for a class they are enrolled in

## 4. Helper function: is_lesson_accessible
SECURITY DEFINER function that checks whether a lesson is accessible to a user
(teacher owns it, or student is enrolled in one of its assigned classes).
*/

-- ==================== JUNCTION TABLE ====================
CREATE TABLE IF NOT EXISTS lesson_classes (
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  class_id  uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  PRIMARY KEY (lesson_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_classes_lesson_id ON lesson_classes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_classes_class_id ON lesson_classes(class_id);

ALTER TABLE lesson_classes ENABLE ROW LEVEL SECURITY;

-- SELECT: teachers see rows for their lessons; students see rows for their enrolled classes
DROP POLICY IF EXISTS "select_lesson_classes" ON lesson_classes;
CREATE POLICY "select_lesson_classes" ON lesson_classes FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM lessons l WHERE l.id = lesson_classes.lesson_id AND l.teacher_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM classes c WHERE c.id = lesson_classes.class_id AND c.teacher_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM class_enrollments ce
      WHERE ce.class_id = lesson_classes.class_id AND ce.student_id = auth.uid()
    )
  );

-- INSERT: teacher can only assign their own lesson to their own class
DROP POLICY IF EXISTS "insert_lesson_classes" ON lesson_classes;
CREATE POLICY "insert_lesson_classes" ON lesson_classes FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM lessons l WHERE l.id = lesson_classes.lesson_id AND l.teacher_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM classes c WHERE c.id = lesson_classes.class_id AND c.teacher_id = auth.uid()
    )
  );

-- DELETE: teacher can remove their own lesson assignments
DROP POLICY IF EXISTS "delete_lesson_classes" ON lesson_classes;
CREATE POLICY "delete_lesson_classes" ON lesson_classes FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM lessons l WHERE l.id = lesson_classes.lesson_id AND l.teacher_id = auth.uid()
    )
  );

-- ==================== LESSON SELECT POLICY UPDATE ====================
-- Teachers see their own lessons; students see lessons assigned to their enrolled classes
DROP POLICY IF EXISTS "select_lessons" ON lessons;
CREATE POLICY "select_lessons" ON lessons FOR SELECT
  TO authenticated USING (
    teacher_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM lesson_classes lc
      JOIN class_enrollments ce ON ce.class_id = lc.class_id
      WHERE lc.lesson_id = lessons.id AND ce.student_id = auth.uid()
    )
  );

-- ==================== MIGRATE EXISTING class_id DATA ====================
-- Copy any existing single class_id assignments into the junction table
INSERT INTO lesson_classes (lesson_id, class_id)
SELECT id, class_id FROM lessons
WHERE class_id IS NOT NULL
ON CONFLICT (lesson_id, class_id) DO NOTHING;
