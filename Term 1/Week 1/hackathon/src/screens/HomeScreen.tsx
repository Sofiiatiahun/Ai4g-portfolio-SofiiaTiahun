import { GraduationCap, BookOpen, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface HomeScreenProps {
  onStartLearning: () => void;
  onTeacherArea: () => void;
}

export function HomeScreen({ onStartLearning, onTeacherArea }: HomeScreenProps) {
  const { profile, signOut } = useAuth();

  const handlePrimary = () => {
    if (profile?.role === 'teacher') {
      onTeacherArea();
    } else {
      onStartLearning();
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-teal-50 via-white to-white">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-md shadow-teal-600/20">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold text-slate-900">LearnBridge</span>
        </div>
        {profile && (
          <button
            onClick={() => signOut()}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </button>
        )}
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-teal-600 text-white shadow-xl shadow-teal-600/20">
          <GraduationCap className="h-10 w-10" />
        </div>
        <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
          Learn anywhere, anytime
        </h1>
        <p className="mt-4 max-w-xl text-base text-slate-600 sm:text-lg">
          Download lessons, study offline, and access your learning materials
          even without an internet connection.
        </p>

        <div className="mt-10 w-full max-w-sm space-y-3">
          {profile ? (
            <button
              onClick={handlePrimary}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-teal-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-teal-600/20 transition-all hover:bg-teal-700 hover:shadow-xl"
            >
              {profile.role === 'teacher' ? (
                <GraduationCap className="h-5 w-5" />
              ) : (
                <BookOpen className="h-5 w-5" />
              )}
              {profile.role === 'teacher' ? 'Teacher Dashboard' : 'Start Learning'}
            </button>
          ) : (
            <button
              onClick={onStartLearning}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-teal-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-teal-600/20 transition-all hover:bg-teal-700 hover:shadow-xl"
            >
              <GraduationCap className="h-5 w-5" />
              Get Started
            </button>
          )}
          {profile && (
            <p className="pt-2 text-sm text-slate-400">
              Signed in as {profile.name}
            </p>
          )}
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-slate-400 sm:px-10">
        LearnBridge — Offline-first learning platform
      </footer>
    </div>
  );
}
