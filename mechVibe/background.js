chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    enabled: true,
    volume: 0.7,
    soundProfile: 'linear',
    siteBlacklist: []
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_SETTINGS') {
    chrome.storage.local.get(['enabled', 'volume', 'soundProfile', 'siteBlacklist'], (result) => {
      sendResponse(result);
    });
    return true;
  }
  
  if (request.type === 'UPDATE_SETTINGS') {
    chrome.storage.local.set(request.settings, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.type === 'CHECK_BLACKLIST') {
    chrome.storage.local.get(['siteBlacklist'], (result) => {
      const blacklist = result.siteBlacklist || [];
      const hostname = new URL(request.url).hostname.toLowerCase();
      const isBlacklisted = blacklist.some(site => hostname.includes(site.toLowerCase()));
      sendResponse({ blacklisted: isBlacklisted });
    });
    return true;
  }
});
