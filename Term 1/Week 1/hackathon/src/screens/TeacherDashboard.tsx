import { useEffect, useState, useCallback } from 'react';
import {
  GraduationCap,
  Plus,
  LogOut,
  Home,
  ClipboardList,
  Trash2,
  Loader2,
  X,
  Video,
  FileText,
  Edit3,
  Users,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Download,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Lesson, Homework, Class, ClassEnrollment, HomeworkSubmission, SubmissionFile, LessonClass } from '@/types';
import { LoadingSpinner, EmptyState, ErrorState } from '@/components/States';
import { ClassModal, AssignLessonModal, ClassDetailModal } from '@/components/ClassModals';

interface TeacherDashboardProps {
  onBack: () => void;
}

type View = 'list' | 'create-lesson' | 'edit-lesson';
type Tab = 'lessons' | 'classes';

export function TeacherDashboard({ onBack }: TeacherDashboardProps) {
  const { profile, signOut } = useAuth();
  const [view, setView] = useState<View>('list');
  const [tab, setTab] = useState<Tab>('lessons');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [homeworkMap, setHomeworkMap] = useState<Record<string, Homework[]>>({});
  const [classes, setClasses] = useState<Class[]>([]);
  const [enrollmentsMap, setEnrollmentsMap] = useState<Record<string, ClassEnrollment[]>>({});
  const [lessonClassMap, setLessonClassMap] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [showHomeworkModal, setShowHomeworkModal] = useState<string | null>(null);
  const [showClassModal, setShowClassModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [assignClassFor, setAssignClassFor] = useState<Class | null>(null);
  const [viewingSubmissionsFor, setViewingSubmissionsFor] = useState<Homework | null>(null);

  const loadLessons = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('lessons')
      .select('*')
      .eq('teacher_id', profile.id)
      .order('created_at', { ascending: false });

    if (err) {
      setError(err.message);
    } else {
      const lessonList = (data ?? []) as Lesson[];
      setLessons(lessonList);

      // Build lesson->classes map from junction table
      if (lessonList.length > 0) {
        const { data: lcData } = await supabase
          .from('lesson_classes')
          .select('lesson_id, class_id')
          .in('lesson_id', lessonList.map((l) => l.id));
        const lcMap: Record<string, string[]> = {};
        for (const row of (lcData ?? []) as LessonClass[]) {
          if (!lcMap[row.lesson_id]) lcMap[row.lesson_id] = [];
          lcMap[row.lesson_id].push(row.class_id);
        }
        setLessonClassMap(lcMap);
      } else {
        setLessonClassMap({});
      }

      // Load homework for all lessons
      if (lessonList.length > 0) {
        const { data: hwData } = await supabase
          .from('homework')
          .select('*')
          .in(
            'lesson_id',
            lessonList.map((l) => l.id)
          )
          .order('created_at', { ascending: false });

        const hwMap: Record<string, Homework[]> = {};
        for (const hw of (hwData ?? []) as Homework[]) {
          if (!hwMap[hw.lesson_id]) hwMap[hw.lesson_id] = [];
          hwMap[hw.lesson_id].push(hw);
        }
        setHomeworkMap(hwMap);
      }
    }
    setLoading(false);
  }, [profile]);

  const loadClasses = useCallback(async () => {
    if (!profile) return;
    const { data, error: err } = await supabase
      .from('classes')
      .select('*')
      .eq('teacher_id', profile.id)
      .order('created_at', { ascending: false });

    if (err) {
      setError(err.message);
      return;
    }

    const classList = (data ?? []) as Class[];
    setClasses(classList);

    if (classList.length > 0) {
      const { data: enrollData } = await supabase
        .from('class_enrollments')
        .select('*, profiles!class_enrollments_student_id_profiles_fkey(name, email)')
        .in(
          'class_id',
          classList.map((c) => c.id)
        );

      const eMap: Record<string, ClassEnrollment[]> = {};
      for (const row of (enrollData ?? []) as Array<Record<string, unknown>>) {
        const enrollment = row as unknown as ClassEnrollment & {
          profiles?: { name: string; email: string | null } | null;
        };
        const enriched: ClassEnrollment = {
          ...enrollment,
          student_name: enrollment.profiles?.name ?? 'Student',
          student_email: enrollment.profiles?.email ?? undefined,
        };
        if (!eMap[enrollment.class_id]) eMap[enrollment.class_id] = [];
        eMap[enrollment.class_id].push(enriched);
      }
      setEnrollmentsMap(eMap);
    }
  }, [profile]);

  useEffect(() => {
    loadLessons();
    loadClasses();
  }, [loadLessons, loadClasses]);

  async function handleDeleteLesson(lessonId: string) {
    if (!confirm('Delete this lesson and all its homework? This cannot be undone.')) return;
    const { error: err } = await supabase.from('lessons').delete().eq('id', lessonId);
    if (err) {
      setError(err.message);
      return;
    }
    await loadLessons();
  }

  async function handleDeleteHomework(hwId: string) {
    const { error: err } = await supabase.from('homework').delete().eq('id', hwId);
    if (err) {
      setError(err.message);
      return;
    }
    await loadLessons();
  }

  async function handleDeleteClass(classId: string) {
    if (!confirm('Delete this class? Enrolled students will lose access to its lessons.')) return;
    const { error: err } = await supabase.from('classes').delete().eq('id', classId);
    if (err) {
      setError(err.message);
      return;
    }
    await loadClasses();
    await loadLessons();
  }

  async function handleRemoveStudent(enrollmentId: string) {
    const { error: err } = await supabase
      .from('class_enrollments')
      .delete()
      .eq('id', enrollmentId);
    if (err) {
      setError(err.message);
      return;
    }
    await loadClasses();
  }

  async function handleAddStudent(studentId: string) {
    if (!selectedClass) return;
    const { error: err } = await supabase
      .from('class_enrollments')
      .insert({
        class_id: selectedClass.id,
        student_id: studentId,
      });
    if (err) throw err;
    await loadClasses();
  }

  if (view === 'create-lesson' || (view === 'edit-lesson' && editingLesson)) {
    return (
      <LessonForm
        lesson={editingLesson}
        teacherClasses={classes}
        onCancel={() => {
          setView('list');
          setEditingLesson(null);
        }}
        onSaved={() => {
          setView('list');
          setEditingLesson(null);
          loadLessons();
        }}
      />
    );
  }

  const classesForLesson = (lessonId: string): Class[] => {
    const cids = lessonClassMap[lessonId] ?? [];
    return classes.filter((c) => cids.includes(c.id));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">Teacher Dashboard</h1>
              <p className="text-xs text-slate-500">{profile?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </button>
            <button
              onClick={() => signOut()}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Log Out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setTab('lessons')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              tab === 'lessons'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Lessons
          </button>
          <button
            onClick={() => setTab('classes')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              tab === 'classes'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="h-4 w-4" />
            Classes
            {classes.length > 0 && (
              <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700">
                {classes.length}
              </span>
            )}
          </button>
        </div>

        {error && <div className="mb-4"><ErrorState message={error} /></div>}

        {/* LESSONS TAB */}
        {tab === 'lessons' && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Your Lessons</h2>
              <button
                onClick={() => setView('create-lesson')}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
              >
                <Plus className="h-4 w-4" />
                Create Lesson
              </button>
            </div>

            {loading ? (
              <LoadingSpinner label="Loading your lessons..." />
            ) : lessons.length === 0 ? (
              <EmptyState
                title="No lessons yet"
                description="Create your first lesson to share with students."
              />
            ) : (
              <div className="space-y-4">
                {lessons.map((lesson) => {
                  const lessonClasses = classesForLesson(lesson.id);
                  return (
                    <div
                      key={lesson.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">
                              {lesson.subject}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                              {lesson.level}
                            </span>
                            {lessonClasses.map((cls) => (
                              <span key={cls.id} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                                {cls.name}
                              </span>
                            ))}
                          </div>
                          <h3 className="mt-2 text-lg font-semibold text-slate-900">
                            {lesson.title}
                          </h3>
                          {lessonClasses.length > 0 && (
                            <p className="mt-1 text-xs text-slate-500">
                              Assigned to: {lessonClasses.map((c) => c.name).join(', ')}
                            </p>
                          )}
                          <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                            {lesson.description}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingLesson(lesson);
                            setView('edit-lesson');
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => setShowHomeworkModal(lesson.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                        >
                          <ClipboardList className="h-3.5 w-3.5" />
                          Homework ({homeworkMap[lesson.id]?.length ?? 0})
                        </button>
                        <button
                          onClick={() => handleDeleteLesson(lesson.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>

                      {homeworkMap[lesson.id]?.length > 0 && (
                        <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                          {homeworkMap[lesson.id].map((hw) => (
                            <div
                              key={hw.id}
                              className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                            >
                              <div className="flex items-center gap-2">
                                <ClipboardList className="h-4 w-4 text-teal-600" />
                                <span className="text-sm font-medium text-slate-700">
                                  {hw.title}
                                </span>
                                {hw.file_name && (
                                  <span className="text-xs text-slate-400">
                                    ({hw.file_name})
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setViewingSubmissionsFor(hw)}
                                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-teal-700 transition-colors hover:bg-teal-50"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  Submissions
                                </button>
                                <button
                                  onClick={() => handleDeleteHomework(hw.id)}
                                  className="text-slate-400 transition-colors hover:text-red-500"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* CLASSES TAB */}
        {tab === 'classes' && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Your Classes</h2>
              <button
                onClick={() => setShowClassModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
              >
                <Plus className="h-4 w-4" />
                Create Class
              </button>
            </div>

            {loading ? (
              <LoadingSpinner label="Loading classes..." />
            ) : classes.length === 0 ? (
              <EmptyState
                title="No classes yet"
                description="Create a class, get an invite code, and share it with your students."
              />
            ) : (
              <div className="space-y-4">
                {classes.map((cls) => (
                  <div
                    key={cls.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            {cls.subject}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                            {enrollmentsMap[cls.id]?.length ?? 0} students
                          </span>
                        </div>
                        <h3 className="mt-2 text-lg font-semibold text-slate-900">
                          {cls.name}
                        </h3>
                        <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-teal-50 px-3 py-1.5">
                          <span className="text-xs font-medium text-teal-600">Invite Code:</span>
                          <span className="font-mono text-sm font-bold tracking-widest text-teal-800">
                            {cls.invite_code}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setSelectedClass(cls)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        <Users className="h-3.5 w-3.5" />
                        Students ({enrollmentsMap[cls.id]?.length ?? 0})
                      </button>
                      <button
                        onClick={() => setAssignClassFor(cls)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Assign Lesson
                      </button>
                      <button
                        onClick={() => handleDeleteClass(cls.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showHomeworkModal && (
        <HomeworkModal
          lessonId={showHomeworkModal}
          onClose={() => setShowHomeworkModal(null)}
          onSaved={() => {
            setShowHomeworkModal(null);
            loadLessons();
          }}
        />
      )}

      {showClassModal && (
        <ClassModal
          onClose={() => setShowClassModal(false)}
          onSaved={() => {
            setShowClassModal(false);
            loadClasses();
          }}
        />
      )}

      {selectedClass && (
        <ClassDetailModal
          cls={selectedClass}
          enrollments={enrollmentsMap[selectedClass.id] ?? []}
          onClose={() => setSelectedClass(null)}
          onAssignLesson={() => {
            setAssignClassFor(selectedClass);
            setSelectedClass(null);
          }}
          onRemoveStudent={handleRemoveStudent}
          onAddStudent={handleAddStudent}
        />
      )}

      {assignClassFor && (
        <AssignLessonModal
          cls={assignClassFor}
          lessons={lessons}
          onClose={() => setAssignClassFor(null)}
          onSaved={() => {
            setAssignClassFor(null);
            loadLessons();
          }}
        />
      )}

      {viewingSubmissionsFor && (
        <SubmissionsModal
          homework={viewingSubmissionsFor}
          onClose={() => setViewingSubmissionsFor(null)}
        />
      )}
    </div>
  );
}

// ==================== SUBMISSIONS MODAL ====================

function SubmissionsModal({
  homework,
  onClose,
}: {
  homework: Homework;
  onClose: () => void;
}) {
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState<Record<string, string>>({});
  const [gradeInput, setGradeInput] = useState<Record<string, string>>({});
  const [savingFeedback, setSavingFeedback] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await supabase
        .from('homework_submissions')
        .select('*, profiles!homework_submissions_student_id_profiles_fkey(name, email), submission_files(*)')
        .eq('homework_id', homework.id)
        .order('created_at', { ascending: false });

      if (err) {
        setError(err.message);
      } else {
        const enriched = (data ?? []).map((row) => {
          const r = row as Record<string, unknown>;
          const profiles = r.profiles as { name: string; email: string | null } | null;
          const files = r.submission_files as SubmissionFile[] | null;
          return {
            ...(r as unknown as HomeworkSubmission),
            student_name: profiles?.name ?? 'Student',
            student_email: profiles?.email ?? undefined,
            submission_files: files ?? [],
          };
        });
        setSubmissions(enriched);

        const fbMap: Record<string, string> = {};
        const grMap: Record<string, string> = {};
        for (const sub of enriched) {
          if (sub.feedback) fbMap[sub.id] = sub.feedback;
          if (sub.grade) grMap[sub.id] = sub.grade;
        }
        setFeedbackText(fbMap);
        setGradeInput(grMap);
      }
      setLoading(false);
    })();
  }, [homework.id]);

  async function handleSaveFeedback(submissionId: string) {
    const text = feedbackText[submissionId]?.trim();
    const grade = gradeInput[submissionId]?.trim() || null;
    if (!text && !grade) return;
    setSavingFeedback(submissionId);

    const updatePayload: Record<string, string | null> = {
      feedback_at: new Date().toISOString(),
      status: 'graded',
    };
    if (text) updatePayload.feedback = text;
    if (grade) updatePayload.grade = grade;

    const { data, error: err } = await supabase
      .from('homework_submissions')
      .update(updatePayload)
      .eq('id', submissionId)
      .select('*')
      .maybeSingle();

    if (err) {
      setError(err.message);
      setSavingFeedback(null);
      return;
    }

    if (data) {
      const updated = data as HomeworkSubmission;
      const existing = submissions.find((s) => s.id === submissionId);
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === submissionId
            ? { ...updated, student_name: existing?.student_name, student_email: existing?.student_email }
            : s
        )
      );
    }
    setSavingFeedback(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Submissions</h2>
            <p className="text-sm text-slate-500">{homework.title}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
          </div>
        ) : error ? (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : submissions.length === 0 ? (
          <EmptyState
            title="No submissions yet"
            description="Students have not submitted homework for this assignment yet."
          />
        ) : (
          <div className="space-y-4">
            {submissions.map((sub) => (
              <div key={sub.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-semibold text-slate-900">
                        {sub.student_name ?? 'Student'}
                      </span>
                    </div>
                    {sub.student_email && (
                      <span className="ml-6 text-xs text-slate-400">{sub.student_email}</span>
                    )}
                    <span className="ml-6 text-xs text-slate-400">
                      Submitted {new Date(sub.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {sub.grade && (
                      <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-bold text-teal-800">
                        Grade: {sub.grade}
                      </span>
                    )}
                    {sub.submission_files && sub.submission_files.length > 0 ? (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                        {sub.submission_files.length} file{sub.submission_files.length !== 1 ? 's' : ''}
                      </span>
                    ) : sub.file_name && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                        1 file
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        sub.status === 'graded'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {sub.status === 'graded' ? 'Graded' : 'Pending'}
                    </span>
                  </div>
                </div>

                {sub.content && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-slate-500">Answer:</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                      {sub.content}
                    </p>
                  </div>
                )}

                {sub.submission_files && sub.submission_files.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-medium text-slate-500">Files:</p>
                    {sub.submission_files.map((sf: SubmissionFile) => (
                      <TeacherFileRow key={sf.id} file={sf} />
                    ))}
                  </div>
                ) : sub.file_name && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                    <FileText className="h-4 w-4 text-teal-600" />
                    <span className="flex-1 truncate text-sm text-slate-700">
                      {sub.file_name}
                    </span>
                  </div>
                )}

                {sub.feedback && (
                  <div className="mt-3 rounded-lg bg-blue-50 p-3">
                    <p className="text-xs font-semibold text-blue-700">Your Feedback</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-blue-800">
                      {sub.feedback}
                    </p>
                  </div>
                )}

                <div className="mt-3 space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">Grade</label>
                    <input
                      type="text"
                      value={gradeInput[sub.id] ?? ''}
                      onChange={(e) =>
                        setGradeInput((prev) => ({ ...prev, [sub.id]: e.target.value }))
                      }
                      className="w-24 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                      placeholder="e.g. 7"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">Feedback</label>
                    <textarea
                      value={feedbackText[sub.id] ?? ''}
                      onChange={(e) =>
                        setFeedbackText((prev) => ({ ...prev, [sub.id]: e.target.value }))
                      }
                      rows={2}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                      placeholder="Write feedback for this student..."
                    />
                  </div>
                  <button
                    onClick={() => handleSaveFeedback(sub.id)}
                    disabled={(!feedbackText[sub.id]?.trim() && !gradeInput[sub.id]?.trim()) || savingFeedback === sub.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
                  >
                    {savingFeedback === sub.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    Save Grade & Feedback
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== LESSON FORM ====================

function LessonForm({
  lesson,
  teacherClasses,
  onCancel,
  onSaved,
}: {
  lesson: Lesson | null;
  teacherClasses: Class[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { profile } = useAuth();
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [classError, setClassError] = useState<string | null>(null);
  const [title, setTitle] = useState(lesson?.title ?? '');
  const [subject, setSubject] = useState(lesson?.subject ?? '');
  const [level, setLevel] = useState(lesson?.level ?? 'Beginner');
  const [language, setLanguage] = useState(lesson?.language ?? 'English');
  const [duration, setDuration] = useState(lesson?.duration ?? '');
  const [description, setDescription] = useState(lesson?.description ?? '');
  const [objectives, setObjectives] = useState(lesson?.learning_objectives ?? '');
  const [notes, setNotes] = useState(lesson?.lesson_notes ?? '');
  const [videoUrl, setVideoUrl] = useState(lesson?.video_url ?? '');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const levels = ['Beginner', 'Intermediate', 'Advanced'];

  useEffect(() => {
    if (lesson) {
      (async () => {
        const { data } = await supabase
          .from('lesson_classes')
          .select('class_id')
          .eq('lesson_id', lesson.id);
        setSelectedClassIds((data ?? []).map((r: { class_id: string }) => r.class_id));
      })();
    }
  }, [lesson]);

  function toggleClass(classId: string) {
    setSelectedClassIds((prev) =>
      prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId]
    );
    setClassError(null);
  }

  async function syncLessonClasses(lessonId: string) {
    const { data: existing, error: selErr } = await supabase
      .from('lesson_classes')
      .select('class_id')
      .eq('lesson_id', lessonId);
    if (selErr) {
      console.error('[syncLessonClasses] SELECT existing failed:', { message: selErr.message, code: selErr.code, details: selErr.details, hint: selErr.hint });
      throw new Error(`Failed to load existing class assignments: ${selErr.message} (code: ${selErr.code})`);
    }
    const existingIds = new Set((existing ?? []).map((r: { class_id: string }) => r.class_id));
    const selectedSet = new Set(selectedClassIds);

    const toInsert = selectedClassIds.filter((id) => !existingIds.has(id));
    const toDelete = [...existingIds].filter((id) => !selectedSet.has(id));

    if (toInsert.length > 0) {
      const rows = toInsert.map((class_id) => ({ lesson_id: lessonId, class_id }));
      console.log('[syncLessonClasses] Inserting rows:', JSON.stringify(rows));
      const { error: insErr } = await supabase
        .from('lesson_classes')
        .insert(rows);
      if (insErr) {
        console.error('[syncLessonClasses] INSERT failed:', { message: insErr.message, code: insErr.code, details: insErr.details, hint: insErr.hint });
        throw new Error(`Failed to assign classes: ${insErr.message} (code: ${insErr.code}${insErr.hint ? ', hint: ' + insErr.hint : ''})`);
      }
    }
    if (toDelete.length > 0) {
      for (const classId of toDelete) {
        const { error: delErr } = await supabase
          .from('lesson_classes')
          .delete()
          .eq('lesson_id', lessonId)
          .eq('class_id', classId);
        if (delErr) {
          console.error('[syncLessonClasses] DELETE failed:', { message: delErr.message, code: delErr.code, details: delErr.details, hint: delErr.hint });
          throw new Error(`Failed to remove class assignment: ${delErr.message} (code: ${delErr.code})`);
        }
      }
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    if (!lesson && selectedClassIds.length === 0) {
      setClassError('Please assign at least one class before publishing.');
      return;
    }

    setSaving(true);
    setError(null);
    setClassError(null);

    try {
      let videoStoragePath = lesson?.video_storage_path ?? null;
      let finalVideoUrl = videoUrl || null;

      // Upload video if a new file is selected
      if (videoFile) {
        const fileExt = videoFile.name.split('.').pop();
        const fileName = `${profile.id}/${Date.now()}.${fileExt}`;
        const { error: uploadErr } = await supabase.storage
          .from('lesson-videos')
          .upload(fileName, videoFile);
        if (uploadErr) {
          setError('Video upload failed: ' + uploadErr.message);
          setSaving(false);
          return;
        }
        videoStoragePath = fileName;
        const { data: urlData } = await supabase.storage
          .from('lesson-videos')
          .getPublicUrl(fileName);
        finalVideoUrl = urlData.publicUrl;
      }

      const payload = {
        teacher_id: profile.id,
        title,
        subject,
        level,
        language,
        duration,
        description,
        learning_objectives: objectives,
        lesson_notes: notes,
        video_url: finalVideoUrl,
        video_storage_path: videoStoragePath,
      };

      let lessonId = lesson?.id ?? '';

      if (lesson) {
        const { error: err } = await supabase
          .from('lessons')
          .update(payload)
          .eq('id', lesson.id);
        if (err) {
          console.error('[handleSave] Lesson UPDATE failed:', { message: err.message, code: err.code, details: err.details, hint: err.hint });
          throw new Error(`Failed to update lesson: ${err.message} (code: ${err.code})`);
        }
      } else {
        console.log('[handleSave] Inserting lesson with payload:', JSON.stringify(payload));
        const { data, error: err } = await supabase
          .from('lessons')
          .insert(payload)
          .select('id')
          .maybeSingle();
        if (err) {
          console.error('[handleSave] Lesson INSERT failed:', { message: err.message, code: err.code, details: err.details, hint: err.hint });
          throw new Error(`Failed to create lesson: ${err.message} (code: ${err.code}${err.hint ? ', hint: ' + err.hint : ''})`);
        }
        if (!data) {
          console.error('[handleSave] Lesson INSERT returned no data (RLS blocked?)');
          throw new Error('Failed to create lesson: no row returned. The database may have blocked the insert (check RLS policies).');
        }
        lessonId = (data as { id: string }).id;
        console.log('[handleSave] Lesson created with id:', lessonId);
      }

      console.log('[handleSave] Syncing class assignments for lesson:', lessonId, 'selectedClassIds:', selectedClassIds);
      await syncLessonClasses(lessonId);

      onSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : typeof err === 'object' && err !== null && 'message' in err ? String((err as { message: unknown }).message) : 'Failed to save lesson';
      console.error('[handleSave] Final error:', msg, err);
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <h1 className="text-base font-bold text-slate-900">
            {lesson ? 'Edit Lesson' : 'Create Lesson'}
          </h1>
          <button
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <form onSubmit={handleSave} className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Lesson Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  placeholder="e.g. Introduction to Fractions"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Subject *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  placeholder="e.g. Mathematics"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Level *
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-teal-500"
                >
                  {levels.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Language *
                </label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Duration *
                </label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  placeholder="e.g. 30 minutes"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  placeholder="A brief summary of what this lesson covers..."
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Learning Objectives
            </label>
            <p className="mb-2 text-xs text-slate-400">
              One objective per line
            </p>
            <textarea
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              placeholder={"Understand what fractions are\nAdd and subtract simple fractions"}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Lesson Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={8}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              placeholder="Detailed lesson content and explanations..."
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Video className="h-5 w-5 text-teal-600" />
              <label className="text-sm font-medium text-slate-700">
                Lesson Video (optional)
              </label>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs text-slate-500">
                  Upload a video file
                </label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-teal-700"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-slate-500">
                  Or paste a video URL
                </label>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => {
                    setVideoUrl(e.target.value);
                    setVideoFile(null);
                  }}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          {/* Assign to Classes */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-5 w-5 text-teal-600" />
              <label className="text-sm font-medium text-slate-700">
                Assign to Classes {!lesson && '*'}
              </label>
            </div>
            {teacherClasses.length === 0 ? (
              <p className="text-sm text-slate-500">
                You have no classes yet. Create a class first, then assign this lesson to it.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {teacherClasses.map((cls) => {
                  const selected = selectedClassIds.includes(cls.id);
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => toggleClass(cls.id)}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                        selected
                          ? 'border-teal-500 bg-teal-50 text-teal-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {selected && <CheckCircle2 className="h-3.5 w-3.5" />}
                      {cls.name}
                    </button>
                  );
                })}
              </div>
            )}
            {classError && (
              <p className="mt-2 text-xs text-red-600">{classError}</p>
            )}
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {lesson ? 'Save Changes' : 'Publish Lesson'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-slate-200 px-6 py-3.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==================== HOMEWORK MODAL ====================

function HomeworkModal({
  lessonId,
  onClose,
  onSaved,
}: {
  lessonId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { profile } = useAuth();
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError(null);

    try {
      let fileStoragePath: string | null = null;
      let fileUrl: string | null = null;
      let fileName: string | null = null;
      let fileType: string | null = null;

      if (file) {
        const fileExt = file.name.split('.').pop();
        const path = `${profile.id}/${Date.now()}.${fileExt}`;
        const { error: uploadErr } = await supabase.storage
          .from('homework-files')
          .upload(path, file);
        if (uploadErr) {
          setError('File upload failed: ' + uploadErr.message);
          setSaving(false);
          return;
        }
        fileStoragePath = path;
        fileName = file.name;
        fileType = file.type;
        const { data: urlData } = await supabase.storage
          .from('homework-files')
          .getPublicUrl(path);
        fileUrl = urlData.publicUrl;
      }

      const { error: err } = await supabase.from('homework').insert({
        lesson_id: lessonId,
        title,
        instructions,
        due_date: dueDate || null,
        file_url: fileUrl,
        file_storage_path: fileStoragePath,
        file_name: fileName,
        file_type: fileType,
      });

      if (err) throw err;
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save homework');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-teal-600" />
            <h2 className="text-lg font-bold text-slate-900">Create Homework</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              placeholder="e.g. Practice Exercise 1"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Instructions *
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              required
              rows={5}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              placeholder="What should students do for this homework?"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Due Date (optional)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5 text-teal-600" />
              <label className="text-sm font-medium text-slate-700">
                Attach File (optional)
              </label>
            </div>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-teal-700"
            />
            {file && (
              <p className="mt-2 text-xs text-slate-500">
                Selected: {file.name}
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Publish Homework
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-6 py-3.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TeacherFileRow({ file }: { file: SubmissionFile }) {
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.storage
        .from('homework-submissions')
        .createSignedUrl(file.file_storage_path, 3600);
      if (data) setViewUrl(data.signedUrl);
    })();
  }, [file.file_storage_path]);

  async function handleDownload() {
    setDownloading(true);
    setError(null);
    try {
      const { data, error: dlErr } = await supabase.storage
        .from('homework-submissions')
        .download(file.file_storage_path);
      if (dlErr) throw new Error('Could not download file.');
      if (!data) throw new Error('File not found.');
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name || 'submission-file';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
      <FileText className="h-4 w-4 text-teal-600" />
      <span className="flex-1 truncate text-sm text-slate-700">
        {file.file_name}
      </span>
      {viewUrl && (
        <a
          href={viewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View
        </a>
      )}
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
      >
        {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        Download
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
