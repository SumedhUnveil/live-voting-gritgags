/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ResultsReveal from "../ResultsReveal";

// Mock the ConfettiAnimation component
jest.mock("../ConfettiAnimation", () => {
  return function MockConfettiAnimation({ isActive, onComplete }: any) {
    return (
      <div data-testid="confetti-animation" data-active={isActive}>
        {isActive && (
          <button onClick={onComplete} data-testid="complete-confetti">
            Complete Animation
          </button>
        )}
      </div>
    );
  };
});

const mockCategories = [
  {
    id: "category-1",
    title: "Best Actor",
    description: "Outstanding performance in a leading role",
    results: {
      "John Doe": 5,
      "Jane Smith": 3,
      "Bob Johnson": 2,
    },
    completed: true,
    revealed: false,
  },
  {
    id: "category-2",
    title: "Best Director",
    description: "Excellence in film direction",
    results: {
      "Alice Brown": 4,
      "Charlie Wilson": 4,
    },
    completed: true,
    revealed: false,
  },
];

describe("ResultsReveal Integration", () => {
  const mockOnRevealWinner = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders categories with reveal buttons", () => {
    render(
      <ResultsReveal
        categories={mockCategories}
        onRevealWinner={mockOnRevealWinner}
      />
    );

    expect(screen.getByText("Best Actor")).toBeInTheDocument();
    expect(screen.getByText("Best Director")).toBeInTheDocument();
    expect(screen.getAllByText("Reveal Winner")).toHaveLength(2);
  });

  it("triggers confetti animation when revealing winner", async () => {
    render(
      <ResultsReveal
        categories={mockCategories}
        onRevealWinner={mockOnRevealWinner}
      />
    );

    const revealButtons = screen.getAllByText("Reveal Winner");

    // Click the first reveal button
    fireEvent.click(revealButtons[0]);

    // Check that confetti animation is active
    const confettiAnimation = screen.getByTestId("confetti-animation");
    expect(confettiAnimation).toHaveAttribute("data-active", "true");

    // Check that onRevealWinner was called
    expect(mockOnRevealWinner).toHaveBeenCalledWith("category-1");
  });

  it("stops confetti animation when completed", async () => {
    render(
      <ResultsReveal
        categories={mockCategories}
        onRevealWinner={mockOnRevealWinner}
      />
    );

    const revealButtons = screen.getAllByText("Reveal Winner");

    // Click reveal button to start confetti
    fireEvent.click(revealButtons[0]);

    // Confetti should be active
    let confettiAnimation = screen.getByTestId("confetti-animation");
    expect(confettiAnimation).toHaveAttribute("data-active", "true");

    // Complete the confetti animation
    const completeButton = screen.getByTestId("complete-confetti");
    fireEvent.click(completeButton);

    // Wait for state update
    await waitFor(() => {
      confettiAnimation = screen.getByTestId("confetti-animation");
      expect(confettiAnimation).toHaveAttribute("data-active", "false");
    });
  });

  it("shows winner information after reveal", () => {
    render(
      <ResultsReveal
        categories={mockCategories}
        onRevealWinner={mockOnRevealWinner}
      />
    );

    const revealButtons = screen.getAllByText("Reveal Winner");

    // Click reveal button
    fireEvent.click(revealButtons[0]);

    // Check that winner is displayed
    expect(screen.getByText("Winner!")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("5 votes")).toBeInTheDocument();
  });

  it("handles tie scenarios correctly", () => {
    render(
      <ResultsReveal
        categories={mockCategories}
        onRevealWinner={mockOnRevealWinner}
      />
    );

    const revealButtons = screen.getAllByText("Reveal Winner");

    // Click reveal button for tied category
    fireEvent.click(revealButtons[1]);

    // Check that tie is displayed
    expect(screen.getByText("It's a Tie!")).toBeInTheDocument();
    expect(
      screen.getByText("Alice Brown & Charlie Wilson")
    ).toBeInTheDocument();
    expect(screen.getByText("4 votes each")).toBeInTheDocument();
  });

  it("shows no votes message for empty results", () => {
    const emptyCategory = [
      {
        id: "empty-category",
        title: "Empty Category",
        description: "No votes cast",
        results: {},
        completed: true,
        revealed: false,
      },
    ];

    render(
      <ResultsReveal
        categories={emptyCategory}
        onRevealWinner={mockOnRevealWinner}
      />
    );

    expect(screen.getByText("No votes cast")).toBeInTheDocument();
    expect(screen.getByText("No Votes to Reveal")).toBeInTheDocument();
  });

  it("updates button state after reveal", () => {
    render(
      <ResultsReveal
        categories={mockCategories}
        onRevealWinner={mockOnRevealWinner}
      />
    );

    const revealButtons = screen.getAllByText("Reveal Winner");

    // Click reveal button
    fireEvent.click(revealButtons[0]);

    // Button should change to "Winner Revealed"
    expect(screen.getByText("Winner Revealed")).toBeInTheDocument();

    // Should have one less "Reveal Winner" button
    expect(screen.getAllByText("Reveal Winner")).toHaveLength(1);
  });
});
