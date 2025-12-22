"use client";

import { useState, useEffect } from "react";
import { Vote, Users, BarChart3, Copy, Check, Wifi } from "lucide-react";
import QRCode from "qrcode";
import Image from "next/image";
import { getServerInfo, initializeServerUrl } from "./utils/getServerUrl";

export default function Home() {
  const [showQR, setShowQR] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [serverInfo, setServerInfo] = useState<{
    baseUrl: string;
    participantUrl: string;
    adminUrl: string;
    isLocalNetwork: boolean;
    detectedRealIp: string | null;
  } | null>(null);

  // Get server info on mount
  useEffect(() => {
    const detectIp = async () => {
      await initializeServerUrl();
      const info = getServerInfo();
      setServerInfo(info);
    };
    detectIp();
  }, []);

  const participantUrl = serverInfo?.participantUrl || "";
  const adminUrl = serverInfo?.adminUrl || "";

  useEffect(() => {
    if (showQR && participantUrl) {
      // Generate QR code when showQR becomes true
      QRCode.toDataURL(participantUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: "#4c4c4c",
          light: "#FFFFFF",
        },
      })
        .then((url) => {
          setQrCodeDataUrl(url);
        })
        .catch((err) => {
          console.error("Error generating QR code:", err);
        });
    }
  }, [showQR, participantUrl]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(participantUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Image
              src="/assets/gf-logo.svg"
              alt="GritFeat Logo"
              width={120}
              height={50}
              className="h-12 w-auto"
            />
          </div>
          <h1 className="text-5xl font-bold text-[#4c4c4c] mb-4">
            🏆 Live Voting
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Real-time voting for your office awards! Join the fun and vote for
            your favorite colleagues.
          </p>
        </div>

        {/* Network Info Banner */}
        {serverInfo && (
          <div className="bg-white rounded-xl p-4 mb-8 shadow-lg border-l-4 border-[#7ebd41]">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-[#7ebd41]/10 rounded-full flex items-center justify-center">
                  <Wifi className="w-5 h-5 text-[#7ebd41]" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Server URL</p>
                  <p className="font-mono text-sm text-[#4c4c4c] break-all">
                    {serverInfo.baseUrl}
                  </p>
                </div>
              </div>
              <button
                onClick={copyToClipboard}
                className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-[#4c4c4c] px-4 py-2 rounded-lg transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-green-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Participant Section */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow border-l-4 border-[#7ebd41]">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#7ebd41]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Vote className="w-8 h-8 text-[#7ebd41]" />
              </div>
              <h2 className="text-2xl font-bold text-[#4c4c4c] mb-2">
                Join as Participant
              </h2>
              <p className="text-gray-600">
                Vote on your phone for the awards!
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setShowQR(true)}
                className="w-full bg-[#7ebd41] text-white py-3 px-6 rounded-lg font-semibold hover:bg-[#6ba835] transition-colors"
              >
                Show QR Code
              </button>

              <a
                href={participantUrl}
                className="block w-full bg-gray-100 text-[#4c4c4c] py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-center"
              >
                Open Voting Page
              </a>
            </div>

            {showQR && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="QR Code for voting page"
                      className="w-32 h-32 mx-auto mb-3"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-gray-200 rounded flex items-center justify-center mx-auto mb-3">
                      <div className="text-xs text-gray-500">Generating...</div>
                    </div>
                  )}
                  <p className="text-sm text-gray-600 mb-2">
                    Scan with your phone
                  </p>
                  <p className="text-xs text-gray-500 font-mono break-all">
                    {participantUrl}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Admin Section */}
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow border-l-4 border-[#7ebd41]">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#7ebd41]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-[#7ebd41]" />
              </div>
              <h2 className="text-2xl font-bold text-[#4c4c4c] mb-2">
                Admin Panel
              </h2>
              <p className="text-gray-600">
                Control voting sessions and view results
              </p>
            </div>

            <div className="space-y-4">
              <a
                href={adminUrl}
                className="block w-full bg-[#7ebd41] text-white py-3 px-8 rounded-lg font-semibold hover:bg-[#6ba835] transition-colors text-center"
              >
                Open Admin Panel
              </a>

              <div className="text-center text-sm text-gray-500">
                <Users className="w-4 h-4 inline mr-1" />
                Perfect for projector display
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-[#4c4c4c] mb-8">Features</h3>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border-l-4 border-[#7ebd41]">
              <div className="w-12 h-12 bg-[#7ebd41]/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Vote className="w-6 h-6 text-[#7ebd41]" />
              </div>
              <h4 className="font-semibold text-[#4c4c4c] mb-2">
                Real-time Voting
              </h4>
              <p className="text-gray-600 text-sm">
                30-second voting periods with live updates
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border-l-4 border-[#7ebd41]">
              <div className="w-12 h-12 bg-[#7ebd41]/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-[#7ebd41]" />
              </div>
              <h4 className="font-semibold text-[#4c4c4c] mb-2">
                No Sign-up Required
              </h4>
              <p className="text-gray-600 text-sm">
                Join instantly with just a link
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border-l-4 border-[#7ebd41]">
              <div className="w-12 h-12 bg-[#7ebd41]/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-6 h-6 text-[#7ebd41]" />
              </div>
              <h4 className="font-semibold text-[#4c4c4c] mb-2">
                Live Results
              </h4>
              <p className="text-gray-600 text-sm">
                See votes come in real-time on the big screen
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
