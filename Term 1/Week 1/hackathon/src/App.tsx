import { useState, useEffect } from 'react';
import { Loader2, GraduationCap, AlertCircle } from 'lucide-react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AuthScreen } from '@/screens/AuthScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { StudentBrowser } from '@/screens/StudentBrowser';
import { LessonDetail } from '@/screens/LessonDetail';
import { TeacherDashboard } from '@/screens/TeacherDashboard';
import { OfflineStatus } from '@/components/OfflineStatus';

type Screen =
  | { name: 'home' }
  | { name: 'auth'; returnTo: 'student' | 'teacher' }
  | { name: 'student' }
  | { name: 'lesson'; lessonId: string }
  | { name: 'teacher' };

function AppContent() {
  const { session, profile, loading, profileError, signOut } = useAuth();
  const [screen, setScreen] = useState<Screen>({ name: 'home' });

  // Auto-route based on auth state. When session+profile become available,
  // immediately route to the correct dashboard if we're on home or auth.
  useEffect(() => {
    if (loading || !session || !profile) return;

    if (screen.name === 'home' || screen.name === 'auth') {
      if (profile.role === 'teacher') {
        setScreen({ name: 'teacher' });
      } else {
        setScreen({ name: 'student' });
      }
    }
  }, [loading, session, profile, screen.name]);

  // Reset to home on logout (session becomes null)
  useEffect(() => {
    if (!loading && !session && screen.name !== 'home' && screen.name !== 'auth') {
      setScreen({ name: 'home' });
    }
  }, [loading, session, screen]);

  // Role-based access control: prevent students from accessing teacher dashboard
  useEffect(() => {
    if (screen.name === 'teacher' && profile && profile.role !== 'teacher') {
      setScreen({ name: 'home' });
    }
  }, [screen, profile]);

  function handleStartLearning() {
    if (session && profile) {
      setScreen({ name: 'student' });
    } else {
      setScreen({ name: 'auth', returnTo: 'student' });
    }
  }

  function handleTeacherArea() {
    if (session && profile) {
      if (profile.role === 'teacher') {
        setScreen({ name: 'teacher' });
      } else {
        setScreen({ name: 'auth', returnTo: 'teacher' });
      }
    } else {
      setScreen({ name: 'auth', returnTo: 'teacher' });
    }
  }

  // Show loading state while auth or profile is being resolved
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-white">
            <GraduationCap className="h-7 w-7" />
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
        </div>
      </div>
    );
  }

  // Show error state if profile failed to load
  if (session && !profile && profileError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
            <AlertCircle className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Profile Error</h2>
            <p className="mt-1 text-sm text-slate-600">{profileError}</p>
          </div>
          <button
            onClick={() => signOut()}
            className="rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  switch (screen.name) {
    case 'home':
      return (
        <>
          <HomeScreen
            onStartLearning={handleStartLearning}
            onTeacherArea={handleTeacherArea}
          />
          <OfflineStatus />
        </>
      );

    case 'auth':
      return (
        <>
          <AuthScreen />
          <OfflineStatus />
        </>
      );

    case 'student':
      return (
        <>
          <StudentBrowser
            onOpenLesson={(lessonId) => setScreen({ name: 'lesson', lessonId })}
            onBack={() => setScreen({ name: 'home' })}
          />
          <OfflineStatus />
        </>
      );

    case 'lesson':
      return (
        <>
          <LessonDetail
            lessonId={screen.lessonId}
            onBack={() => setScreen({ name: 'student' })}
            onHome={() => setScreen({ name: 'home' })}
          />
          <OfflineStatus />
        </>
      );

    case 'teacher':
      return (
        <>
          <TeacherDashboard onBack={() => setScreen({ name: 'home' })} />
          <OfflineStatus />
        </>
      );

    default:
      return (
        <>
          <HomeScreen
            onStartLearning={handleStartLearning}
            onTeacherArea={handleTeacherArea}
          />
          <OfflineStatus />
        </>
      );
  }
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
