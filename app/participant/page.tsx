"use client";

import { useState, useEffect, useCallback } from "react";
import { Vote, Clock, CheckCircle, Users } from "lucide-react";
import { io, Socket } from "socket.io-client";
import Image from "next/image";
import { VotingSession, VoterState } from "../../types";
import ConfirmationModal from "../components/ConfirmationModal";
import WaitingState from "../components/WaitingState";
import {
  getParticipantStateManager,
  ParticipantStateManager,
} from "../utils/participantStateManager";
import { getServerUrl } from "../utils/getServerUrl";
import { getDeviceId } from "../utils/deviceId";

// Utility function to safely log objects
const safeLog = (message: string, data?: any) => {
  try {
    if (data !== undefined) {
      console.log(
        message,
        typeof data === "object" ? JSON.stringify(data, null, 2) : data
      );
    } else {
      console.log(message);
    }
  } catch (error) {
    console.log(message, "[Unable to serialize data]");
  }
};

// Legacy interface for backward compatibility during transition
interface LegacyVotingSession {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  active: boolean;
  startTime: number;
  endTime: number;
  results: Record<string, number>;
  options: string[];
}

// Global socket instance to prevent multiple connections
let globalSocket: Socket | null = null;

export default function ParticipantPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [participantId, setParticipantId] = useState<string>("");
  const [participantName, setParticipantName] = useState<string>("");
  const [votingSession, setVotingSession] =
    useState<LegacyVotingSession | null>(null);
  const [stateManager, setStateManager] =
    useState<ParticipantStateManager | null>(null);
  const [voterState, setVoterState] = useState<VoterState>({
    participantId: "",
    currentCategoryId: null,
    hasVoted: false,
    selectedOption: null,
    viewState: "waiting",
  });
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [participantCount, setParticipantCount] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionAttempts, setConnectionAttempts] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [pendingVote, setPendingVote] = useState<string>("");
  const [voteValidationError, setVoteValidationError] = useState<string>("");
  const [sessionComplete, setSessionComplete] = useState<boolean>(false);
  const [nextCategoryTitle, setNextCategoryTitle] = useState<string>("");
  const [deviceId, setDeviceId] = useState<string>("");

  const createSocketConnection = useCallback(() => {
    const serverUrl = getServerUrl();
    safeLog("Connecting to server:", serverUrl);

    const newSocket = io(serverUrl, {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 30000,
      forceNew: false,
      autoConnect: true,
      transports: ["websocket", "polling"],
      upgrade: true,
      rememberUpgrade: true,
    });

    // Connection events
    newSocket.on("connect", () => {
      safeLog("Connected to server");
      setIsConnected(true);
      setConnectionAttempts(0);

      // Add a small delay to ensure connection is stable before joining rooms
      setTimeout(() => {
        if (newSocket.connected) {
          // Join voting room
          newSocket.emit("join-voting", { participantId });

          // Request current voting status to sync state
          newSocket.emit("request-voting-status");

          // Also request admin status to get current session info
          newSocket.emit("request-admin-status");

          // Request participant count update
          newSocket.emit("request-participant-count");
        }
      }, 100);
    });

    newSocket.on("disconnect", (reason) => {
      safeLog("Disconnected:", reason);
      setIsConnected(false);

      // Don't manually reconnect - let Socket.IO handle it
      // Only log the reason for debugging
      if (reason === "io server disconnect") {
        safeLog("Server disconnected us - Socket.IO will handle reconnection");
      } else if (reason === "io client disconnect") {
        safeLog("Client manually disconnected");
      } else {
        safeLog("Disconnected due to:", reason);
      }
    });

    newSocket.on("connect_error", (error) => {
      safeLog("Connection error:", error);
      setIsConnected(false);
      setConnectionAttempts((prev) => prev + 1);
    });

    newSocket.on("reconnect", (attemptNumber) => {
      safeLog("Reconnected after", attemptNumber + " attempts");
      setIsConnected(true);
      setConnectionAttempts(0);

      // Add a small delay to ensure reconnection is stable
      setTimeout(() => {
        if (newSocket.connected) {
          // Rejoin voting room after reconnection
          newSocket.emit("join-voting", { participantId });

          // Request current voting status to sync state
          newSocket.emit("request-voting-status");

          // Also request admin status to get current session info
          newSocket.emit("request-admin-status");

          // Request participant count update
          newSocket.emit("request-participant-count");
        }
      }, 200);
    });

    newSocket.on("reconnect_error", (error) => {
      safeLog("Reconnection error:", error);
      setIsConnected(false);
    });

    newSocket.on("reconnect_failed", () => {
      safeLog("Reconnection failed after all attempts");
      setIsConnected(false);
    });

    // Listen for voting events
    newSocket.on("participant-info", (data) => {
      setParticipantName(data.name);
    });

    newSocket.on("voting-status", (session) => {
      safeLog("Received voting-status:", session);
      setVotingSession(session);
      if (session && session.active && stateManager) {
        setTimeLeft(
          Math.max(0, Math.floor((session.endTime - Date.now()) / 1000))
        );
        stateManager.handleVotingSessionStart(session.categoryId);
      } else if (session && stateManager) {
        stateManager.handleVotingSessionEnd();
      }
    });

    newSocket.on("voting-started", (session) => {
      safeLog("Received voting-started:", session);
      setVotingSession(session);

      // Calculate time left based on session end time
      if (session.endTime) {
        const calculatedTimeLeft = Math.max(
          0,
          Math.floor((session.endTime - Date.now()) / 1000)
        );
        setTimeLeft(calculatedTimeLeft);
      } else {
        setTimeLeft(30); // Fallback to 30 seconds
      }

      setSearchQuery(""); // Clear search when new voting starts
      setShowConfirmation(false);
      setPendingVote("");
      setVoteValidationError("");

      // Update state manager
      if (stateManager) {
        stateManager.handleVotingSessionStart(session.categoryId);
      }
    });

    // Listen for new category-started event
    newSocket.on("category-started", (session) => {
      safeLog("Received category-started:", session);
      setVotingSession(session);

      // Calculate time left based on session end time
      if (session.endTime) {
        const calculatedTimeLeft = Math.max(
          0,
          Math.floor((session.endTime - Date.now()) / 1000)
        );
        setTimeLeft(calculatedTimeLeft);
      } else {
        setTimeLeft(30); // Fallback to 30 seconds
      }

      setSearchQuery(""); // Clear search when new voting starts
      setShowConfirmation(false);
      setPendingVote("");
      setVoteValidationError("");

      // Update state manager
      if (stateManager) {
        stateManager.handleVotingSessionStart(session.categoryId);
      }
    });

    newSocket.on("voting-results", (session) => {
      safeLog("Received voting-results:", session);
      setVotingSession(session);
    });

    // Listen for vote confirmation
    newSocket.on("vote-confirmed", (data) => {
      safeLog("Vote confirmed:", data);
      // Update voter state and record in history to prevent resets on status updates
      if (stateManager) {
        stateManager.recordVote(data.categoryId, data.option);
      }
    });

    // Listen for voting session updates
    newSocket.on("voting-session-update", (session) => {
      safeLog("Received voting-session-update:", session);
      setVotingSession(session);

      if (session && session.active && stateManager) {
        setTimeLeft(
          Math.max(0, Math.floor((session.endTime - Date.now()) / 1000))
        );
        stateManager.handleVotingSessionStart(session.categoryId);
      } else if (session && stateManager) {
        stateManager.handleVotingSessionEnd();
      }
    });


    newSocket.on("voting-ended", (session) => {
      safeLog("Received voting-ended:", session);
      setVotingSession(session);
      setTimeLeft(0);

      if (stateManager) {
        stateManager.handleVotingSessionEnd();
      }
    });

    // Listen for new category-stopped event
    newSocket.on("category-stopped", (session) => {
      safeLog("Received category-stopped:", session);
      setVotingSession(session);
      setTimeLeft(0);

      if (stateManager) {
        stateManager.handleVotingSessionEnd();
      }
    });

    newSocket.on("session-complete", () => {
      setSessionComplete(true);
      if (stateManager) {
        stateManager.handleSessionComplete();
      }
    });

    newSocket.on("next-category-info", (data) => {
      setNextCategoryTitle(data?.title || "");
    });

    newSocket.on("all-categories-complete", () => {
      setSessionComplete(true);
      if (stateManager) {
        stateManager.handleSessionComplete();
      }
    });

    newSocket.on("participant-count", (count) => {
      safeLog("Received participant-count:", count);
      setParticipantCount(count);
    });

    // Listen for admin status updates to sync current session
    newSocket.on("admin-status", (data) => {
      safeLog("Received admin-status:", data);
      if (data.currentSession) {
        setVotingSession(data.currentSession);
        if (data.currentSession.active && stateManager) {
          // Calculate time left based on session end time
          if (data.currentSession.endTime) {
            const calculatedTimeLeft = Math.max(
              0,
              Math.floor((data.currentSession.endTime - Date.now()) / 1000)
            );
            setTimeLeft(calculatedTimeLeft);
          }
          stateManager.handleVotingSessionStart(data.currentSession.categoryId);
        }
      }
      if (data.participantCount !== undefined) {
        safeLog(
          "Setting participant count from admin-status:",
          data.participantCount
        );
        setParticipantCount(data.participantCount);
      }
    });

    // Handle state sync on reconnection
    newSocket.on("state-sync", (data) => {
      if (stateManager && data.currentSession) {
        // Sync with current session state
        const session = data.currentSession;
        if (session.active) {
          stateManager.handleVotingSessionStart(session.categoryId);
        } else {
          stateManager.handleVotingSessionEnd();
        }
      }
    });

    return newSocket;
  }, [participantId, stateManager, votingSession]);

  // Initialize participant ID, device ID, and state manager
  useEffect(() => {
    // Get or generate participant ID (persisted)
    let id = localStorage.getItem('voting_participant_id');
    if (!id) {
      id = Math.random().toString(36).substring(2, 11);
      localStorage.setItem('voting_participant_id', id);
    }
    setParticipantId(id);

    // Get or generate device ID for vote tracking
    const devId = getDeviceId();
    setDeviceId(devId);
    console.log('Device ID initialized:', devId);

    // Initialize state manager
    const manager = getParticipantStateManager(id);
    setStateManager(manager);

    // Set initial voter state from manager
    setVoterState(manager.getVoterState());

    // Subscribe to state changes
    const unsubscribe = manager.subscribe((state) => {
      setVoterState(state.voterState);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Create socket connection when participant ID and state manager are ready
  useEffect(() => {
    if (!participantId || !stateManager) return;

    // Use global socket instance if it exists and is connected
    if (globalSocket && globalSocket.connected) {
      safeLog("Using existing global socket connection");
      setSocket(globalSocket);
      return;
    }

    // Prevent creating multiple connections
    if (socket && socket.connected) {
      safeLog(
        "Socket already exists and is connected, skipping new connection"
      );
      return;
    }

    safeLog("Creating new socket connection for participant:", participantId);
    const newSocket = createSocketConnection();
    globalSocket = newSocket; // Store in global instance
    setSocket(newSocket);

    return () => {
      safeLog("Cleaning up socket connection");
      if (newSocket && newSocket.connected) {
        newSocket.disconnect();
        globalSocket = null; // Clear global instance
      }
    };
  }, [participantId, stateManager]); // Remove socket from dependencies to prevent infinite loop

  // Handle page visibility changes (tab switching, screen lock)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Page became visible, check connection status but don't force reconnect
        if (socket && !isConnected) {
          safeLog("Page became visible, connection status:", isConnected);
          // Let Socket.IO handle reconnection naturally
        }
      }
    };

    const handleFocus = () => {
      // Window regained focus, check connection status but don't force reconnect
      if (socket && !isConnected) {
        safeLog("Window regained focus, connection status:", isConnected);
        // Let Socket.IO handle reconnection naturally
      }
    };

    const handleBeforeUnload = () => {
      // Clean up global socket on page unload
      if (globalSocket) {
        safeLog("Page unloading, cleaning up global socket");
        globalSocket.disconnect();
        globalSocket = null;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [socket, isConnected]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0 && votingSession?.active) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            return 0;
          }

          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeLeft, votingSession?.active]);

  // Preserve timer when voting session updates
  useEffect(() => {
    if (votingSession?.active && votingSession.endTime) {
      const newTimeLeft = Math.max(
        0,
        Math.floor((votingSession.endTime - Date.now()) / 1000)
      );
      if (newTimeLeft > timeLeft) {
        setTimeLeft(newTimeLeft);
      }
    }
  }, [votingSession?.active, votingSession?.endTime]);

  // Periodic status check to ensure we don't miss updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    const statusCheck = setInterval(() => {
      // Only send status requests if socket is connected and stable
      if (socket.connected && !socket.disconnected) {
        socket.emit("request-voting-status");
        socket.emit("request-admin-status");
        socket.emit("request-participant-count");
      }
    }, 10000); // Check every 10 seconds instead of 5 to reduce load

    return () => clearInterval(statusCheck);
  }, [socket, isConnected]);

  const handleVoteSelect = useCallback(
    (option: string) => {
      if (!votingSession?.active || !stateManager) return;

      // Validate vote attempt using state manager
      const validation = stateManager.validateVoteAttempt(
        votingSession.categoryId,
        option
      );

      if (!validation.isValid) {
        setVoteValidationError(validation.reason || "Cannot vote at this time");
        return;
      }

      setVoteValidationError("");
      setPendingVote(option);
      setShowConfirmation(true);
    },
    [votingSession, stateManager]
  );

  const handleVoteConfirm = useCallback(() => {
    if (!socket || !votingSession?.active || !pendingVote || !stateManager)
      return;

    // Double-check validation before submitting
    const validation = stateManager.validateVoteAttempt(
      votingSession.categoryId,
      pendingVote
    );

    if (!validation.isValid) {
      setVoteValidationError(validation.reason || "Cannot vote at this time");
      setShowConfirmation(false);
      setPendingVote("");
      return;
    }

    // Update local state immediately for instant feedback
    // This prevents the voting screen from showing briefly before the socket confirmation
    stateManager.recordVote(votingSession.categoryId, pendingVote);

    socket.emit("submit-vote", {
      categoryId: votingSession.categoryId,
      option: pendingVote,
      deviceId: deviceId, // Include device ID to prevent refresh-based duplicate voting
    });

    setShowConfirmation(false);
    setPendingVote("");
    setVoteValidationError("");
  }, [socket, votingSession, pendingVote, stateManager, deviceId]);

  const handleVoteCancel = () => {
    setShowConfirmation(false);
    setPendingVote("");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Filter and sort options based on search query
  const filteredOptions =
    votingSession?.options
      ?.filter((option) =>
        option.toLowerCase().includes(searchQuery.toLowerCase())
      )
      ?.sort((a, b) => a.localeCompare(b)) || [];

  // Determine waiting state with enhanced logic
  const getWaitingState = () => {
    // 1. Session is complete - all categories finished
    if (sessionComplete || voterState.viewState === "session-complete") {
      return "session-complete";
    }

    // 2. No active session - waiting for admin to start
    if (!votingSession) {
      return "no-session";
    }

    // 3. User has voted for current category
    const hasVotedForCurrentCategory =
      stateManager?.hasVotedForCategory(votingSession.categoryId) ||
      (voterState.hasVoted && voterState.currentCategoryId === votingSession.categoryId) ||
      voterState.viewState === "voted";

    if (hasVotedForCurrentCategory) {
      // If user has voted, they're waiting
      if (!votingSession.active) {
        return "between-categories";
      }
      return "voted";
    }

    // 4. Voting session exists but not active
    if (!votingSession.active) {
      return "between-categories";
    }

    // 5. Active voting session - not a waiting state
    return null;
  };

  const waitingState = getWaitingState();

  if (waitingState) {
    return (
      <WaitingState
        state={waitingState}
        participantCount={participantCount}
        nextCategoryTitle={nextCategoryTitle}
        connectionStatus={isConnected ? "connected" : "disconnected"}
        isReconnecting={
          !isConnected &&
          socket &&
          socket.connected === false &&
          connectionAttempts > 0
        }
      />
    );
  }

  return (
    <div className="min-h-screen pb-12 pt-6">
      <div className="max-w-xl mx-auto px-4">
        {/* Logo */}
        <div className="flex justify-center mb-8 animate-float">
          <div className="bg-white p-3 rounded-2xl shadow-xl border border-white/50">
            <Image
              src="/assets/gf-logo.svg"
              alt="GritFeat Logo"
              width={120}
              height={48}
              className="h-10 w-auto"
            />
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8 animate-slide-up">
          <h1 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">
            {votingSession.title}
          </h1>
          <p className="text-slate-500 font-medium leading-relaxed">
            {votingSession.description}
          </p>

          {votingSession.active && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <div className="glass-card px-4 py-2 flex items-center gap-2">
                <Users className="w-4 h-4 text-gritfeat-green" />
                <span className="font-bold text-slate-700">{participantCount} Voting</span>
              </div>
              <div className="glass-card px-4 py-2 flex items-center gap-2">
                <Vote className="w-4 h-4 text-gritfeat-green" />
                <span className="font-bold text-gritfeat-green">Live Now</span>
              </div>
            </div>
          )}
        </div>

        {/* Connection Status */}
        <div className="flex flex-col sm:flex-row items-center justify-center mt-2 space-y-2 sm:space-y-0 sm:space-x-2">
          <div
            className={`flex items-center text-xs px-3 py-1.5 rounded-full transition-colors ${isConnected
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
              }`}
          >
            <div
              className={`w-2 h-2 rounded-full mr-2 ${isConnected ? "bg-green-500" : "bg-red-500"
                }`}
            ></div>
            {isConnected ? "Connected" : "Disconnected"}
            {!isConnected && connectionAttempts > 0 && (
              <span className="ml-1">({connectionAttempts})</span>
            )}
          </div>

          {!isConnected && (
            <button
              onClick={() => socket?.connect()}
              className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-full hover:bg-blue-600 transition-colors touch-manipulation active:scale-95"
            >
              Reconnect
            </button>
          )}
        </div>

        {/* Voting State Info */}
        {stateManager &&
          votingSession &&
          stateManager.hasVotedForCategory(votingSession.categoryId) && (
            <div className="flex items-center justify-center mt-3">
              <div className="flex items-center text-xs px-3 py-1.5 rounded-full bg-blue-100 text-blue-700">
                <CheckCircle className="w-3 h-3 mr-1.5" />
                <span>Vote recorded for this category</span>
              </div>
            </div>
          )}

      </div>

      {/* Vote Validation Error */}
      {voteValidationError && (
        <div className="mb-4 p-4 bg-red-100 border border-red-300 rounded-lg">
          <p className="text-red-700 text-sm font-medium">
            {voteValidationError}
          </p>
        </div>
      )}

      {/* Voting Options */}
      {votingSession.active && !voterState.hasVoted && (
        <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8 mx-24">
          <h2 className="text-lg sm:text-xl font-semibold text-[#4c4c4c] text-center mb-4 sm:mb-6 px-2">
            Choose your vote:
          </h2>

          {/* Search Input */}
          <div className="relative mb-3 sm:mb-6">
            <label
              htmlFor="search-input"
              className="block text-sm font-medium text-gray-700 mb-2 px-2"
            >
              Search Options
            </label>
            <input
              id="search-input"
              type="text"
              placeholder="Type to search for a name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full px-3 sm:px-4 py-3 sm:py-3.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7ebd41] focus:border-[#7ebd41] text-gray-900 placeholder-gray-500 bg-white shadow-sm text-base touch-manipulation"
            />
          </div>

          {/* Results count */}
          {searchQuery && (
            <div className="text-sm text-gray-600 text-center px-2 mb-2">
              {filteredOptions.length === 0
                ? "No matches found"
                : `${filteredOptions.length} of ${votingSession.options.length} options`}
            </div>
          )}

          {/* No results message */}
          {searchQuery && filteredOptions.length === 0 && (
            <div className="text-center py-8 px-4">
              <div className="text-gray-400 mb-2">
                <Vote className="w-8 h-8 mx-auto mb-2" />
              </div>
              <p className="text-gray-600 text-sm">
                No nominees match "{searchQuery}"
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Try a different search term
              </p>
            </div>
          )}

          {/* Voting options */}
          <div className="space-y-2 sm:space-y-3">
            {filteredOptions.map((option, index) => (
              <button
                key={index}
                onClick={() => handleVoteSelect(option)}
                className="w-full voting-option bg-white rounded-xl p-3 sm:p-4 md:p-6 text-left border-2 border-gray-200 hover:border-[#7ebd41] focus:outline-none focus:ring-2 focus:ring-[#7ebd41] focus:ring-offset-2 transition-colors duration-200 touch-manipulation active:scale-[0.98] active:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm sm:text-base md:text-lg font-semibold text-[#4c4c4c] pr-2 break-words">
                    {option}
                  </span>
                  <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full border-2 border-gray-300 flex-shrink-0"></div>
                </div>
              </button>
            ))}
          </div>

          {/* Show total options count when not searching */}
          {!searchQuery && votingSession.options.length > 0 && (
            <div className="text-center text-xs sm:text-sm text-gray-500 mt-4 px-2">
              {votingSession.options.length} nominee
              {votingSession.options.length !== 1 ? "s" : ""} available
            </div>
          )}
        </div>
      )}


      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmation}
        nominee={pendingVote}
        categoryTitle={votingSession?.title || ""}
        onConfirm={handleVoteConfirm}
        onCancel={handleVoteCancel}
      />
    </div>
  );
}
