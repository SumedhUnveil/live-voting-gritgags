/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import ConfettiAnimation from "../ConfettiAnimation";

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => {
  setTimeout(cb, 16);
  return 1;
});

global.cancelAnimationFrame = jest.fn();

// Mock HTMLCanvasElement methods
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  clearRect: jest.fn(),
  fillRect: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  translate: jest.fn(),
  rotate: jest.fn(),
  set fillStyle(value) {},
  set globalAlpha(value) {},
}));

describe("ConfettiAnimation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders canvas element", () => {
    render(<ConfettiAnimation isActive={false} />);

    const canvas = document.querySelector("canvas");
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveClass(
      "absolute",
      "inset-0",
      "pointer-events-none",
      "z-50"
    );
  });

  it("starts animation when isActive is true", () => {
    const onComplete = jest.fn();
    render(<ConfettiAnimation isActive={true} onComplete={onComplete} />);

    expect(global.requestAnimationFrame).toHaveBeenCalled();
  });

  it("does not start animation when isActive is false", () => {
    render(<ConfettiAnimation isActive={false} />);

    expect(global.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it("calls onComplete callback when provided", (done) => {
    const onComplete = jest.fn(() => {
      expect(onComplete).toHaveBeenCalled();
      done();
    });

    render(
      <ConfettiAnimation
        isActive={true}
        duration={100}
        particleCount={1}
        onComplete={onComplete}
      />
    );

    // Fast-forward time to trigger completion
    setTimeout(() => {
      // Animation should complete after duration
    }, 150);
  });

  it("accepts custom configuration props", () => {
    const customColors = ["#FF0000", "#00FF00", "#0000FF"];
    const customDuration = 2000;
    const customParticleCount = 50;

    render(
      <ConfettiAnimation
        isActive={true}
        duration={customDuration}
        particleCount={customParticleCount}
        colors={customColors}
      />
    );

    // Component should render without errors with custom props
    const canvas = document.querySelector("canvas");
    expect(canvas).toBeInTheDocument();
  });

  it("cleans up animation on unmount", () => {
    const { unmount } = render(<ConfettiAnimation isActive={true} />);

    unmount();

    expect(global.cancelAnimationFrame).toHaveBeenCalled();
  });
});
