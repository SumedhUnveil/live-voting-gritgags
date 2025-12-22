"use client";

/**
 * Dynamic server URL detection for Vercel/Render production and local development
 * 
 * Priority:
 * 1. NEXT_PUBLIC_API_URL environment variable (for Vercel production)
 * 2. Auto-detect from window.location (for development)
 */

// Production backend URL (hardcoded fallback for Render)
const PRODUCTION_BACKEND_URL = "https://live-voting-gritgags.onrender.com";

// Cache the detected URL
let cachedServerUrl: string | null = null;

/**
 * Check if we're running in production (on Vercel)
 */
function isProduction(): boolean {
    if (typeof window === "undefined") return false;
    const hostname = window.location.hostname;
    return hostname.includes("vercel.app") ||
        hostname.includes("render.com") ||
        (!hostname.includes("localhost") && !hostname.includes("127.0.0.1") && !hostname.match(/^\d+\.\d+\.\d+\.\d+$/));
}

/**
 * Get the backend server URL
 * For production: Uses NEXT_PUBLIC_API_URL or fallback to Render URL
 * For development: Uses localhost:3001
 */
export function getServerUrl(): string {
    // Return cached URL if available
    if (cachedServerUrl) {
        return cachedServerUrl;
    }

    // PRIORITY 1: Environment variable (set in Vercel dashboard)
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl && envUrl.trim() !== "") {
        cachedServerUrl = envUrl.trim().replace(/\/$/, "");
        console.log("[getServerUrl] Using env var:", cachedServerUrl);
        return cachedServerUrl;
    }

    // PRIORITY 2: Production detection (Vercel/Render)
    if (isProduction()) {
        cachedServerUrl = PRODUCTION_BACKEND_URL;
        console.log("[getServerUrl] Production detected, using:", cachedServerUrl);
        return cachedServerUrl;
    }

    // PRIORITY 3: Development (localhost)
    if (typeof window !== "undefined") {
        const { hostname, protocol } = window.location;

        if (hostname === "localhost" || hostname === "127.0.0.1") {
            cachedServerUrl = "http://localhost:3001";
        } else {
            // Local network IP
            cachedServerUrl = `${protocol}//${hostname}:3001`;
        }

        console.log("[getServerUrl] Development mode:", cachedServerUrl);
        return cachedServerUrl;
    }

    // Server-side fallback
    cachedServerUrl = "http://localhost:3001";
    return cachedServerUrl;
}

/**
 * Initialize server URL (no longer fetches from backend in production)
 */
export async function initializeServerUrl(): Promise<string> {
    // In production, just return the cached/env URL
    if (isProduction()) {
        return getServerUrl();
    }

    // In development, try to fetch real IP from backend
    try {
        const currentUrl = getServerUrl();
        const response = await fetch(`${currentUrl}/api/server-info`);
        const data = await response.json();

        if (data.ip && data.ip !== "localhost") {
            cachedServerUrl = `http://${data.ip}:3001`;
            console.log("[initializeServerUrl] Detected local IP:", data.ip);
            return cachedServerUrl;
        }
    } catch (error) {
        console.log("[initializeServerUrl] Could not fetch server info, using default");
    }
    return getServerUrl();
}

/**
 * Get the participant page URL for QR code
 */
export function getParticipantUrl(): string {
    const baseUrl = getServerUrl();
    return `${baseUrl}/participant`;
}

/**
 * Get the admin page URL
 */
export function getAdminUrl(): string {
    const baseUrl = getServerUrl();
    return `${baseUrl}/admin`;
}

/**
 * Clear cached URL (useful if network changes)
 */
export function clearCachedUrl(): void {
    cachedServerUrl = null;
}

/**
 * Get display-friendly server info
 */
export function getServerInfo(): {
    baseUrl: string;
    participantUrl: string;
    adminUrl: string;
    isProduction: boolean;
} {
    const baseUrl = getServerUrl();

    return {
        baseUrl,
        participantUrl: getParticipantUrl(),
        adminUrl: getAdminUrl(),
        isProduction: isProduction(),
    };
}
