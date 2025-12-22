// Utility types and type guards for voting UX redesign

import { VotingSession, VoterState, Category, CategoryResult } from "./voting";
import { CATEGORY_STATUS, SESSION_PHASES, VIEW_STATES } from "./constants";

// Type guards for runtime type checking
export function isVotingSession(obj: any): obj is VotingSession {
  return (
    obj &&
    typeof obj.id === "string" &&
    typeof obj.categoryId === "string" &&
    typeof obj.title === "string" &&
    typeof obj.description === "string" &&
    typeof obj.active === "boolean" &&
    typeof obj.startTime === "number" &&
    typeof obj.endTime === "number" &&
    typeof obj.results === "object" &&
    Array.isArray(obj.options) &&
    typeof obj.phase === "string" &&
    typeof obj.adminControlled === "boolean"
  );
}

export function isVoterState(obj: any): obj is VoterState {
  return (
    obj &&
    typeof obj.participantId === "string" &&
    (obj.currentCategoryId === null ||
      typeof obj.currentCategoryId === "string") &&
    typeof obj.hasVoted === "boolean" &&
    (obj.selectedOption === null || typeof obj.selectedOption === "string") &&
    typeof obj.viewState === "string"
  );
}

export function isCategory(obj: any): obj is Category {
  return (
    obj &&
    typeof obj.id === "string" &&
    typeof obj.title === "string" &&
    typeof obj.description === "string" &&
    Array.isArray(obj.options) &&
    typeof obj.status === "string"
  );
}

export function isCategoryResult(obj: any): obj is CategoryResult {
  return (
    obj &&
    typeof obj.categoryId === "string" &&
    typeof obj.title === "string" &&
    typeof obj.description === "string" &&
    typeof obj.results === "object" &&
    (typeof obj.winner === "string" || Array.isArray(obj.winner)) &&
    typeof obj.totalVotes === "number" &&
    typeof obj.revealed === "boolean"
  );
}

// Utility functions for working with voting data
export function calculateWinner(results: Record<string, number>): {
  winner: string | string[];
  maxVotes: number;
  isTie: boolean;
} {
  if (!results || Object.keys(results).length === 0) {
    return { winner: "", maxVotes: 0, isTie: false };
  }

  const entries = Object.entries(results);
  const maxVotes = Math.max(...entries.map(([_, votes]) => votes));
  const winners = entries.filter(([_, votes]) => votes === maxVotes);

  if (winners.length === 1) {
    return {
      winner: winners[0][0],
      maxVotes,
      isTie: false,
    };
  } else {
    return {
      winner: winners.map(([name, _]) => name),
      maxVotes,
      isTie: true,
    };
  }
}

export function calculatePercentage(votes: number, totalVotes: number): number {
  if (totalVotes === 0) return 0;
  return Math.round((votes / totalVotes) * 100 * 10) / 10; // Round to 1 decimal place
}

export function getTotalVotes(results: Record<string, number>): number {
  return Object.values(results).reduce((sum, votes) => sum + votes, 0);
}

export function getTopResults(
  results: Record<string, number>,
  maxResults: number = 3
): Array<{
  position: number;
  name: string;
  votes: number;
  percentage: number;
  isTie: boolean;
}> {
  if (!results || Object.keys(results).length === 0) return [];

  const entries = Object.entries(results);
  const sortedEntries = entries.sort((a, b) => b[1] - a[1]);
  const totalVotes = getTotalVotes(results);

  const uniqueVoteCounts = Array.from(
    new Set(sortedEntries.map(([_, votes]) => votes))
  );

  let topResults = [];
  let currentPosition = 1;

  for (
    let i = 0;
    i < uniqueVoteCounts.length && topResults.length < maxResults;
    i++
  ) {
    const voteCount = uniqueVoteCounts[i];
    const tiedEntries = sortedEntries.filter(
      ([_, votes]) => votes === voteCount
    );

    if (tiedEntries.length === 1) {
      topResults.push({
        position: currentPosition,
        name: tiedEntries[0][0],
        votes: tiedEntries[0][1],
        percentage: calculatePercentage(tiedEntries[0][1], totalVotes),
        isTie: false,
      });
      currentPosition++;
    } else {
      const tiedNames = tiedEntries.map(([name, _]) => name).join(" & ");
      topResults.push({
        position: currentPosition,
        name: tiedNames,
        votes: tiedEntries[0][1],
        percentage: calculatePercentage(tiedEntries[0][1], totalVotes),
        isTie: true,
      });
      currentPosition++;
    }
  }

  return topResults;
}

// Session state helpers
export function canStartVoting(category: Category): boolean {
  return category.status === CATEGORY_STATUS.NOT_STARTED;
}

export function canStopVoting(category: Category): boolean {
  return category.status === CATEGORY_STATUS.ACTIVE;
}

export function canRevealWinner(category: Category): boolean {
  return category.status === CATEGORY_STATUS.COMPLETED;
}

export function isVotingActive(session: VotingSession | null): boolean {
  return (
    session !== null &&
    session.active &&
    session.phase === SESSION_PHASES.VOTING
  );
}

export function isSessionComplete(session: VotingSession | null): boolean {
  return session !== null && session.phase === SESSION_PHASES.COMPLETED;
}

export function isWinnerRevealed(session: VotingSession | null): boolean {
  return session !== null && session.phase === SESSION_PHASES.REVEALED;
}

// Participant state helpers
export function canParticipantVote(
  voterState: VoterState,
  session: VotingSession | null
): boolean {
  return (
    session !== null &&
    isVotingActive(session) &&
    !voterState.hasVoted &&
    voterState.viewState === VIEW_STATES.VOTING
  );
}

export function shouldShowConfirmation(voterState: VoterState): boolean {
  return voterState.selectedOption !== null && !voterState.hasVoted;
}

export function getWaitingMessage(
  voterState: VoterState,
  session: VotingSession | null
): string {
  if (!session) {
    return "Waiting for admin to start voting session";
  }

  switch (voterState.viewState) {
    case VIEW_STATES.WAITING:
      return "Waiting for admin to start voting session";
    case VIEW_STATES.VOTING:
      return "Cast your vote below";
    case VIEW_STATES.VOTED:
      return "Vote submitted! Waiting for other participants...";
    case VIEW_STATES.SESSION_COMPLETE:
      return "Voting session complete";
    default:
      return "Wait for the admin to begin the next category";
  }
}

// Time formatting utilities
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  return formatTime(seconds);
}

// Validation utilities
export function validateVote(nominee: string, options: string[]): boolean {
  return nominee.trim() !== "" && options.includes(nominee);
}

export function validateCategoryId(
  categoryId: string,
  categories: Category[]
): boolean {
  return categories.some((category) => category.id === categoryId);
}

// Search utilities
export function filterNominees(
  nominees: string[],
  searchQuery: string
): string[] {
  if (!searchQuery.trim()) return nominees;

  const query = searchQuery.toLowerCase().trim();
  return nominees.filter((nominee) => nominee.toLowerCase().includes(query));
}

export function highlightSearchMatch(
  text: string,
  searchQuery: string
): string {
  if (!searchQuery.trim()) return text;

  const regex = new RegExp(`(${searchQuery})`, "gi");
  return text.replace(regex, "<mark>$1</mark>");
}
