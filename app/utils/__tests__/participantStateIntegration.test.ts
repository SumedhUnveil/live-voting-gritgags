// Integration test for participant state management workflow
import { ParticipantStateManager } from "../participantStateManager";

// Mock localStorage
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

Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("Participant State Management Integration", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  test("complete voting workflow with state persistence", () => {
    const participantId = "integration-test-participant";
    const category1 = "best-developer";
    const category2 = "coffee-addict";

    // === Phase 1: Initial connection ===
    let stateManager = new ParticipantStateManager(participantId);
    let voterState = stateManager.getVoterState();

    expect(voterState.participantId).toBe(participantId);
    expect(voterState.viewState).toBe("waiting");
    expect(voterState.hasVoted).toBe(false);

    // === Phase 2: First category starts ===
    stateManager.handleVotingSessionStart(category1);
    voterState = stateManager.getVoterState();

    expect(voterState.currentCategoryId).toBe(category1);
    expect(voterState.viewState).toBe("voting");
    expect(voterState.hasVoted).toBe(false);

    // === Phase 3: Participant votes ===
    const voteValidation = stateManager.validateVoteAttempt(category1, "Alice");
    expect(voteValidation.isValid).toBe(true);

    const voteSuccess = stateManager.recordVote(category1, "Alice");
    expect(voteSuccess).toBe(true);

    voterState = stateManager.getVoterState();
    expect(voterState.hasVoted).toBe(true);
    expect(voterState.selectedOption).toBe("Alice");
    expect(voterState.viewState).toBe("voted");

    // === Phase 4: Try to vote again (should fail) ===
    const duplicateValidation = stateManager.validateVoteAttempt(
      category1,
      "Bob"
    );
    expect(duplicateValidation.isValid).toBe(false);
    expect(duplicateValidation.reason).toBe("Already voted for this category");

    // === Phase 5: Category ends ===
    stateManager.handleVotingSessionEnd();
    voterState = stateManager.getVoterState();
    expect(voterState.viewState).toBe("voted");

    // === Phase 6: Simulate page refresh (new state manager instance) ===
    stateManager = new ParticipantStateManager(participantId);
    voterState = stateManager.getVoterState();

    // State should be restored
    expect(voterState.participantId).toBe(participantId);
    expect(voterState.hasVoted).toBe(true);
    expect(voterState.selectedOption).toBe("Alice");
    expect(stateManager.hasVotedForCategory(category1)).toBe(true);
    expect(stateManager.getVoteForCategory(category1)).toBe("Alice");

    // === Phase 7: Second category starts ===
    stateManager.handleVotingSessionStart(category2);
    voterState = stateManager.getVoterState();

    // Should be able to vote for new category
    expect(voterState.currentCategoryId).toBe(category2);
    expect(voterState.viewState).toBe("voting");
    expect(voterState.hasVoted).toBe(false); // Reset for new category
    expect(voterState.selectedOption).toBe(null); // Reset for new category

    // === Phase 8: Vote for second category ===
    const secondVoteValidation = stateManager.validateVoteAttempt(
      category2,
      "Charlie"
    );
    expect(secondVoteValidation.isValid).toBe(true);

    const secondVoteSuccess = stateManager.recordVote(category2, "Charlie");
    expect(secondVoteSuccess).toBe(true);

    // === Phase 9: Verify voting history ===
    const history = stateManager.getVotingHistory();
    expect(history).toHaveLength(2);
    expect(history[0].categoryId).toBe(category1);
    expect(history[0].selectedOption).toBe("Alice");
    expect(history[1].categoryId).toBe(category2);
    expect(history[1].selectedOption).toBe("Charlie");

    // === Phase 10: Session complete ===
    stateManager.handleSessionComplete();
    voterState = stateManager.getVoterState();
    expect(voterState.viewState).toBe("session-complete");

    // === Phase 11: Final state verification ===
    const summary = stateManager.getStateSummary();
    expect(summary.participantId).toBe(participantId);
    expect(summary.totalVotes).toBe(2);
    expect(summary.hasVoted).toBe(true);
    expect(summary.viewState).toBe("session-complete");
  });

  test("reconnection scenario with state recovery", () => {
    const participantId = "reconnection-test";
    const categoryId = "test-category";

    // === Initial session ===
    let stateManager = new ParticipantStateManager(participantId);
    stateManager.handleVotingSessionStart(categoryId);
    stateManager.recordVote(categoryId, "Option A");

    // === Simulate disconnection and reconnection ===
    // Create new state manager instance (simulates page refresh/reconnection)
    stateManager = new ParticipantStateManager(participantId);

    // State should be recovered
    expect(stateManager.hasVotedForCategory(categoryId)).toBe(true);
    expect(stateManager.getVoteForCategory(categoryId)).toBe("Option A");

    // === Simulate server sending voting session start for same category ===
    stateManager.handleVotingSessionStart(categoryId);
    const voterState = stateManager.getVoterState();

    // Should recognize already voted
    expect(voterState.hasVoted).toBe(true);
    expect(voterState.selectedOption).toBe("Option A");
    expect(voterState.viewState).toBe("voted");

    // Should prevent duplicate voting
    const validation = stateManager.validateVoteAttempt(categoryId, "Option B");
    expect(validation.isValid).toBe(false);
  });

  test("state listener notifications", () => {
    const participantId = "listener-test";
    const stateManager = new ParticipantStateManager(participantId);

    const stateChanges: any[] = [];
    const unsubscribe = stateManager.subscribe((state) => {
      stateChanges.push({
        viewState: state.voterState.viewState,
        hasVoted: state.voterState.hasVoted,
        timestamp: Date.now(),
      });
    });

    // Trigger state changes
    stateManager.handleVotingSessionStart("test-category");
    stateManager.recordVote("test-category", "Option A");
    stateManager.handleVotingSessionEnd();
    stateManager.handleSessionComplete();

    // Should have received notifications for each change
    expect(stateChanges.length).toBeGreaterThan(0);

    // Verify state progression
    const viewStates = stateChanges.map((change) => change.viewState);
    expect(viewStates).toContain("voting");
    expect(viewStates).toContain("voted");
    expect(viewStates).toContain("session-complete");

    unsubscribe();
  });
});
