import type { Lesson, Homework } from '@/types';

const DB_NAME = 'learnbridge-offline';
const DB_VERSION = 1;
const LESSON_STORE = 'lessons';
const HOMEWORK_STORE = 'homework';
const FILE_STORE = 'files';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(LESSON_STORE)) {
        db.createObjectStore(LESSON_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(HOMEWORK_STORE)) {
        db.createObjectStore(HOMEWORK_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(FILE_STORE)) {
        db.createObjectStore(FILE_STORE, { keyPath: 'key' });
      }
    };
  });
}

export interface StoredHomework extends Homework {
  lessonId?: string;
  blob?: Blob;
}

export interface StoredLesson extends Lesson {
  videoBlob?: Blob;
  homework: StoredHomework[];
}

export async function saveLessonOffline(lesson: StoredLesson): Promise<void> {
  const db = await openDB();
  const tx = db.transaction([LESSON_STORE, HOMEWORK_STORE], 'readwrite');
  tx.objectStore(LESSON_STORE).put(lesson);
  for (const hw of lesson.homework) {
    tx.objectStore(HOMEWORK_STORE).put({ ...hw, lessonId: lesson.id });
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveHomeworkFile(
  key: string,
  blob: Blob
): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(FILE_STORE, 'readwrite');
  tx.objectStore(FILE_STORE).put({ key, blob });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getHomeworkFile(
  key: string
): Promise<Blob | null> {
  const db = await openDB();
  const tx = db.transaction(FILE_STORE, 'readonly');
  const request = tx.objectStore(FILE_STORE).get(key);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result?.blob ?? null);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getOfflineLesson(
  lessonId: string
): Promise<StoredLesson | null> {
  const db = await openDB();
  const tx = db.transaction([LESSON_STORE, HOMEWORK_STORE], 'readonly');
  const lessonReq = tx.objectStore(LESSON_STORE).get(lessonId);
  return new Promise((resolve, reject) => {
    lessonReq.onsuccess = () => {
      const lesson = lessonReq.result as StoredLesson | undefined;
      if (!lesson) {
        resolve(null);
        return;
      }
      const hwReq = tx.objectStore(HOMEWORK_STORE).getAll();
      hwReq.onsuccess = () => {
        const allHw = hwReq.result as StoredHomework[];
        lesson.homework = allHw.filter((h) => h.lessonId === lessonId);
        resolve(lesson);
      };
      hwReq.onerror = () => reject(hwReq.error);
    };
    lessonReq.onerror = () => reject(lessonReq.error);
  });
}

export async function getAllOfflineLessons(): Promise<StoredLesson[]> {
  const db = await openDB();
  const tx = db.transaction(LESSON_STORE, 'readonly');
  const request = tx.objectStore(LESSON_STORE).getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error);
  });
}

export async function isLessonOffline(lessonId: string): Promise<boolean> {
  const db = await openDB();
  const tx = db.transaction(LESSON_STORE, 'readonly');
  const request = tx.objectStore(LESSON_STORE).count();
  return new Promise((resolve) => {
    request.onsuccess = async () => {
      const allReq = tx.objectStore(LESSON_STORE).get(lessonId);
      allReq.onsuccess = () => resolve(!!allReq.result);
      allReq.onerror = () => resolve(false);
    };
    request.onerror = () => resolve(false);
  });
}

export async function getOfflineLessonIds(): Promise<Set<string>> {
  const db = await openDB();
  const tx = db.transaction(LESSON_STORE, 'readonly');
  const request = tx.objectStore(LESSON_STORE).getAllKeys();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(new Set(request.result as string[]));
    request.onerror = () => reject(request.error);
  });
}

export async function removeOfflineLesson(lessonId: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction([LESSON_STORE, HOMEWORK_STORE, FILE_STORE], 'readwrite');
  tx.objectStore(LESSON_STORE).delete(lessonId);

  // Delete associated homework
  const hwReq = tx.objectStore(HOMEWORK_STORE).getAll();
  hwReq.onsuccess = () => {
    const allHw = hwReq.result as (StoredHomework & { lessonId: string })[];
    for (const hw of allHw) {
      if (hw.lessonId === lessonId) {
        tx.objectStore(HOMEWORK_STORE).delete(hw.id);
        if (hw.file_storage_path) {
          tx.objectStore(FILE_STORE).delete(hw.file_storage_path);
        }
      }
    }
  };

  // Delete video blob
  tx.objectStore(FILE_STORE).delete(`video-${lessonId}`);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveVideoBlob(
  lessonId: string,
  blob: Blob
): Promise<void> {
  return saveHomeworkFile(`video-${lessonId}`, blob);
}

export async function getVideoBlob(
  lessonId: string
): Promise<Blob | null> {
  return getHomeworkFile(`video-${lessonId}`);
}
