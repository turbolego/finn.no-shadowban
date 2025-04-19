// background.js - Handles context menu and background tasks

// Create context menu item
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'shadowbanSeller',
    title: 'Shadowban all items from this seller',
    contexts: ['link'],
    documentUrlPatterns: ['*://*.finn.no/*'],
    targetUrlPatterns: ['*://*.finn.no/*/item/*', '*://*.finn.no/item/*']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'shadowbanSeller') {
    // Send message to the content script to handle this action
    chrome.tabs.sendMessage(
      tab.id,
      {
        action: 'shadowbanSeller',
        itemUrl: info.linkUrl
      },
      (response) => {
        if (response && response.success) {
          // Show a notification to the user
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'images/icon128.png',
            title: 'Finn.no Shadowban',
            message: `Seller with ID ${response.userId} has been shadowbanned.`
          });
        } else {
          // Show error notification
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'images/icon128.png',
            title: 'Finn.no Shadowban',
            message: 'Could not shadowban seller. Please try again.'
          });
        }
      }
    );
  }
});
