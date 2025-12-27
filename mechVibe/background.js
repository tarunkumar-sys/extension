/**
 * Background service worker for WebVibes extension
 * Handles storage operations and message passing between popup and content scripts
 */

/**
 * Initializes default settings when extension is installed
 */
chrome.runtime.onInstalled.addListener(() => {
  // Default key settings with all keys enabled
  const defaultKeySettings = {
    // Letters A-Z
    KeyA: true,
    KeyB: true,
    KeyC: true,
    KeyD: true,
    KeyE: true,
    KeyF: true,
    KeyG: true,
    KeyH: true,
    KeyI: true,
    KeyJ: true,
    KeyK: true,
    KeyL: true,
    KeyM: true,
    KeyN: true,
    KeyO: true,
    KeyP: true,
    KeyQ: true,
    KeyR: true,
    KeyS: true,
    KeyT: true,
    KeyU: true,
    KeyV: true,
    KeyW: true,
    KeyX: true,
    KeyY: true,
    KeyZ: true,
    // Numbers 0-9
    Digit0: true,
    Digit1: true,
    Digit2: true,
    Digit3: true,
    Digit4: true,
    Digit5: true,
    Digit6: true,
    Digit7: true,
    Digit8: true,
    Digit9: true,
    // Special keys
    Space: true,
    Enter: true,
    Backspace: true,
    Tab: true,
    Escape: true,
    ShiftLeft: true,
    ShiftRight: true,
    ControlLeft: true,
    ControlRight: true,
    AltLeft: true,
    AltRight: true,
    MetaLeft: true,
    MetaRight: true,
    CapsLock: true,
    Delete: true,
    Insert: true,
    Home: true,
    End: true,
    PageUp: true,
    PageDown: true,
    ArrowUp: true,
    ArrowDown: true,
    ArrowLeft: true,
    ArrowRight: true,
  };

  chrome.storage.local.set({
    enabled: true,
    volume: 0.7,
    soundProfile: "linear",
    siteBlacklist: [],
    keySettings: defaultKeySettings,
  });
});

/**
 * Message listener for communication between popup and content scripts
 * Handles settings retrieval, updates, and blacklist checks
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle GET_SETTINGS request - returns all stored settings
  if (request.type === "GET_SETTINGS") {
    chrome.storage.local.get(
      ["enabled", "volume", "soundProfile", "siteBlacklist", "keySettings"],
      (result) => {
        sendResponse(result);
      }
    );
    return true; // Required for async response
  }

  // Handle UPDATE_SETTINGS request - saves new settings to storage
  if (request.type === "UPDATE_SETTINGS") {
    chrome.storage.local.set(request.settings, () => {
      sendResponse({ success: true });
    });
    return true; // Required for async response
  }

  // Handle CHECK_BLACKLIST request - checks if a URL is blacklisted
  if (request.type === "CHECK_BLACKLIST") {
    chrome.storage.local.get(["siteBlacklist"], (result) => {
      const blacklist = result.siteBlacklist || [];
      const hostname = new URL(request.url).hostname.toLowerCase();
      // Check if hostname contains any blacklisted site
      const isBlacklisted = blacklist.some((site) =>
        hostname.includes(site.toLowerCase())
      );
      sendResponse({ blacklisted: isBlacklisted });
    });
    return true; // Required for async response
  }
});
