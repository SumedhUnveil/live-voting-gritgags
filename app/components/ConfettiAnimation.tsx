"use client";

import { useEffect, useRef, useCallback } from "react";
import { ConfettiAnimationProps } from "../../types";
import { CONFETTI_CONFIG } from "../../types/constants";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  gravity: number;
  life: number;
  maxLife: number;
}

export default function ConfettiAnimation({
  isActive,
  duration = CONFETTI_CONFIG.duration,
  particleCount = CONFETTI_CONFIG.particleCount,
  colors = CONFETTI_CONFIG.colors,
  onComplete,
}: ConfettiAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  const startTimeRef = useRef<number>();

  // Create a single particle
  const createParticle = useCallback(
    (canvas: HTMLCanvasElement): Particle => {
      const centerX = canvas.width / 2;
      const centerY = canvas.height * 0.3; // Start from upper portion

      // Random angle and velocity for spread effect
      const angle = (Math.random() - 0.5) * Math.PI; // -90 to 90 degrees
      const velocity = Math.random() * 15 + 5; // Random velocity between 5-20

      return {
        x: centerX + (Math.random() - 0.5) * 100, // Small horizontal spread
        y: centerY,
        vx: Math.sin(angle) * velocity,
        vy: Math.cos(angle) * velocity * -1, // Negative for upward motion
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4, // Size between 4-12
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        gravity: 0.5 + Math.random() * 0.3, // Gravity between 0.5-0.8
        life: 1,
        maxLife: duration / 1000, // Convert to seconds
      };
    },
    [colors, duration]
  );

  // Initialize particles
  const initializeParticles = useCallback(
    (canvas: HTMLCanvasElement) => {
      particlesRef.current = [];
      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push(createParticle(canvas));
      }
    },
    [particleCount, createParticle]
  );

  // Update particle physics
  const updateParticle = useCallback(
    (particle: Particle, deltaTime: number) => {
      // Update position
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;

      // Apply gravity
      particle.vy += particle.gravity * deltaTime;

      // Update rotation
      particle.rotation += particle.rotationSpeed * deltaTime;

      // Update life
      particle.life -= deltaTime / particle.maxLife;

      return particle.life > 0;
    },
    []
  );

  // Draw a single particle
  const drawParticle = useCallback(
    (ctx: CanvasRenderingContext2D, particle: Particle) => {
      ctx.save();

      // Set opacity based on life remaining
      ctx.globalAlpha = Math.max(0, particle.life);

      // Move to particle position and rotate
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);

      // Set color and draw rectangle (confetti piece)
      ctx.fillStyle = particle.color;
      ctx.fillRect(
        -particle.size / 2,
        -particle.size / 4,
        particle.size,
        particle.size / 2
      );

      ctx.restore();
    },
    []
  );

  // Main animation loop
  const animate = useCallback(
    (currentTime: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Initialize start time
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime;
      }

      const elapsed = currentTime - startTimeRef.current;
      const deltaTime = 16.67 / 1000; // Assume 60fps for consistent physics

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter((particle) => {
        const isAlive = updateParticle(particle, deltaTime);
        if (isAlive) {
          drawParticle(ctx, particle);
        }
        return isAlive;
      });

      // Continue animation if particles exist and within duration
      if (particlesRef.current.length > 0 && elapsed < duration) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Animation complete
        startTimeRef.current = undefined;
        if (onComplete) {
          onComplete();
        }
      }
    },
    [duration, updateParticle, drawParticle, onComplete]
  );

  // Resize canvas to match container
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = canvas.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }, []);

  // Start animation
  const startAnimation = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Stop any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    // Reset state
    startTimeRef.current = undefined;

    // Resize canvas and initialize particles
    resizeCanvas();
    initializeParticles(canvas);

    // Start animation loop
    animationRef.current = requestAnimationFrame(animate);
  }, [resizeCanvas, initializeParticles, animate]);

  // Stop animation
  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }
    startTimeRef.current = undefined;
    particlesRef.current = [];

    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, []);

  // Handle isActive prop changes
  useEffect(() => {
    if (isActive) {
      startAnimation();
    } else {
      stopAnimation();
    }

    return () => {
      stopAnimation();
    };
  }, [isActive, startAnimation, stopAnimation]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      resizeCanvas();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [resizeCanvas]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAnimation();
    };
  }, [stopAnimation]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-50"
      style={{
        width: "100%",
        height: "100%",
      }}
    />
  );
}
