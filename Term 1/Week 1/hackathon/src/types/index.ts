export type UserRole = 'student' | 'teacher';

export interface Profile {
  id: string;
  name: string;
  email: string | null;
  role: UserRole;
  created_at: string;
}

export interface Lesson {
  id: string;
  teacher_id: string;
  title: string;
  subject: string;
  level: string;
  language: string;
  duration: string;
  description: string;
  learning_objectives: string;
  lesson_notes: string;
  video_url: string | null;
  video_storage_path: string | null;
  class_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Homework {
  id: string;
  lesson_id: string;
  teacher_id: string;
  title: string;
  instructions: string;
  due_date: string | null;
  file_url: string | null;
  file_storage_path: string | null;
  file_name: string | null;
  file_type: string | null;
  created_at: string;
}

export interface Class {
  id: string;
  teacher_id: string;
  name: string;
  subject: string;
  invite_code: string;
  created_at: string;
}

export interface LessonClass {
  lesson_id: string;
  class_id: string;
  assigned_at: string;
}

export interface ClassEnrollment {
  id: string;
  class_id: string;
  student_id: string;
  joined_at: string;
  student_name?: string;
  student_email?: string;
}

export interface SubmissionFile {
  id: string;
  submission_id: string;
  file_storage_path: string;
  file_name: string;
  file_type: string | null;
  created_at: string;
}

export interface HomeworkSubmission {
  id: string;
  homework_id: string;
  student_id: string;
  content: string;
  file_storage_path: string | null;
  file_name: string | null;
  file_type: string | null;
  feedback: string | null;
  feedback_at: string | null;
  grade: string | null;
  status: string;
  created_at: string;
  student_name?: string;
  student_email?: string;
  submission_files?: SubmissionFile[];
}

export interface AuthSession {
  user: { id: string; email: string } | null;
  profile: Profile | null;
}
