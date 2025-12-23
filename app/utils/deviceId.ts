/**
 * Generate a unique device fingerprint for vote tracking
 * This prevents users from voting multiple times by refreshing the page
 */
export function getDeviceId(): string {
    const storageKey = 'voting_device_id';

    // Check if we already have a device ID
    let deviceId = localStorage.getItem(storageKey);

    if (deviceId) {
        return deviceId;
    }

    // Generate a new device ID based on browser fingerprint
    const fingerprint = generateFingerprint();
    deviceId = `device_${fingerprint}_${Date.now()}`;

    // Store it for future use
    localStorage.setItem(storageKey, deviceId);

    return deviceId;
}

/**
 * Generate a browser fingerprint based on available characteristics
 */
function generateFingerprint(): string {
    const components = [
        navigator.userAgent,
        navigator.language,
        screen.colorDepth,
        screen.width,
        screen.height,
        new Date().getTimezoneOffset(),
        navigator.hardwareConcurrency || 'unknown',
        navigator.platform,
    ];

    // Create a simple hash from the components
    const fingerprint = components.join('|');
    return simpleHash(fingerprint);
}

/**
 * Simple hash function for fingerprinting
 */
function simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
}

/**
 * Clear device ID (for testing purposes)
 */
export function clearDeviceId(): void {
    localStorage.removeItem('voting_device_id');
}
