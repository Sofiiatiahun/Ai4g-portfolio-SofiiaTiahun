import { useEffect, useState, useCallback } from 'react';
import {
  Download,
  CheckCircle2,
  Trash2,
  FileText,
  Video,
  Loader2,
  Home,
  BookOpen,
  ListChecks,
  ClipboardList,
  ExternalLink,
  AlertCircle,
  Upload,
  Send,
  Camera,
  MessageSquare,
  FileDown,
  Package,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { BackButton } from '@/components/BackButton';
import { LoadingSpinner, ErrorState, EmptyState } from '@/components/States';
import type { Lesson, Homework, HomeworkSubmission, SubmissionFile } from '@/types';

// === Download helpers ===

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function getFileExt(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? (parts.pop() as string).toUpperCase() : 'FILE';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

async function downloadFromStorage(bucket: string, path: string, fileName: string): Promise<void> {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error) throw new Error(`Could not download ${fileName}.`);
  if (!data) throw new Error(`File not found: ${fileName}`);
  triggerDownload(data, fileName);
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').trim() || 'lesson';
}

interface MaterialFile {
  bucket: string;
  path: string;
  fileName: string;
  fileType: string;
  label: string;
}

// === Main component ===

interface LessonDetailProps {
  lessonId: string;
  onBack: () => void;
  onHome: () => void;
}

export function LessonDetail({ lessonId, onBack, onHome }: LessonDetailProps) {
  const isOnline = useOnlineStatus();
  const { profile } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, HomeworkSubmission>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadMsg, setDownloadMsg] = useState<string | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);

  const loadOnline = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: lessonData, error: lessonErr } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .maybeSingle();

    if (lessonErr) {
      setError(lessonErr.message);
      setLoading(false);
      return;
    }
    if (!lessonData) {
      setError('Lesson not found.');
      setLoading(false);
      return;
    }
    setLesson(lessonData as Lesson);

    const { data: hwData } = await supabase
      .from('homework')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: false });

    const hwList = (hwData ?? []) as Homework[];
    setHomework(hwList);

    if (profile && hwList.length > 0) {
      const { data: subData } = await supabase
        .from('homework_submissions')
        .select('*, submission_files(*)')
        .eq('student_id', profile.id)
        .in('homework_id', hwList.map((h) => h.id));

      const subMap: Record<string, HomeworkSubmission> = {};
      for (const row of (subData ?? []) as Record<string, unknown>[]) {
        const sub = row as unknown as HomeworkSubmission;
        sub.submission_files = (row.submission_files as SubmissionFile[] | null) ?? [];
        subMap[sub.homework_id] = sub;
      }
      setSubmissions(subMap);
    }

    setLoading(false);
  }, [lessonId, profile]);

  useEffect(() => {
    if (isOnline) {
      loadOnline();
    } else if (!lesson) {
      setLoading(false);
      setError('You are offline. Please reconnect to view and download lesson materials.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, isOnline, loadOnline]);

  useEffect(() => {
    if (!lesson?.video_storage_path || !isOnline) {
      setPlaybackUrl(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.storage
        .from('lesson-videos')
        .createSignedUrl(lesson.video_storage_path!, 3600);
      if (!cancelled && data?.signedUrl) {
        setPlaybackUrl(data.signedUrl);
      }
    })();
    return () => { cancelled = true; };
  }, [lesson, isOnline]);

  const materials: MaterialFile[] = [];
  if (lesson?.video_storage_path) {
    const videoExt = lesson.video_storage_path.split('.').pop() || 'mp4';
    materials.push({
      bucket: 'lesson-videos',
      path: lesson.video_storage_path,
      fileName: `${sanitizeFileName(lesson.title)}.${videoExt}`,
      fileType: videoExt.toUpperCase(),
      label: 'Lesson Video',
    });
  }
  for (const hw of homework) {
    if (hw.file_storage_path) {
      materials.push({
        bucket: 'homework-files',
        path: hw.file_storage_path,
        fileName: hw.file_name || hw.file_storage_path.split('/').pop() || 'homework-file',
        fileType: hw.file_type || getFileExt(hw.file_name || hw.file_storage_path),
        label: `Homework: ${hw.title}`,
      });
    } else if (hw.file_url) {
      materials.push({
        bucket: '',
        path: hw.file_url,
        fileName: hw.file_name || hw.file_url.split('/').pop() || 'homework-file',
        fileType: hw.file_type || getFileExt(hw.file_name || hw.file_url),
        label: `Homework: ${hw.title}`,
      });
    }
  }

  function handleDownloadNotes() {
    if (!lesson) return;
    let text = `${lesson.title}\n`;
    text += `${'='.repeat(lesson.title.length)}\n\n`;
    text += `Subject: ${lesson.subject}\n`;
    text += `Level: ${lesson.level}\n`;
    text += `Language: ${lesson.language}\n`;
    text += `Duration: ${lesson.duration}\n\n`;
    text += `Description\n-----------\n${lesson.description}\n\n`;
    if (lesson.learning_objectives) {
      text += `Learning Objectives\n-------------------\n${lesson.learning_objectives}\n\n`;
    }
    if (lesson.lesson_notes) {
      text += `Lesson Notes\n------------\n${lesson.lesson_notes}\n\n`;
    }
    if (homework.length > 0) {
      text += `Homework\n--------\n`;
      for (const hw of homework) {
        text += `\n${hw.title}\n`;
        text += `${'-'.repeat(hw.title.length)}\n`;
        text += `${hw.instructions}\n`;
        if (hw.due_date) {
          text += `Due: ${new Date(hw.due_date).toLocaleDateString()}\n`;
        }
        text += '\n';
      }
    }
    const blob = new Blob([text], { type: 'text/plain' });
    triggerDownload(blob, `${sanitizeFileName(lesson.title)}_notes.txt`);
  }

  async function handleDownloadAll() {
    if (!lesson) return;
    setDownloadingAll(true);
    setDownloadMsg(null);
    let successCount = 0;
    let failCount = 0;

    try {
      handleDownloadNotes();
      successCount++;
    } catch {
      failCount++;
    }

    for (const mat of materials) {
      try {
        if (mat.bucket) {
          await downloadFromStorage(mat.bucket, mat.path, mat.fileName);
        } else {
          const resp = await fetch(mat.path);
          if (!resp.ok) throw new Error('Download failed');
          const blob = await resp.blob();
          triggerDownload(blob, mat.fileName);
        }
        successCount++;
        await new Promise((r) => setTimeout(r, 600));
      } catch {
        failCount++;
      }
    }

    if (failCount === 0) {
      setDownloadMsg(`Downloaded ${successCount} file${successCount !== 1 ? 's' : ''} to your device.`);
    } else if (successCount > 0) {
      setDownloadMsg(
        `Downloaded ${successCount} file${successCount !== 1 ? 's' : ''}. ${failCount} failed. If your browser blocked multiple downloads, use the individual Download buttons below.`
      );
    } else {
      setDownloadMsg('Downloads were blocked by your browser. Please use the individual Download buttons below.');
    }
    setDownloadingAll(false);
    setTimeout(() => setDownloadMsg(null), 8000);
  }

  async function handleSubmissionUpdate(homeworkId: string, updated: HomeworkSubmission) {
    setSubmissions((prev) => ({ ...prev, [homeworkId]: updated }));
  }

  if (loading) return <div className="min-h-screen bg-slate-50"><LoadingSpinner label="Loading lesson..." /></div>;
  if (error) return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <BackButton onClick={onBack} label="Back to Lessons" />
        <div className="mt-4"><ErrorState message={error} onRetry={isOnline ? loadOnline : undefined} /></div>
      </div>
    </div>
  );
  if (!lesson) return null;

  const objectives = lesson.learning_objectives
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <BackButton onClick={onBack} label="Lessons" />
          <button
            onClick={onHome}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
          >
            <Home className="h-4 w-4" />
            Home
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        {/* Lesson header */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
              {lesson.subject}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {lesson.level}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {lesson.duration}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {lesson.language}
            </span>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900 sm:text-3xl">
            {lesson.title}
          </h1>
          <p className="mt-3 text-slate-600">{lesson.description}</p>
        </div>

        {/* Lesson Materials */}
        {isOnline && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-teal-600" />
                <h2 className="text-lg font-semibold text-slate-900">Lesson Materials</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleDownloadNotes}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <FileDown className="h-4 w-4" />
                  Download Notes
                </button>
                {materials.length > 0 && (
                  <button
                    onClick={handleDownloadAll}
                    disabled={downloadingAll}
                    className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-60"
                  >
                    {downloadingAll ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {downloadingAll ? 'Downloading...' : 'Download All Materials'}
                  </button>
                )}
              </div>
            </div>

            {materials.length > 0 ? (
              <div className="space-y-2">
                {materials.map((mat, i) => (
                  <MaterialFileRow key={i} file={mat} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No downloadable files for this lesson. Use "Download Notes" to save the lesson text as a file.
              </p>
            )}

            {downloadMsg && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {downloadMsg}
              </div>
            )}
          </div>
        )}

        {/* Video */}
        {(lesson.video_url || playbackUrl) && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="h-5 w-5 text-teal-600" />
                <h2 className="text-lg font-semibold text-slate-900">Lesson Video</h2>
              </div>
              {lesson.video_storage_path && isOnline && (
                <VideoDownloadButton lesson={lesson} />
              )}
            </div>
            {isOnline ? (
              <video
                src={playbackUrl ?? lesson.video_url ?? undefined}
                controls
                className="w-full rounded-xl bg-black"
                preload="metadata"
              />
            ) : (
              <p className="text-sm text-slate-500">
                Video requires an internet connection to play.
              </p>
            )}
            {!lesson.video_storage_path && isOnline && (
              <p className="mt-2 text-xs text-slate-400">
                This is an external video link. Download is not available for external videos.
              </p>
            )}
          </div>
        )}

        {/* Learning Objectives */}
        {objectives.length > 0 && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-teal-600" />
              <h2 className="text-lg font-semibold text-slate-900">Learning Objectives</h2>
            </div>
            <ul className="space-y-2">
              {objectives.map((obj, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                  {obj}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Lesson Notes */}
        {lesson.lesson_notes && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-teal-600" />
              <h2 className="text-lg font-semibold text-slate-900">Lesson Notes</h2>
            </div>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-slate-700">
              {lesson.lesson_notes}
            </div>
          </div>
        )}

        {/* Homework Section */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-teal-600" />
            <h2 className="text-lg font-semibold text-slate-900">Homework</h2>
          </div>

          {homework.length === 0 ? (
            <EmptyState title="No homework has been published for this lesson yet." />
          ) : (
            <div className="space-y-4">
              {homework.map((hw) => (
                <HomeworkCard
                  key={hw.id}
                  homework={hw}
                  isOnline={isOnline}
                  existingSubmission={submissions[hw.id] ?? null}
                  onSubmissionChange={handleSubmissionUpdate}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// === Material File Row ===

function MaterialFileRow({ file }: { file: MaterialFile }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      if (!file.bucket) return;
      const { data } = await supabase.storage
        .from(file.bucket)
        .createSignedUrl(file.path, 3600);
      if (data?.signedUrl) {
        try {
          const resp = await fetch(data.signedUrl, { method: 'HEAD' });
          const len = resp.headers.get('Content-Length');
          if (len) setFileSize(parseInt(len, 10));
        } catch {
          // size unavailable
        }
      }
    })();
  }, [file]);

  async function handleDownload() {
    setDownloading(true);
    setError(null);
    try {
      if (file.bucket) {
        await downloadFromStorage(file.bucket, file.path, file.fileName);
      } else {
        const resp = await fetch(file.path);
        if (!resp.ok) throw new Error('Could not download file.');
        const blob = await resp.blob();
        triggerDownload(blob, file.fileName);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setDownloading(false);
    }
  }

  const isVideo = ['MP4', 'WEBM', 'MOV', 'AVI', 'MKV'].includes(file.fileType);

  return (
    <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
        {isVideo ? <Video className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-700">{file.fileName}</p>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="rounded bg-slate-200 px-1.5 py-0.5 font-medium text-slate-600">
            {file.fileType}
          </span>
          {fileSize !== null && <span>{formatSize(fileSize)}</span>}
          <span className="truncate">{file.label}</span>
        </div>
      </div>
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
      >
        {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        Download
      </button>
      {error && <span className="shrink-0 text-xs text-red-600">{error}</span>}
    </div>
  );
}

// === Video Download Button ===

function VideoDownloadButton({ lesson }: { lesson: Lesson }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    if (!lesson.video_storage_path) return;
    setDownloading(true);
    setError(null);
    try {
      const videoExt = lesson.video_storage_path.split('.').pop() || 'mp4';
      const fileName = `${sanitizeFileName(lesson.title)}.${videoExt}`;
      await downloadFromStorage('lesson-videos', lesson.video_storage_path, fileName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
      >
        {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        Download Video
      </button>
    </div>
  );
}

// === Homework Card ===

function HomeworkCard({
  homework,
  isOnline,
  existingSubmission,
  onSubmissionChange,
}: {
  homework: Homework;
  isOnline: boolean;
  existingSubmission: HomeworkSubmission | null;
  onSubmissionChange: (homeworkId: string, submission: HomeworkSubmission) => void;
}) {
  const { profile } = useAuth();
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [answer, setAnswer] = useState(existingSubmission?.content ?? '');
  const [subFiles, setSubFiles] = useState<File[]>([]);
  const [showSubmitForm, setShowSubmitForm] = useState(false);

  useEffect(() => {
    (async () => {
      if (homework.file_storage_path && isOnline) {
        const { data } = await supabase.storage
          .from('homework-files')
          .createSignedUrl(homework.file_storage_path, 3600);
        if (data) setFileUrl(data.signedUrl);
      } else if (homework.file_url) {
        setFileUrl(homework.file_url);
      }
    })();
  }, [homework, isOnline]);

  async function handleDownloadFile() {
    if (!homework.file_storage_path && !homework.file_url) return;
    setLoadingFile(true);
    setDownloadError(null);
    try {
      let blob: Blob | null = null;
      let fileName = homework.file_name || 'homework-file';

      if (homework.file_storage_path) {
        const { data, error: dlErr } = await supabase.storage
          .from('homework-files')
          .download(homework.file_storage_path);
        if (dlErr) throw new Error('Could not download file. Please try again.');
        if (data) blob = data;
      } else if (homework.file_url && isOnline) {
        const resp = await fetch(homework.file_url);
        if (!resp.ok) throw new Error('Could not download file. Please try again.');
        blob = await resp.blob();
        const urlFileName = homework.file_url.split('/').pop();
        if (urlFileName) fileName = decodeURIComponent(urlFileName);
      }

      if (blob) {
        triggerDownload(blob, fileName);
      } else {
        throw new Error('File could not be loaded. Check your connection and try again.');
      }
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Download failed. Please try again.');
      setTimeout(() => setDownloadError(null), 5000);
    } finally {
      setLoadingFile(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    if (!answer.trim() && subFiles.length === 0) {
      setSubmitError('Please write an answer or attach at least one file before submitting.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      let submissionId: string;

      if (existingSubmission) {
        submissionId = existingSubmission.id;
        const { error: err } = await supabase
          .from('homework_submissions')
          .update({
            content: answer.trim(),
            status: 'submitted',
          })
          .eq('id', existingSubmission.id);
        if (err) throw err;
      } else {
        const { data, error: err } = await supabase
          .from('homework_submissions')
          .insert({
            homework_id: homework.id,
            student_id: profile.id,
            content: answer.trim(),
          })
          .select('*')
          .maybeSingle();
        if (err) throw err;
        if (!data) throw new Error('Failed to create submission');
        submissionId = (data as HomeworkSubmission).id;
      }

      const uploadedFiles: SubmissionFile[] = [];
      for (const file of subFiles) {
        const fileExt = file.name.split('.').pop();
        const path = `${profile.id}/${homework.id}/${submissionId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const { error: uploadErr } = await supabase.storage
          .from('homework-submissions')
          .upload(path, file);
        if (uploadErr) {
          setSubmitError('File upload failed: ' + uploadErr.message);
          setSubmitting(false);
          return;
        }
        const { data: sfData, error: sfErr } = await supabase
          .from('submission_files')
          .insert({
            submission_id: submissionId,
            file_storage_path: path,
            file_name: file.name,
            file_type: file.type,
          })
          .select('*')
          .maybeSingle();
        if (sfErr) throw sfErr;
        if (sfData) uploadedFiles.push(sfData as SubmissionFile);
      }

      const { data: finalSub } = await supabase
        .from('homework_submissions')
        .select('*, submission_files(*)')
        .eq('id', submissionId)
        .maybeSingle();

      if (finalSub) {
        const sub = finalSub as unknown as HomeworkSubmission;
        sub.submission_files = (finalSub as Record<string, unknown>).submission_files as SubmissionFile[] ?? uploadedFiles;
        onSubmissionChange(homework.id, sub);
      }

      setSubFiles([]);
      setShowSubmitForm(false);
      setSubmitSuccess('Homework submitted successfully.');
      setTimeout(() => setSubmitSuccess(null), 4000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit homework');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <h3 className="font-semibold text-slate-900">{homework.title}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
        {homework.instructions}
      </p>
      {homework.due_date && (
        <p className="mt-2 text-xs font-medium text-slate-500">
          Due: {new Date(homework.due_date).toLocaleDateString()}
        </p>
      )}
      {homework.file_name && (
        <div className="mt-3 flex items-center gap-3 rounded-lg bg-slate-50 p-3">
          <FileText className="h-5 w-5 text-teal-600" />
          <span className="flex-1 truncate text-sm text-slate-700">
            {homework.file_name}
          </span>
          <div className="flex items-center gap-2">
            {fileUrl && isOnline && (
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open
              </a>
            )}
            <button
              onClick={handleDownloadFile}
              disabled={loadingFile || !isOnline}
              className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
            >
              {loadingFile ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Download
            </button>
          </div>
        </div>
      )}
      {!isOnline && homework.file_url && !homework.file_storage_path && (
        <p className="mt-2 text-xs text-amber-600">
          File requires internet to download.
        </p>
      )}
      {downloadError && (
        <p className="mt-2 text-xs text-red-600">{downloadError}</p>
      )}

      {/* Submission Section */}
      {isOnline && profile?.role === 'student' && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          {existingSubmission ? (
            <div>
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Submitted
                {existingSubmission.status === 'graded' && (
                  <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-xs font-semibold">
                    Graded
                  </span>
                )}
              </div>

              {existingSubmission.content && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-slate-500">Your Answer:</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                    {existingSubmission.content}
                  </p>
                </div>
              )}

              {existingSubmission.submission_files && existingSubmission.submission_files.length > 0 ? (
                <div className="mt-2 space-y-1.5">
                  <p className="text-xs font-medium text-slate-500">Your Files:</p>
                  {existingSubmission.submission_files.map((sf) => (
                    <SubmissionFileRow key={sf.id} file={sf} />
                  ))}
                </div>
              ) : existingSubmission.file_name && (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <FileText className="h-4 w-4 text-teal-600" />
                  <span className="flex-1 truncate text-sm text-slate-700">
                    {existingSubmission.file_name}
                  </span>
                </div>
              )}

              {existingSubmission.grade && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-teal-50 px-3 py-2">
                  <span className="text-xs font-semibold text-teal-700">Grade:</span>
                  <span className="text-lg font-bold text-teal-800">{existingSubmission.grade}</span>
                </div>
              )}

              {existingSubmission.feedback && (
                <div className="mt-3 rounded-lg bg-blue-50 p-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                    <p className="text-xs font-semibold text-blue-700">Teacher Feedback</p>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-blue-800">
                    {existingSubmission.feedback}
                  </p>
                </div>
              )}

              {!showSubmitForm ? (
                <button
                  onClick={() => {
                    setAnswer(existingSubmission.content ?? '');
                    setShowSubmitForm(true);
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-800"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Edit Submission
                </button>
              ) : (
                <SubmitForm
                  answer={answer}
                  setAnswer={setAnswer}
                  subFiles={subFiles}
                  setSubFiles={setSubFiles}
                  submitting={submitting}
                  submitError={submitError}
                  onCancel={() => setShowSubmitForm(false)}
                  onSubmit={handleSubmit}
                  submitLabel="Update Submission"
                />
              )}
            </div>
          ) : !showSubmitForm ? (
            <button
              onClick={() => setShowSubmitForm(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
            >
              <Send className="h-4 w-4" />
              Submit Homework
            </button>
          ) : (
            <SubmitForm
              answer={answer}
              setAnswer={setAnswer}
              subFiles={subFiles}
              setSubFiles={setSubFiles}
              submitting={submitting}
              submitError={submitError}
              onCancel={() => setShowSubmitForm(false)}
              onSubmit={handleSubmit}
              submitLabel="Submit"
            />
          )}

          {submitSuccess && (
            <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
              {submitSuccess}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// === Submit Form ===

function SubmitForm({
  answer,
  setAnswer,
  subFiles,
  setSubFiles,
  submitting,
  submitError,
  onCancel,
  onSubmit,
  submitLabel,
}: {
  answer: string;
  setAnswer: (v: string) => void;
  subFiles: File[];
  setSubFiles: (files: File[]) => void;
  submitting: boolean;
  submitError: string | null;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
}) {
  function addFiles(files: FileList | null) {
    if (!files) return;
    const newFiles = Array.from(files);
    setSubFiles([...subFiles, ...newFiles]);
  }

  function removeFile(index: number) {
    setSubFiles(subFiles.filter((_, i) => i !== index));
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 space-y-3">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-600">
          Your Answer
        </label>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={4}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
          placeholder="Type your answer here..."
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-600">
          Attach Files (optional, multiple allowed)
        </label>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">
            <FileText className="h-4 w-4" />
            Choose Files
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.webp"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
              className="hidden"
            />
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">
            <Camera className="h-4 w-4" />
            Take Photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
              className="hidden"
            />
          </label>
        </div>
        {subFiles.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {subFiles.map((file, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <FileText className="h-3.5 w-3.5 text-teal-600" />
                <span className="flex-1 truncate text-xs text-slate-700">
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {submitError && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {submitError}
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// === Submission File Row ===

function SubmissionFileRow({ file }: { file: SubmissionFile }) {
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
      triggerDownload(data, file.file_name || 'submission-file');
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
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50"
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
