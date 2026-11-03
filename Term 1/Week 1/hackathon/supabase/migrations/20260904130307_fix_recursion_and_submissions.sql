/*
# Fix RLS Recursion on Classes + Add Homework Submissions

## Overview
1. Fixes infinite recursion in the classes/class_enrollments RLS policies by using a SECURITY DEFINER function that checks enrollment without triggering RLS.
2. Adds homework_submissions table so students can submit homework with file/photo uploads, and teachers can view and provide feedback.

## 1. RLS Fix — SECURITY DEFINER helper

### `is_class_member(class_uuid, user_uuid)`
- SECURITY DEFINER function that returns true if the user is the teacher of the class OR is enrolled in it.
- Runs with elevated privileges, bypassing RLS on the queried tables.
- Used in the `classes` SELECT policy to avoid circular recursion.

### `is_class_teacher(class_uuid, user_uuid)`
- SECURITY DEFINER function that returns true if the user owns the class.
- Used in `class_enrollments` SELECT policy to avoid circular recursion.

## 2. Policy Updates

### classes
- SELECT: rewritten to use `is_class_member()` instead of a subquery on `class_enrollments`

### class_enrollments
- SELECT: rewritten to use `is_class_teacher()` instead of a subquery on `classes`

## 3. New Tables

### homework_submissions
- `id` (uuid, PK)
- `homework_id` (uuid, NOT NULL, references homework ON DELETE CASCADE)
- `student_id` (uuid, NOT NULL, DEFAULT auth.uid(), references auth.users ON DELETE CASCADE)
- `content` (text) — typed answer/notes from student
- `file_storage_path` (text) — path in storage bucket
- `file_name` (text) — original file name
- `file_type` (text) — MIME type
- `feedback` (text) — teacher feedback
- `feedback_at` (timestamptz) — when feedback was given
- `status` (text, DEFAULT 'submitted') — submitted / graded
- `created_at` (timestamptz)

## 4. Security for homework_submissions

- SELECT: students see their own submissions; teachers see submissions for homework they own
- INSERT: students submit their own homework
- UPDATE: students can update their own (before feedback); teachers can update (to add feedback)
- DELETE: students can delete their own; teachers can delete for their homework

## 5. Storage Bucket
- `homework-submissions` — public read, authenticated students can upload, owners can update/delete
*/

-- ==================== SECURITY DEFINER FUNCTIONS ====================

CREATE OR REPLACE FUNCTION is_class_member(class_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = class_uuid AND classes.teacher_id = user_uuid
  ) OR EXISTS (
    SELECT 1 FROM class_enrollments
    WHERE class_enrollments.class_id = class_uuid
    AND class_enrollments.student_id = user_uuid
  );
$$;

CREATE OR REPLACE FUNCTION is_class_teacher(class_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM classes
    WHERE classes.id = class_uuid AND classes.teacher_id = user_uuid
  );
$$;

-- ==================== FIX CLASSES SELECT POLICY ====================

DROP POLICY IF EXISTS "select_classes" ON classes;
CREATE POLICY "select_classes" ON classes FOR SELECT
  TO authenticated USING (is_class_member(id, auth.uid()));

-- ==================== FIX CLASS_ENROLLMENTS SELECT POLICY ====================

DROP POLICY IF EXISTS "select_enrollments" ON class_enrollments;
CREATE POLICY "select_enrollments" ON class_enrollments FOR SELECT
  TO authenticated USING (
    student_id = auth.uid()
    OR is_class_teacher(class_id, auth.uid())
  );

-- ==================== HOMEWORK_SUBMISSIONS TABLE ====================

CREATE TABLE IF NOT EXISTS homework_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id uuid NOT NULL REFERENCES homework(id) ON DELETE CASCADE,
  student_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  content text DEFAULT '',
  file_storage_path text,
  file_name text,
  file_type text,
  feedback text,
  feedback_at timestamptz,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE homework_submissions ENABLE ROW LEVEL SECURITY;

-- Students see their own submissions; teachers see submissions for their homework
DROP POLICY IF EXISTS "select_submissions" ON homework_submissions;
CREATE POLICY "select_submissions" ON homework_submissions FOR SELECT
  TO authenticated USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM homework
      WHERE homework.id = homework_submissions.homework_id
      AND homework.teacher_id = auth.uid()
    )
  );

-- Students submit their own homework
DROP POLICY IF EXISTS "insert_submissions" ON homework_submissions;
CREATE POLICY "insert_submissions" ON homework_submissions FOR INSERT
  TO authenticated WITH CHECK (student_id = auth.uid());

-- Students can update their own (before feedback); teachers can update to add feedback
DROP POLICY IF EXISTS "update_submissions" ON homework_submissions;
CREATE POLICY "update_submissions" ON homework_submissions FOR UPDATE
  TO authenticated USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM homework
      WHERE homework.id = homework_submissions.homework_id
      AND homework.teacher_id = auth.uid()
    )
  ) WITH CHECK (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM homework
      WHERE homework.id = homework_submissions.homework_id
      AND homework.teacher_id = auth.uid()
    )
  );

-- Students can delete their own; teachers can delete for their homework
DROP POLICY IF EXISTS "delete_submissions" ON homework_submissions;
CREATE POLICY "delete_submissions" ON homework_submissions FOR DELETE
  TO authenticated USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM homework
      WHERE homework.id = homework_submissions.homework_id
      AND homework.teacher_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_submissions_homework_id ON homework_submissions(homework_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON homework_submissions(student_id);

-- ==================== STORAGE BUCKET FOR SUBMISSIONS ====================

INSERT INTO storage.buckets (id, name, public)
VALUES ('homework-submissions', 'homework-submissions', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "read_homework_submissions" ON storage.objects;
CREATE POLICY "read_homework_submissions" ON storage.objects FOR SELECT
  TO public USING (bucket_id = 'homework-submissions');

DROP POLICY IF EXISTS "upload_homework_submissions" ON storage.objects;
CREATE POLICY "upload_homework_submissions" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'homework-submissions');

DROP POLICY IF EXISTS "update_homework_submissions" ON storage.objects;
CREATE POLICY "update_homework_submissions" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'homework-submissions');

DROP POLICY IF EXISTS "delete_homework_submissions" ON storage.objects;
CREATE POLICY "delete_homework_submissions" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'homework-submissions');
