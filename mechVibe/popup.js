class PopupController {
  constructor() {
    this.settings = {
      enabled: true,
      volume: 0.7,
      soundProfile: 'linear',
      siteBlacklist: []
    };
    
    this.init();
  }
  
  async init() {
    await this.loadSettings();
    this.setupUI();
    this.setupEventListeners();
  }
  
  async loadSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
        if (response) {
          this.settings = { ...this.settings, ...response };
        }
        resolve();
      });
    });
  }
  
  async saveSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ 
        type: 'UPDATE_SETTINGS', 
        settings: this.settings 
      }, (response) => {
        this.notifyContentScripts('UPDATE_SETTINGS');
        resolve();
      });
    });
  }
  
  notifyContentScripts(messageType, data = {}) {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          type: messageType,
          settings: this.settings,
          ...data
        }).catch(() => {});
      });
    });
  }
  
  setupUI() {
    const enableToggle = document.getElementById('enableToggle');
    if (enableToggle) {
      enableToggle.checked = this.settings.enabled !== false;
    }
    
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeValue = document.getElementById('volumeValue');
    if (volumeSlider && volumeValue) {
      volumeSlider.value = Math.round(this.settings.volume * 100);
      volumeValue.textContent = `${Math.round(this.settings.volume * 100)}%`;
    }
    
    const profileRadios = document.querySelectorAll('input[name="profile"]');
    profileRadios.forEach(radio => {
      if (radio.value === this.settings.soundProfile) {
        radio.checked = true;
      }
    });
    
    this.renderBlacklist();
  }
  
  setupEventListeners() {
    const enableToggle = document.getElementById('enableToggle');
    if (enableToggle) {
      enableToggle.addEventListener('change', (e) => {
        this.settings.enabled = e.target.checked;
        this.saveSettings();
        this.notifyContentScripts('TOGGLE_ENABLED', { enabled: this.settings.enabled });
      });
    }
    
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeValue = document.getElementById('volumeValue');
    if (volumeSlider && volumeValue) {
      volumeSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        volumeValue.textContent = `${value}%`;
        this.settings.volume = value / 100;
        this.saveSettings();
      });
    }
    
    const profileRadios = document.querySelectorAll('input[name="profile"]');
    profileRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.settings.soundProfile = e.target.value;
          this.saveSettings();
        }
      });
    });
    
    const addSiteBtn = document.getElementById('addSiteBtn');
    const siteInput = document.getElementById('siteInput');
    
    if (addSiteBtn && siteInput) {
      addSiteBtn.addEventListener('click', () => {
        this.addToBlacklist(siteInput.value.trim());
        siteInput.value = '';
      });
      
      siteInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.addToBlacklist(siteInput.value.trim());
          siteInput.value = '';
        }
      });
    }
  }
  
  addToBlacklist(site) {
    if (!site) return;
    
    let formattedSite = site.toLowerCase().trim();
    formattedSite = formattedSite.replace(/^(https?:\/\/)/, '');
    formattedSite = formattedSite.replace(/^www\./, '');
    formattedSite = formattedSite.split('/')[0];
    
    if (!this.settings.siteBlacklist) {
      this.settings.siteBlacklist = [];
    }
    
    if (!this.settings.siteBlacklist.includes(formattedSite)) {
      this.settings.siteBlacklist.push(formattedSite);
      this.saveSettings();
      this.renderBlacklist();
      this.notifyContentScripts('UPDATE_BLACKLIST');
    }
  }
  
  removeFromBlacklist(site) {
    if (!this.settings.siteBlacklist) return;
    
    this.settings.siteBlacklist = this.settings.siteBlacklist.filter(s => s !== site);
    this.saveSettings();
    this.renderBlacklist();
    this.notifyContentScripts('UPDATE_BLACKLIST');
  }
  
  renderBlacklist() {
    const list = document.getElementById('blacklistList');
    if (!list) return;
    
    list.innerHTML = '';
    
    if (!this.settings.siteBlacklist || this.settings.siteBlacklist.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'empty';
      empty.textContent = 'No sites blacklisted';
      list.appendChild(empty);
      return;
    }
    
    this.settings.siteBlacklist.forEach(site => {
      const item = document.createElement('li');
      item.className = 'blacklist-item';
      
      const siteName = document.createElement('span');
      siteName.textContent = site;
      
      const removeBtn = document.createElement('button');
      removeBtn.textContent = '×';
      removeBtn.className = 'remove-btn';
      removeBtn.addEventListener('click', () => {
        this.removeFromBlacklist(site);
      });
      
      item.appendChild(siteName);
      item.appendChild(removeBtn);
      list.appendChild(item);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});

