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
  ParticipantStateDebug,
} from "../utils/participantStateManager";
import { getServerUrl } from "../utils/getServerUrl";

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
      // Update voter state to show voted status
      if (stateManager) {
        stateManager.updateVoterState({
          hasVoted: true,
          selectedOption: data.option,
          viewState: "voted",
          currentCategoryId: data.categoryId,
        });
      }
      // Don't reset the timer - let it continue
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

    newSocket.on("vote-received", (data) => {
      // Vote was successfully received by server
      safeLog("Vote received by server:", data?.option || "unknown option");

      if (stateManager && votingSession) {
        const success = stateManager.recordVote(
          votingSession.categoryId,
          data?.option || ""
        );
        if (!success) {
          console.warn("Failed to record vote in state manager");
        }
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

  // Initialize participant ID and state manager
  useEffect(() => {
    // Generate unique participant ID
    const id = Math.random().toString(36).substring(2, 11);
    setParticipantId(id);

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

    socket.emit("submit-vote", {
      categoryId: votingSession.categoryId,
      option: pendingVote,
    });

    setShowConfirmation(false);
    setPendingVote("");
    setVoteValidationError("");
  }, [socket, votingSession, pendingVote, stateManager]);

  const handleVoteCancel = () => {
    setShowConfirmation(false);
    setPendingVote("");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Filter options based on search query
  const filteredOptions =
    votingSession?.options?.filter((option) =>
      option.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  // Determine waiting state with enhanced logic
  const getWaitingState = () => {
    // Debug logging
    if (process.env.NODE_ENV === "development") {
      safeLog("Waiting state check:", {
        sessionComplete,
        votingSession: votingSession
          ? {
            id: votingSession.id,
            active: votingSession.active,
            title: votingSession.title,
          }
          : null,
        voterState: {
          hasVoted: voterState.hasVoted,
          viewState: voterState.viewState,
        },
      });
    }

    // Session is complete - all categories finished
    if (sessionComplete) {
      return "session-complete";
    }

    // No active session - waiting for admin to start
    if (!votingSession) {
      return "no-session";
    }

    // Voting session exists but not active
    if (!votingSession.active) {
      // If user has voted, they're waiting for next category
      if (voterState.hasVoted) {
        return "between-categories";
      }
      // If user hasn't voted and session ended, they're waiting for next category
      return "between-categories";
    }

    // Active voting session - not a waiting state
    return null;
  };

  const waitingState = getWaitingState();

  // Check if user has voted for current category
  const hasVotedForCurrentCategory =
    voterState.hasVoted &&
    voterState.currentCategoryId === votingSession?.categoryId;

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

  // Show voted state if user has voted for current category
  if (hasVotedForCurrentCategory && votingSession?.active) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-2 sm:p-4">
        <div className="max-w-2xl mx-auto">
          {/* Logo */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <Image
                src="/assets/gf-logo.svg"
                alt="GritFeat Logo"
                width={100}
                height={40}
                className="h-10 w-auto"
              />
            </div>
          </div>

          {/* Voted State */}
          <div className="text-center">
            <div className="bg-white rounded-lg p-6 sm:p-8 shadow-sm border border-gray-200 mb-6">
              <div className="flex items-center justify-center text-green-500 mb-4">
                <CheckCircle className="w-12 h-12" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
                Vote Submitted!
              </h2>
              <p className="text-gray-600 mb-4">
                You voted for:{" "}
                <span className="font-semibold text-gray-800">
                  {voterState.selectedOption}
                </span>
              </p>
              <p className="text-sm text-gray-500">
                Waiting for other participants to finish voting...
              </p>
            </div>

            {/* Timer and Participant Count */}
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4 text-sm mb-6">
              <div className="flex items-center text-[#7ebd41] bg-green-50 px-3 py-1.5 rounded-full">
                <Clock className="w-4 h-4 mr-1.5" />
                <span className="font-mono font-bold text-base">
                  {formatTime(timeLeft)}
                </span>
              </div>
              <div className="flex items-center text-[#4c4c4c] bg-gray-50 px-3 py-1.5 rounded-full">
                <Users className="w-4 h-4 mr-1.5" />
                <span>
                  {participantCount} participant
                  {participantCount !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* Connection Status */}
            <div className="flex items-center justify-center">
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
              </div>
            </div>
          </div>
        </div>
      </div>
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
                <Clock className="w-4 h-4 text-gritfeat-green" />
                <span className="font-black text-slate-700 font-mono text-lg">{formatTime(timeLeft)}</span>
              </div>
              <div className="glass-card px-4 py-2 flex items-center gap-2">
                <Users className="w-4 h-4 text-gritfeat-green" />
                <span className="font-bold text-slate-700">{participantCount}</span>
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

          {/* Debug buttons in development */}
          {process.env.NODE_ENV === "development" && stateManager && (
            <>
              <button
                onClick={() => ParticipantStateDebug.logState(stateManager)}
                className="text-xs bg-gray-500 text-white px-3 py-1.5 rounded-full hover:bg-gray-600 transition-colors touch-manipulation"
              >
                Debug
              </button>
              <button
                onClick={() => {
                  socket?.emit("request-voting-status");
                  socket?.emit("request-admin-status");
                }}
                className="text-xs bg-purple-500 text-white px-3 py-1.5 rounded-full hover:bg-purple-600 transition-colors touch-manipulation"
              >
                Refresh
              </button>
            </>
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

        {/* Debug Info in development */}
        {process.env.NODE_ENV === "development" && (
          <div className="flex flex-col items-center justify-center mt-3 space-y-1">
            <div className="text-xs px-3 py-1 rounded bg-yellow-100 text-yellow-800">
              Session:{" "}
              {votingSession
                ? `${votingSession.active ? "ACTIVE" : "INACTIVE"} - ${votingSession.title
                }`
                : "NONE"}
            </div>
            <div className="text-xs px-3 py-1 rounded bg-gray-100 text-gray-600">
              State: {voterState.viewState} | Voted:{" "}
              {voterState.hasVoted ? "YES" : "NO"}
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
        <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
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

      {/* Vote Confirmation - Active Session */}
      {voterState.hasVoted && votingSession.active && (
        <div className="text-center mb-6 sm:mb-8 px-3 sm:px-2">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#7ebd41]/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-[#7ebd41]" />
          </div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#4c4c4c] mb-2">
            Vote Submitted!
          </h2>
          <div className="bg-white rounded-xl p-3 sm:p-4 md:p-6 shadow-lg border border-gray-200 mb-3 sm:mb-4">
            <p className="text-xs sm:text-sm text-gray-600 mb-2">
              Your vote for
            </p>
            <p className="text-sm sm:text-base md:text-lg font-medium text-[#4c4c4c] mb-2 break-words">
              {votingSession.title}
            </p>
            <p className="text-base sm:text-lg md:text-xl font-bold text-[#7ebd41] break-words">
              {voterState.selectedOption}
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <p className="text-xs sm:text-sm text-blue-700 font-medium">
              ✓ Vote recorded successfully
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Wait for the admin to begin the next category
            </p>
          </div>
        </div>
      )}

      {/* Post-Vote Status for Ended Session */}
      {voterState.hasVoted && !votingSession.active && (
        <div className="text-center mb-6 sm:mb-8 px-3 sm:px-2">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#7ebd41]/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-[#7ebd41]" />
          </div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#4c4c4c] mb-2">
            Your Vote
          </h2>
          <div className="bg-white rounded-xl p-3 sm:p-4 md:p-6 shadow-lg border border-gray-200 mb-3 sm:mb-4">
            <p className="text-xs sm:text-sm text-gray-600 mb-2">
              You voted for
            </p>
            <p className="text-sm sm:text-base md:text-lg font-medium text-[#4c4c4c] mb-2 break-words">
              {votingSession.title}
            </p>
            <p className="text-base sm:text-lg md:text-xl font-bold text-[#7ebd41] break-words">
              {voterState.selectedOption}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs sm:text-sm text-gray-600">
              Waiting for next category to begin
            </p>
          </div>
        </div>
      )}

      {/* Session Ended - No Vote Cast */}
      {!votingSession.active && !voterState.hasVoted && (
        <div className="text-center px-3 sm:px-2">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <Vote className="w-6 h-6 sm:w-8 sm:h-8 text-gray-600" />
          </div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#4c4c4c] mb-2">
            Category Ended
          </h2>
          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200 mb-3 sm:mb-4">
            <p className="text-sm sm:text-base text-gray-600 mb-2">
              Voting for this category has ended.
            </p>
            <p className="text-xs sm:text-sm text-gray-500">
              You did not cast a vote for this category
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs sm:text-sm text-gray-600">
              Wait for the admin to begin the next category
            </p>
          </div>
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
