/**
 * Simple offline sync queue using LocalStorage
 */

interface SyncItem {
    id: string;
    url: string;
    method: string;
    body: any;
    timestamp: number;
}

const QUEUE_KEY = 'offline-sync-queue';

export const offlineSync = {
    addToQueue: (url: string, method: string, body: any) => {
        if (typeof window === 'undefined') return;

        const queue: SyncItem[] = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
        const item: SyncItem = {
            id: crypto.randomUUID(),
            url,
            method,
            body,
            timestamp: Date.now()
        };

        queue.push(item);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

        // register sync listener if not already
        window.addEventListener('online', offlineSync.processQueue);
    },

    processQueue: async () => {
        if (typeof window === 'undefined' || !navigator.onLine) return;

        const queue: SyncItem[] = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
        if (queue.length === 0) return;

        const remainingQueue: SyncItem[] = [];

        for (const item of queue) {
            try {
                // If it's a FormData-like body but stored in JSON, it might need reconstruction.
                // For valid JSON bodies:
                let body = item.body;
                let headers: HeadersInit = { 'Content-Type': 'application/json' };

                // Determine if we can send it (this is a simplified logic)
                // For files, storing in localStorage is hard. IndexedDB is better.
                // For now we assume JSON data.

                const res = await fetch(item.url, {
                    method: item.method,
                    headers,
                    body: JSON.stringify(body)
                });

                if (!res.ok) throw new Error('Failed to sync');

            } catch (e) {
                console.error(`Failed to sync item ${item.id}`, e);
                remainingQueue.push(item); // Keep in queue
            }
        }

        localStorage.setItem(QUEUE_KEY, JSON.stringify(remainingQueue));
    }
};
