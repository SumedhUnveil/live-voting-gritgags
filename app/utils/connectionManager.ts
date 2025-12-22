// Connection management utility for error handling and recovery
import { Socket } from "socket.io-client";

export type ConnectionStatus =
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "error";

export interface ConnectionState {
  status: ConnectionStatus;
  lastConnected: number | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  isOnline: boolean;
  latency: number | null;
}

export interface QueuedVote {
  categoryId: string;
  option: string;
  timestamp: number;
  retryCount: number;
}

export interface SystemIssue {
  id: string;
  type: "connection" | "vote_failure" | "sync_error" | "timeout";
  message: string;
  timestamp: number;
  severity: "low" | "medium" | "high" | "critical";
  resolved: boolean;
}

export class ConnectionManager {
  private socket: Socket | null = null;
  private connectionState: ConnectionState;
  private voteQueue: QueuedVote[] = [];
  private systemIssues: SystemIssue[] = [];
  private listeners: Array<(state: ConnectionState) => void> = [];
  private issueListeners: Array<(issues: SystemIssue[]) => void> = [];
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private latencyCheckInterval: NodeJS.Timeout | null = null;

  constructor(
    private maxReconnectAttempts: number = 10,
    private baseReconnectDelay: number = 2000,
    private maxReconnectDelay: number = 10000
  ) {
    this.connectionState = {
      status: "disconnected",
      lastConnected: null,
      reconnectAttempts: 0,
      maxReconnectAttempts: this.maxReconnectAttempts,
      reconnectDelay: this.baseReconnectDelay,
      isOnline: navigator.onLine,
      latency: null,
    };

    // Listen for online/offline events
    window.addEventListener("online", () =>
      this.handleOnlineStatusChange(true)
    );
    window.addEventListener("offline", () =>
      this.handleOnlineStatusChange(false)
    );
  }

