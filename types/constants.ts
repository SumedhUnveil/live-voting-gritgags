// Constants for voting UX redesign

import { WaitingStateMessages } from "./voting";

// Waiting state messages for participants
export const WAITING_MESSAGES: WaitingStateMessages = {
  noSession: "Waiting for admin to start voting session",
  betweenCategories: "Wait for the admin to begin the next category",
  sessionComplete:
    "All voting has been completed. Thank you for participating!",
  votingActive: "Cast your vote below",
  voteSubmitted: "Vote submitted! Waiting for other participants...",
};

// Enhanced waiting state messages
export const ENHANCED_WAITING_MESSAGES = {
  noSessionSubtitle: "The admin will start the voting session shortly",
  betweenCategoriesSubtitle:
    "The admin will start the next category when ready",
  sessionCompleteSubtitle: "Thank you for participating in the voting session",
  waitingForResultsTitle: "Waiting for Results",
  waitingForResultsMessage:
    "All votes have been cast. Waiting for admin to reveal winners.",
  waitingForResultsSubtitle: "Results will be announced shortly",
  connectionActive: "Live updates active",
  reconnecting: "Attempting to reconnect...",
} as const;

// Animation durations (in milliseconds)
export const ANIMATION_DURATIONS = {
  confetti: 5000,
  fadeIn: 300,
  fadeOut: 200,
  slideIn: 400,
  slideOut: 300,
} as const;

// Confetti animation settings
export const CONFETTI_CONFIG = {
  particleCount: 100,
  spread: 70,
  origin: { y: 0.6 },
  colors: ["#7ebd41", "#4c4c4c", "#FFD700", "#FF6B6B", "#4ECDC4"],
  duration: 5000,
} as const;

// Socket event names for type safety
export const SOCKET_EVENTS = {
  // Client to server
  JOIN_VOTING: "join-voting",
  JOIN_ADMIN: "join-admin",
  SUBMIT_VOTE: "submit-vote",
  START_CATEGORY: "start-category",
  STOP_CATEGORY: "stop-category",
  REVEAL_WINNER: "reveal-winner",

  // Server to client
  PARTICIPANT_INFO: "participant-info",
  VOTING_SESSION_UPDATE: "voting-session-update",
  CATEGORY_STARTED: "category-started",
  CATEGORY_STOPPED: "category-stopped",
  WINNER_REVEALED: "winner-revealed",
  VOTE_CONFIRMED: "vote-confirmed",
  PARTICIPANT_COUNT: "participant-count",
  ADMIN_STATUS: "admin-status",
  ERROR: "error",

  // Legacy events (for backward compatibility)
  VOTING_STATUS: "voting-status",
  VOTING_STARTED: "voting-started",
  VOTING_RESULTS: "voting-results",
  VOTING_ENDED: "voting-ended",
  VOTE_RECEIVED: "vote-received",
} as const;

// Category status constants
export const CATEGORY_STATUS = {
  NOT_STARTED: "not-started",
  ACTIVE: "active",
  COMPLETED: "completed",
  REVEALED: "revealed",
} as const;

// Voting session phases
export const SESSION_PHASES = {
  WAITING: "waiting",
  VOTING: "voting",
  COMPLETED: "completed",
  REVEALED: "revealed",
} as const;

// Participant view states
export const VIEW_STATES = {
  WAITING: "waiting",
  VOTING: "voting",
  VOTED: "voted",
  SESSION_COMPLETE: "session-complete",
} as const;

// Connection status constants
export const CONNECTION_STATUS = {
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  RECONNECTING: "reconnecting",
} as const;

// Admin session phases
export const ADMIN_PHASES = {
  SETUP: "setup",
  VOTING: "voting",
  RESULTS: "results",
  COMPLETE: "complete",
} as const;

// Default voting session duration (in seconds)
export const DEFAULT_VOTING_DURATION = 30;

// Maximum number of reconnection attempts
export const MAX_RECONNECTION_ATTEMPTS = 5;

// Reconnection delay (in milliseconds)
export const RECONNECTION_DELAY = 1000;

// Search debounce delay (in milliseconds)
export const SEARCH_DEBOUNCE_DELAY = 300;

// Maximum number of results to show in charts
export const MAX_CHART_RESULTS = 10;

// Minimum vote count to show percentages
export const MIN_VOTES_FOR_PERCENTAGES = 1;
