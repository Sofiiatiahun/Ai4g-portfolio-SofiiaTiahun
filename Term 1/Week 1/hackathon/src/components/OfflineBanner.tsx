import { Wifi, WifiOff } from 'lucide-react';

interface OfflineBannerProps {
  isOnline: boolean;
}

export function OfflineBanner({ isOnline }: OfflineBannerProps) {
  if (isOnline) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
      <div className="flex items-center gap-2 rounded-full bg-amber-900 px-4 py-2 text-sm font-medium text-amber-50 shadow-lg">
        <WifiOff className="h-4 w-4" />
        You're offline
      </div>
    </div>
  );
}

export function OnlineFlash() {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
      <div className="flex items-center gap-2 rounded-full bg-teal-700 px-4 py-2 text-sm font-medium text-white shadow-lg">
        <Wifi className="h-4 w-4" />
        Back online
      </div>
    </div>
  );
}
