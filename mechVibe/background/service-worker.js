// WebVibes Background Service Worker - FINAL
class BackgroundService {
  constructor() {
    this.currentSession = {
      startTime: Date.now(),
      wordCount: 0,
      keyStrokes: 0,
      achievements: [],
      lastKeyTime: Date.now(),
      sessionId: Date.now().toString(),
    };

    this.initialize();
  }

  async initialize() {
    console.log("WebVibes background service initializing...");

    // Initialize storage with default values
    await this.initializeStorage();

    // Set up listeners
    this.setupListeners();

    // Set up alarms
    await this.setupAlarms();

    console.log("WebVibes background service initialized");
  }

  async initializeStorage() {
    const defaults = {
      settings: {
        enabled: true,
        volume: 0.7,
        pitch: 1.0,
        currentSwitch: "tactile",
        overlap: true,
        pitchVariation: 0.1,
        siteBlacklist: [
          "youtube.com",
          "netflix.com",
          "spotify.com",
          "twitch.tv",
        ],
        passwordProtection: true,
        incognitoStealth: true,
        showNotifications: true,
        darkMode: true,
        autoMuteMedia: true,
        enableAchievements: true,
      },
      achievements: {
        totalWords: 0,
        totalSessions: 0,
        streakDays: 0,
        lastActiveDate: null,
        unlocked: [],
        stats: {
          highestWPM: 0,
          totalTypingTime: 0,
          favoriteSwitch: "tactile",
          totalKeysPressed: 0,
        },
      },
      user: {
        level: 1,
        xp: 0,
        xpToNextLevel: 500,
        username: null,
        joinDate: new Date().toISOString(),
      },
      session: {
        currentWordCount: 0,
        startTime: Date.now(),
        lastReset: Date.now(),
      },
    };

    try {
      const result = await chrome.storage.local.get([
        "settings",
        "achievements",
        "user",
        "session",
      ]);

      if (!result.settings) {
        await chrome.storage.local.set(defaults);
      } else {
        // Merge existing settings with defaults for new properties
        const mergedSettings = { ...defaults.settings, ...result.settings };
        const mergedAchievements = {
          ...defaults.achievements,
          ...result.achievements,
        };
        const mergedUser = { ...defaults.user, ...result.user };
        const mergedSession = { ...defaults.session, ...result.session };

        await chrome.storage.local.set({
          settings: mergedSettings,
          achievements: mergedAchievements,
          user: mergedUser,
          session: mergedSession,
        });
      }

      // Load session data
      const sessionData = await chrome.storage.local.get("session");
      if (sessionData.session) {
        this.currentSession.wordCount =
          sessionData.session.currentWordCount || 0;
        this.currentSession.startTime =
          sessionData.session.startTime || Date.now();
      }
    } catch (error) {
      console.error("Error initializing storage:", error);
    }
  }

