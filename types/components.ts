// Component prop interfaces and utility types

import { AnimationState, VotingSession, VoterState, Category } from "./voting";

// Confirmation Modal Component Props
export interface ConfirmationModalProps {
  isOpen: boolean;
  nominee: string;
  categoryTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}



// Voting Interface Component Props
export interface VotingInterfaceProps {
  session: VotingSession;
  voterState: VoterState;
  onVoteSelect: (nominee: string) => void;
  onVoteConfirm: () => void;
  onVoteCancel: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

// Waiting State Component Props
export interface WaitingStateProps {
  state:
  | "no-session"
  | "between-categories"
  | "session-complete"
  | "waiting-for-results"
  | "voted";
  participantCount?: number;
  nextCategoryTitle?: string;
  connectionStatus?: "connected" | "disconnected" | "reconnecting";
  isReconnecting?: boolean;
}

// Category Controller Component Props (Admin)
export interface CategoryControllerProps {
  category: Category;
  isActive: boolean;
  voteCount: number;
  onStart: (categoryId: string) => void;
  onStop: (categoryId: string) => void;
  onReveal: (categoryId: string) => void;
}

// Results Reveal Component Props (Admin)
export interface ResultsRevealProps {
  categories: Array<{
    id: string;
    title: string;
    description: string;
    results?: Record<string, number>;
    completed: boolean;
    revealed?: boolean;
  }>;
  onRevealWinner: (categoryId: string) => void;
}

// Connection Status Component Props
export interface ConnectionStatusProps {
  status: "connected" | "disconnected" | "reconnecting";
  attemptCount?: number;
  onReconnect?: () => void;
}

// Vote Status Display Component Props
export interface VoteStatusProps {
  hasVoted: boolean;
  selectedOption: string | null;
  categoryTitle: string;
  waitingMessage: string;
}

// Admin Dashboard Stats Props
export interface AdminStatsProps {
  participantCount: number;
  totalCategories: number;
  completedCategories: number;
  currentTimeLeft?: number;
}

// Search Input Component Props
export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

// Nominee Option Component Props
export interface NomineeOptionProps {
  nominee: string;
  isSelected: boolean;
  isDisabled: boolean;
  onClick: (nominee: string) => void;
}

// Timer Display Component Props
export interface TimerDisplayProps {
  timeLeft: number;
  isActive: boolean;
  format?: "mm:ss" | "seconds";
}

// Results Chart Component Props
export interface ResultsChartProps {
  results: Record<string, number>;
  showPercentages?: boolean;
  showVoteCounts?: boolean;
  maxDisplayItems?: number;
  highlightWinner?: boolean;
}

// Session Status Indicator Props
export interface SessionStatusProps {
  phase: "waiting" | "voting" | "completed" | "revealed";
  categoryTitle?: string;
  timeLeft?: number;
}

// Error Boundary Props
export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

// Modal Overlay Props
export interface ModalOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
}

// Animation Wrapper Props
export interface AnimationWrapperProps {
  children: React.ReactNode;
  animationState: AnimationState;
  className?: string;
}

// Utility types for component state management
export type LoadingState = "idle" | "loading" | "success" | "error";

export type ComponentSize = "small" | "medium" | "large";

export type ComponentVariant =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "error";

// Form validation types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Event handler types
export type VoteHandler = (nominee: string) => void;
export type CategoryHandler = (categoryId: string) => void;
export type SearchHandler = (query: string) => void;
export type AnimationHandler = () => void;
