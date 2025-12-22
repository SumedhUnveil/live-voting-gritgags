// Test file for ParticipantStateManager
import { ParticipantStateManager } from "../participantStateManager";

// Mock localStorage for testing
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("ParticipantStateManager", () => {
  let stateManager: ParticipantStateManager;
  const testParticipantId = "test-participant-123";

  beforeEach(() => {
    localStorageMock.clear();
    stateManager = new ParticipantStateManager(testParticipantId);
  });

  test("should initialize with default state", () => {
    const voterState = stateManager.getVoterState();

    expect(voterState.participantId).toBe(testParticipantId);
    expect(voterState.hasVoted).toBe(false);
    expect(voterState.selectedOption).toBe(null);
    expect(voterState.currentCategoryId).toBe(null);
    expect(voterState.viewState).toBe("waiting");
  });

  test("should validate vote attempts correctly", () => {
    const categoryId = "test-category";

    // Should be invalid without setting current category
    let validation = stateManager.validateVoteAttempt(categoryId, "option1");
    expect(validation.isValid).toBe(false);
    expect(validation.reason).toBe("Category mismatch");

    // Set current category
    stateManager.handleVotingSessionStart(categoryId);

    // Should be valid now
    validation = stateManager.validateVoteAttempt(categoryId, "option1");
    expect(validation.isValid).toBe(true);

    // Record a vote
    stateManager.recordVote(categoryId, "option1");

    // Should be invalid after voting
    validation = stateManager.validateVoteAttempt(categoryId, "option2");
    expect(validation.isValid).toBe(false);
    expect(validation.reason).toBe("Already voted for this category");
  });

  test("should prevent duplicate votes", () => {
    const categoryId = "test-category";
    stateManager.handleVotingSessionStart(categoryId);

    // First vote should succeed
    const firstVote = stateManager.recordVote(categoryId, "option1");
    expect(firstVote).toBe(true);
    expect(stateManager.hasVotedForCategory(categoryId)).toBe(true);

    // Second vote should fail
    const secondVote = stateManager.recordVote(categoryId, "option2");
    expect(secondVote).toBe(false);

    // Should still have the first vote
    expect(stateManager.getVoteForCategory(categoryId)).toBe("option1");
  });

  test("should persist state across instances", () => {
    const categoryId = "test-category";
    stateManager.handleVotingSessionStart(categoryId);
    stateManager.recordVote(categoryId, "option1");

    // Create new instance with same participant ID
    const newStateManager = new ParticipantStateManager(testParticipantId);

    // Should restore previous state
    expect(newStateManager.hasVotedForCategory(categoryId)).toBe(true);
    expect(newStateManager.getVoteForCategory(categoryId)).toBe("option1");

    const voterState = newStateManager.getVoterState();
    expect(voterState.hasVoted).toBe(true);
    expect(voterState.selectedOption).toBe("option1");
  });

  test("should handle voting session lifecycle", () => {
    const categoryId = "test-category";

    // Start voting session
    stateManager.handleVotingSessionStart(categoryId);
    let voterState = stateManager.getVoterState();
    expect(voterState.currentCategoryId).toBe(categoryId);
    expect(voterState.viewState).toBe("voting");

    // Record vote
    stateManager.recordVote(categoryId, "option1");
    voterState = stateManager.getVoterState();
    expect(voterState.hasVoted).toBe(true);
    expect(voterState.viewState).toBe("voted");

    // End voting session
    stateManager.handleVotingSessionEnd();
    voterState = stateManager.getVoterState();
    expect(voterState.viewState).toBe("voted");

    // Complete session
    stateManager.handleSessionComplete();
    voterState = stateManager.getVoterState();
    expect(voterState.viewState).toBe("session-complete");
  });

  test("should track voting history", () => {
    const category1 = "category-1";
    const category2 = "category-2";

    // Vote for first category
    stateManager.handleVotingSessionStart(category1);
    stateManager.recordVote(category1, "option1");

    // Vote for second category
    stateManager.handleVotingSessionStart(category2);
    stateManager.recordVote(category2, "option2");

    const history = stateManager.getVotingHistory();
    expect(history).toHaveLength(2);
    expect(history[0].categoryId).toBe(category1);
    expect(history[0].selectedOption).toBe("option1");
    expect(history[1].categoryId).toBe(category2);
    expect(history[1].selectedOption).toBe("option2");
  });

  test("should handle state listeners", () => {
    const listener = jest.fn();
    const unsubscribe = stateManager.subscribe(listener);

    // Should call listener on state changes
    stateManager.updateVoterState({ viewState: "voting" });
    expect(listener).toHaveBeenCalledTimes(1);

    // Should not call listener after unsubscribe
    unsubscribe();
    stateManager.updateVoterState({ viewState: "voted" });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
