import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('healthsync.db');

export function initDb() {
  try {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS vitals_daily (
        date TEXT PRIMARY KEY NOT NULL,
        data TEXT NOT NULL
      );
    `);
    db.execSync(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payload TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        createdAt TEXT NOT NULL
      );
    `);
    console.log('[db] Database initialized successfully');
  } catch (e) {
    console.error('[db] Failed to init DB', e);
  }
}

// Auto-initialize on module load
initDb();

export function saveDaily(data: { date: string; payload: any }[]) {
  // Use async transaction to avoid blocking UI
  db.withTransactionAsync(async () => {
    for (const row of data) {
      await db.runAsync(
        `INSERT OR REPLACE INTO vitals_daily (date, data) VALUES (?, ?);`,
        [row.date, JSON.stringify(row.payload)],
      );
    }
  }).catch(e => console.error('Failed to save daily vitals', e));
}

export async function readAllDaily(): Promise<{ date: string; payload: any }[]> {
  const rows = await db.getAllAsync<{ date: string; data: string }>(
    `SELECT date, data FROM vitals_daily ORDER BY date ASC;`
  );
  return rows.map(row => ({
    date: row.date,
    payload: JSON.parse(row.data),
  }));
}

export function enqueueSync(payload: any) {
  db.runAsync(
    `INSERT INTO sync_queue (payload, status, createdAt) VALUES (?, ?, ?);`,
    [JSON.stringify(payload), 'pending', new Date().toISOString()]
  ).catch(e => console.error('Failed to enqueue sync', e));
}

export async function readPendingQueue(): Promise<{ id: number; payload: any }[]> {
  const rows = await db.getAllAsync<{ id: number; payload: string }>(
    `SELECT id, payload FROM sync_queue WHERE status = 'pending' ORDER BY createdAt ASC;`
  );
  return rows.map(row => ({
    id: row.id,
    payload: JSON.parse(row.payload),
  }));
}

export async function markSynced(ids: number[]) {
  if (!ids.length) return;
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(
    `DELETE FROM sync_queue WHERE id IN (${placeholders});`,
    ids
  );
}
