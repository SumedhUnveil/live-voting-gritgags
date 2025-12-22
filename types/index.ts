// Main types export file for voting UX redesign

// Core voting types
export type {
  VotingSession,
  VoterState,
  CategoryResult,
  Category,
  AdminCategoryControl,
  SocketEvents,
  WaitingStateMessages,
  AdminDashboardState,
  ParticipantDashboardState,
  AnimationState,
} from "./voting";

// Component prop types
export type {
  ConfirmationModalProps,
  ConfettiAnimationProps,
  VotingInterfaceProps,
  WaitingStateProps,
  CategoryControllerProps,
  ResultsRevealProps,
  ConnectionStatusProps,
  VoteStatusProps,
  AdminStatsProps,
  SearchInputProps,
  NomineeOptionProps,
  TimerDisplayProps,
  ResultsChartProps,
  SessionStatusProps,
  ErrorBoundaryProps,
  ModalOverlayProps,
  AnimationWrapperProps,
  LoadingState,
  ComponentSize,
  ComponentVariant,
  ValidationResult,
  VoteHandler,
  CategoryHandler,
  SearchHandler,
  AnimationHandler,
} from "./components";

// Constants
export {
  WAITING_MESSAGES,
  ANIMATION_DURATIONS,
  CONFETTI_CONFIG,
  SOCKET_EVENTS,
  CATEGORY_STATUS,
  SESSION_PHASES,
  VIEW_STATES,
  CONNECTION_STATUS,
  ADMIN_PHASES,
  DEFAULT_VOTING_DURATION,
  MAX_RECONNECTION_ATTEMPTS,
  RECONNECTION_DELAY,
  SEARCH_DEBOUNCE_DELAY,
  MAX_CHART_RESULTS,
  MIN_VOTES_FOR_PERCENTAGES,
} from "./constants";

// Utility functions and type guards
export {
  isVotingSession,
  isVoterState,
  isCategory,
  isCategoryResult,
  calculateWinner,
  calculatePercentage,
  getTotalVotes,
  getTopResults,
  canStartVoting,
  canStopVoting,
  canRevealWinner,
  isVotingActive,
  isSessionComplete,
  isWinnerRevealed,
  canParticipantVote,
  shouldShowConfirmation,
  getWaitingMessage,
  formatTime,
  formatDuration,
  validateVote,
  validateCategoryId,
  filterNominees,
  highlightSearchMatch,
} from "./utils";

// Re-export commonly used types for convenience
export type { VotingSession as Session } from "./voting";
export type { VoterState as ParticipantState } from "./voting";
export type { Category as VotingCategory } from "./voting";
