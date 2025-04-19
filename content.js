// Store blocked user IDs in an array (will be loaded from storage)
let BLOCKED_USER_IDS = [];

// Store checked item IDs to avoid repeated checks
const checkedItems = new Set();
// Store blocked item IDs
const blockedItems = new Set();

// Load blocked user IDs from local storage
function loadBlockedUserIds() {
  chrome.storage.local.get(['blockedUserIds'], function(result) {
    if (result.blockedUserIds) {
      BLOCKED_USER_IDS = result.blockedUserIds;
      console.log('Finn.no Shadowban: Loaded blocked user IDs:', BLOCKED_USER_IDS);
      // Re-run shadowban with the loaded IDs
      shadowbanUser();
    } else {
      // Initialize with empty array if no blocked users exist
      chrome.storage.local.set({blockedUserIds: []});
      BLOCKED_USER_IDS = [];
    }
  });
}

// Initialize by loading blocked user IDs
loadBlockedUserIds();

// Main function to handle the shadowban functionality
function shadowbanUser() {
  // If we have no blocked users, no need to continue
  if (BLOCKED_USER_IDS.length === 0) {
    return;
  }
  
  // Check if we're on a search results page
  if (window.location.href.includes('/search/') || 
      window.location.href.includes('/bap/') || 
      window.location.href.includes('/recommerce/') ||
      document.querySelector('article.sf-search-ad')) {
    console.log('Finn.no Shadowban: Scanning search results page for blocked user IDs:', BLOCKED_USER_IDS);
    
    // Get all articles (search results)
    const searchResults = document.querySelectorAll('article.sf-search-ad');
    
    if (searchResults.length > 0) {
      console.log(`Finn.no Shadowban: Found ${searchResults.length} items in search results`);
      
      // Process each search result
      searchResults.forEach((article) => {
        // Try to find user ID directly in the article HTML
        const articleHTML = article.innerHTML;
        
        // Check against all blocked user IDs
        for (const userId of BLOCKED_USER_IDS) {
          if (articleHTML.includes(`userId=${userId}`)) {
            console.log(`Finn.no Shadowban: Found and hiding item from blocked user ${userId} (direct match)`);
            article.style.display = 'none';
            return;
          }
        }
        
        // Get the item ID if possible
        const linkElement = article.querySelector('a.sf-search-ad-link');
        if (!linkElement) return;
        
        const itemUrl = linkElement.href;
        const itemIdMatch = itemUrl.match(/\/item\/(\d+)/);
        if (!itemIdMatch) return;
        
        const itemId = itemIdMatch[1];
        
        // If we've already identified this as a blocked item, hide it
        if (blockedItems.has(itemId)) {
          console.log(`Finn.no Shadowban: Hiding previously identified blocked item: ${itemId}`);
          article.style.display = 'none';
          return;
        }
        
        // Skip if we've already checked this item
        if (checkedItems.has(itemId)) return;
        
        // Mark this item as checked to avoid checking it again
        checkedItems.add(itemId);
        
        // Check if this item is from any of the blocked users
        checkItemSeller(itemUrl).then(blockedUserId => {
          if (blockedUserId) {
            console.log(`Finn.no Shadowban: Hiding item from blocked user ${blockedUserId}: ${itemUrl}`);
            article.style.display = 'none';
            blockedItems.add(itemId);
            
            // Create a more permanent style
            const styleTag = document.createElement('style');
            styleTag.textContent = `
              [data-blocked-item-id="${itemId}"] {
                display: none !important;
              }
            `;
            document.head.appendChild(styleTag);
            article.setAttribute('data-blocked-item-id', itemId);
          }
        });
      });
    }
  } else if (window.location.href.includes('/item/')) {
    // If we're on an item page, check if it's from any blocked user
    const sellerLinks = document.querySelectorAll('a[href*="?userId="]');
    
    sellerLinks.forEach(link => {
      for (const userId of BLOCKED_USER_IDS) {
        if (link.href.includes(`userId=${userId}`)) {
          console.log(`Finn.no Shadowban: This item is from blocked user ${userId}, redirecting back`);
          window.history.back();
          return;
        }
      }
    });
  }
}

// Function to extract userId from an item URL
async function extractUserIdFromItemPage(itemUrl) {
  try {
    // Fetch the item page
    const response = await fetch(itemUrl, {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        'Accept': 'text/html',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      console.error(`Finn.no Shadowban: Failed to fetch ${itemUrl}, status: ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    
    // Use regex to extract the userId from the HTML
    // Looking for patterns like: href="/profile/ads?userId=<number_here>"
    const userIdMatch = html.match(/href="\/profile\/ads\?userId=(\d+)"/);
    
    if (userIdMatch && userIdMatch[1]) {
      return userIdMatch[1];
    }
    
    return null;
  } catch (error) {
    console.error('Finn.no Shadowban: Error extracting user ID:', error, itemUrl);
    return null;
  }
}

// Function to check if an item is from any of the blocked users
// Returns the blocked user ID if found, otherwise null
async function checkItemSeller(itemUrl) {
  try {
    // Fetch the item page
    const response = await fetch(itemUrl, {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        'Accept': 'text/html',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      console.error(`Finn.no Shadowban: Failed to fetch ${itemUrl}, status: ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    
    // Check for each blocked user ID in the HTML
    for (const userId of BLOCKED_USER_IDS) {
      if (html.includes(`userId=${userId}`)) {
        return userId;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Finn.no Shadowban: Error checking item seller:', error, itemUrl);
    return null;
  }
}

// Function to add a userId to the blocked list
function addUserToBlockedList(userId) {
  if (!userId || BLOCKED_USER_IDS.includes(userId)) {
    return;
  }
  
  // Add to the in-memory array
  BLOCKED_USER_IDS.push(userId);
  
  // Save to storage
  chrome.storage.local.set({blockedUserIds: BLOCKED_USER_IDS}, function() {
    console.log(`Finn.no Shadowban: Added user ${userId} to blocked list`);
    // Re-run shadowban with the updated list
    shadowbanUser();
  });
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'shadowbanSeller') {
    // Extract the URL from the selected item
    const itemUrl = request.itemUrl;
    
    if (itemUrl) {
      // Extract the userId and add it to the blocked list
      extractUserIdFromItemPage(itemUrl).then(userId => {
        if (userId) {
          addUserToBlockedList(userId);
          sendResponse({success: true, userId: userId});
        } else {
          sendResponse({success: false, error: 'Could not extract user ID'});
        }
      });
      
      // Return true to indicate we'll respond asynchronously
      return true;
    }
  } else if (request.action === 'refreshBlockedList') {
    // Reload the blocked list from storage
    loadBlockedUserIds();
    sendResponse({success: true});
  }
});

// Also run when the DOM content might have been updated (for infinite scrolling)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    shadowbanUser();
  } else if (document.querySelector('article.sf-search-ad')) {
    // Check if new articles were added (infinite scroll)
    shadowbanUser();
  }
}).observe(document, {subtree: true, childList: true});
