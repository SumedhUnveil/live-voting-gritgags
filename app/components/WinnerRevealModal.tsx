"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Trophy, Sparkles } from "lucide-react";

interface WinnerRevealModalProps {
    isOpen: boolean;
    onClose: () => void;
    categoryTitle: string;
    winnerName: string | string[];
}

export default function WinnerRevealModal({
    isOpen,
    onClose,
    categoryTitle,
    winnerName,
}: WinnerRevealModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        if (isOpen && closeButtonRef.current) {
            closeButtonRef.current.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!isOpen) return;

            if (event.key === "Escape") {
                event.preventDefault();
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "hidden";
        }

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "unset";
        };
    }, [isOpen, onClose]);

    if (!isOpen || !mounted) return null;

    const winnerDisplay = Array.isArray(winnerName)
        ? winnerName.join(" & ")
        : winnerName;

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            role="dialog"
            aria-modal="true"
        >
            {/* Background with blur and darken */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-500 animate-in fade-in" />

            {/* Modal Container */}
            <div
                ref={modalRef}
                className="relative w-full max-w-lg bg-white rounded-3xl shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden transform animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Animated Background Gradients */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#7ebd41] via-[#6ba835] to-[#7ebd41] animate-pulse" />

                {/* Close Button */}
                <button
                    ref={closeButtonRef}
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all z-10"
                    aria-label="Close"
                >
                    <X className="w-6 h-6" />
                </button>

                {/* Content Section */}
                <div className="p-8 sm:p-12 flex flex-col items-center text-center">
                    {/* Icon Trophy */}
                    <div className="relative mb-8">
                        <div className="absolute inset-0 bg-[#7ebd41] blur-2xl opacity-20 rounded-full animate-pulse" />
                        <div className="relative w-24 h-24 bg-gradient-to-br from-[#7ebd41] to-[#6ba835] rounded-full flex items-center justify-center shadow-xl">
                            <Trophy className="w-12 h-12 text-white animate-bounce-slow" />
                        </div>
                        <Sparkles className="absolute -top-1 -right-1 w-8 h-8 text-[#7ebd41] animate-pulse" />
                        <Sparkles className="absolute -bottom-2 -left-3 w-6 h-6 text-[#7ebd41] opacity-60 animate-pulse delay-75" />
                    </div>

                    {/* Text Content */}
                    <div className="space-y-4">
                        <h3 className="text-sm sm:text-base font-bold text-[#7ebd41] uppercase tracking-[0.2em]">
                            Winner Revealed
                        </h3>

                        <div className="space-y-2">
                            <h2 className="text-xl sm:text-2xl font-medium text-gray-500">
                                {categoryTitle}
                            </h2>

                            <div className="py-4">
                                <p className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#4c4c4c] leading-tight tracking-tight drop-shadow-sm">
                                    {winnerDisplay}
                                </p>
                            </div>
                        </div>

                        <p className="text-gray-500 text-sm sm:text-base max-w-[280px] mx-auto opacity-80">
                            Congratulations to the winner for their outstanding achievement!
                        </p>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={onClose}
                        className="mt-10 min-w-[200px] bg-[#4c4c4c] hover:bg-black text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg transform transition hover:scale-105 active:scale-95"
                    >
                        Fantastic!
                    </button>
                </div>

                {/* Decorative corner element */}
                <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-[#7ebd41]/10 rounded-full blur-2xl" />
                <div className="absolute -top-12 -left-12 w-32 h-32 bg-[#7ebd41]/5 rounded-full blur-2xl" />
            </div>

            <style jsx>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s infinite ease-in-out;
        }
      `}</style>
        </div>,
        document.body
    );
}
