"use client";

import { useEffect, useRef } from "react";
import { X, Check, AlertCircle } from "lucide-react";
import { ConfirmationModalProps } from "../../types/components";

export default function ConfirmationModal({
  isOpen,
  nominee,
  categoryTitle,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Focus management - focus the confirm button when modal opens
  useEffect(() => {
    if (isOpen && confirmButtonRef.current) {
      confirmButtonRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case "Escape":
          event.preventDefault();
          onCancel();
          break;
        case "Tab":
          // Trap focus within modal
          event.preventDefault();
          const focusableElements = [
            confirmButtonRef.current,
            cancelButtonRef.current,
          ];
          const currentIndex = focusableElements.indexOf(
            document.activeElement as HTMLButtonElement
          );
          const nextIndex = event.shiftKey
            ? (currentIndex - 1 + focusableElements.length) %
              focusableElements.length
            : (currentIndex + 1) % focusableElements.length;
          focusableElements[nextIndex]?.focus();
          break;
        case "Enter":
          // Confirm on Enter if confirm button is focused
          if (document.activeElement === confirmButtonRef.current) {
            event.preventDefault();
            onConfirm();
          }
          break;
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onConfirm, onCancel]);

  // Handle backdrop click
  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />

      {/* Modal Content */}
      <div
        ref={modalRef}
        className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-200 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#7ebd41]/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-[#7ebd41]" />
            </div>
            <h2
              id="modal-title"
              className="text-xl font-semibold text-[#4c4c4c]"
            >
              Confirm Your Vote
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#7ebd41] focus:ring-offset-2"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p id="modal-description" className="text-gray-600 mb-4">
            Are you sure you want to vote for:
          </p>

          {/* Nominee Display */}
          <div className="bg-gradient-to-r from-[#7ebd41]/5 to-[#7ebd41]/10 rounded-lg p-4 mb-4 border border-[#7ebd41]/20">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Your vote for</p>
              <p className="text-lg font-medium text-[#4c4c4c] mb-1">
                {categoryTitle}
              </p>
              <p className="text-xl font-bold text-[#7ebd41]">{nominee}</p>
            </div>
          </div>

          <p className="text-sm text-gray-500 text-center">
            This action cannot be undone. You can only vote once per category.
          </p>
        </div>

        {/* Footer */}
        <div className="flex space-x-3 p-6 border-t border-gray-200">
          <button
            ref={cancelButtonRef}
            onClick={onCancel}
            className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            ref={confirmButtonRef}
            onClick={onConfirm}
            className="flex-1 px-4 py-3 bg-[#7ebd41] hover:bg-[#6ba837] text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#7ebd41] focus:ring-offset-2 flex items-center justify-center space-x-2"
          >
            <Check className="w-4 h-4" />
            <span>Confirm Vote</span>
          </button>
        </div>
      </div>
    </div>
  );
}
