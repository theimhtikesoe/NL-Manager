/**
 * PWA Utilities
 * Handles offline support, caching, and background sync
 */

/**
 * Check if the app is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Listen for online/offline events
 */
export function onOnlineStatusChange(callback: (isOnline: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  // Return unsubscribe function
  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}

/**
 * Request background sync permission
 */
export async function requestBackgroundSync(tag: string): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("SyncManager" in window)) {
    return false;
  }

  try {
    const registration = (await navigator.serviceWorker.ready) as any;
    if (registration.sync) {
      await registration.sync.register(tag);
      return true;
    }
  } catch (error) {
    console.error("Background sync registration failed:", error);
  }

  return false;
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    try {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    } catch (error) {
      console.error("Notification permission request failed:", error);
    }
  }

  return false;
}

/**
 * Send a notification
 */
export async function sendNotification(title: string, options?: NotificationOptions): Promise<void> {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration.showNotification) {
        await registration.showNotification(title, {
          icon: "/icon-192.png",
          badge: "/icon-96.png",
          ...options,
        });
      }
    } catch (error) {
      console.error("Failed to send notification:", error);
    }
  }
}

/**
 * IndexedDB utilities for offline data storage
 */
export interface OfflineData {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  synced: boolean;
}

let db: IDBDatabase | null = null;

/**
 * Initialize IndexedDB
 */
export async function initIndexedDB(): Promise<IDBDatabase> {
  if (db) {
    return db;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open("nl-manager-db", 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Create object stores
      if (!database.objectStoreNames.contains("offline-data")) {
        database.createObjectStore("offline-data", { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains("pending-activities")) {
        database.createObjectStore("pending-activities", { keyPath: "id" });
      }
    };
  });
}

/**
 * Save data to IndexedDB
 */
export async function saveOfflineData(data: OfflineData): Promise<void> {
  const database = await initIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(["offline-data"], "readwrite");
    const store = transaction.objectStore("offline-data");
    const request = store.put(data);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get data from IndexedDB
 */
export async function getOfflineData(id: string): Promise<OfflineData | undefined> {
  const database = await initIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(["offline-data"], "readonly");
    const store = transaction.objectStore("offline-data");
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Get all offline data
 */
export async function getAllOfflineData(): Promise<OfflineData[]> {
  const database = await initIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(["offline-data"], "readonly");
    const store = transaction.objectStore("offline-data");
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Delete offline data
 */
export async function deleteOfflineData(id: string): Promise<void> {
  const database = await initIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(["offline-data"], "readwrite");
    const store = transaction.objectStore("offline-data");
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Check for PWA install prompt
 */
export function onPWAInstallPrompt(callback: (event: BeforeInstallPromptEvent) => void): () => void {
  const handleBeforeInstallPrompt = (event: Event) => {
    event.preventDefault();
    callback(event as BeforeInstallPromptEvent);
  };

  window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

  return () => {
    window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  };
}

/**
 * Trigger PWA install
 */
export async function triggerPWAInstall(event: BeforeInstallPromptEvent): Promise<boolean> {
  try {
    event.prompt();
    const { outcome } = await event.userChoice;
    return outcome === "accepted";
  } catch (error) {
    console.error("PWA install failed:", error);
    return false;
  }
}

/**
 * Check if app is installed as PWA
 */
export function isPWAInstalled(): boolean {
  // Check if running as standalone PWA
  if (window.matchMedia("(display-mode: standalone)").matches) {
    return true;
  }

  // Check if running in fullscreen mode
  if (document.fullscreenElement) {
    return true;
  }

  // Check if running as iOS web app
  if ((navigator as any).standalone === true) {
    return true;
  }

  return false;
}
