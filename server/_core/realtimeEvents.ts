/**
 * Real-time Events Module
 * Manages WebSocket connections and event broadcasting for live updates
 */

import { EventEmitter } from "events";

export type EventType =
  | "factory:mode-changed"
  | "worker:activity-started"
  | "worker:activity-ended"
  | "worker:overtime-alert"
  | "machine:status-changed"
  | "machine:check-overdue"
  | "alert:new"
  | "alert:resolved";

export interface RealtimeEvent {
  type: EventType;
  timestamp: Date;
  data: Record<string, any>;
}

class RealtimeEventEmitter extends EventEmitter {
  private static instance: RealtimeEventEmitter;

  private constructor() {
    super();
    this.setMaxListeners(100); // Allow multiple listeners
  }

  static getInstance(): RealtimeEventEmitter {
    if (!RealtimeEventEmitter.instance) {
      RealtimeEventEmitter.instance = new RealtimeEventEmitter();
    }
    return RealtimeEventEmitter.instance;
  }

  /**
   * Emit a real-time event
   */
  emitEvent(event: RealtimeEvent): void {
    this.emit(event.type, event);
    // Also emit a generic "event" for all listeners
    this.emit("event", event);
  }

  /**
   * Subscribe to specific event type
   */
  onEvent(
    type: EventType,
    callback: (event: RealtimeEvent) => void
  ): () => void {
    this.on(type, callback);
    // Return unsubscribe function
    return () => this.off(type, callback);
  }

  /**
   * Subscribe to all events
   */
  onAnyEvent(callback: (event: RealtimeEvent) => void): () => void {
    this.on("event", callback);
    return () => this.off("event", callback);
  }
}

export const realtimeEvents = RealtimeEventEmitter.getInstance();

/**
 * Helper functions to emit common events
 */

export function emitFactoryModeChanged(mode: "POWER_ON" | "POWER_OFF") {
  realtimeEvents.emitEvent({
    type: "factory:mode-changed",
    timestamp: new Date(),
    data: { mode },
  });
}

export function emitWorkerActivityStarted(
  workerId: number,
  activityType: string
) {
  realtimeEvents.emitEvent({
    type: "worker:activity-started",
    timestamp: new Date(),
    data: { workerId, activityType },
  });
}

export function emitWorkerActivityEnded(
  workerId: number,
  activityType: string,
  durationMinutes: number,
  complianceStatus: string
) {
  realtimeEvents.emitEvent({
    type: "worker:activity-ended",
    timestamp: new Date(),
    data: { workerId, activityType, durationMinutes, complianceStatus },
  });
}

export function emitWorkerOvertimeAlert(
  workerId: number,
  activityType: string,
  durationMinutes: number,
  maxAllowed: number
) {
  realtimeEvents.emitEvent({
    type: "worker:overtime-alert",
    timestamp: new Date(),
    data: { workerId, activityType, durationMinutes, maxAllowed },
  });
}

export function emitMachineStatusChanged(
  machineCode: string,
  status: string
) {
  realtimeEvents.emitEvent({
    type: "machine:status-changed",
    timestamp: new Date(),
    data: { machineCode, status },
  });
}

export function emitMachineCheckOverdue(
  machineCode: string,
  lastCheckTime: Date
) {
  realtimeEvents.emitEvent({
    type: "machine:check-overdue",
    timestamp: new Date(),
    data: { machineCode, lastCheckTime },
  });
}

export function emitNewAlert(
  alertType: string,
  severity: "info" | "warning" | "critical",
  message: string,
  data?: Record<string, any>
) {
  realtimeEvents.emitEvent({
    type: "alert:new",
    timestamp: new Date(),
    data: { alertType, severity, message, ...data },
  });
}

export function emitAlertResolved(alertId: number) {
  realtimeEvents.emitEvent({
    type: "alert:resolved",
    timestamp: new Date(),
    data: { alertId },
  });
}
