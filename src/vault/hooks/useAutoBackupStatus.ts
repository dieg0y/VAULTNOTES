import { useEffect, useState } from 'react';
import { getAutoBackupStatus, subscribeAutoBackup } from '../utils/autoBackup';

/**
 * Live view of the auto-backup engine (status object is replaced on every
 * change — safe to use as a dependency / in render). The engine itself is
 * started once by App; this hook only observes it.
 */
export function useAutoBackupStatus() {
  const [status, setStatus] = useState(getAutoBackupStatus);
  useEffect(() => subscribeAutoBackup(() => setStatus(getAutoBackupStatus())), []);
  return status;
}
