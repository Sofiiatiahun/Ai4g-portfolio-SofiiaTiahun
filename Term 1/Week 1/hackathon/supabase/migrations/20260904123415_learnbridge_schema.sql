/*
# LearnBridge Core Schema

## Overview
Creates the core database tables for LearnBridge — a learning platform with teacher and student roles.
Teachers create lessons and homework; students browse and download them for offline learning.

## 1. New Tables

### profiles
- `id` (uuid, PK, references auth.users) — one row per authenticated user
- `name` (text) — display name
- `role` (text, CHECK 'student' | 'teacher') — user's role
- `created_at` (timestamptz)

### lessons
- `id` (uuid, PK)
- `teacher_id` (uuid, NOT NULL, DEFAULT auth.uid(), references auth.users) — owning teacher
- `title` (text, NOT NULL)
- `subject` (text, NOT NULL)
- `level` (text, NOT NULL) — e.g. Beginner, Intermediate, Advanced
- `language` (text, NOT NULL DEFAULT 'English')
- `duration` (text, NOT NULL) — e.g. "30 minutes"
- `description` (text, NOT NULL)
- `learning_objectives` (text) — newline-separated objectives
- `lesson_notes` (text) — rich text notes
- `video_url` (text) — external video URL if provided
- `video_storage_path` (text) — path in storage bucket if uploaded
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### homework
- `id` (uuid, PK)
- `lesson_id` (uuid, NOT NULL, references lessons ON DELETE CASCADE)
- `teacher_id` (uuid, NOT NULL, DEFAULT auth.uid(), references auth.users)
- `title` (text, NOT NULL)
- `instructions` (text, NOT NULL)
- `due_date` (date) — optional
- `file_url` (text) — external file URL
- `file_storage_path` (text) — path in storage bucket
- `file_name` (text) — original file name for display
- `file_type` (text) — MIME type
- `created_at` (timestamptz)

## 2. Security (RLS)

### profiles
- SELECT: authenticated users can read their own profile
- INSERT: authenticated users can insert their own profile (id = auth.uid())
- UPDATE: authenticated users can update their own profile

### lessons
- SELECT: any authenticated user (students + teachers) can read published lessons
- INSERT: authenticated teachers can insert lessons they own
- UPDATE: teachers can update their own lessons
- DELETE: teachers can delete their own lessons

### homework
- SELECT: any authenticated user can read homework (students view, teachers manage)
- INSERT: authenticated teachers can insert homework they own
- UPDATE: teachers can update their own homework
- DELETE: teachers can delete their own homework

## 3. Storage Buckets
- `lesson-videos` — public read, authenticated teachers write/delete own files
- `homework-files` — public read, authenticated teachers write/delete own files

## 4. Indexes
- lessons(teacher_id), homework(lesson_id), homework(teacher_id)
*/

-- ==================== PROFILES ====================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('student', 'teacher')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ==================== LESSONS ====================
CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  subject text NOT NULL,
  level text NOT NULL,
  language text NOT NULL DEFAULT 'English',
  duration text NOT NULL,
  description text NOT NULL,
  learning_objectives text DEFAULT '',
  lesson_notes text DEFAULT '',
  video_url text,
  video_storage_path text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_lessons" ON lessons;
CREATE POLICY "select_lessons" ON lessons FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_lessons" ON lessons;
CREATE POLICY "insert_own_lessons" ON lessons FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "update_own_lessons" ON lessons;
CREATE POLICY "update_own_lessons" ON lessons FOR UPDATE
  TO authenticated USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "delete_own_lessons" ON lessons;
CREATE POLICY "delete_own_lessons" ON lessons FOR DELETE
  TO authenticated USING (auth.uid() = teacher_id);

CREATE INDEX IF NOT EXISTS idx_lessons_teacher_id ON lessons(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lessons_subject ON lessons(subject);

-- ==================== HOMEWORK ====================
CREATE TABLE IF NOT EXISTS homework (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  instructions text NOT NULL,
  due_date date,
  file_url text,
  file_storage_path text,
  file_name text,
  file_type text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE homework ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_homework" ON homework;
CREATE POLICY "select_homework" ON homework FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_homework" ON homework;
CREATE POLICY "insert_own_homework" ON homework FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "update_own_homework" ON homework;
CREATE POLICY "update_own_homework" ON homework FOR UPDATE
  TO authenticated USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "delete_own_homework" ON homework;
CREATE POLICY "delete_own_homework" ON homework FOR DELETE
  TO authenticated USING (auth.uid() = teacher_id);

CREATE INDEX IF NOT EXISTS idx_homework_lesson_id ON homework(lesson_id);
CREATE INDEX IF NOT EXISTS idx_homework_teacher_id ON homework(teacher_id);

-- ==================== UPDATED_AT TRIGGER ====================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lessons_updated_at ON lessons;
CREATE TRIGGER lessons_updated_at BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==================== STORAGE BUCKETS ====================
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-videos', 'lesson-videos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('homework-files', 'homework-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for lesson-videos
DROP POLICY IF EXISTS "read_lesson_videos" ON storage.objects;
CREATE POLICY "read_lesson_videos" ON storage.objects FOR SELECT
  TO public USING (bucket_id = 'lesson-videos');

DROP POLICY IF EXISTS "upload_lesson_videos" ON storage.objects;
CREATE POLICY "upload_lesson_videos" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'lesson-videos');

DROP POLICY IF EXISTS "update_lesson_videos" ON storage.objects;
CREATE POLICY "update_lesson_videos" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'lesson-videos');

DROP POLICY IF EXISTS "delete_lesson_videos" ON storage.objects;
CREATE POLICY "delete_lesson_videos" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'lesson-videos');

-- Storage policies for homework-files
DROP POLICY IF EXISTS "read_homework_files" ON storage.objects;
CREATE POLICY "read_homework_files" ON storage.objects FOR SELECT
  TO public USING (bucket_id = 'homework-files');

DROP POLICY IF EXISTS "upload_homework_files" ON storage.objects;
CREATE POLICY "upload_homework_files" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'homework-files');

DROP POLICY IF EXISTS "update_homework_files" ON storage.objects;
CREATE POLICY "update_homework_files" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'homework-files');

DROP POLICY IF EXISTS "delete_homework_files" ON storage.objects;
CREATE POLICY "delete_homework_files" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'homework-files');
