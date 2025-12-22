"use client";

import {
  Vote,
  Clock,
  CheckCircle,
  Users,
  Trophy,
  Wifi,
  WifiOff,
} from "lucide-react";
import Image from "next/image";
import { WaitingStateProps } from "../../types/components";
import { WAITING_MESSAGES } from "../../types/constants";

export default function WaitingState({
  state,
  participantCount = 0,
  nextCategoryTitle,
  connectionStatus = "connected",
  isReconnecting = false,
}: WaitingStateProps) {
  // Safety checks for props
  const safeParticipantCount =
    typeof participantCount === "number" ? participantCount : 0;
  const safeNextCategoryTitle =
    typeof nextCategoryTitle === "string" ? nextCategoryTitle : "";
  const safeConnectionStatus =
    typeof connectionStatus === "string" ? connectionStatus : "connected";
  const safeIsReconnecting =
    typeof isReconnecting === "boolean" ? isReconnecting : false;
  const getWaitingContent = () => {
    switch (state) {
      case "no-session":
        return {
          icon: <Vote className="w-8 h-8 sm:w-12 sm:h-12 text-[#7ebd41]" />,
          title: "Waiting for Admin",
          message: WAITING_MESSAGES.noSession,
          iconBg: "bg-[#7ebd41]/10",
          subtitle: "The admin will start the voting session shortly",
        };

      case "between-categories":
        return {
          icon: <Clock className="w-8 h-8 sm:w-12 sm:h-12 text-blue-500" />,
          title: "Get Ready for Next Category",
          message: safeNextCategoryTitle
            ? `Next up: ${safeNextCategoryTitle}`
            : WAITING_MESSAGES.betweenCategories,
          iconBg: "bg-blue-500/10",
          subtitle: "The admin will start the next category when ready",
        };

      case "session-complete":
        return {
          icon: <Trophy className="w-8 h-8 sm:w-12 sm:h-12 text-yellow-500" />,
          title: "Voting Complete!",
          message: WAITING_MESSAGES.sessionComplete,
          iconBg: "bg-yellow-500/10",
          subtitle: "Thank you for participating in the voting session",
        };

      case "waiting-for-results":
        return {
          icon: (
            <CheckCircle className="w-8 h-8 sm:w-12 sm:h-12 text-green-500" />
          ),
          title: "Waiting for Results",
          message:
            "All votes have been cast. Waiting for admin to reveal winners.",
          iconBg: "bg-green-500/10",
          subtitle: "Results will be announced shortly",
        };

      default:
        return {
          icon: <Vote className="w-8 h-8 sm:w-12 sm:h-12 text-[#7ebd41]" />,
          title: "Waiting for Admin",
          message: WAITING_MESSAGES.noSession,
          iconBg: "bg-[#7ebd41]/10",
          subtitle: "The admin will start the voting session shortly",
        };
    }
  };

  const { icon, title, message, iconBg, subtitle } = getWaitingContent();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-3 sm:p-4">
      <div className="text-center max-w-sm sm:max-w-md mx-auto w-full">
        {/* Logo */}
        <div className="flex justify-center mb-4 sm:mb-6">
          <Image
            src="/assets/gf-logo.svg"
            alt="GritFeat Logo"
            width={100}
            height={40}
            className="h-8 sm:h-10 w-auto"
          />
        </div>

        {/* Icon */}
        <div
          className={`w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 ${iconBg} rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6`}
        >
          {icon}
        </div>

        {/* Title */}
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#4c4c4c] mb-2 sm:mb-4 px-2">
          {typeof title === "string" ? title : "Waiting..."}
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-gray-500 mb-3 sm:mb-4 px-2">
          {typeof subtitle === "string" ? subtitle : ""}
        </p>

        {/* Message */}
        <p className="text-base sm:text-lg text-gray-600 mb-4 sm:mb-6 px-2 font-medium">
          {typeof message === "string" ? message : "Loading..."}
        </p>

        {/* State-specific content */}
        <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
          {state === "no-session" && (
            <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-center text-gray-600 mb-2">
                <Users className="w-4 h-4 mr-2" />
                <span className="text-sm sm:text-base">
                  {safeParticipantCount} participant
                  {safeParticipantCount !== 1 ? "s" : ""} connected
                </span>
              </div>
              <div className="text-xs sm:text-sm text-gray-500">
                You'll be notified when voting begins
              </div>
            </div>
          )}

          {state === "between-categories" && (
            <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-center text-blue-600 mb-2">
                <Clock className="w-4 h-4 mr-2" />
                <span className="text-sm sm:text-base font-medium">
                  Waiting for next category
                </span>
              </div>
              {safeNextCategoryTitle && (
                <div className="text-xs sm:text-sm text-gray-600 bg-blue-50 rounded p-2 mt-2">
                  <span className="font-medium">Coming up:</span>{" "}
                  {safeNextCategoryTitle}
                </div>
              )}
            </div>
          )}

          {state === "session-complete" && (
            <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-center text-green-600 mb-2">
                <CheckCircle className="w-4 h-4 mr-2" />
                <span className="text-sm sm:text-base font-medium">
                  All voting complete
                </span>
              </div>
              <div className="text-xs sm:text-sm text-gray-600">
                Results may be announced by the admin
              </div>
            </div>
          )}

          {state === "waiting-for-results" && (
            <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-center text-green-600 mb-2">
                <Trophy className="w-4 h-4 mr-2" />
                <span className="text-sm sm:text-base font-medium">
                  All votes submitted
                </span>
              </div>
              <div className="text-xs sm:text-sm text-gray-600">
                Admin will reveal winners when ready
              </div>
            </div>
          )}
        </div>

        {/* Connection Status */}
        <div className="flex items-center justify-center space-x-2 mb-4">
          <div
            className={`flex items-center text-xs sm:text-sm px-3 py-1.5 rounded-full transition-colors ${
              safeConnectionStatus === "connected"
                ? "bg-green-100 text-green-700"
                : safeConnectionStatus === "reconnecting" || safeIsReconnecting
                ? "bg-yellow-100 text-yellow-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {safeConnectionStatus === "connected" ? (
              <Wifi className="w-3 h-3 mr-1.5" />
            ) : (
              <WifiOff className="w-3 h-3 mr-1.5" />
            )}
            <span>
              {safeConnectionStatus === "connected"
                ? "Connected"
                : safeConnectionStatus === "reconnecting" || safeIsReconnecting
                ? "Reconnecting..."
                : "Disconnected"}
            </span>
          </div>
        </div>

        {/* Live indicator */}
        {safeConnectionStatus === "connected" && (
          <div className="flex items-center justify-center space-x-2 text-xs text-gray-400">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Live updates active</span>
          </div>
        )}

        {/* Reconnection indicator */}
        {(safeConnectionStatus === "reconnecting" || safeIsReconnecting) && (
          <div className="flex items-center justify-center space-x-2 text-xs text-yellow-600">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce"></div>
            <span>Attempting to reconnect...</span>
          </div>
        )}
      </div>
    </div>
  );
}
