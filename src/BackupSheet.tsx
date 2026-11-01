import { type ChangeEvent, useState } from 'react';
import { type Backup, exportBackup, readBackup, restoreBackup } from './backup';

interface BackupSheetProps {
  // The id of the app in the backup file.
  app: string;
  // True for the storage keys that the backup holds.
  isKey: (key: string) => boolean;
  onClose: () => void;
}

// A sheet that exports all data of the app to a backup file, or replaces all
// data with the data of a backup file. The replace needs a second tap, and
// then the app loads again with the new data.
export function BackupSheet({ app, isKey, onClose }: BackupSheetProps) {
  const [backup, setBackup] = useState<Backup | null>(null);
  const [error, setError] = useState('');

  const importFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Clear the input so that the same file can be selected again.
    e.target.value = '';
    if (!file) return;
    try {
      setBackup(readBackup(await file.text(), app));
      setError('');
    } catch (err) {
      setBackup(null);
      setError(err instanceof Error ? err.message : 'The file is not a backup file.');
    }
  };

  const replace = () => {
    if (!backup) return;
    restoreBackup(backup, isKey);
    location.reload();
  };

  return (
    <div className="backdrop" onClick={onClose}>
      <form
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onClose();
        }}
      >
        <h2>Backup</h2>
        <p className="backup-hint">Export all data to a file. Import the file on the new phone.</p>
        <div className="backup-buttons">
          <button type="button" onClick={() => void exportBackup(app, isKey)}>
            Export
          </button>
          <label className="backup-file">
            Import
            <input type="file" accept="application/json,.json" hidden onChange={importFile} />
          </label>
        </div>
        {error && <p className="backup-error">{error}</p>}
        {backup && (
          <>
            <p className="backup-hint">
              Backup of {new Date(backup.exported).toLocaleString()}. The import replaces all data on this
              phone.
            </p>
            <button type="button" className="backup-replace" onClick={replace}>
              Tap to replace all data
            </button>
          </>
        )}
        <div className="buttons">
          <button type="submit" className="primary">
            Close
          </button>
        </div>
      </form>
    </div>
  );
}
