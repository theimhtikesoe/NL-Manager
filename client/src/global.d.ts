interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface ServiceWorkerRegistration {
  readonly sync: SyncManager;
}

interface SyncManager {
  register(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}

interface WindowEventMap {
  beforeinstallprompt: BeforeInstallPromptEvent;
}
