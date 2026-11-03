import { useEffect, useState } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { OfflineBanner, OnlineFlash } from '@/components/OfflineBanner';

export function OfflineStatus() {
  const isOnline = useOnlineStatus();
  const [showOnlineFlash, setShowOnlineFlash] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    } else if (isOnline && wasOffline) {
      setShowOnlineFlash(true);
      const timer = setTimeout(() => {
        setShowOnlineFlash(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  return (
    <>
      <OfflineBanner isOnline={isOnline} />
      {showOnlineFlash && <OnlineFlash />}
    </>
  );
}
