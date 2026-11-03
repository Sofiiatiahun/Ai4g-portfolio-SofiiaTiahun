import { useState } from 'react';
import {
  X,
  Loader2,
  Plus,
  Users,
  Copy,
  Check,
  Trash2,
  UserCircle,
  Search,
  UserPlus,
  Mail,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Class, Lesson, ClassEnrollment, Profile } from '@/types';

interface ClassModalProps {
  onClose: () => void;
  onSaved: () => void;
}

export function ClassModal({ onClose, onSaved }: ClassModalProps) {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const { data: codeData, error: codeErr } = await supabase.rpc(
        'generate_invite_code'
      );
      if (codeErr) throw codeErr;

      const { error: err } = await supabase.from('classes').insert({
        name,
        subject,
        invite_code: codeData,
      });

      if (err) throw err;
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create class');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-teal-600" />
            <h2 className="text-lg font-bold text-slate-900">Create Class</h2>
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
              Class Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              placeholder="e.g. Math 101"
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
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create Class
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

interface AssignLessonModalProps {
  cls: Class;
  lessons: Lesson[];
  onClose: () => void;
  onSaved: () => void;
}

export function AssignLessonModal({
  cls,
  lessons,
  onClose,
  onSaved,
}: AssignLessonModalProps) {
  const [selectedLesson, setSelectedLesson] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLesson) return;
    setSaving(true);
    setError(null);

    const { error: err } = await supabase
      .from('lesson_classes')
      .insert({ lesson_id: selectedLesson, class_id: cls.id });

    if (err) {
      if (err.code === '23505') {
        setError('This lesson is already assigned to this class.');
      } else {
        setError(err.message);
      }
      setSaving(false);
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-teal-600" />
            <h2 className="text-lg font-bold text-slate-900">
              Assign Lesson to {cls.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleAssign} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Select Lesson *
            </label>
            <select
              value={selectedLesson}
              onChange={(e) => setSelectedLesson(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-teal-500"
            >
              <option value="">Choose a lesson...</option>
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || !selectedLesson}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Assign
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

interface ClassDetailModalProps {
  cls: Class;
  enrollments: ClassEnrollment[];
  onClose: () => void;
  onAssignLesson: () => void;
  onRemoveStudent: (enrollmentId: string) => void;
  onAddStudent: (studentId: string) => Promise<void>;
}

export function ClassDetailModal({
  cls,
  enrollments,
  onClose,
  onAssignLesson,
  onRemoveStudent,
  onAddStudent,
}: ClassDetailModalProps) {
  const [copied, setCopied] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  function copyCode() {
    navigator.clipboard.writeText(cls.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRemove(enrollmentId: string) {
    setRemovingId(enrollmentId);
    await onRemoveStudent(enrollmentId);
    setRemovingId(null);
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearched(true);
    setAddError(null);

    const query = searchQuery.trim();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(10);

    if (error) {
      setAddError('Search failed. Please try again.');
      setSearching(false);
      return;
    }

    const enrolledIds = new Set(enrollments.map((e) => e.student_id));
    setSearchResults((data ?? []).filter((p) => !enrolledIds.has(p.id)));
    setSearching(false);
  }

  async function handleAddStudent(studentId: string) {
    setAddingId(studentId);
    setAddError(null);
    try {
      await onAddStudent(studentId);
      setSearchResults((prev) => prev.filter((p) => p.id !== studentId));
    } catch {
      setAddError('Could not add student. They may already be enrolled.');
    }
    setAddingId(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{cls.name}</h2>
            <p className="text-sm text-slate-500">{cls.subject}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl bg-teal-50 p-4">
            <p className="mb-1 text-xs font-medium text-teal-600">Invite Code</p>
            <div className="flex items-center justify-between">
              <span className="font-mono text-2xl font-bold tracking-widest text-teal-800">
                {cls.invite_code}
              </span>
              <button
                onClick={copyCode}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-100"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="mt-2 text-xs text-teal-600">
              Share this code with students so they can join your class.
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-700">
                  Enrolled Students ({enrollments.length})
                </h3>
              </div>
              <button
                onClick={() => setShowAddStudent(!showAddStudent)}
                className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-100"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Add Student
              </button>
            </div>

            {showAddStudent && (
              <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
                      placeholder="Search by name or email..."
                      className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    disabled={searching || !searchQuery.trim()}
                    className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
                  >
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Search
                  </button>
                </div>

                {addError && (
                  <p className="mt-2 text-xs text-red-600">{addError}</p>
                )}

                {searched && !searching && searchResults.length === 0 && !addError && (
                  <p className="mt-2 text-xs text-slate-500">
                    No students found. Try a different name or email.
                  </p>
                )}

                {searchResults.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {searchResults.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between rounded-lg bg-white px-3 py-2"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-700">
                            {student.name}
                          </span>
                          {student.email && (
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <Mail className="h-3 w-3" />
                              {student.email}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleAddStudent(student.id)}
                          disabled={addingId === student.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
                        >
                          {addingId === student.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <UserPlus className="h-3.5 w-3.5" />
                          )}
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {enrollments.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center">
                <UserCircle className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">
                  No students enrolled yet. Share the invite code or add a student above.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {enrollments.map((enr) => (
                  <div
                    key={enr.id}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">
                        {(enr.student_name ?? '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-700">
                          {enr.student_name ?? 'Student'}
                        </span>
                        {enr.student_email && (
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Mail className="h-3 w-3" />
                            {enr.student_email}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(enr.id)}
                      disabled={removingId === enr.id}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                      title="Remove student"
                    >
                      {removingId === enr.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={onAssignLesson}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" />
            Assign Lesson to Class
          </button>
        </div>
      </div>
    </div>
  );
}
