"use client";

/**
 * Dynamic server URL detection for local network support
 * 
 * IMPORTANT: 
 * - The backend runs on port 3001 and serves the static frontend in production
 * - During development, Next.js runs on port 3000 but still connects to backend on 3001
 * - Socket.io and API calls always go to port 3001
 * - The QR code should point to port 3001 (where static files are served)
 */

// Cache the detected URL to avoid repeated lookups
let cachedServerUrl: string | null = null;
let detectedRealIp: string | null = null;

// Try to load cached IP from localStorage on mount
if (typeof window !== "undefined") {
    detectedRealIp = localStorage.getItem("deepmind_detected_ip");
}

/**
 * Get the backend server URL (port 3001)
 * This is used for Socket.io connections and API calls
 */
export function getServerUrl(): string {
    // If we have a detected real IP, use it
    if (detectedRealIp) {
        return `http://${detectedRealIp}:3001`;
    }

    // Return cached URL if available
    if (cachedServerUrl) {
        return cachedServerUrl;
    }

    // Check for environment variable first
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl && envUrl.trim() !== "") {
        cachedServerUrl = envUrl.trim().replace(/\/$/, ""); // Remove trailing slash
        return cachedServerUrl;
    }

    // Auto-detect based on current window location
    if (typeof window !== "undefined") {
        const { hostname, protocol } = window.location;

        // Always connect to backend on port 3001
        // BUT if we are on localhost, the phone won't be able to use 'localhost'
        if (hostname === "localhost" || hostname === "127.0.0.1") {
            cachedServerUrl = "http://localhost:3001";
        } else {
            // Use the same hostname (for local network) with backend port
            cachedServerUrl = `${protocol}//${hostname}:3001`;
        }

        return cachedServerUrl;
    }

    // Server-side fallback
    cachedServerUrl = "http://localhost:3001";
    return cachedServerUrl;
}

/**
 * Fetch the real local IP from the backend
 * This should be called once on app mount (in the landing page)
 */
export async function initializeServerUrl(): Promise<string> {
    try {
        const currentUrl = getServerUrl();
        const response = await fetch(`${currentUrl}/api/server-info`);
        const data = await response.json();

        if (data.ip && data.ip !== "localhost") {
            detectedRealIp = data.ip;
            if (typeof window !== "undefined") {
                localStorage.setItem("deepmind_detected_ip", data.ip);
            }
            cachedServerUrl = `http://${data.ip}:3001`;
            return cachedServerUrl;
        }
    } catch (error) {
        console.error("Failed to detect real server IP:", error);
    }
    return getServerUrl();
}

/**
 * Get the participant page URL for QR code
 * Points to the backend port where static files are served
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
    detectedRealIp = null;
    if (typeof window !== "undefined") {
        localStorage.removeItem("deepmind_detected_ip");
    }
}

/**
 * Get display-friendly server info
 */
export function getServerInfo(): {
    baseUrl: string;
    participantUrl: string;
    adminUrl: string;
    isLocalNetwork: boolean;
    isDevelopment: boolean;
    detectedRealIp: string | null;
} {
    const baseUrl = getServerUrl();
    const isLocalNetwork =
        typeof window !== "undefined" &&
        !window.location.hostname.includes("localhost") &&
        !window.location.hostname.includes("127.0.0.1") &&
        !window.location.hostname.includes("ngrok");

    const isDevelopment =
        typeof window !== "undefined" &&
        (window.location.port === "3000" || window.location.hostname === "localhost");

    return {
        baseUrl,
        participantUrl: getParticipantUrl(),
        adminUrl: getAdminUrl(),
        isLocalNetwork,
        isDevelopment,
        detectedRealIp,
    };
}
