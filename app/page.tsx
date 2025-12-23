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
    isProduction: boolean;
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
    <div className="min-h-screen pb-12 pt-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Logo & Header */}
        <header className="text-center mb-12 animate-slide-up">
          <div className="inline-block p-3 rounded-2xl bg-white shadow-xl mb-6 border border-white/50 animate-float">
            <Image
              src="/assets/gf-logo.svg"
              alt="GritFeat Logo"
              width={140}
              height={56}
              className="h-12 w-auto"
            />
          </div>
          <h1 className="text-5xl sm:text-6xl font-black text-slate-800 mb-4 tracking-tight">
            <span className="text-gritfeat-green">Live</span> Voting
          </h1>
          <p className="text-lg sm:text-xl text-slate-500 font-medium max-w-2xl mx-auto">
            Real-time voting for your office awards! Join the fun and vote for your favorite colleagues.
          </p>
        </header>

        {/* Network Info Banner */}
        {serverInfo && (
          <div className="glass-card p-6 mb-12 border-l-8 border-gritfeat-green animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-12 h-12 bg-gritfeat-green/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Wifi className="w-6 h-6 text-gritfeat-green" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Server URL</p>
                  <p className="font-mono text-sm text-slate-700 truncate">
                    {serverInfo.baseUrl}
                  </p>
                </div>
              </div>
              <button
                onClick={copyToClipboard}
                className="btn-secondary py-2 px-6 flex items-center gap-2 flex-shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-gritfeat-green" />
                    <span className="text-gritfeat-green font-bold">Copied!</span>
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

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Participant Section */}
          <div className="glass-card p-8 border-l-8 border-gritfeat-green relative overflow-hidden group animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="absolute top-0 right-0 p-12 text-gritfeat-green/5 group-hover:text-gritfeat-green/10 transition-colors">
              <Vote className="w-48 h-48 fill-current rotate-12" />
            </div>

            <div className="relative z-10">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gritfeat-green/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Vote className="w-8 h-8 text-gritfeat-green" />
                </div>
                <h2 className="text-3xl font-black text-slate-800 mb-2">
                  Join as Participant
                </h2>
                <p className="text-slate-500 font-medium">
                  Vote on your phone for the awards!
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setShowQR(true)}
                  className="w-full btn-primary py-4"
                >
                  Show QR Code
                </button>

                <a
                  href={participantUrl}
                  className="block w-full btn-secondary py-4 text-center"
                >
                  Open Voting Page
                </a>
              </div>

              {showQR && (
                <div className="mt-6 glass-card p-6 bg-white/90 animate-scale-in">
                  <div className="text-center">
                    {qrCodeDataUrl ? (
                      <img
                        src={qrCodeDataUrl}
                        alt="QR Code for voting page"
                        className="w-40 h-40 mx-auto mb-4 rounded-xl shadow-lg"
                      />
                    ) : (
                      <div className="w-40 h-40 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <div className="text-sm text-slate-400 font-medium">Generating...</div>
                      </div>
                    )}
                    <p className="text-sm text-slate-600 font-semibold mb-2">
                      📱 Scan with your phone
                    </p>
                    <p className="text-xs text-slate-400 font-mono break-all px-2">
                      {participantUrl}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Admin Section */}
          <div className="glass-card p-8 border-l-8 border-gritfeat-green relative overflow-hidden group animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="absolute top-0 right-0 p-12 text-gritfeat-green/5 group-hover:text-gritfeat-green/10 transition-colors">
              <BarChart3 className="w-48 h-48 fill-current rotate-12" />
            </div>

            <div className="relative z-10">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gritfeat-green/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-8 h-8 text-gritfeat-green" />
                </div>
                <h2 className="text-3xl font-black text-slate-800 mb-2">
                  Admin Panel
                </h2>
                <p className="text-slate-500 font-medium">
                  Control voting sessions and view results
                </p>
              </div>

              <div className="space-y-4">
                <a
                  href={adminUrl}
                  className="block w-full btn-primary py-4 text-center"
                >
                  Open Admin Panel
                </a>

                <div className="flex items-center justify-center gap-2 text-sm text-slate-400 font-medium">
                  <Users className="w-4 h-4" />
                  <span>Perfect for projector display</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <section className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <h3 className="text-3xl font-black text-slate-800 text-center mb-10">Features</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="glass-card p-6 border-l-4 border-gritfeat-green hover:border-gritfeat-green-light transition-all">
              <div className="w-14 h-14 bg-gritfeat-green/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Vote className="w-7 h-7 text-gritfeat-green" />
              </div>
              <h4 className="font-black text-slate-800 mb-2 text-center text-lg">
                Real-time Voting
              </h4>
              <p className="text-slate-500 text-sm text-center font-medium">
                30-second voting periods with live updates
              </p>
            </div>

            <div className="glass-card p-6 border-l-4 border-gritfeat-green hover:border-gritfeat-green-light transition-all">
              <div className="w-14 h-14 bg-gritfeat-green/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-7 h-7 text-gritfeat-green" />
              </div>
              <h4 className="font-black text-slate-800 mb-2 text-center text-lg">
                No Sign-up Required
              </h4>
              <p className="text-slate-500 text-sm text-center font-medium">
                Join instantly with just a link
              </p>
            </div>

            <div className="glass-card p-6 border-l-4 border-gritfeat-green hover:border-gritfeat-green-light transition-all">
              <div className="w-14 h-14 bg-gritfeat-green/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-7 h-7 text-gritfeat-green" />
              </div>
              <h4 className="font-black text-slate-800 mb-2 text-center text-lg">
                Live Results
              </h4>
              <p className="text-slate-500 text-sm text-center font-medium">
                See votes come in real-time on the big screen
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
