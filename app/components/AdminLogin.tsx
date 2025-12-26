"use client";

import { useState, FormEvent } from "react";
import { Lock, User, AlertCircle } from "lucide-react";
import Image from "next/image";

interface AdminLoginProps {
  onLogin: () => void;
}

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "Abcd!234x";

export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password");
      return;
    }

    setIsLoading(true);

    // Simulate a small delay for better UX
    setTimeout(() => {
      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        // Store auth in localStorage
        localStorage.setItem("admin_authenticated", "true");
        localStorage.setItem("admin_auth_time", Date.now().toString());
        onLogin();
      } else {
        setError("Invalid username or password");
        setIsLoading(false);
      }
    }, 300);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="glass-card p-8 md:p-12 max-w-md w-full border-l-8 border-gritfeat-green animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-block p-3 rounded-2xl bg-white shadow-xl mb-6 border border-white/50">
            <Image
              src="/assets/gf-logo.svg"
              alt="GritFeat Logo"
              width={120}
              height={48}
              className="h-10 w-auto"
            />
          </div>
          <h1 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">
            Admin Login
          </h1>
          <p className="text-slate-500 font-medium">
            Enter your credentials to access the admin panel
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-center gap-3 animate-scale-in">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm font-semibold text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="username"
              className="block text-sm font-bold text-slate-700 uppercase tracking-wider"
            >
              Username
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <User className="w-5 h-5" />
              </div>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gritfeat-green focus:border-gritfeat-green transition-colors font-medium text-slate-700"
                placeholder="Enter username"
                autoComplete="username"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-sm font-bold text-slate-700 uppercase tracking-wider"
            >
              Password
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Lock className="w-5 h-5" />
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gritfeat-green focus:border-gritfeat-green transition-colors font-medium text-slate-700"
                placeholder="Enter password"
                autoComplete="current-password"
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary py-4 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Logging in...</span>
              </>
            ) : (
              <>
                <Lock className="w-5 h-5" />
                <span>Login</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
