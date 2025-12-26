// Enhanced data models and interfaces for voting UX redesign

// Enhanced VotingSession interface with new phase and control fields
export interface VotingSession {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  active: boolean;
  startTime: number;
  endTime: number;
  results: Record<string, number>;
  options: string[];
  // New fields for enhanced UX
  phase: "waiting" | "voting" | "completed" | "revealed";
  adminControlled: boolean;
}

// Voter state tracking interface
export interface VoterState {
  participantId: string;
  currentCategoryId: string | null;
  hasVoted: boolean;
  selectedOption: string | null;
  viewState: "waiting" | "voting" | "voted" | "session-complete";
}

// Category result interface for winner reveal system
export interface CategoryResult {
  categoryId: string;
  title: string;
  description: string;
  results: Record<string, number>;
  winner: string | string[]; // Handle ties
  totalVotes: number;
  revealed: boolean;
  revealedAt?: number;
}

// Confirmation modal props interface
export interface ConfirmationModalProps {
  nominee: string;
  onConfirm: () => void;
  onCancel: () => void;
  isOpen: boolean;
}

// Animation state interface for layout and other animations
export interface AnimationState {
  isPlaying: boolean;
  duration: number;
  type: "fade" | "slide";
  trigger?: "winner-reveal" | "vote-submit" | "category-start";
}

// Enhanced category interface with status tracking
export interface Category {
  id: string;
  title: string;
  description: string;
  options: string[];
  status: "not-started" | "active" | "completed" | "revealed";
  results?: Record<string, number>;
  winner?: string | string[];
  totalVotes?: number;
  startedAt?: number;
  completedAt?: number;
  revealedAt?: number;
  revealed?: boolean; // For easier reveal state checking
}

// Admin control interface for category management
export interface AdminCategoryControl {
  categoryId: string;
  canStart: boolean;
  canStop: boolean;
  canReveal: boolean;
  voteCount: number;
  status: "not-started" | "active" | "completed" | "revealed";
}

// Socket event interfaces for type safety
export interface SocketEvents {
  // Client to server events
  "join-voting": (data: { participantId?: string; name?: string }) => void;
  "join-admin": () => void;
  "submit-vote": (data: { categoryId: string; option: string }) => void;
  "start-category": (data: { categoryId: string }) => void;
  "stop-category": (data: { categoryId: string }) => void;
  "reveal-winner": (data: { categoryId: string }) => void;

  // Server to client events
  "participant-info": (data: { id: string; name: string }) => void;
  "voting-session-update": (session: VotingSession) => void;
  "category-started": (session: VotingSession) => void;
  "category-stopped": (session: VotingSession) => void;
  "winner-revealed": (result: CategoryResult) => void;
  "vote-confirmed": (data: { option: string; categoryId: string }) => void;
  "participant-count": (count: number) => void;
  "admin-status": (data: {
    currentSession: VotingSession | null;
    participantCount: number;
    categories: Category[];
  }) => void;
  error: (message: string) => void;
}

// Participant waiting state messages
export interface WaitingStateMessages {
  noSession: string;
  betweenCategories: string;
  sessionComplete: string;
  votingActive: string;
  voteSubmitted: string;
}

// Admin dashboard state interface
export interface AdminDashboardState {
  categories: Category[];
  currentSession: VotingSession | null;
  participantCount: number;
  connectionStatus: "connected" | "disconnected" | "reconnecting";
  sessionPhase: "setup" | "voting" | "results" | "complete";
}

// Participant dashboard state interface
export interface ParticipantDashboardState {
  voterState: VoterState;
  currentSession: VotingSession | null;
  connectionStatus: "connected" | "disconnected" | "reconnecting";
  showConfirmation: boolean;
  selectedNominee: string | null;
}
