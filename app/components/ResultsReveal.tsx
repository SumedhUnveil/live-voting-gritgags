"use client";

import { useState, useCallback } from "react";
import { Trophy, Eye, EyeOff, Sparkles } from "lucide-react";
import { CategoryResult, ResultsRevealProps } from "../../types";
import { SOUNDS } from "../../types/constants";
import WinnerRevealModal from "./WinnerRevealModal";

interface WinnerInfo {
  winner: string | string[];
  votes: number;
  isTie: boolean;
  totalVotes: number;
}

export default function ResultsReveal({
  categories,
  onRevealWinner,
}: ResultsRevealProps) {
  const [revealedCategories, setRevealedCategories] = useState<Set<string>>(
    new Set()
  );
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    categoryTitle: string;
    winnerName: string | string[];
  }>({
    isOpen: false,
    categoryTitle: "",
    winnerName: "",
  });

  // Calculate winner for a category
  const calculateWinner = useCallback(
    (results: Record<string, number>): WinnerInfo | null => {
      if (!results || Object.keys(results).length === 0) {
        return null;
      }

      const entries = Object.entries(results);
      const totalVotes = entries.reduce((sum, [, votes]) => sum + votes, 0);

      if (totalVotes === 0) {
        return null;
      }

      const maxVotes = Math.max(...entries.map(([, votes]) => votes));
      const winners = entries.filter(([, votes]) => votes === maxVotes);

      return {
        winner:
          winners.length === 1 ? winners[0][0] : winners.map(([name]) => name),
        votes: maxVotes,
        isTie: winners.length > 1,
        totalVotes,
      };
    },
    []
  );

  // Get top 3 results for a category
  const getTopResults = useCallback((results: Record<string, number>) => {
    if (!results || Object.keys(results).length === 0) return [];

    const entries = Object.entries(results);
    const sortedEntries = entries.sort((a, b) => b[1] - a[1]);
    const totalVotes = entries.reduce((sum, [, votes]) => sum + votes, 0);

    return sortedEntries.slice(0, 3).map(([name, votes], index) => ({
      position: index + 1,
      name,
      votes,
      percentage: totalVotes > 0 ? (votes / totalVotes) * 100 : 0,
    }));
  }, []);

  // Handle reveal winner
  const handleRevealWinner = useCallback(
    (categoryId: string, categoryTitle: string, results: Record<string, number>) => {
      setRevealedCategories(
        (prev) => new Set(Array.from(prev).concat(categoryId))
      );

      const winnerInfo = calculateWinner(results);
      if (winnerInfo) {
        setModalState({
          isOpen: true,
          categoryTitle: categoryTitle,
          winnerName: winnerInfo.winner,
        });
      }

      // Play applause sound
      try {
        const audio = new Audio(SOUNDS.APPLAUSE);
        audio.volume = 0.5;
        audio.play().catch(err => console.log("Audio play blocked:", err));
      } catch (err) {
        console.error("Audio error:", err);
      }

      onRevealWinner(categoryId);
    },
    [onRevealWinner, calculateWinner]
  );

  // Filter completed categories
  const completedCategories = categories.filter((cat) => cat.completed);

  if (completedCategories.length === 0) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-xl border-l-4 border-gray-300">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-500 mb-2">
            No Results Yet
          </h2>
          <p className="text-gray-400">
            Complete some voting categories to see results here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl p-8 shadow-xl border-l-4 border-[#7ebd41] relative overflow-hidden">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#7ebd41]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-[#7ebd41]" />
          </div>
          <h2 className="text-3xl font-bold text-[#4c4c4c] mb-2">
            Results Reveal Center
          </h2>
          <p className="text-lg text-gray-600">
            Reveal winners one by one to create suspense and excitement!
          </p>
        </div>

        {/* Results Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {completedCategories.map((category) => {
            const winnerInfo = category.results
              ? calculateWinner(category.results)
              : null;
            const topResults = category.results
              ? getTopResults(category.results)
              : [];
            const isRevealed =
              category.revealed || revealedCategories.has(category.id);

            return (
              <div
                key={category.id}
                className={`rounded-lg p-6 border-2 transition-all duration-300 ${isRevealed
                  ? "bg-gradient-to-br from-[#7ebd41]/10 to-[#7ebd41]/5 border-[#7ebd41]/30"
                  : "bg-gray-50 border-gray-200 hover:border-[#7ebd41]/50"
                  }`}
              >
                {/* Category Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-3 h-3 rounded-full ${isRevealed ? "bg-[#7ebd41]" : "bg-gray-400"
                        }`}
                    ></div>
                    <span
                      className={`text-xs font-semibold uppercase tracking-wide ${isRevealed ? "text-[#7ebd41]" : "text-gray-500"
                        }`}
                    >
                      {isRevealed ? "Revealed" : "Ready to Reveal"}
                    </span>
                  </div>
                  {winnerInfo && (
                    <div className="text-sm text-gray-600">
                      {winnerInfo.totalVotes} votes
                    </div>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-[#4c4c4c] mb-2">
                  {category.title}
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  {category.description}
                </p>

                {/* Winner Display (only if revealed) */}
                {isRevealed && winnerInfo && (
                  <div className="mb-4 p-4 bg-white rounded-lg border-2 border-[#7ebd41]/20">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-[#7ebd41]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Trophy className="w-6 h-6 text-[#7ebd41]" />
                      </div>
                      <h4 className="text-lg font-bold text-[#4c4c4c] mb-1">
                        {winnerInfo.isTie ? "It's a Tie!" : "Winner!"}
                      </h4>
                      <p className="text-xl font-semibold text-[#7ebd41] mb-2">
                        {Array.isArray(winnerInfo.winner)
                          ? winnerInfo.winner.join(" & ")
                          : winnerInfo.winner}
                      </p>
                      <p className="text-sm text-gray-600">
                        {winnerInfo.votes} votes
                        {winnerInfo.isTie && " each"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Top Results (only if revealed) */}
                {isRevealed && topResults.length > 0 && (
                  <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Final Results:
                    </h4>
                    <div className="space-y-2">
                      {topResults.map((result, index) => {
                        const medals = ["🥇", "🥈", "🥉"];
                        return (
                          <div
                            key={result.name}
                            className="flex justify-between items-center text-sm"
                          >
                            <div className="flex items-center space-x-2">
                              <span>
                                {medals[index] || `${result.position}.`}
                              </span>
                              <span className="font-medium text-gray-700">
                                {result.name}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-semibold text-gray-600">
                                {result.votes}
                              </span>
                              <span className="text-gray-500 text-xs ml-1">
                                ({result.percentage.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* No Votes Message */}
                {!winnerInfo && (
                  <div className="mb-4 p-3 bg-gray-100 rounded-lg text-center">
                    <p className="text-sm text-gray-500">No votes cast</p>
                  </div>
                )}

                {/* Reveal Button */}
                <div className="space-y-2">
                  {!isRevealed && winnerInfo ? (
                    <button
                      onClick={() => handleRevealWinner(category.id, category.title, category.results || {})}
                      className="w-full bg-[#7ebd41] text-white py-3 px-4 rounded-lg font-semibold hover:bg-[#6ba835] transition-all duration-200 flex items-center justify-center space-x-2 transform hover:scale-105"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Reveal Winner</span>
                    </button>
                  ) : !isRevealed && !winnerInfo ? (
                    <div className="w-full bg-gray-300 text-gray-500 py-3 px-4 rounded-lg font-semibold flex items-center justify-center cursor-not-allowed">
                      <EyeOff className="w-4 h-4 mr-2" />
                      No Votes to Reveal
                    </div>
                  ) : (
                    <div className="w-full bg-[#7ebd41]/20 text-[#7ebd41] py-3 px-4 rounded-lg font-semibold flex items-center justify-center">
                      <Eye className="w-4 h-4 mr-2" />
                      Winner Revealed
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Stats */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-[#7ebd41] rounded-full mr-2"></div>
                <span className="text-[#7ebd41] font-semibold">
                  {revealedCategories.size +
                    categories.filter((cat) => cat.revealed).length}{" "}
                  Revealed
                </span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
                <span className="text-gray-600">
                  {completedCategories.length -
                    revealedCategories.size -
                    categories.filter((cat) => cat.revealed).length}{" "}
                  Pending
                </span>
              </div>
            </div>
            <div className="text-gray-500">
              {completedCategories.length} Categories Complete
            </div>
          </div>
        </div>
      </div>

      <WinnerRevealModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
        categoryTitle={modalState.categoryTitle}
        winnerName={modalState.winnerName}
      />
    </>
  );
}