  setupListeners() {
    // Command listener for global hotkey
    chrome.commands.onCommand.addListener((command) => {
      if (command === "toggle_sounds") {
        this.toggleSounds();
      } else if (command === "open_popup") {
        this.openPopup();
      }
    });

    // Tab update listener for site blacklist
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === "complete" && tab.url) {
        this.checkSiteBlacklist(tab.url);
      }
    });

    // Tab activation listener
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (tab.url) {
          this.checkSiteBlacklist(tab.url);
        }
      } catch (error) {
        console.error("Error getting tab:", error);
      }
    });

    // Message listener from content scripts
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender).then(sendResponse);
      return true; // Keep message channel open for async response
    });

    // Install/update listener
    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === "install") {
        this.onInstall();
      } else if (details.reason === "update") {
        this.onUpdate();
      }
    });

    // Alarm listener
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === "dailyReset") {
        this.checkDailyStreak();
      } else if (alarm.name === "saveSession") {
        this.saveSessionData();
      }
    });
  }

  async setupAlarms() {
    // Create alarm for daily streak reset
    await chrome.alarms.create("dailyReset", { periodInMinutes: 1440 });

    // Create alarm for session data saving (every 5 minutes)
    await chrome.alarms.create("saveSession", { periodInMinutes: 5 });
  }

  async toggleSounds() {
    try {
      const data = await chrome.storage.local.get("settings");
      const newState = !data.settings.enabled;

      await chrome.storage.local.set({
        settings: { ...data.settings, enabled: newState },
      });

      // Notify all tabs
      const tabs = await chrome.tabs.query({});
      tabs.forEach((tab) => {
        chrome.tabs
          .sendMessage(tab.id, {
            type: "TOGGLE_SOUNDS",
            enabled: newState,
          })
          .catch(() => {}); // Ignore errors for tabs that don't have content script
      });

      // Show notification
      this.showNotification(
        newState ? "🎹 Sounds Enabled" : "🔇 Sounds Disabled",
        newState ? "Keyboard sounds are now ON" : "Keyboard sounds are now OFF",
        newState ? "success" : "info"
      );

      return newState;
    } catch (error) {
      console.error("Error toggling sounds:", error);
      return false;
    }
  }

  async openPopup() {
    try {
      await chrome.action.openPopup();
    } catch (error) {
      console.error("Error opening popup:", error);
    }
  }

  async checkSiteBlacklist(url) {
    try {
      const data = await chrome.storage.local.get("settings");
      const blacklist = data.settings?.siteBlacklist || [];
      const hostname = new URL(url).hostname.toLowerCase();

      const isBlacklisted = blacklist.some((site) =>
        hostname.includes(site.toLowerCase())
      );

      // Send message to active tab
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs[0]) {
        chrome.tabs
          .sendMessage(tabs[0].id, {
            type: "SITE_BLACKLIST",
            blacklisted: isBlacklisted,
          })
          .catch(() => {});
      }

      return isBlacklisted;
    } catch (error) {
      console.error("Error checking site blacklist:", error);
      return false;
    }
  }

  async handleMessage(request, sender) {
    try {
      switch (request.type) {
        case "KEY_PRESSED":
          return await this.handleKeyPress(request.data);

        case "WORD_COUNT_UPDATE":
          return await this.updateWordCount(request.data);

        case "GET_SETTINGS":
          return await chrome.storage.local.get("settings");

        case "UPDATE_SETTINGS":
          await chrome.storage.local.set({ settings: request.settings });
          return { success: true };

        case "GET_ACHIEVEMENTS":
          return await chrome.storage.local.get(["achievements", "user"]);

        case "CHECK_ACHIEVEMENT":
          return await this.checkAchievement(
            request.achievementId,
            request.data
          );

        case "GET_SESSION_INFO":
          return {
            session: this.currentSession,
            timestamp: Date.now(),
          };

        case "RESET_SESSION":
          return await this.resetSession();

        case "GET_BLACKLIST_STATUS":
          if (sender.tab?.url) {
            const isBlacklisted = await this.checkSiteBlacklist(sender.tab.url);
            return { blacklisted: isBlacklisted };
          }
          return { blacklisted: false };

        case "TEST_SOUND":
          return await this.playTestSound();

        default:
          return { error: "Unknown message type" };
      }
    } catch (error) {
      console.error("Error handling message:", error, request);
      return { error: error.message };
    }
  }

  async handleKeyPress(data) {
    try {
      this.currentSession.keyStrokes++;
      this.currentSession.lastKeyTime = Date.now();

      // Update total keys pressed in stats
      const storage = await chrome.storage.local.get("achievements");
      if (storage.achievements?.stats) {
        storage.achievements.stats.totalKeysPressed =
          (storage.achievements.stats.totalKeysPressed || 0) + 1;
        await chrome.storage.local.set({ achievements: storage.achievements });
      }

      // Check for special achievements
      if (data.key === " ") {
        this.currentSession.wordCount++;
        await this.updateSessionWordCount();
        await this.checkWordBasedAchievements();
      }

      return { success: true };
    } catch (error) {
      console.error("Error handling key press:", error);
      return { success: false };
    }
  }

  async updateSessionWordCount() {
    try {
      await chrome.storage.local.set({
        session: {
          currentWordCount: this.currentSession.wordCount,
          startTime: this.currentSession.startTime,
          lastReset: Date.now(),
        },
      });
    } catch (error) {
      console.error("Error updating session word count:", error);
    }
  }

  async updateWordCount(data) {
    try {
      const now = Date.now();
      const sessionDuration = (now - this.currentSession.startTime) / 1000 / 60; // in minutes

      if (sessionDuration > 0) {
        const wpm = Math.round(this.currentSession.wordCount / sessionDuration);

        // Update highest WPM if needed
        const storage = await chrome.storage.local.get("achievements");
        if (wpm > (storage.achievements?.stats?.highestWPM || 0)) {
          storage.achievements.stats.highestWPM = wpm;
          await chrome.storage.local.set({
            achievements: storage.achievements,
          });

          // Check for WPM-based achievements
          if (wpm >= 100) {
            await this.unlockAchievement("sprint_master");
          }
          if (wpm >= 60 && sessionDuration >= 2) {
            await this.unlockAchievement("flow_state");
          }
        }
      }

      // Check for marathon achievement
      if (this.currentSession.wordCount >= 2000) {
        await this.unlockAchievement("marathon");
      }

      // Update total typing time
      const totalTime = await this.incrementTotalTypingTime(1); // 1 minute

      return {
        success: true,
        wpm: Math.round(this.currentSession.wordCount / sessionDuration || 0),
        totalTime: totalTime,
      };
    } catch (error) {
      console.error("Error updating word count:", error);
      return { success: false };
    }
  }

  async incrementTotalTypingTime(minutes) {
    try {
      const storage = await chrome.storage.local.get("achievements");
      if (storage.achievements?.stats) {
        storage.achievements.stats.totalTypingTime =
          (storage.achievements.stats.totalTypingTime || 0) + minutes;
        await chrome.storage.local.set({ achievements: storage.achievements });
        return storage.achievements.stats.totalTypingTime;
      }
      return 0;
    } catch (error) {
      console.error("Error incrementing total typing time:", error);
      return 0;
    }
  }

  async checkWordBasedAchievements() {
    try {
      const totalWords = await this.incrementTotalWords();

      // Check for word count milestones
      const milestones = [
        { count: 500, id: "first_steps" },
        { count: 1000, id: "productive_day" },
        { count: 5000, id: "consistent_writer" },
        { count: 10000, id: "golden_switch" },
        { count: 50000, id: "typing_master" },
        { count: 100000, id: "legendary_typist" },
      ];

      for (const milestone of milestones) {
        if (totalWords >= milestone.count) {
          await this.unlockAchievement(milestone.id);
        }
      }

      return totalWords;
    } catch (error) {
      console.error("Error checking word achievements:", error);
      return 0;
    }
  }

  async incrementTotalWords() {
    try {
      const storage = await chrome.storage.local.get("achievements");
      if (!storage.achievements) {
        storage.achievements = { totalWords: 0 };
      }
      storage.achievements.totalWords =
        (storage.achievements.totalWords || 0) + 1;
      await chrome.storage.local.set({ achievements: storage.achievements });
      return storage.achievements.totalWords;
    } catch (error) {
      console.error("Error incrementing total words:", error);
      return 0;
    }
  }

  async checkAchievement(achievementId, data) {
    try {
      // Check if already unlocked
      const storage = await chrome.storage.local.get("achievements");
      if (storage.achievements?.unlocked?.includes(achievementId)) {
        return { alreadyUnlocked: true };
      }

      // Unlock the achievement
      await this.unlockAchievement(achievementId);
      return { unlocked: true };
    } catch (error) {
      console.error("Error checking achievement:", error);
      return { error: error.message };
    }
  }

  async unlockAchievement(achievementId) {
    try {
      // Prevent duplicate unlocks in same session
      if (this.currentSession.achievements.includes(achievementId)) {
        return;
      }

      const storage = await chrome.storage.local.get([
        "achievements",
        "user",
        "settings",
      ]);

      // Initialize if not exists
      if (!storage.achievements) storage.achievements = { unlocked: [] };
      if (!storage.achievements.unlocked) storage.achievements.unlocked = [];
      if (!storage.user) storage.user = { level: 1, xp: 0, xpToNextLevel: 500 };

      // Check if already unlocked
      if (storage.achievements.unlocked.includes(achievementId)) {
        return;
      }

      // Add to unlocked achievements
      storage.achievements.unlocked.push(achievementId);
      this.currentSession.achievements.push(achievementId);

      // Add XP
      const xpGained = this.getXpForAchievement(achievementId);
      storage.user.xp = (storage.user.xp || 0) + xpGained;

      // Check level up
      while (storage.user.xp >= storage.user.xpToNextLevel) {
        storage.user.xp -= storage.user.xpToNextLevel;
        storage.user.level = (storage.user.level || 1) + 1;
        storage.user.xpToNextLevel = Math.round(
          (storage.user.xpToNextLevel || 500) * 1.5
        );

        // Show level up notification
        this.showNotification(
          "🎉 Level Up!",
          `You've reached level ${storage.user.level}!`,
          "levelUp"
        );
      }

      await chrome.storage.local.set({
        achievements: storage.achievements,
        user: storage.user,
      });

      // Show achievement notification
      if (storage.settings?.showNotifications !== false) {
        await this.showAchievementNotification(
          achievementId,
          xpGained,
          storage.user.level
        );
      }

      return { unlocked: true, xpGained, level: storage.user.level };
    } catch (error) {
      console.error("Error unlocking achievement:", error);
      throw error;
    }
  }

  getXpForAchievement(achievementId) {
    const xpValues = {
      first_steps: 50,
      productive_day: 100,
      consistent_writer: 250,
      golden_switch: 500,
      typing_master: 1000,
      legendary_typist: 2000,
      sprint_master: 150,
      flow_state: 200,
      marathon: 300,
      five_day_streak: 200,
      ten_day_streak: 500,
      thirty_day_streak: 1000,
      typing_streak_30: 100,
      speed_demon: 400,
      accuracy_master: 300,
    };

    return xpValues[achievementId] || 100;
  }

  async showAchievementNotification(achievementId, xpGained, userLevel) {
    const achievementData = this.getAchievementData(achievementId);

    // Show Chrome notification
    if (chrome.notifications) {
      chrome.notifications.create(`achievement_${achievementId}`, {
        type: "basic",
        iconUrl: chrome.runtime.getURL("icons/icon128.png"),
        title: `🏆 ${achievementData.name}`,
        message: `${achievementData.description} (+${xpGained} XP)`,
        priority: 1,
      });
    }

    // Also send message to content script for in-page notification
    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs[0]) {
        chrome.tabs
          .sendMessage(tabs[0].id, {
            type: "SHOW_ACHIEVEMENT",
            achievement: {
              ...achievementData,
              xpGained,
              userLevel,
            },
          })
          .catch(() => {}); // Ignore if content script not ready
      }
    } catch (error) {
      console.error("Error sending achievement to content script:", error);
    }
  }

  getAchievementData(achievementId) {
    const achievements = {
      first_steps: {
        name: "First Steps",
        description: "You typed your first 500 words!",
      },
      productive_day: {
        name: "Productive Day",
        description: "1,000 words reached! Keep going!",
      },
      consistent_writer: {
        name: "Consistent Writer",
        description: "5,000 words! You're on fire! 🔥",
      },
      golden_switch: {
        name: "Golden Switch",
        description: "10,000 words! Golden switch sound unlocked!",
      },
      typing_master: {
        name: "Typing Master",
        description: "50,000 words! You're a typing machine!",
      },
      legendary_typist: {
        name: "Legendary Typist",
        description: "100,000 words! Welcome to the legends club!",
      },
      sprint_master: {
        name: "Sprint Master",
        description: "100+ WPM for 10 seconds! Speed demon!",
      },
      flow_state: {
        name: "Flow State",
        description: "60+ WPM for 2 minutes! Perfect flow!",
      },
      marathon: {
        name: "Marathon Typist",
        description: "2,000 words in one session! Incredible!",
      },
      five_day_streak: {
        name: "Five Day Streak",
        description: "5 days in a row! You're committed!",
      },
      ten_day_streak: {
        name: "Ten Day Streak",
        description: "10 days streak! Unstoppable!",
      },
      thirty_day_streak: {
        name: "Thirty Day Streak",
        description: "30 days! You've made it a habit!",
      },
      typing_streak_30: {
        name: "Unbroken Focus",
        description: "30 seconds of continuous typing!",
      },
      speed_demon: {
        name: "Speed Demon",
        description: "Reached 150+ WPM! Lightning fast!",
      },
      accuracy_master: {
        name: "Accuracy Master",
        description: "98% accuracy for 1000 words! Precision!",
      },
    };

    return (
      achievements[achievementId] || {
        name: "Achievement Unlocked!",
        description: "You unlocked a new achievement!",
      }
    );
  }

  async showNotification(title, message, type = "info") {
    if (!chrome.notifications) return;

    try {
      const notificationId = `notification_${Date.now()}`;

      chrome.notifications.create(notificationId, {
        type: "basic",
        iconUrl: chrome.runtime.getURL("icons/icon128.png"),
        title: title,
        message: message,
        priority: type === "levelUp" ? 2 : 1,
      });

      // Auto-remove notification after 5 seconds
      setTimeout(() => {
        chrome.notifications.clear(notificationId);
      }, 5000);
    } catch (error) {
      console.error("Error showing notification:", error);
    }
  }

  async checkDailyStreak() {
    try {
      const storage = await chrome.storage.local.get("achievements");
      if (!storage.achievements) {
        storage.achievements = {
          streakDays: 0,
          lastActiveDate: null,
        };
      }

      const today = new Date().toDateString();

      if (storage.achievements.lastActiveDate === today) {
        return; // Already counted today
      }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();

      if (storage.achievements.lastActiveDate === yesterdayStr) {
        // Consecutive day
        storage.achievements.streakDays =
          (storage.achievements.streakDays || 0) + 1;

        // Check streak achievements
        if (storage.achievements.streakDays === 5) {
          await this.unlockAchievement("five_day_streak");
        } else if (storage.achievements.streakDays === 10) {
          await this.unlockAchievement("ten_day_streak");
        } else if (storage.achievements.streakDays === 30) {
          await this.unlockAchievement("thirty_day_streak");
        }
      } else if (storage.achievements.lastActiveDate !== today) {
        // Broken streak, but active today
        storage.achievements.streakDays = 1;
      }

      storage.achievements.lastActiveDate = today;
      await chrome.storage.local.set({ achievements: storage.achievements });

      return storage.achievements.streakDays;
    } catch (error) {
      console.error("Error checking daily streak:", error);
      return 0;
    }
  }

  async saveSessionData() {
    try {
      await chrome.storage.local.set({
        session: {
          currentWordCount: this.currentSession.wordCount,
          startTime: this.currentSession.startTime,
          lastReset: Date.now(),
        },
      });
    } catch (error) {
      console.error("Error saving session data:", error);
    }
  }

  async resetSession() {
    try {
      this.currentSession = {
        startTime: Date.now(),
        wordCount: 0,
        keyStrokes: 0,
        achievements: [],
        lastKeyTime: Date.now(),
        sessionId: Date.now().toString(),
      };

      await chrome.storage.local.set({
        session: {
          currentWordCount: 0,
          startTime: Date.now(),
          lastReset: Date.now(),
        },
      });

      return { success: true };
    } catch (error) {
      console.error("Error resetting session:", error);
      return { success: false, error: error.message };
    }
  }

  async playTestSound() {
    try {
      // Send test sound to all tabs
      const tabs = await chrome.tabs.query({});
      tabs.forEach((tab) => {
        chrome.tabs
          .sendMessage(tab.id, {
            type: "PLAY_TEST_SOUND",
          })
          .catch(() => {});
      });

      return { success: true };
    } catch (error) {
      console.error("Error playing test sound:", error);
      return { success: false };
    }
  }

  async onInstall() {
    console.log("WebVibes extension installed");

    // Show welcome notification
    this.showNotification(
      "🎉 Welcome to WebVibes!",
      "Click the extension icon to customize your keyboard sounds.",
      "success"
    );

    // Open welcome page
    try {
      await chrome.tabs.create({
        url: chrome.runtime.getURL("popup/popup.html") + "?welcome=true",
      });
    } catch (error) {
      console.error("Error opening welcome page:", error);
    }
  }

  async onUpdate() {
    console.log("WebVibes extension updated");

    // Show update notification
    this.showNotification(
      "🔄 WebVibes Updated",
      "Check out the new features in version 1.0!",
      "info"
    );
  }
}

// Initialize the background service
const backgroundService = new BackgroundService();
