/*
# LearnBridge Classes & Enrollments

## Overview
Adds a class system so teachers can group students by subject/class, generate invite codes for students to join, and assign lessons to specific classes. Students join classes using invite codes and see lessons from their enrolled classes.

## 1. New Tables

### classes
- `id` (uuid, PK)
- `teacher_id` (uuid, NOT NULL, DEFAULT auth.uid(), references auth.users) — owning teacher
- `name` (text, NOT NULL) — e.g. "Math 101"
- `subject` (text, NOT NULL) — e.g. "Mathematics"
- `invite_code` (text, NOT NULL, UNIQUE) — 6-char code students use to join
- `created_at` (timestamptz)

### class_enrollments
- `id` (uuid, PK)
- `class_id` (uuid, NOT NULL, references classes ON DELETE CASCADE)
- `student_id` (uuid, NOT NULL, DEFAULT auth.uid(), references auth.users ON DELETE CASCADE)
- `joined_at` (timestamptz)

## 2. Modified Tables

### lessons
- Added `class_id` (uuid, nullable, references classes ON DELETE SET NULL) — optional class assignment

## 3. Security (RLS)

### classes
- SELECT: teachers can read their own classes; students can read classes they're enrolled in
- INSERT/UPDATE/DELETE: teachers manage their own classes

### class_enrollments
- SELECT: teachers can see enrollments for their classes; students can see their own enrollments
- INSERT: any authenticated student can enroll using invite code
- DELETE: teachers can remove students; students can unenroll themselves
*/

-- ==================== CLASSES TABLE (no policies yet) ====================
CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  subject text NOT NULL,
  invite_code text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);

-- ==================== CLASS_ENROLLMENTS TABLE ====================
CREATE TABLE IF NOT EXISTS class_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(class_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_class_id ON class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON class_enrollments(student_id);

-- ==================== ADD class_id TO LESSONS ====================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lessons' AND column_name = 'class_id'
  ) THEN
    ALTER TABLE lessons ADD COLUMN class_id uuid REFERENCES classes(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lessons_class_id ON lessons(class_id);

-- ==================== ENABLE RLS & POLICIES FOR CLASSES ====================
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_classes" ON classes;
CREATE POLICY "select_classes" ON classes FOR SELECT
  TO authenticated USING (
    teacher_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM class_enrollments
      WHERE class_enrollments.class_id = classes.id
      AND class_enrollments.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_classes" ON classes;
CREATE POLICY "insert_own_classes" ON classes FOR INSERT
  TO authenticated WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "update_own_classes" ON classes;
CREATE POLICY "update_own_classes" ON classes FOR UPDATE
  TO authenticated USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "delete_own_classes" ON classes;
CREATE POLICY "delete_own_classes" ON classes FOR DELETE
  TO authenticated USING (teacher_id = auth.uid());

-- ==================== ENABLE RLS & POLICIES FOR CLASS_ENROLLMENTS ====================
ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_enrollments" ON class_enrollments;
CREATE POLICY "select_enrollments" ON class_enrollments FOR SELECT
  TO authenticated USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_enrollments.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_enrollments" ON class_enrollments;
CREATE POLICY "insert_enrollments" ON class_enrollments FOR INSERT
  TO authenticated WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "delete_enrollments" ON class_enrollments;
CREATE POLICY "delete_enrollments" ON class_enrollments FOR DELETE
  TO authenticated USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_enrollments.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- ==================== INVITE CODE GENERATION FUNCTION ====================
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
BEGIN
  code := '';
  FOR i IN 1..6 LOOP
    code := code || substr(chars, floor(random() * length(chars))::int + 1, 1);
  END LOOP;
  RETURN code;
END;
$$;
