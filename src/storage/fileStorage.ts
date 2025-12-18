import * as FileSystem from 'expo-file-system/legacy';

const SYNC_DATA_FILE = `${(FileSystem as any).documentDirectory || ''}synced_data_dump.json`;

export async function dumpToLocalFile(payload: any) {
    try {
        let currentData: any[] = [];

        // Check if file exists
        const fileInfo = await FileSystem.getInfoAsync(SYNC_DATA_FILE);
        if (fileInfo.exists) {
            const content = await FileSystem.readAsStringAsync(SYNC_DATA_FILE);
            try {
                currentData = JSON.parse(content);
                if (!Array.isArray(currentData)) {
                    currentData = [];
                }
            } catch (e) {
                currentData = [];
            }
        }

        // Add new payload with timestamp
        currentData.push({
            ...payload,
            _dumpedAt: new Date().toISOString(),
        });

        // Write back
        await FileSystem.writeAsStringAsync(
            SYNC_DATA_FILE,
            JSON.stringify(currentData, null, 2)
        );

        console.log(`[file-storage] Data dumped to: ${SYNC_DATA_FILE}`);
        return true;
    } catch (err) {
        console.error('[file-storage] Failed to dump data', err);
        return false;
    }
}

export async function getSyncDataFilePath() {
    return SYNC_DATA_FILE;
}

export async function readSyncDataDump() {
    try {
        const fileInfo = await FileSystem.getInfoAsync(SYNC_DATA_FILE);
        if (!fileInfo.exists) return [];
        const content = await FileSystem.readAsStringAsync(SYNC_DATA_FILE);
        return JSON.parse(content);
    } catch (err) {
        return [];
    }
}
