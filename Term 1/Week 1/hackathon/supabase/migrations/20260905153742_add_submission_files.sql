/*
# Add submission_files table for multiple file uploads
Students can submit multiple files per homework submission (e.g. multiple pages of homework).
*/

CREATE TABLE IF NOT EXISTS submission_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES homework_submissions(id) ON DELETE CASCADE,
  file_storage_path text NOT NULL,
  file_name text NOT NULL,
  file_type text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE submission_files ENABLE ROW LEVEL SECURITY;

-- Students can read their own submission files
CREATE POLICY "select_own_submission_files" ON submission_files FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM homework_submissions hs
      WHERE hs.id = submission_id AND hs.student_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM homework_submissions hs
      JOIN homework h ON h.id = hs.homework_id
      JOIN lessons l ON l.id = h.lesson_id
      WHERE hs.id = submission_id AND l.teacher_id = auth.uid()
    )
  );

-- Students can insert files for their own submissions
CREATE POLICY "insert_own_submission_files" ON submission_files FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM homework_submissions hs
      WHERE hs.id = submission_id AND hs.student_id = auth.uid()
    )
  );

-- Students can delete files from their own submissions
CREATE POLICY "delete_own_submission_files" ON submission_files FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM homework_submissions hs
      WHERE hs.id = submission_id AND hs.student_id = auth.uid()
    )
  );

-- Teachers can read files from submissions for their homework
-- (covered by the SELECT policy above)
