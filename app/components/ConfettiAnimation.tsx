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
      // Logic for multi-source confetti (cannons at bottom left/right + top burst)
      const mode = Math.random();
      let x, y, vx, vy;

      if (mode < 0.4) {
        // Bottom Left Cannon
        x = 0;
        y = canvas.height;
        vx = Math.random() * 25 + 10;
        vy = (Math.random() * 25 + 15) * -1;
      } else if (mode < 0.8) {
        // Bottom Right Cannon
        x = canvas.width;
        y = canvas.height;
        vx = (Math.random() * 25 + 10) * -1;
        vy = (Math.random() * 25 + 15) * -1;
      } else {
        // Top Burst
        x = canvas.width / 2 + (Math.random() - 0.5) * canvas.width;
        y = -20;
        vx = (Math.random() - 0.5) * 10;
        vy = Math.random() * 10;
      }

      return {
        x,
        y,
        vx,
        vy,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 10 + 5,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.4,
        gravity: 0.8 + Math.random() * 0.4, // Increased gravity (was 0.5-0.8)
        life: 1,
        maxLife: (duration / 1000) * (0.8 + Math.random() * 0.4),
      };
    },
    [colors, duration]
  );

  // Initialize particles
  const initializeParticles = useCallback(
    (canvas: HTMLCanvasElement) => {
      particlesRef.current = [];
      // Triple the particle count for a MORE PLEASING effect
      const actualCount = particleCount * 3;
      for (let i = 0; i < actualCount; i++) {
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

  // Resize canvas to match screen
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
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
      className="fixed inset-0 pointer-events-none z-[9999]"
      style={{
        width: "100vw",
        height: "100vh",
      }}
    />
  );
}
