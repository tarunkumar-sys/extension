/**
 * Main controller class for the popup interface
 * Handles all UI interactions and settings management
 */
class PopupController {
  constructor() {
    // Default settings object containing all user preferences
    this.settings = {
      enabled: true,
      volume: 0.7,
      soundProfile: "linear",
      siteBlacklist: [],
      // Key settings: true means sound will play for that key, false means silent
      keySettings: this.getDefaultKeySettings(),
    };

    this.init();
  }

  /**
   * Returns default key settings with all keys enabled by default
   * @returns {Object} Object mapping key codes to boolean values
   */
  getDefaultKeySettings() {
    return {
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
  }

  /**
   * Initializes the popup controller
   * Loads settings and sets up the UI and event listeners
   */
  async init() {
    await this.loadSettings();
    this.setupUI();
    this.setupEventListeners();
    this.setupKeySettingsModal();
  }

  /**
   * Loads settings from Chrome storage
   * Merges loaded settings with default settings
   * @returns {Promise} Promise that resolves when settings are loaded
   */
  async loadSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "GET_SETTINGS" }, (response) => {
        if (response) {
          // Merge all settings
          this.settings = { ...this.settings, ...response };
          // Ensure enabled is a proper boolean
          if (typeof this.settings.enabled !== "boolean") {
            this.settings.enabled = this.settings.enabled !== false;
          }
          // Ensure keySettings exists and merge with defaults
          if (
            !this.settings.keySettings ||
            Object.keys(this.settings.keySettings).length === 0
          ) {
            this.settings.keySettings = this.getDefaultKeySettings();
          } else {
            // Merge user settings with defaults to ensure all keys are present
            const defaults = this.getDefaultKeySettings();
            this.settings.keySettings = {
              ...defaults,
              ...this.settings.keySettings,
            };
          }
        }
        resolve();
      });
    });
  }

  /**
   * Saves current settings to Chrome storage
   * Notifies content scripts about the update
   * @returns {Promise} Promise that resolves when settings are saved
   */
  async saveSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          type: "UPDATE_SETTINGS",
          settings: this.settings,
        },
        (response) => {
          this.notifyContentScripts("UPDATE_SETTINGS");
          resolve();
        }
      );
    });
  }

  /**
   * Sends messages to all content scripts in open tabs
   * Used to notify content scripts about settings changes
   * @param {string} messageType - Type of message to send
   * @param {Object} data - Additional data to include in the message
   */
  notifyContentScripts(messageType, data = {}) {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs
          .sendMessage(tab.id, {
            type: messageType,
            settings: this.settings,
            ...data,
          })
          .catch(() => {});
      });
    });
  }

  /**
   * Sets up the UI elements with current settings values
   * Initializes all form controls to reflect saved preferences
   */
  setupUI() {
    const enableToggle = document.getElementById("enableToggle");
    if (enableToggle) {
      // Ensure boolean value for toggle - explicitly check for true
      enableToggle.checked = this.settings.enabled === true;
    }

    const volumeSlider = document.getElementById("volumeSlider");
    const volumeValue = document.getElementById("volumeValue");
    if (volumeSlider && volumeValue) {
      volumeSlider.value = Math.round(this.settings.volume * 100);
      volumeValue.textContent = `${Math.round(this.settings.volume * 100)}%`;
    }

    const profileRadios = document.querySelectorAll('input[name="profile"]');
    profileRadios.forEach((radio) => {
      if (radio.value === this.settings.soundProfile) {
        radio.checked = true;
      }
    });

    this.renderBlacklist();
  }

  setupEventListeners() {
    const enableToggle = document.getElementById("enableToggle");
    if (enableToggle) {
      enableToggle.addEventListener("change", (e) => {
        this.settings.enabled = !!e.target.checked; // Ensure boolean
        this.saveSettings();
        // Also send UPDATE_SETTINGS to ensure all content scripts get the full settings
        this.notifyContentScripts("UPDATE_SETTINGS");
        this.notifyContentScripts("TOGGLE_ENABLED", {
          enabled: this.settings.enabled,
        });
      });
    }

    const volumeSlider = document.getElementById("volumeSlider");
    const volumeValue = document.getElementById("volumeValue");
    if (volumeSlider && volumeValue) {
      volumeSlider.addEventListener("input", (e) => {
        const value = parseInt(e.target.value);
        volumeValue.textContent = `${value}%`;
        this.settings.volume = value / 100;
        this.saveSettings();
      });
    }

    const profileRadios = document.querySelectorAll('input[name="profile"]');
    profileRadios.forEach((radio) => {
      radio.addEventListener("change", (e) => {
        if (e.target.checked) {
          this.settings.soundProfile = e.target.value;
          this.saveSettings();
        }
      });
    });

    const addSiteBtn = document.getElementById("addSiteBtn");
    const siteInput = document.getElementById("siteInput");

    if (addSiteBtn && siteInput) {
      addSiteBtn.addEventListener("click", () => {
        this.addToBlacklist(siteInput.value.trim());
        siteInput.value = "";
      });

      siteInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.addToBlacklist(siteInput.value.trim());
          siteInput.value = "";
        }
      });
    }

    // More sounds button event listener
    const moreSoundsBtn = document.getElementById("moreSoundsBtn");
    if (moreSoundsBtn) {
      moreSoundsBtn.addEventListener("click", () => {
        this.openMoreSoundsModal();
      });
    }

    // Back button for more sounds panel
    const backMoreSoundsBtn = document.getElementById("backMoreSoundsBtn");
    if (backMoreSoundsBtn) {
      backMoreSoundsBtn.addEventListener("click", () => {
        this.closeMoreSoundsModal();
      });
    }

    // Handle profile selection in more sounds panel
    const moreSoundsPanel = document.getElementById("moreSoundsPanel");
    if (moreSoundsPanel) {
      const profileRadios = moreSoundsPanel.querySelectorAll(
        'input[name="profile"]'
      );
      profileRadios.forEach((radio) => {
        radio.addEventListener("change", (e) => {
          if (e.target.checked) {
            this.settings.soundProfile = e.target.value;
            this.saveSettings();
            // Update main profile selector
            const mainRadios = document.querySelectorAll(
              'main input[name="profile"]'
            );
            mainRadios.forEach((mainRadio) => {
              mainRadio.checked = mainRadio.value === e.target.value;
            });
          }
        });
      });
    }
  }

  /**
   * Sets up the key settings slide-over panel functionality
   * Handles opening/closing and rendering key toggles
   */
  setupKeySettingsModal() {
    const settingsBtn = document.getElementById("settingsBtn");
    const panel = document.getElementById("keySettingsPanel");
    const backBtn = document.getElementById("backBtn");

    if (settingsBtn) {
      settingsBtn.addEventListener("click", () => {
        this.openKeySettingsPanel();
      });
    }

    if (backBtn) {
      backBtn.addEventListener("click", () => {
        this.closeKeySettingsPanel();
      });
    }

    // Render key settings
    this.renderKeySettings();
  }

  /**
   * Opens the key settings slide-over panel
   */
  openKeySettingsPanel() {
    const panel = document.getElementById("keySettingsPanel");
    if (panel) {
      panel.classList.add("active");
      this.renderKeySettings();
    }
  }

  /**
   * Closes the key settings slide-over panel
   */
  closeKeySettingsPanel() {
    const panel = document.getElementById("keySettingsPanel");
    if (panel) {
      panel.classList.remove("active");
    }
  }

  /**
   * Opens the more sounds slide-over panel
   */
  openMoreSoundsModal() {
    const panel = document.getElementById("moreSoundsPanel");
    if (panel) {
      panel.classList.add("active");
      // Update radio buttons to reflect current selection
      const profileRadios = panel.querySelectorAll('input[name="profile"]');
      profileRadios.forEach((radio) => {
        if (radio.value === this.settings.soundProfile) {
          radio.checked = true;
        }
      });
    }
  }

  /**
   * Closes the more sounds slide-over panel
   */
  closeMoreSoundsModal() {
    const panel = document.getElementById("moreSoundsPanel");
    if (panel) {
      panel.classList.remove("active");
    }
  }

  /**
   * Renders the key settings toggles in the slide-over panel
   * Creates toggle switches for each key that can be customized
   */
  renderKeySettings() {
    const container = document.getElementById("keySettingsContainer");
    if (!container) return;

    // Ensure keySettings is initialized
    if (!this.settings.keySettings) {
      this.settings.keySettings = this.getDefaultKeySettings();
    }

    container.innerHTML = "";

    // Key display names mapping
    const keyDisplayNames = {
      // Letters
      KeyA: "A",
      KeyB: "B",
      KeyC: "C",
      KeyD: "D",
      KeyE: "E",
      KeyF: "F",
      KeyG: "G",
      KeyH: "H",
      KeyI: "I",
      KeyJ: "J",
      KeyK: "K",
      KeyL: "L",
      KeyM: "M",
      KeyN: "N",
      KeyO: "O",
      KeyP: "P",
      KeyQ: "Q",
      KeyR: "R",
      KeyS: "S",
      KeyT: "T",
      KeyU: "U",
      KeyV: "V",
      KeyW: "W",
      KeyX: "X",
      KeyY: "Y",
      KeyZ: "Z",
      // Numbers
      Digit0: "0",
      Digit1: "1",
      Digit2: "2",
      Digit3: "3",
      Digit4: "4",
      Digit5: "5",
      Digit6: "6",
      Digit7: "7",
      Digit8: "8",
      Digit9: "9",
      // Special keys
      Space: "Space",
      Enter: "Enter",
      Backspace: "Backspace",
      Tab: "Tab",
      Escape: "Esc",
      ShiftLeft: "Shift L",
      ShiftRight: "Shift R",
      ControlLeft: "Ctrl L",
      ControlRight: "Ctrl R",
      AltLeft: "Alt L",
      AltRight: "Alt R",
      MetaLeft: "Meta L",
      MetaRight: "Meta R",
      CapsLock: "Caps Lock",
      Delete: "Delete",
      Insert: "Insert",
      Home: "Home",
      End: "End",
      PageUp: "Page Up",
      PageDown: "Page Down",
      ArrowUp: "↑",
      ArrowDown: "↓",
      ArrowLeft: "←",
      ArrowRight: "→",
    };

    // Sort keys for better organization
    const sortedKeys = Object.keys(this.settings.keySettings).sort((a, b) => {
      const nameA = keyDisplayNames[a] || a;
      const nameB = keyDisplayNames[b] || b;
      return nameA.localeCompare(nameB);
    });

    sortedKeys.forEach((keyCode) => {
      const item = document.createElement("div");
      item.className = "key-toggle-item";

      const label = document.createElement("label");
      label.textContent = keyDisplayNames[keyCode] || keyCode;

      // Create toggle switch
      const toggleSwitch = document.createElement("label");
      toggleSwitch.className = "toggle-switch";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `key-${keyCode}`;
      checkbox.checked = this.settings.keySettings[keyCode] !== false;

      const slider = document.createElement("span");
      slider.className = "slider";

      checkbox.addEventListener("change", (e) => {
        this.settings.keySettings[keyCode] = e.target.checked;
        this.saveSettings();
        // Notify content scripts immediately
        this.notifyContentScripts("UPDATE_SETTINGS");
      });

      toggleSwitch.appendChild(checkbox);
      toggleSwitch.appendChild(slider);

      item.appendChild(label);
      item.appendChild(toggleSwitch);
      container.appendChild(item);
    });
  }

  /**
   * Adds a site to the blacklist
   * Formats the site URL and adds it to the blacklist if not already present
   * @param {string} site - The site URL or domain to blacklist
   */
  addToBlacklist(site) {
    if (!site) return;

    let formattedSite = site.toLowerCase().trim();
    formattedSite = formattedSite.replace(/^(https?:\/\/)/, "");
    formattedSite = formattedSite.replace(/^www\./, "");
    formattedSite = formattedSite.split("/")[0];

    if (!this.settings.siteBlacklist) {
      this.settings.siteBlacklist = [];
    }

    if (!this.settings.siteBlacklist.includes(formattedSite)) {
      this.settings.siteBlacklist.push(formattedSite);
      this.saveSettings();
      this.renderBlacklist();
      this.notifyContentScripts("UPDATE_BLACKLIST");
    }
  }

  /**
   * Removes a site from the blacklist
   * @param {string} site - The site to remove from the blacklist
   */
  removeFromBlacklist(site) {
    if (!this.settings.siteBlacklist) return;

    this.settings.siteBlacklist = this.settings.siteBlacklist.filter(
      (s) => s !== site
    );
    this.saveSettings();
    this.renderBlacklist();
    this.notifyContentScripts("UPDATE_BLACKLIST");
  }

  /**
   * Renders the blacklist of sites in the UI
   * Displays all blacklisted sites with remove buttons
   */
  renderBlacklist() {
    const list = document.getElementById("blacklistList");
    if (!list) return;

    list.innerHTML = "";

    if (
      !this.settings.siteBlacklist ||
      this.settings.siteBlacklist.length === 0
    ) {
      const empty = document.createElement("li");
      empty.className = "empty";
      empty.textContent = "No sites blacklisted";
      list.appendChild(empty);
      return;
    }

    this.settings.siteBlacklist.forEach((site) => {
      const item = document.createElement("li");
      item.className = "blacklist-item";

      const siteName = document.createElement("span");
      siteName.textContent = site;

      const removeBtn = document.createElement("button");
      removeBtn.textContent = "×";
      removeBtn.className = "remove-btn";
      removeBtn.addEventListener("click", () => {
        this.removeFromBlacklist(site);
      });

      item.appendChild(siteName);
      item.appendChild(removeBtn);
      list.appendChild(item);
    });
  }
}

/**
 * Initializes the popup controller when the DOM is ready
 */
document.addEventListener("DOMContentLoaded", () => {
  new PopupController();
});
