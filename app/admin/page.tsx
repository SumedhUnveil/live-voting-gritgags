"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Play, Square, Users, BarChart3, Clock, Trophy, Wifi, Copy, Check } from "lucide-react";
import { io, Socket } from "socket.io-client";
import QRCode from "qrcode";
import {
  VotingSession,
  Category,
  AdminDashboardState,
  CategoryResult,
} from "../../types";
import { ResultsReveal } from "../components";
import { getServerUrl, getParticipantUrl, initializeServerUrl } from "../utils/getServerUrl";

// Legacy interfaces for backward compatibility during transition
interface LegacyCategory {
  id: string;
  title: string;
  description: string;
  options: string[];
  completed: boolean;
  results?: Record<string, number>;
  revealed?: boolean;
}

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

export default function AdminPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [categories, setCategories] = useState<LegacyCategory[]>([]);
  const [currentSession, setCurrentSession] =
    useState<LegacyVotingSession | null>(null);
  const [adminDashboard, setAdminDashboard] = useState<AdminDashboardState>({
    categories: [],
    currentSession: null,
    participantCount: 0,
    connectionStatus: "disconnected",
    sessionPhase: "setup",
  });
  const [participantCount, setParticipantCount] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [revealedCategories, setRevealedCategories] = useState<Set<string>>(
    new Set()
  );
  const [serverUrl, setServerUrl] = useState<string>("");
  const [participantUrl, setParticipantUrl] = useState<string>("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  // Create "Who wants to be a millionaire" question reveal sound
  const playQuestionReveal = () => {
    try {
      const audio = new Audio("/assets/sound-fx.mp3");
      audio.volume = 0.7;
      audio.play().catch((error) => {
        console.log("Audio playback failed:", error);
      });
    } catch (error) {
      console.log("Audio playback failed:", error);
    }
  };

  // Get server URL on mount
  useEffect(() => {
    const init = async () => {
      await initializeServerUrl();
      const url = getServerUrl();
      const pUrl = getParticipantUrl();
      setServerUrl(url);
      setParticipantUrl(pUrl);

      // Generate QR code
      QRCode.toDataURL(pUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: "#4c4c4c",
          light: "#FFFFFF",
        },
      })
        .then(setQrCodeDataUrl)
        .catch(console.error);
    };
    init();
  }, []);

  useEffect(() => {
    const url = getServerUrl();
    // Connect to socket with improved reconnection settings
    const newSocket = io(url, {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 30000,
      forceNew: false,
      autoConnect: true,
    });
    setSocket(newSocket);

    // Initialize audio context
    const initAudio = () => {
      try {
        const context = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        setAudioContext(context);
      } catch (error) {
        console.log("Audio context initialization failed:", error);
      }
    };

    // Initialize audio on user interaction
    const handleUserInteraction = () => {
      initAudio();
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("touchstart", handleUserInteraction);
    };

    document.addEventListener("click", handleUserInteraction);
    document.addEventListener("touchstart", handleUserInteraction);

    // Join admin room
    newSocket.emit("join-admin");

    // Listen for admin events
    newSocket.on("admin-status", (data) => {
      setCurrentSession(data.currentSession);
      setParticipantCount(data.participantCount);
      if (data.categories) {
        setCategories(data.categories);
      }
    });

    newSocket.on("category-started", (session) => {
      setCurrentSession(session);
      setTimeLeft(30);
      // Play question reveal sound
      playQuestionReveal();
      // Refresh categories to update completion status
      fetchCategories();
    });

    newSocket.on("voting-results", (session) => {
      setCurrentSession(session);
    });

    newSocket.on("category-stopped", (session) => {
      setCurrentSession(session);
      setTimeLeft(0);
      // Refresh categories to update completion status
      fetchCategories();
    });

    newSocket.on("participant-count", (count) => {
      setParticipantCount(count);
    });

    newSocket.on("winner-revealed", (result: CategoryResult) => {
      setRevealedCategories((prev) => new Set([...prev, result.categoryId]));
      // Refresh categories to update reveal status
      fetchCategories();
    });

    // Fetch categories
    fetchCategories();

    return () => {
      if (newSocket && newSocket.connected) {
        newSocket.disconnect();
      }
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("touchstart", handleUserInteraction);
    };
  }, []);

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0 && currentSession?.active) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            return 0;
          }
          // Play tick-tock sound on each second
          playTickTock();
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeLeft, currentSession?.active]);

  const fetchCategories = useCallback(async () => {
    try {
      const url = getServerUrl();
      const response = await fetch(`${url}/api/categories`);
      const data = await response.json();

      // Fetch completed categories with results
      const completedResponse = await fetch(`${url}/api/completed-categories`);
      const completedData = await completedResponse.json();

      // Merge categories with completion status and results
      const categoriesWithStatus = data.map((category: Category) => {
        const completed = completedData.find(
          (c: any) => c.categoryId === category.id
        );

        // Parse options if they're stored as JSON string
        let parsedOptions = category.options;
        if (typeof category.options === "string") {
          try {
            parsedOptions = JSON.parse(category.options);
          } catch (e) {
            console.error(
              "Error parsing options for category:",
              category.id,
              e
            );
            parsedOptions = [];
          }
        }

        return {
          ...category,
          options: parsedOptions,
          completed: !!completed,
          results: completed?.results || undefined,
          revealed:
            revealedCategories.has(category.id) || category.revealed || false,
        };
      });

      setCategories(categoriesWithStatus);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }, []);

  const startVoting = useCallback(
    (categoryId: string) => {
      if (socket) {
        socket.emit("start-category", { categoryId });
      }
    },
    [socket]
  );

  const stopVoting = useCallback(
    (categoryId: string) => {
      if (socket) {
        socket.emit("stop-category", { categoryId });
      }
    },
    [socket]
  );

  const endVoting = useCallback(() => {
    if (socket) {
      socket.emit("end-voting");
    }
  }, [socket]);

  const revealWinner = useCallback(
    (categoryId: string) => {
      if (socket) {
        socket.emit("reveal-winner", { categoryId });
      }
    },
    [socket]
  );

  const resetDatabase = useCallback(async () => {
    if (
      confirm(
        "Are you sure you want to reset the database? This will clear all voting data and reset to initial state."
      )
    ) {
      try {
        const url = getServerUrl();
        const response = await fetch(`${url}/api/reset`, {
          method: "POST",
        });

        if (response.ok) {
          alert(
            "Database reset successfully! All voting data has been cleared."
          );
          // Refresh categories and reset current session
          fetchCategories();
          setCurrentSession(null);
          setRevealedCategories(new Set());
        } else {
          alert("Failed to reset database. Please try again.");
        }
      } catch (error) {
        console.error("Error resetting database:", error);
        alert(
          "Error resetting database. Please check the console for details."
        );
      }
    }
  }, [fetchCategories]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const getWinner = useCallback(() => {
    if (!currentSession || Object.keys(currentSession.results).length === 0)
      return null;

    const entries = Object.entries(currentSession.results);
    const maxVotes = Math.max(...entries.map(([_, votes]) => votes));
    const winners = entries.filter(([_, votes]) => votes === maxVotes);

    if (winners.length === 1) {
      return winners[0];
    } else {
      // Handle tie - return array of all winners
      return [winners.map(([name, _]) => name).join(" & "), maxVotes, true];
    }
  }, [currentSession]);

  const getWinnerForCategory = useCallback(
    (results: Record<string, number>) => {
      if (!results || Object.keys(results).length === 0) return null;

      const entries = Object.entries(results);
      const maxVotes = Math.max(...entries.map(([_, votes]) => votes));
      const winners = entries.filter(([_, votes]) => votes === maxVotes);

      if (winners.length === 1) {
        return winners[0];
      } else {
        // Handle tie - return array of all winners
        return [winners.map(([name, _]) => name).join(" & "), maxVotes, true];
      }
    },
    []
  );

  const getTopResultsForCategory = useCallback(
    (results: Record<string, number>) => {
      if (!results || Object.keys(results).length === 0) return [];

      const entries = Object.entries(results);
      const sortedEntries = entries.sort((a, b) => b[1] - a[1]);

      const uniqueVoteCounts = Array.from(
        new Set(sortedEntries.map(([_, votes]) => votes))
      );

      let results_array = [];
      let currentPosition = 1;

      for (
        let i = 0;
        i < uniqueVoteCounts.length && results_array.length < 3;
        i++
      ) {
        const voteCount = uniqueVoteCounts[i];
        const tiedEntries = sortedEntries.filter(
          ([_, votes]) => votes === voteCount
        );

        if (tiedEntries.length === 1) {
          results_array.push({
            position: currentPosition,
            name: tiedEntries[0][0],
            votes: tiedEntries[0][1],
            isTie: false,
          });
          currentPosition++;
        } else {
          const tiedNames = tiedEntries.map(([name, _]) => name).join(" & ");
          results_array.push({
            position: currentPosition,
            name: tiedNames,
            votes: tiedEntries[0][1],
            isTie: true,
          });
          currentPosition++;
        }
      }

      return results_array;
    },
    []
  );

  // Create clock-like tick-tock sound effect
  const playTickTock = () => {
    if (!audioContext) return;

    try {
      // Create oscillator for tick sound
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Set frequency and type for authentic clock sound (lower frequency)
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.type = "sine";

      // Set gain envelope for clock-like tick (shorter, more percussive)
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(
        0.3,
        audioContext.currentTime + 0.002
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.08
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.08);
    } catch (error) {
      console.log("Audio playback failed:", error);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(participantUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-2 sm:p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-8">
          <h1 className="text-3xl sm:text-5xl font-bold text-gray-900 mb-2 sm:mb-4">
            🏆 Admin Panel
          </h1>
          <p className="text-lg sm:text-xl text-gray-600">
            Control voting sessions and monitor results in real-time
          </p>
        </div>

        {/* Network Info Panel - Show QR for participants */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg mb-4 sm:mb-8 border-l-4 border-[#7ebd41]">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {qrCodeDataUrl && (
                <img
                  src={qrCodeDataUrl}
                  alt="QR Code for participants"
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg border-2 border-gray-200"
                />
              )}
              <div className="text-center sm:text-left">
                <h3 className="text-lg font-semibold text-[#4c4c4c] flex items-center gap-2">
                  <Wifi className="w-5 h-5 text-[#7ebd41]" />
                  Participant Link
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  Scan the QR code or share this URL:
                </p>
                <p className="font-mono text-xs sm:text-sm text-[#4c4c4c] bg-gray-100 px-3 py-2 rounded break-all">
                  {participantUrl}
                </p>
              </div>
            </div>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 bg-[#7ebd41] hover:bg-[#6ba835] text-white px-4 py-2 rounded-lg transition-colors font-semibold whitespace-nowrap"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Link
                </>
              )}
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-4 sm:mb-8">
          <div className="bg-white rounded-xl p-6 shadow-lg text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">
              {participantCount}
            </h3>
            <p className="text-gray-600">Connected Participants</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg text-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">
              {categories.length}
            </h3>
            <p className="text-gray-600">Award Categories</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">
              {currentSession?.active ? formatTime(timeLeft) : "--:--"}
            </h3>
            <p className="text-gray-600">Time Remaining</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg text-center">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            <button
              onClick={resetDatabase}
              className="w-full bg-red-500 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-600 transition-colors text-sm"
            >
              Reset Database
            </button>
            <p className="text-gray-600 text-xs mt-2">Clear all voting data</p>
          </div>
        </div>

        {/* Current Voting Session */}
        {currentSession && currentSession.active && (
          <div className="bg-white rounded-xl p-8 shadow-xl mb-8 border-l-4 border-[#7ebd41]">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-[#4c4c4c] mb-2">
                {currentSession.title}
              </h2>
              <p className="text-lg text-gray-600 mb-4">
                {currentSession.description}
              </p>

              <div className="flex items-center justify-center space-x-6 text-lg">
                <div className="flex items-center text-[#7ebd41]">
                  <Clock className="w-5 h-5 mr-2" />
                  <span className="font-mono font-bold text-2xl">
                    {formatTime(timeLeft)}
                  </span>
                </div>
                <div className="flex items-center text-[#4c4c4c]">
                  <Users className="w-5 h-5 mr-2" />
                  <span className="font-semibold">
                    {participantCount} participants
                  </span>
                </div>
              </div>
            </div>

            {/* Live Results */}
            {Object.keys(currentSession.results).length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-[#4c4c4c] mb-4 text-center">
                  Live Results
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {currentSession.options.map((option, index) => {
                    const votes = currentSession.results[option] || 0;
                    const totalVotes = Object.values(
                      currentSession.results
                    ).reduce((a, b) => a + b, 0);
                    const percentage =
                      totalVotes > 0 ? (votes / totalVotes) * 100 : 0;

                    return (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-medium text-gray-700">
                            {option}
                          </span>
                          <span className="text-gray-500 font-semibold">
                            {votes} votes
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4">
                          <div
                            className="bg-[#7ebd41] h-4 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <div className="text-right text-sm text-gray-500 mt-1">
                          {percentage.toFixed(1)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex justify-center space-x-4 mt-6">
              <button
                onClick={endVoting}
                className="bg-red-600 text-white py-3 px-8 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center"
              >
                <Square className="w-5 h-5 mr-2" />
                End Voting
              </button>
            </div>
          </div>
        )}

        {/* Winner Announcement - Show after voting ends */}
        {currentSession && !currentSession.active && getWinner() && (
          <div className="bg-white rounded-xl p-8 shadow-xl mb-8 border-l-4 border-[#7ebd41]">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-[#4c4c4c] mb-2">
                {currentSession.title} - Results
              </h2>
              <p className="text-lg text-gray-600 mb-4">
                {currentSession.description}
              </p>
            </div>

            {/* Winner Announcement */}
            <div className="text-center bg-gradient-to-r from-[#7ebd41]/10 to-[#7ebd41]/5 rounded-xl p-6 border-2 border-[#7ebd41]/20 mb-6">
              <div className="w-16 h-16 bg-[#7ebd41]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-[#7ebd41]" />
              </div>
              <h3 className="text-2xl font-bold text-[#4c4c4c] mb-2">
                {getWinner()?.[2] ? "Tie!" : "Winner!"}
              </h3>
              <p className="text-xl text-gray-700">
                <span className="font-semibold text-[#7ebd41]">
                  {getWinner()?.[0]}
                </span>{" "}
                {getWinner()?.[2] ? "tie with" : "wins with"}{" "}
                <span className="font-semibold">{getWinner()?.[1]} votes</span>!
              </p>
            </div>

            {/* Final Results */}
            {Object.keys(currentSession.results).length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-[#4c4c4c] mb-4 text-center">
                  Final Results
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {currentSession.options.map((option, index) => {
                    const votes = currentSession.results[option] || 0;
                    const totalVotes = Object.values(
                      currentSession.results
                    ).reduce((a, b) => a + b, 0);
                    const percentage =
                      totalVotes > 0 ? (votes / totalVotes) * 100 : 0;

                    return (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-medium text-gray-700">
                            {option}
                          </span>
                          <span className="text-gray-500 font-semibold">
                            {votes} votes
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4">
                          <div
                            className="bg-[#7ebd41] h-4 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <div className="text-right text-sm text-gray-500 mt-1">
                          {percentage.toFixed(1)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Next Category Button */}
            <div className="text-center">
              <button
                onClick={() => setCurrentSession(null)}
                className="bg-[#7ebd41] text-white py-3 px-8 rounded-lg font-semibold hover:bg-[#6ba835] transition-colors flex items-center mx-auto"
              >
                <Play className="w-5 h-5 mr-2" />
                Choose Next Category
              </button>
            </div>
          </div>
        )}

        {/* Enhanced Category Control Interface */}
        <div className="bg-white rounded-xl p-8 shadow-xl border-l-4 border-[#7ebd41]">
          <h2 className="text-2xl font-bold text-[#4c4c4c] mb-6 text-center">
            Category Management
          </h2>

          {/* Session Flow Progress */}
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">
              Session Progress
            </h3>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-gray-300 rounded-full mr-2"></div>
                  <span className="text-gray-600">
                    {
                      categories.filter(
                        (cat) =>
                          !cat.completed &&
                          (!currentSession ||
                            currentSession.categoryId !== cat.id)
                      ).length
                    }{" "}
                    Not Started
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-blue-600">
                    {currentSession && currentSession.active ? 1 : 0} Active
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-green-600">
                    {categories.filter((cat) => cat.completed).length} Completed
                  </span>
                </div>
              </div>
              <div className="text-gray-500">
                {categories.filter((cat) => cat.completed).length} /{" "}
                {categories.length} Categories Complete
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => {
              const isActive =
                currentSession &&
                currentSession.active &&
                currentSession.categoryId === category.id;
              const canStart =
                !category.completed &&
                !isActive &&
                (!currentSession || !currentSession.active);
              const canStop = isActive;

              // Calculate real-time vote count for active category
              const voteCount =
                isActive && currentSession
                  ? Object.values(currentSession.results).reduce(
                    (sum, count) => sum + count,
                    0
                  )
                  : category.results
                    ? Object.values(category.results).reduce(
                      (sum, count) => sum + count,
                      0
                    )
                    : 0;

              return (
                <div
                  key={category.id}
                  className={`bg-gray-50 rounded-lg p-6 transition-all duration-200 border-2 ${isActive
                    ? "border-blue-500 bg-blue-50"
                    : category.completed
                      ? "border-green-300 bg-green-50"
                      : "border-gray-200 hover:border-[#7ebd41] hover:bg-gray-100"
                    }`}
                >
                  {/* Category Status Indicator */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-3 h-3 rounded-full ${isActive
                          ? "bg-blue-500 animate-pulse"
                          : category.completed
                            ? "bg-green-500"
                            : "bg-gray-300"
                          }`}
                      ></div>
                      <span
                        className={`text-xs font-semibold uppercase tracking-wide ${isActive
                          ? "text-blue-600"
                          : category.completed
                            ? "text-green-600"
                            : "text-gray-500"
                          }`}
                      >
                        {isActive
                          ? "Active"
                          : category.completed
                            ? "Completed"
                            : "Not Started"}
                      </span>
                    </div>

                    {/* Real-time vote count */}
                    {(isActive || category.completed) && (
                      <div className="flex items-center space-x-1 text-sm">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span className="font-semibold text-gray-700">
                          {voteCount} {voteCount === 1 ? "vote" : "votes"}
                        </span>
                        {isActive && (
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse ml-1"></div>
                        )}
                      </div>
                    )}
                  </div>

                  <h3 className="text-lg font-semibold text-[#4c4c4c] mb-2">
                    {category.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    {category.description}
                  </p>

                  {/* Live Results for Active Category */}
                  {isActive &&
                    currentSession &&
                    Object.keys(currentSession.results).length > 0 && (
                      <div className="mb-4 p-3 bg-white rounded-lg border border-blue-200">
                        <h4 className="text-sm font-semibold text-blue-700 mb-2 flex items-center">
                          <BarChart3 className="w-4 h-4 mr-1" />
                          Live Results
                        </h4>
                        <div className="space-y-2">
                          {Object.entries(currentSession.results)
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 3)
                            .map(([option, votes], index) => {
                              const percentage =
                                voteCount > 0 ? (votes / voteCount) * 100 : 0;
                              return (
                                <div
                                  key={option}
                                  className="flex justify-between items-center text-xs"
                                >
                                  <span className="font-medium text-gray-700 truncate mr-2">
                                    {index === 0 && "🥇"} {index === 1 && "🥈"}{" "}
                                    {index === 2 && "🥉"} {option}
                                  </span>
                                  <div className="flex items-center space-x-2">
                                    <div className="w-12 bg-gray-200 rounded-full h-2">
                                      <div
                                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${percentage}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-gray-600 font-semibold min-w-[2rem]">
                                      {votes}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                  {/* Final Results for Completed Categories */}
                  {category.completed && category.results && (
                    <div className="mb-4 p-3 bg-white rounded-lg border border-green-200">
                      <h4 className="text-sm font-semibold text-green-700 mb-2">
                        Final Results:
                      </h4>
                      {getTopResultsForCategory(category.results).map(
                        (result, index) => {
                          const totalVotes = Object.values(
                            category.results
                          ).reduce((a, b) => a + b, 0);
                          const percentage =
                            totalVotes > 0
                              ? (result.votes / totalVotes) * 100
                              : 0;
                          const positionLabels = ["🥇", "🥈", "🥉"];
                          const positionLabel =
                            positionLabels[result.position - 1] ||
                            `${result.position}.`;

                          return (
                            <div
                              key={index}
                              className="flex justify-between items-center text-xs mb-1"
                            >
                              <div className="flex items-center space-x-1">
                                <span>{positionLabel}</span>
                                <span className="font-medium text-gray-700">
                                  {result.name}
                                  {result.isTie && (
                                    <span className="text-gray-500">(Tie)</span>
                                  )}
                                </span>
                              </div>
                              <span className="text-gray-500">
                                {result.votes} ({percentage.toFixed(1)}%)
                              </span>
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}

                  {/* Category Control Buttons */}
                  <div className="space-y-2">
                    {canStart && (
                      <button
                        onClick={() => startVoting(category.id)}
                        className="w-full bg-[#7ebd41] text-white py-2 px-4 rounded-lg font-semibold hover:bg-[#6ba835] transition-colors flex items-center justify-center"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Start Voting
                      </button>
                    )}

                    {canStop && (
                      <button
                        onClick={() => stopVoting(category.id)}
                        className="w-full bg-red-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center"
                      >
                        <Square className="w-4 h-4 mr-2" />
                        Stop Voting
                      </button>
                    )}

                    {category.completed && (
                      <div className="w-full bg-gray-400 text-gray-600 py-2 px-4 rounded-lg font-semibold flex items-center justify-center cursor-not-allowed">
                        <Trophy className="w-4 h-4 mr-2" />
                        Completed
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Results Reveal System */}
        <div className="mt-8">
          <ResultsReveal
            categories={categories}
            onRevealWinner={revealWinner}
          />
        </div>

        {/* Instructions */}
        <div className="mt-8 text-center text-gray-600">
          <p className="text-sm">
            💡 <strong>Tip:</strong> Share this admin screen on your projector
            to show live results to everyone!
          </p>
        </div>
      </div>
    </div>
  );
}
