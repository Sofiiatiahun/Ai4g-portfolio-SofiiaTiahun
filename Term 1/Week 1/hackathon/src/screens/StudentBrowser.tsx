import { useEffect, useState, useCallback } from 'react';
import {
  GraduationCap,
  BookOpen,
  Search,
  LogOut,
  Filter,

  Users,
  X,
  Loader2,
  Ticket,
  ClipboardList,
  Clock,
  MessageSquare,
  Award,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import type { Lesson, Class, Homework, HomeworkSubmission, LessonClass } from '@/types';
import { LoadingSpinner, EmptyState, ErrorState } from '@/components/States';

interface StudentBrowserProps {
  onOpenLesson: (lessonId: string) => void;
  onBack: () => void;
}

type Tab = 'all' | 'classes' | 'assignments' | 'grades';

export function StudentBrowser({ onOpenLesson, onBack }: StudentBrowserProps) {
  const { profile, signOut } = useAuth();
  const isOnline = useOnlineStatus();
  const [tab, setTab] = useState<Tab>('all');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [enrolledClasses, setEnrolledClasses] = useState<Class[]>([]);
  const [allHomework, setAllHomework] = useState<(Homework & { lesson_title: string; class_name: string })[]>([]);
  const [lessonClassMap, setLessonClassMap] = useState<Record<string, string[]>>({});
  const [allSubmissions, setAllSubmissions] = useState<Record<string, HomeworkSubmission>>({});
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const loadEnrolledClasses = useCallback(async () => {
    if (!profile) return;
    const { data: enrollData } = await supabase
      .from('class_enrollments')
      .select('class_id')
      .eq('student_id', profile.id);

    if (enrollData && enrollData.length > 0) {
      const classIds = enrollData.map((e: { class_id: string }) => e.class_id);
      const { data: classData } = await supabase
        .from('classes')
        .select('*')
        .in('id', classIds)
        .order('created_at', { ascending: false });
      setEnrolledClasses((classData ?? []) as Class[]);

      // Load lesson-class assignments for enrolled classes
      const { data: lcData } = await supabase
        .from('lesson_classes')
        .select('lesson_id, class_id')
        .in('class_id', classIds);

      const lcRows = (lcData ?? []) as LessonClass[];
      const lessonIdsFromJunction = Array.from(new Set(lcRows.map((r) => r.lesson_id)));

      // Build lesson -> classIds map
      const lcMap: Record<string, string[]> = {};
      for (const row of lcRows) {
        if (!lcMap[row.lesson_id]) lcMap[row.lesson_id] = [];
        lcMap[row.lesson_id].push(row.class_id);
      }
      setLessonClassMap(lcMap);

      if (lessonIdsFromJunction.length > 0) {
        // Load lessons that are assigned to enrolled classes
        const { data: classLessons } = await supabase
          .from('lessons')
          .select('*')
          .in('id', lessonIdsFromJunction)
          .order('created_at', { ascending: false });

        const classLessonsList = (classLessons ?? []) as Lesson[];

        // Load homework for those lessons
        const { data: hwData } = await supabase
          .from('homework')
          .select('*')
          .in('lesson_id', lessonIdsFromJunction)
          .order('created_at', { ascending: false });

        const hwList = (hwData ?? []) as Homework[];

        // Build enriched homework list with lesson title and class name
        const lessonMap = new Map(classLessonsList.map((l) => [l.id, l]));
        const classMap = new Map((classData as Class[] ?? []).map((c) => [c.id, c]));
        const enriched = hwList.map((hw) => {
          const lesson = lessonMap.get(hw.lesson_id);
          const cids = lcMap[hw.lesson_id] ?? [];
          const cls = cids.length > 0 ? classMap.get(cids[0]) : undefined;
          return {
            ...hw,
            lesson_title: lesson?.title ?? 'Unknown Lesson',
            class_name: cls?.name ?? 'General',
          };
        });
        setAllHomework(enriched);

        // Load student's submissions for this homework
        const { data: subData } = await supabase
          .from('homework_submissions')
          .select('*')
          .eq('student_id', profile.id)
          .in('homework_id', hwList.map((h) => h.id));

        const subMap: Record<string, HomeworkSubmission> = {};
        for (const sub of (subData ?? []) as HomeworkSubmission[]) {
          subMap[sub.homework_id] = sub;
        }
        setAllSubmissions(subMap);
      } else {
        setAllHomework([]);
        setAllSubmissions({});
      }
    } else {
      setEnrolledClasses([]);
      setLessonClassMap({});
      setAllHomework([]);
      setAllSubmissions({});
    }
  }, [profile]);

  const loadLessons = useCallback(async () => {
    if (!isOnline) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('lessons')
      .select('*')
      .order('created_at', { ascending: false });

    if (err) {
      setError(err.message);
    } else {
      setLessons((data ?? []) as Lesson[]);
    }
    await loadEnrolledClasses();
    setLoading(false);
  }, [isOnline, loadEnrolledClasses]);

  useEffect(() => {
    loadLessons();
  }, [loadLessons]);

  async function handleJoinClass(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !joinCode.trim()) return;
    setJoining(true);
    setJoinError(null);

    const code = joinCode.trim().toUpperCase();
    const { data: classData, error: classErr } = await supabase
      .from('classes')
      .select('*')
      .eq('invite_code', code)
      .maybeSingle();

    if (classErr || !classData) {
      setJoinError('Invalid invite code. Please check and try again.');
      setJoining(false);
      return;
    }

    const cls = classData as Class;

    // Check if already enrolled
    const { data: existing } = await supabase
      .from('class_enrollments')
      .select('id')
      .eq('class_id', cls.id)
      .eq('student_id', profile.id)
      .maybeSingle();

    if (existing) {
      setJoinError(`You are already enrolled in ${cls.name}.`);
      setJoining(false);
      return;
    }

    const { error: enrollErr } = await supabase
      .from('class_enrollments')
      .insert({ class_id: cls.id, student_id: profile.id });

    if (enrollErr) {
      setJoinError(enrollErr.message);
      setJoining(false);
      return;
    }

    setJoinCode('');
    setShowJoinModal(false);
    setJoining(false);
    await loadEnrolledClasses();
  }

  const subjects = Array.from(
    new Set(lessons.map((l) => l.subject).filter(Boolean))
  ).sort();
  const levels = Array.from(
    new Set(lessons.map((l) => l.level).filter(Boolean))
  ).sort();

  const enrolledClassIds = new Set(enrolledClasses.map((c) => c.id));
  const classLessons = lessons.filter((l) =>
    (lessonClassMap[l.id] ?? []).some((cid) => enrolledClassIds.has(cid))
  );
  const gradedCount = Object.values(allSubmissions).filter((s) => s.grade).length;

  const displayLessons =
    tab === 'classes'
      ? classLessons
      : classLessons;

  const filtered = displayLessons.filter((lesson) => {
    const matchesSearch =
      !search ||
      lesson.title.toLowerCase().includes(search.toLowerCase()) ||
      lesson.subject.toLowerCase().includes(search.toLowerCase());
    const matchesSubject = !subjectFilter || lesson.subject === subjectFilter;
    const matchesLevel = !levelFilter || lesson.level === levelFilter;
    return matchesSearch && matchesSubject && matchesLevel;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">LearnBridge</h1>
              <p className="text-xs text-slate-500">Student</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Home
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
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setTab('all')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              tab === 'all'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Explore Lessons
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
            My Classes
            {enrolledClasses.length > 0 && (
              <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700">
                {enrolledClasses.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('assignments')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              tab === 'assignments'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            Assignments
            {allHomework.length > 0 && (
              <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700">
                {allHomework.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('grades')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              tab === 'grades'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Award className="h-4 w-4" />
            My Grades
            {gradedCount > 0 && (
              <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700">
                {gradedCount}
              </span>
            )}
          </button>
        </div>

        {/* Classes tab — show enrolled classes + join button */}
        {tab === 'classes' && (
          <div className="mb-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">
                Enrolled Classes
              </h3>
              <button
                onClick={() => setShowJoinModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
              >
                <Ticket className="h-4 w-4" />
                Join Class
              </button>
            </div>
            {enrolledClasses.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {enrolledClasses.map((cls) => {
                  const clsLessons = classLessons.filter((l) =>
                    (lessonClassMap[l.id] ?? []).includes(cls.id)
                  );
                  return (
                    <div
                      key={cls.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                          <Users className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-900">
                            {cls.name}
                          </p>
                          <p className="text-xs text-slate-500">{cls.subject}</p>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-slate-500">
                        {clsLessons.length} lesson{clsLessons.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mb-4">
                <EmptyState
                  title="No classes joined yet"
                  description="Ask your teacher for an invite code, then tap Join Class to enroll."
                />
              </div>
            )}
          </div>
        )}

        {/* Search + Filters */}
        {(tab === 'all' || tab === 'classes') && (
          <div className="mb-6 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search lessons by title or subject..."
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            {(subjects.length > 0 || levels.length > 0) && (
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                {subjects.length > 0 && (
                  <select
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-500"
                  >
                    <option value="">All subjects</option>
                    {subjects.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                )}
                {levels.length > 0 && (
                  <select
                    value={levelFilter}
                    onChange={(e) => setLevelFilter(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-500"
                  >
                    <option value="">All levels</option>
                    {levels.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        {tab === 'assignments' ? (
          <AssignmentsTab
            homework={allHomework}
            submissions={allSubmissions}
            loading={loading}
            onOpenLesson={onOpenLesson}
          />
        ) : tab === 'grades' ? (
          <GradesTab
            homework={allHomework}
            submissions={allSubmissions}
            loading={loading}
            onOpenLesson={onOpenLesson}
          />
        ) : loading ? (
          <LoadingSpinner label="Loading lessons..." />
        ) : error ? (
          <ErrorState message={error} onRetry={loadLessons} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={
              tab === 'classes'
                ? 'No lessons in your classes yet'
                : 'No lessons available'
            }
            description={
              tab === 'classes'
                ? 'Join a class with an invite code, or ask your teacher to assign lessons.'
                : 'Check back later for new lessons from your teachers.'
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((lesson) => {
              const lessonClassIds = lessonClassMap[lesson.id] ?? [];
              const lessonClasses = enrolledClasses.filter((c) => lessonClassIds.includes(c.id));
              const classNameText = lessonClasses.map((c) => c.name).join(', ') || undefined;
              return (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  className={classNameText}
                  onOpen={() => onOpenLesson(lesson.id)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Join Class modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-teal-600" />
                <h2 className="text-lg font-bold text-slate-900">Join Class</h2>
              </div>
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinError(null);
                  setJoinCode('');
                }}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleJoinClass} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Invite Code
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  required
                  maxLength={6}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center font-mono text-lg tracking-widest outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  placeholder="ABC123"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Enter the 6-character code your teacher gave you.
                </p>
              </div>
              {joinError && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {joinError}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={joining || !joinCode.trim()}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-60"
                >
                  {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
                  Join
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinModal(false);
                    setJoinError(null);
                    setJoinCode('');
                  }}
                  className="rounded-xl border border-slate-200 px-6 py-3.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function LessonCard({
  lesson,
  className,
  onOpen,
}: {
  lesson: Lesson;
  className?: string;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:border-teal-200 hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
          <GraduationCap className="h-5 w-5" />
        </div>
      </div>
      <h3 className="line-clamp-2 text-base font-semibold text-slate-900 group-hover:text-teal-700">
        {lesson.title}
      </h3>
      <p className="mt-1 line-clamp-2 text-sm text-slate-500">
        {lesson.description}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          {lesson.subject}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          {lesson.level}
        </span>
        {className && (
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
            {className}
          </span>
        )}
      </div>
    </button>
  );
}

type EnrichedHomework = Homework & { lesson_title: string; class_name: string };

function AssignmentsTab({
  homework,
  submissions,
  loading,
  onOpenLesson,
}: {
  homework: EnrichedHomework[];
  submissions: Record<string, HomeworkSubmission>;
  loading: boolean;
  onOpenLesson: (lessonId: string) => void;
}) {
  if (loading) {
    return <LoadingSpinner label="Loading assignments..." />;
  }

  if (homework.length === 0) {
    return (
      <EmptyState
        title="No assignments yet"
        description="Join a class to receive homework assignments from your teacher."
      />
    );
  }

  return (
    <div className="space-y-4">
      {homework.map((hw) => {
        const sub = submissions[hw.id];
        const isGraded = sub?.status === 'graded' && !!sub.grade;
        const isSubmitted = !!sub;
        return (
          <div
            key={hw.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 shrink-0 text-teal-600" />
                  <h3 className="truncate text-base font-semibold text-slate-900">
                    {hw.title}
                  </h3>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {hw.class_name} • {hw.lesson_title}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {isGraded ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-1 text-xs font-bold text-teal-800">
                    <Award className="h-3 w-3" />
                    {sub.grade}
                  </span>
                ) : isSubmitted ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    <Clock className="h-3 w-3" />
                    Pending
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    Not Submitted
                  </span>
                )}
              </div>
            </div>

            <p className="mt-3 line-clamp-2 text-sm text-slate-600">
              {hw.instructions}
            </p>

            {hw.due_date && (
              <p className="mt-2 text-xs font-medium text-slate-500">
                Due: {new Date(hw.due_date).toLocaleDateString()}
              </p>
            )}

            {isGraded && sub.feedback && (
              <div className="mt-3 rounded-lg bg-blue-50 p-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                  <p className="text-xs font-semibold text-blue-700">Teacher Feedback</p>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-blue-800">
                  {sub.feedback}
                </p>
              </div>
            )}

            <button
              onClick={() => onOpenLesson(hw.lesson_id)}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-800"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Open Lesson
            </button>
          </div>
        );
      })}
    </div>
  );
}

function GradesTab({
  homework,
  submissions,
  loading,
  onOpenLesson,
}: {
  homework: EnrichedHomework[];
  submissions: Record<string, HomeworkSubmission>;
  loading: boolean;
  onOpenLesson: (lessonId: string) => void;
}) {
  if (loading) {
    return <LoadingSpinner label="Loading grades..." />;
  }

  const graded = homework
    .map((hw) => ({ hw, sub: submissions[hw.id] }))
    .filter((item) => item.sub?.grade);

  if (graded.length === 0) {
    return (
      <EmptyState
        title="No grades yet"
        description="Your teacher will assign grades after you submit your homework."
      />
    );
  }

  const numericGrades = graded
    .map((item) => parseFloat(item.sub.grade!))
    .filter((n) => !isNaN(n));
  const avg = numericGrades.length > 0
    ? (numericGrades.reduce((a, b) => a + b, 0) / numericGrades.length).toFixed(1)
    : null;

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-teal-600" />
          <h3 className="text-base font-semibold text-teal-900">Grade Summary</h3>
        </div>
        <div className="mt-4 flex flex-wrap gap-6">
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold text-teal-800">{graded.length}</span>
            <span className="text-xs font-semibold text-teal-600">Graded</span>
          </div>
          {avg && (
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-teal-800">{avg}</span>
              <span className="text-xs font-semibold text-teal-600">Average</span>
            </div>
          )}
        </div>
      </div>

      {/* Grade cards */}
      {graded.map(({ hw, sub }) => (
        <div
          key={hw.id}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-semibold text-slate-900">
                {hw.title}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {hw.class_name} • {hw.lesson_title}
              </p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-xl font-bold text-white">
              {sub.grade}
            </div>
          </div>

          {sub.feedback && (
            <div className="mt-3 rounded-lg bg-blue-50 p-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-600" />
                <p className="text-xs font-semibold text-blue-700">Teacher Feedback</p>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-blue-800">
                {sub.feedback}
              </p>
            </div>
          )}

          <button
            onClick={() => onOpenLesson(hw.lesson_id)}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-800"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Open Lesson
          </button>
        </div>
      ))}
    </div>
  );
}
