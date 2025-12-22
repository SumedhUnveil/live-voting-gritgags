// Participant state management utility for voting UX redesign
import { VoterState } from "../../types";

const STORAGE_KEY = "voting_participant_state";
const STORAGE_VERSION = "1.0";

export interface PersistedParticipantState {
  version: string;
  participantId: string;
  voterState: VoterState;
  votingHistory: Array<{
    categoryId: string;
    selectedOption: string;
    timestamp: number;
  }>;
  lastUpdated: number;
}

export class ParticipantStateManager {
  private state: PersistedParticipantState;
  private listeners: Array<(state: PersistedParticipantState) => void> = [];

  constructor(participantId: string) {
    this.state = this.loadState(participantId);
  }

  /**
   * Load state from localStorage or create new state
   */
  private loadState(participantId: string): PersistedParticipantState {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);

        // Check version compatibility and participant ID match
        if (
          parsed.version === STORAGE_VERSION &&
          parsed.participantId === participantId
        ) {
          return {
            ...parsed,
            voterState: {
              ...parsed.voterState,
              participantId, // Ensure participant ID is current
            },
          };
        }
      }
    } catch (error) {
      console.warn("Failed to load participant state from storage:", error);
    }

    // Return default state
    return {
      version: STORAGE_VERSION,
      participantId,
      voterState: {
        participantId,
        currentCategoryId: null,
        hasVoted: false,
        selectedOption: null,
        viewState: "waiting",
      },
      votingHistory: [],
      lastUpdated: Date.now(),
    };
  }

  /**
   * Save current state to localStorage
   */
  private saveState(): void {
    try {
      this.state.lastUpdated = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.warn("Failed to save participant state to storage:", error);
    }
  }

  /**
   * Get current voter state
   */
  getVoterState(): VoterState {
    return { ...this.state.voterState };
  }

  /**
   * Update voter state
   */
  updateVoterState(updates: Partial<VoterState>): void {
    this.state.voterState = {
      ...this.state.voterState,
      ...updates,
    };
    this.saveState();
    this.notifyListeners();
  }

  /**
   * Check if participant has already voted for a category
   */
  hasVotedForCategory(categoryId: string): boolean {
    return this.state.votingHistory.some(
      (vote) => vote.categoryId === categoryId
    );
  }

  /**
   * Get the vote for a specific category
   */
  getVoteForCategory(categoryId: string): string | null {
    const vote = this.state.votingHistory.find(
      (vote) => vote.categoryId === categoryId
    );
    return vote ? vote.selectedOption : null;
  }

  /**
   * Record a vote for a category
   */
  recordVote(categoryId: string, selectedOption: string): boolean {
    // Prevent duplicate votes for the same category
    if (this.hasVotedForCategory(categoryId)) {
      console.warn(`Already voted for category ${categoryId}`);
      return false;
    }

    // Add to voting history
    this.state.votingHistory.push({
      categoryId,
      selectedOption,
      timestamp: Date.now(),
    });

    // Update voter state
    this.updateVoterState({
      currentCategoryId: categoryId,
      hasVoted: true,
      selectedOption,
      viewState: "voted",
    });

    return true;
  }

  /**
   * Handle new voting session start
   */
  handleVotingSessionStart(categoryId: string): void {
    const hasAlreadyVoted = this.hasVotedForCategory(categoryId);

    this.updateVoterState({
      currentCategoryId: categoryId,
      hasVoted: hasAlreadyVoted,
      selectedOption: hasAlreadyVoted
        ? this.getVoteForCategory(categoryId)
        : null,
      viewState: hasAlreadyVoted ? "voted" : "voting",
    });
  }

  /**
   * Handle voting session end
   */
  handleVotingSessionEnd(): void {
    const currentState = this.getVoterState();

    this.updateVoterState({
      viewState: currentState.hasVoted ? "voted" : "waiting",
    });
  }

  /**
   * Handle session complete (all categories finished)
   */
  handleSessionComplete(): void {
    this.updateVoterState({
      viewState: "session-complete",
    });
  }

  /**
   * Reset state for new session
   */
  resetForNewSession(): void {
    this.state.votingHistory = [];
    this.updateVoterState({
      currentCategoryId: null,
      hasVoted: false,
      selectedOption: null,
      viewState: "waiting",
    });
  }

  /**
   * Validate vote attempt
   */
  validateVoteAttempt(
    categoryId: string,
    option: string
  ): {
    isValid: boolean;
    reason?: string;
  } {
    // Check if already voted for this category
    if (this.hasVotedForCategory(categoryId)) {
      return {
        isValid: false,
        reason: "Already voted for this category",
      };
    }

    // Check if current category matches
    const currentState = this.getVoterState();
    if (currentState.currentCategoryId !== categoryId) {
      return {
        isValid: false,
        reason: "Category mismatch",
      };
    }

    // Check if option is provided
    if (!option || option.trim() === "") {
      return {
        isValid: false,
        reason: "No option selected",
      };
    }

    return { isValid: true };
  }

  /**
   * Get voting history
   */
  getVotingHistory(): Array<{
    categoryId: string;
    selectedOption: string;
    timestamp: number;
  }> {
    return [...this.state.votingHistory];
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: PersistedParticipantState) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.state);
      } catch (error) {
        console.error("Error in state listener:", error);
      }
    });
  }

  /**
   * Clear all stored state (for debugging/reset)
   */
  clearState(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      this.state = this.loadState(this.state.participantId);
      this.notifyListeners();
    } catch (error) {
      console.warn("Failed to clear participant state:", error);
    }
  }

  /**
   * Get state summary for debugging
   */
  getStateSummary(): {
    participantId: string;
    currentCategory: string | null;
    hasVoted: boolean;
    viewState: string;
    totalVotes: number;
    lastUpdated: Date;
  } {
    return {
      participantId: this.state.participantId,
      currentCategory: this.state.voterState.currentCategoryId,
      hasVoted: this.state.voterState.hasVoted,
      viewState: this.state.voterState.viewState,
      totalVotes: this.state.votingHistory.length,
      lastUpdated: new Date(this.state.lastUpdated),
    };
  }
}

/**
 * Create a singleton instance for the current session
 */
let stateManagerInstance: ParticipantStateManager | null = null;

export function getParticipantStateManager(
  participantId: string
): ParticipantStateManager {
  if (
    !stateManagerInstance ||
    stateManagerInstance.getVoterState().participantId !== participantId
  ) {
    stateManagerInstance = new ParticipantStateManager(participantId);
  }
  return stateManagerInstance;
}

/**
 * Reset the singleton instance (for testing or session changes)
 */
export function resetParticipantStateManager(): void {
  stateManagerInstance = null;
}

/**
 * Debug utilities for development
 */
export const ParticipantStateDebug = {
  /**
   * Log current state to console
   */
  logState: (stateManager: ParticipantStateManager) => {
    const summary = stateManager.getStateSummary();
    console.log("Participant State Summary:", summary);
    console.log("Voting History:", stateManager.getVotingHistory());
  },

  /**
   * Clear all participant state (for testing)
   */
  clearAllState: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log("Cleared all participant state");
    } catch (error) {
      console.warn("Failed to clear participant state:", error);
    }
  },

  /**
   * Export state for debugging
   */
  exportState: (stateManager: ParticipantStateManager) => {
    return {
      summary: stateManager.getStateSummary(),
      history: stateManager.getVotingHistory(),
      voterState: stateManager.getVoterState(),
    };
  },
};

// Make debug utilities available globally in development
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  (window as any).ParticipantStateDebug = ParticipantStateDebug;
}
