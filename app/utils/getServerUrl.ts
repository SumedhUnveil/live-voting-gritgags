"use client";

/**
 * Dynamic server URL detection for Vercel/Render production and local development
 * 
 * In production:
 * - API/Socket.io → Render backend (https://live-voting-gritgags.onrender.com)
 * - Frontend pages → Vercel (https://live-voting-gritgags.vercel.app)
 * 
 * In development:
 * - Everything → localhost:3001
 */

// Production URLs
const PRODUCTION_BACKEND_URL = "https://live-voting-gritgags.onrender.com";
const PRODUCTION_FRONTEND_URL = "https://live-voting-gritgags.vercel.app";

// Cache the detected URL
let cachedServerUrl: string | null = null;
let cachedFrontendUrl: string | null = null;

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
 * Get the backend server URL (for API calls and Socket.io)
 * Production: Render backend
 * Development: localhost:3001
 */
export function getServerUrl(): string {
    if (cachedServerUrl) {
        return cachedServerUrl;
    }

    // Environment variable override
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl && envUrl.trim() !== "") {
        cachedServerUrl = envUrl.trim().replace(/\/$/, "");
        return cachedServerUrl;
    }

    // Production: Use Render backend
    if (isProduction()) {
        cachedServerUrl = PRODUCTION_BACKEND_URL;
        return cachedServerUrl;
    }

    // Development: localhost
    if (typeof window !== "undefined") {
        const { hostname, protocol } = window.location;
        if (hostname === "localhost" || hostname === "127.0.0.1") {
            cachedServerUrl = "http://localhost:3001";
        } else {
            cachedServerUrl = `${protocol}//${hostname}:3001`;
        }
        return cachedServerUrl;
    }

    cachedServerUrl = "http://localhost:3001";
    return cachedServerUrl;
}

/**
 * Get the frontend URL (for QR codes and sharing links)
 * Production: Vercel frontend
 * Development: localhost:3001 (backend serves static files)
 */
export function getFrontendUrl(): string {
    if (cachedFrontendUrl) {
        return cachedFrontendUrl;
    }

    // Production: Use Vercel frontend
    if (isProduction()) {
        cachedFrontendUrl = PRODUCTION_FRONTEND_URL;
        return cachedFrontendUrl;
    }

    // Development: Use backend (serves static files)
    if (typeof window !== "undefined") {
        const { hostname, protocol } = window.location;
        if (hostname === "localhost" || hostname === "127.0.0.1") {
            cachedFrontendUrl = "http://localhost:3001";
        } else {
            cachedFrontendUrl = `${protocol}//${hostname}:3001`;
        }
        return cachedFrontendUrl;
    }

    cachedFrontendUrl = "http://localhost:3001";
    return cachedFrontendUrl;
}

/**
 * Initialize server URL (for development IP detection)
 */
export async function initializeServerUrl(): Promise<string> {
    if (isProduction()) {
        return getServerUrl();
    }

    try {
        const currentUrl = getServerUrl();
        const response = await fetch(`${currentUrl}/api/server-info`);
        const data = await response.json();

        if (data.ip && data.ip !== "localhost") {
            cachedServerUrl = `http://${data.ip}:3001`;
            cachedFrontendUrl = `http://${data.ip}:3001`;
            return cachedServerUrl;
        }
    } catch (error) {
        console.log("[initializeServerUrl] Could not fetch server info");
    }
    return getServerUrl();
}

/**
 * Get the participant page URL for QR code (points to FRONTEND)
 */
export function getParticipantUrl(): string {
    const baseUrl = getFrontendUrl();
    return `${baseUrl}/participant`;
}

/**
 * Get the admin page URL (points to FRONTEND)
 */
export function getAdminUrl(): string {
    const baseUrl = getFrontendUrl();
    return `${baseUrl}/admin`;
}

/**
 * Clear cached URLs
 */
export function clearCachedUrl(): void {
    cachedServerUrl = null;
    cachedFrontendUrl = null;
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
    return {
        baseUrl: getServerUrl(),
        participantUrl: getParticipantUrl(),
        adminUrl: getAdminUrl(),
        isProduction: isProduction(),
    };
}
