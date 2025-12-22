"use client";

import { useState } from "react";
import { Sparkles, RotateCcw } from "lucide-react";
import ConfettiAnimation from "./ConfettiAnimation";
import { CONFETTI_CONFIG } from "../../types/constants";

interface ConfettiConfig {
  duration: number;
  particleCount: number;
  colors: readonly string[];
}

export default function ConfettiDemo() {
  const [isActive, setIsActive] = useState(false);
  const [customConfig, setCustomConfig] = useState<ConfettiConfig>({
    duration: CONFETTI_CONFIG.duration,
    particleCount: CONFETTI_CONFIG.particleCount,
    colors: CONFETTI_CONFIG.colors,
  });

  const handleTrigger = () => {
    setIsActive(true);
  };

  const handleComplete = () => {
    setIsActive(false);
  };

  const handleReset = () => {
    setIsActive(false);
  };

  return (
    <div className="bg-white rounded-xl p-8 shadow-xl border-l-4 border-[#7ebd41] relative overflow-hidden">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[#7ebd41]/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-[#7ebd41]" />
        </div>
        <h2 className="text-3xl font-bold text-[#4c4c4c] mb-2">
          Confetti Animation Demo
        </h2>
        <p className="text-lg text-gray-600">
          Test the confetti animation with customizable settings
        </p>
      </div>

      {/* Configuration Controls */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-50 rounded-lg p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Duration (ms)
          </label>
          <input
            type="range"
            min="1000"
            max="10000"
            step="500"
            value={customConfig.duration}
            onChange={(e) =>
              setCustomConfig((prev) => ({
                ...prev,
                duration: parseInt(e.target.value),
              }))
            }
            className="w-full"
          />
          <div className="text-sm text-gray-600 mt-1">
            {customConfig.duration}ms
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Particle Count
          </label>
          <input
            type="range"
            min="20"
            max="200"
            step="10"
            value={customConfig.particleCount}
            onChange={(e) =>
              setCustomConfig((prev) => ({
                ...prev,
                particleCount: parseInt(e.target.value),
              }))
            }
            className="w-full"
          />
          <div className="text-sm text-gray-600 mt-1">
            {customConfig.particleCount} particles
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Color Scheme
          </label>
          <select
            value={
              customConfig.colors === CONFETTI_CONFIG.colors
                ? "default"
                : "custom"
            }
            onChange={(e) => {
              if (e.target.value === "default") {
                setCustomConfig((prev) => ({
                  ...prev,
                  colors: CONFETTI_CONFIG.colors,
                }));
              } else if (e.target.value === "gold") {
                setCustomConfig((prev) => ({
                  ...prev,
                  colors: ["#FFD700", "#FFA500", "#FF8C00", "#DAA520"] as const,
                }));
              } else if (e.target.value === "rainbow") {
                setCustomConfig((prev) => ({
                  ...prev,
                  colors: [
                    "#FF6B6B",
                    "#4ECDC4",
                    "#45B7D1",
                    "#96CEB4",
                    "#FFEAA7",
                  ] as const,
                }));
              }
            }}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="default">Default</option>
            <option value="gold">Gold Theme</option>
            <option value="rainbow">Rainbow</option>
          </select>
        </div>
      </div>

      {/* Color Preview */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          Color Preview:
        </h3>
        <div className="flex space-x-2">
          {customConfig.colors.map((color, index) => (
            <div
              key={index}
              className="w-8 h-8 rounded-full border-2 border-gray-300"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex justify-center space-x-4 mb-6">
        <button
          onClick={handleTrigger}
          disabled={isActive}
          className={`py-3 px-8 rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2 ${
            isActive
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-[#7ebd41] text-white hover:bg-[#6ba835] transform hover:scale-105"
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span>{isActive ? "Animation Running..." : "Trigger Confetti"}</span>
        </button>

        <button
          onClick={handleReset}
          className="bg-gray-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-600 transition-colors flex items-center space-x-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset</span>
        </button>
      </div>

      {/* Status Display */}
      <div className="text-center">
        <div
          className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
            isActive
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full mr-2 ${
              isActive ? "bg-green-500 animate-pulse" : "bg-gray-400"
            }`}
          />
          {isActive ? "Animation Active" : "Animation Idle"}
        </div>
      </div>

      {/* Confetti Animation */}
      <ConfettiAnimation
        isActive={isActive}
        duration={customConfig.duration}
        particleCount={customConfig.particleCount}
        colors={customConfig.colors}
        onComplete={handleComplete}
      />
    </div>
  );
}
