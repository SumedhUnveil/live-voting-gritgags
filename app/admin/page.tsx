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
    <div className="min-h-screen pb-10">
      <div className="max-w-7xl mx-auto px-4 pt-8">
        {/* Header */}
        <header className="text-center mb-12 animate-slide-up">
          <div className="inline-block p-3 rounded-2xl bg-white shadow-xl mb-6 border border-white/50">
            <Trophy className="w-10 h-10 text-gritfeat-green animate-float" />
          </div>
          <h1 className="text-5xl sm:text-7xl font-black text-slate-800 mb-4 tracking-tight">
            Awards <span className="text-gritfeat-green">Control</span> Center
          </h1>
          <p className="text-lg sm:text-xl text-slate-500 font-medium max-w-2xl mx-auto">
            Orchestrate your event in real-time. Manage voting sessions, monitor attendance, and reveal winners with flair.
          </p>
        </header>

        {/* Top Actions Row: Connection & Social Reset */}
        <div className="flex flex-col lg:flex-row gap-8 mb-12">
          {/* Connection & Share Panel */}
          <section className="lg:w-2/3 glass-card p-6 sm:p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Wifi className="w-48 h-48 -mr-12 -mt-12" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
              <div className="bg-white p-3 rounded-2xl shadow-inner border border-slate-100 shrink-0">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="Participant QR"
                    className="w-32 h-32 sm:w-40 sm:h-40 rounded-xl"
                  />
                ) : (
                  <div className="w-40 h-40 bg-slate-50 animate-pulse rounded-xl" />
                )}
              </div>

              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gritfeat-green/10 text-gritfeat-green text-xs font-bold uppercase tracking-wider mb-3">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gritfeat-green opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-gritfeat-green"></span>
                  </span>
                  Share & Connect
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Invite Participants</h3>
                <p className="text-slate-500 mb-6 font-medium">Share the link below or let people scan the QR code to join the live voting room instantly.</p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 bg-slate-100/50 border border-slate-200 rounded-2xl px-4 py-3 font-mono text-sm text-slate-600 truncate flex items-center">
                    {participantUrl}
                  </div>
                  <button onClick={copyToClipboard} className="btn-primary flex items-center justify-center gap-2 min-w-[140px]">
                    {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy Link</>}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Critical Actions Panel */}
          <section className="lg:w-1/3 glass-card p-6 sm:p-8 flex flex-col justify-center border-t-8 border-red-500/20">
            <div className="text-center">
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-500 shadow-sm">
                <Square className="w-6 h-6 fill-current" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Emergency Reset</h3>
              <p className="text-sm text-slate-500 mb-6 font-medium">Permanently wipe all voting results and participants. This cannot be undone.</p>
              <button
                onClick={resetDatabase}
                className="w-full py-4 px-6 rounded-2xl bg-white border-2 border-red-100 text-red-600 font-bold hover:bg-red-600 hover:text-white hover:border-red-600 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                Clear All Stage Data
              </button>
            </div>
          </section>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-12 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {[
            { label: 'Live Participants', value: participantCount, icon: Users, color: 'blue' },
            { label: 'Award Categories', value: categories.length, icon: BarChart3, color: 'green' },
            { label: 'Time Control', value: currentSession?.active ? formatTime(timeLeft) : '--:--', icon: Clock, color: 'orange' },
            { label: 'Total Votes', value: categories.reduce((acc, cat) => acc + (cat.results ? Object.values(cat.results).reduce((a, b) => a + b, 0) : 0), 0), icon: Trophy, color: 'purple' }
          ].map((stat, i) => (
            <div key={i} className="glass-card p-6 text-center group">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-transform group-hover:scale-110 shadow-sm
                ${stat.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                  stat.color === 'green' ? 'bg-green-50 text-green-600' :
                    stat.color === 'orange' ? 'bg-orange-50 text-orange-600' :
                      'bg-purple-50 text-purple-600'}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <h4 className="text-3xl font-black text-slate-800 mb-1">{stat.value}</h4>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
            </div>
          ))}
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

            {/* Active Stage */}
            <div className="mb-12 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              {currentSession && currentSession.active ? (
                <div className="glass-card p-8 border-l-8 border-gritfeat-green relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-12 text-gritfeat-green/5">
                    <Play className="w-64 h-64 fill-current rotate-12" />
                  </div>

                  <div className="relative z-10">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
                      <div className="text-center md:text-left">
                        <div className="inline-block px-4 py-1.5 rounded-full bg-gritfeat-green text-white text-xs font-black uppercase tracking-widest mb-4 shadow-lg shadow-gritfeat-green/30">
                          Now Live & Accepting Votes
                        </div>
                        <h2 className="text-4xl font-black text-slate-800 mb-2">{currentSession.title}</h2>
                        <p className="text-slate-500 text-lg max-w-xl font-medium">{currentSession.description}</p>
                      </div>

                      <div className="flex flex-col items-center justify-center gap-1 bg-white shadow-xl rounded-3xl p-6 min-w-[180px] border border-slate-100">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Time Lapsed</span>
                        <span className="text-5xl font-black text-gritfeat-green font-mono tracking-tighter">
                          {currentSession.startTime ? formatTime(Math.floor((Date.now() - currentSession.startTime) / 1000)) : "0:00"}
                        </span>
                        <div className="flex items-center gap-2 mt-2 text-slate-400 font-bold text-sm">
                          <Users className="w-4 h-4" /> {participantCount} Active
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6 mb-10">
                      <h3 className="text-lg font-black text-slate-700 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-gritfeat-green" /> Live Response Feed
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        {currentSession.options.map((option, idx) => {
                          const votes = currentSession.results[option] || 0;
                          const totalVotes = Object.values(currentSession.results).reduce((a, b) => a + b, 0);
                          const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;

                          return (
                            <div key={idx} className="bg-slate-100/50 rounded-2xl p-4 border border-white">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-slate-700">{option}</span>
                                <span className="bg-white px-3 py-1 rounded-full text-xs font-black text-slate-600 shadow-sm border border-slate-100">{votes} Votes</span>
                              </div>
                              <div className="relative h-3 bg-white rounded-full overflow-hidden shadow-inner border border-slate-100">
                                <div
                                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-gritfeat-green to-gritfeat-green-light rounded-full transition-all duration-1000 ease-out"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <button
                        onClick={endVoting}
                        className="px-12 py-5 rounded-2xl bg-slate-800 text-white font-black hover:bg-slate-900 transition-all flex items-center gap-3 shadow-2xl shadow-slate-900/20 active:scale-95"
                      >
                        <Square className="w-5 h-5 fill-white" /> Complete Session
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass-card p-12 text-center border-2 border-dashed border-slate-200 bg-transparent flex flex-col items-center">
                  <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-6 text-slate-300">
                    <Play className="w-10 h-10 fill-current translate-x-1" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-400 mb-2">Stage is currently empty</h3>
                  <p className="text-slate-400 max-w-sm font-medium">Select a category below to start a new live voting session for your participants.</p>
                </div>
              )}
            </div>

            {/* Results Reveal Section */}
            <section className="mb-12 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <ResultsReveal
                categories={categories}
                onRevealWinner={revealWinner}
              />
            </section>

            {/* Categories Management Grid */}
            <section className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-black text-slate-800">All Categories</h2>
                <div className="flex gap-2">
                  <span className="px-4 py-1.5 bg-slate-100 rounded-full text-xs font-bold text-slate-500">{categories.length} Total</span>
                  <span className="px-4 py-1.5 bg-gritfeat-green/10 rounded-full text-xs font-bold text-gritfeat-green">{categories.filter(c => c.completed).length} Done</span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map((category) => {
                  const isActive = currentSession?.active && currentSession.categoryId === category.id;
                  const canStart = !category.completed && !isActive && (!currentSession || !currentSession.active);

                  return (
                    <div key={category.id} className={`glass-card p-6 flex flex-col relative overflow-hidden group hover:border-gritfeat-green/30 ${category.completed ? 'opacity-80 grayscale-[0.05]' : ''}`}>
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${category.completed ? 'bg-gritfeat-green text-white' : 'bg-slate-100 text-slate-400'}`}>
                          {category.completed ? <Check className="w-5 h-5" /> : <Play className="w-4 h-4 translate-x-0.5 fill-current" />}
                        </div>
                        <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                          {category.completed ? 'Archived' : isActive ? 'On Air' : 'Queued'}
                        </div>
                      </div>

                      <h3 className="text-xl font-bold text-slate-800 mb-2">{category.title}</h3>
                      <p className="text-sm text-slate-500 mb-6 flex-1 line-clamp-2 font-medium">{category.description}</p>

                      <div className="pt-6 border-t border-slate-100">
                        {canStart ? (
                          <button
                            onClick={() => startVoting(category.id)}
                            className="w-full btn-primary py-3 active:scale-95"
                          >
                            Launch Now
                          </button>
                        ) : isActive ? (
                          <div className="w-full py-3 bg-gritfeat-green/10 text-gritfeat-green font-black rounded-2xl flex items-center justify-center gap-2 animate-pulse">
                            Live Stream Active
                          </div>
                        ) : (
                          <div className="w-full py-3 bg-slate-50 text-slate-400 font-bold rounded-2xl flex items-center justify-center border border-slate-100">
                            Category Completed
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Instructions */}
            <div className="mt-12 text-center text-slate-400 font-medium">
              <p className="text-sm flex items-center justify-center gap-2">
                <span className="w-2 h-2 bg-gritfeat-green rounded-full"></span>
                Pro Tip: Share this admin screen on your projector to show live results to everyone!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