  public setSocket(socket: Socket): void {
    this.socket = socket;
    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      this.updateConnectionState({
        status: "connected",
        lastConnected: Date.now(),
        reconnectAttempts: 0,
        isOnline: navigator.onLine,
      });
      this.startHeartbeat();
      this.startLatencyCheck();
      this.retryQueuedVotes();
    });

    this.socket.on("disconnect", (reason: string) => {
      this.updateConnectionState({
        status: "disconnected",
        isOnline: navigator.onLine,
      });
      this.stopHeartbeat();
      this.stopLatencyCheck();

      // Only attempt reconnection if it wasn't a manual disconnect
      if (reason !== "io client disconnect") {
        this.scheduleReconnection();
      }
    });

    this.socket.on("connect_error", (error: Error) => {
      this.updateConnectionState({
        status: "error",
        isOnline: navigator.onLine,
      });
      this.addSystemIssue({
        type: "connection",
        message: `Connection error: ${error.message}`,
        severity: "medium",
      });
    });

    this.socket.on("reconnect", (attemptNumber: number) => {
      this.updateConnectionState({
        status: "connected",
        reconnectAttempts: attemptNumber,
        lastConnected: Date.now(),
        isOnline: navigator.onLine,
      });
      this.retryQueuedVotes();
    });

    this.socket.on("reconnect_error", (error: Error) => {
      this.updateConnectionState({
        status: "reconnecting",
        isOnline: navigator.onLine,
      });
      this.addSystemIssue({
        type: "connection",
        message: `Reconnection error: ${error.message}`,
        severity: "low",
      });
    });

    this.socket.on("reconnect_failed", () => {
      this.updateConnectionState({
        status: "error",
        isOnline: navigator.onLine,
      });
      this.addSystemIssue({
        type: "connection",
        message: "Reconnection failed after all attempts",
        severity: "high",
      });
    });
  }

  private updateConnectionState(updates: Partial<ConnectionState>): void {
    this.connectionState = { ...this.connectionState, ...updates };
    this.notifyListeners();
  }

  private handleOnlineStatusChange(isOnline: boolean): void {
    this.updateConnectionState({ isOnline });

    if (isOnline && this.socket && !this.socket.connected) {
      // Network came back online, let Socket.IO handle reconnection
      this.addSystemIssue({
        type: "connection",
        message: "Network connection restored",
        severity: "low",
      });
    }
  }

  private scheduleReconnection(): void {
    if (this.connectionState.reconnectAttempts >= this.maxReconnectAttempts) {
      this.addSystemIssue({
        type: "connection",
        message: "Max reconnection attempts reached",
        severity: "critical",
      });
      return;
    }

    const delay = Math.min(
      this.baseReconnectDelay *
        Math.pow(2, this.connectionState.reconnectAttempts),
      this.maxReconnectDelay
    );

    this.updateConnectionState({
      status: "reconnecting",
      reconnectAttempts: this.connectionState.reconnectAttempts + 1,
      reconnectDelay: delay,
    });

    this.reconnectTimeout = setTimeout(() => {
      if (this.socket && !this.socket.connected) {
        this.socket.connect();
      }
    }, delay);
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit("ping");
      }
    }, 30000); // 30 second heartbeat
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private startLatencyCheck(): void {
    if (this.latencyCheckInterval) return;

    this.latencyCheckInterval = setInterval(() => {
      if (this.socket?.connected) {
        const start = Date.now();
        this.socket.emit("ping", () => {
          const latency = Date.now() - start;
          this.updateConnectionState({ latency });
        });
      }
    }, 10000); // 10 second latency check
  }

  private stopLatencyCheck(): void {
    if (this.latencyCheckInterval) {
      clearInterval(this.latencyCheckInterval);
      this.latencyCheckInterval = null;
    }
  }

  public queueVote(vote: Omit<QueuedVote, "retryCount">): void {
    this.voteQueue.push({ ...vote, retryCount: 0 });
  }

  private retryQueuedVotes(): void {
    if (!this.socket?.connected || this.voteQueue.length === 0) return;

    const votesToRetry = [...this.voteQueue];
    this.voteQueue = [];

    votesToRetry.forEach((vote) => {
      if (vote.retryCount < 3) {
        // Re-queue with incremented retry count
        this.voteQueue.push({ ...vote, retryCount: vote.retryCount + 1 });
      } else {
        // Max retries reached, log as system issue
        this.addSystemIssue({
          type: "vote_failure",
          message: `Failed to submit vote for ${vote.categoryId} after 3 attempts`,
          severity: "medium",
        });
      }
    });
  }

  private addSystemIssue(
    issue: Omit<SystemIssue, "id" | "timestamp" | "resolved">
  ): void {
    const newIssue: SystemIssue = {
      ...issue,
      id: `issue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      resolved: false,
    };

    this.systemIssues.push(newIssue);
    this.notifyIssueListeners();
  }

  public resolveSystemIssue(issueId: string): void {
    const issue = this.systemIssues.find((i) => i.id === issueId);
    if (issue) {
      issue.resolved = true;
      this.notifyIssueListeners();
    }
  }

  public getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  public getSystemIssues(): SystemIssue[] {
    return this.systemIssues.filter((issue) => !issue.resolved);
  }

  public addConnectionListener(
    listener: (state: ConnectionState) => void
  ): void {
    this.listeners.push(listener);
  }

  public removeConnectionListener(
    listener: (state: ConnectionState) => void
  ): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  public addIssueListener(listener: (issues: SystemIssue[]) => void): void {
    this.issueListeners.push(listener);
  }

  public removeIssueListener(listener: (issues: SystemIssue[]) => void): void {
    const index = this.issueListeners.indexOf(listener);
    if (index > -1) {
      this.issueListeners.splice(index, 1);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.connectionState));
  }

  private notifyIssueListeners(): void {
    const activeIssues = this.getSystemIssues();
    this.issueListeners.forEach((listener) => listener(activeIssues));
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
    this.cleanup();
  }

  public cleanup(): void {
    this.stopHeartbeat();
    this.stopLatencyCheck();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.updateConnectionState({
      status: "disconnected",
      lastConnected: null,
      reconnectAttempts: 0,
      latency: null,
    });
  }

  public destroy(): void {
    this.cleanup();
    this.listeners = [];
    this.issueListeners = [];
    this.voteQueue = [];
    this.systemIssues = [];
    this.socket = null;
  }
}
