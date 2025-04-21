// Store blocked user IDs in an array (will be loaded from storage)
let BLOCKED_USER_IDS = [];

// Store checked item IDs to avoid repeated checks
const checkedItems = new Set();
// Store blocked item IDs
const blockedItems = new Set();

// Load blocked user IDs from local storage
function loadBlockedUserIds() {
  console.log('Finn.no Shadowban: Loading blocked user IDs from storage');
  chrome.storage.local.get('blockedUserIds', function(result) {
    if (result.blockedUserIds) {
      BLOCKED_USER_IDS = result.blockedUserIds;
      console.log('Finn.no Shadowban: Loaded blocked user IDs:', BLOCKED_USER_IDS);
      shadowbanUser();
    } else {
      console.log('Finn.no Shadowban: No blocked users found, initializing empty array');
      chrome.storage.local.set({ blockedUserIds: [] });
      BLOCKED_USER_IDS = [];
    }
  });
}

// Initialize by loading blocked user IDs
loadBlockedUserIds();

// Main function to handle the shadowban functionality
function shadowbanUser() {
  if (BLOCKED_USER_IDS.length === 0) return;

  if (window.location.href.includes('/search/') ||
      window.location.href.includes('/bap/') ||
      window.location.href.includes('/recommerce/') ||
      document.querySelector('article.sf-search-ad')) {
    console.log('Finn.no Shadowban: Scanning search results for blocked IDs:', BLOCKED_USER_IDS);
    const results = document.querySelectorAll('article.sf-search-ad');
    results.forEach(article => {
      const html = article.innerHTML;
      for (const id of BLOCKED_USER_IDS) {
        if (html.includes(`userId=${id}`)) {
          article.style.display = 'none';
          return;
        }
      }
      const link = article.querySelector('a.sf-search-ad-link');
      if (!link) return;
      const match = link.href.match(/\/item\/(\d+)/);
      if (!match) return;
      const itemId = match[1];
      if (blockedItems.has(itemId)) {
        article.style.display = 'none';
        return;
      }
      if (checkedItems.has(itemId)) return;
      checkedItems.add(itemId);
      checkItemSeller(link.href).then(blockedId => {
        if (blockedId) {
          article.style.display = 'none';
          blockedItems.add(itemId);
          const styleTag = document.createElement('style');
          styleTag.textContent = `[data-blocked-item-id="${itemId}"] { display: none !important; }`;
          document.head.appendChild(styleTag);
          article.setAttribute('data-blocked-item-id', itemId);
        }
      });
    });
  } else if (window.location.href.includes('/item/')) {
    const sellerLinks = document.querySelectorAll('a[href*="?userId="]');
    sellerLinks.forEach(link => {
      for (const id of BLOCKED_USER_IDS) {
        if (link.href.includes(`userId=${id}`)) {
          window.history.back();
          return;
        }
      }
    });
  }
}

async function checkItemSeller(itemUrl) {
  try {
    const response = await fetch(itemUrl, { credentials: 'same-origin' });
    if (!response.ok) return null;
    const html = await response.text();

    for (const id of BLOCKED_USER_IDS) {
      if (html.includes(`userId=${id}`)) {
        console.log(`Finn.no Shadowban: Found blocked userId=${id} in item page`);
        return id;
      }
    }

    const ownerId = await extractOwnerIdFromHtml(html);
    if (ownerId && BLOCKED_USER_IDS.includes(ownerId)) {
      console.log(`Finn.no Shadowban: Found blocked ownerId=${ownerId} in item page`);
      return ownerId;
    }

    return null;
  } catch (e) {
    console.error('Finn.no Shadowban: Error checking item seller:', e);
    return null;
  }
}

// Helper function to extract owner ID from HTML
async function extractOwnerIdFromHtml(html) {
  try {
    let hydrationDataMatch = html.match(/<script>window\.__staticRouterHydrationData\s*=\s*JSON\.parse\("(.*?)"\)<\/script>/s);
    if (!hydrationDataMatch) {
      hydrationDataMatch = html.match(/window\.__staticRouterHydrationData\s*=\s*JSON\.parse\("([^<]+)"\)/s);
    }

    if (hydrationDataMatch && hydrationDataMatch[1]) {
      const hydrationContent = hydrationDataMatch[1];
      const ownerIdMatch = hydrationContent.match(/\\*"ownerId\\*":(\d+)/);
      if (ownerIdMatch && ownerIdMatch[1]) {
        return ownerIdMatch[1];
      }
      const adOwnerPattern = hydrationContent.match(/\\*"adId\\*":\\*"(\d+)\\*",\\*"ownerId\\*":(\d+)/);
      if (adOwnerPattern && adOwnerPattern[2]) {
        return adOwnerPattern[2];
      }
      const generalOwnerIdMatch = hydrationContent.match(/ownerId.{0,10}?(\d{7,})/);
      if (generalOwnerIdMatch && generalOwnerIdMatch[1]) {
        return generalOwnerIdMatch[1];
      }
    }

    return null;
  } catch (e) {
    console.error('Finn.no Shadowban: Error extracting owner ID from HTML:', e);
    return null;
  }
}

function addUserToBlockedList(userId) {
  console.log(`Finn.no Shadowban: Attempting to add user ${userId} to blocked list`);
  if (!userId) {
    console.error('Finn.no Shadowban: Cannot add null/undefined userId to blocked list');
    return;
  }

  if (BLOCKED_USER_IDS.includes(userId)) {
    console.log(`Finn.no Shadowban: User ${userId} is already in blocked list`);
    return;
  }

  BLOCKED_USER_IDS.push(userId);
  console.log(`Finn.no Shadowban: Added user ${userId} to BLOCKED_USER_IDS`);

  chrome.storage.local.set({ blockedUserIds: BLOCKED_USER_IDS }, function() {
    console.log(`Finn.no Shadowban: Successfully saved user ${userId} to storage`);
    shadowbanUser();
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Finn.no Shadowban: Message received in content script:', request);

  if (request.action === 'shadowbanSeller' && request.itemUrl) {
    console.log('Finn.no Shadowban: Processing shadowbanSeller action for URL:', request.itemUrl);

    extractUserIdFromItemPage(request.itemUrl).then(id => {
      if (id) {
        addUserToBlockedList(id);
        sendResponse({ success: true, userId: id });
      } else {
        sendResponse({ success: false, error: 'Could not extract user ID' });
      }
    }).catch(error => {
      sendResponse({ success: false, error: error.toString() });
    });

    return true;
  }

  if (request.action === 'refreshBlockedList') {
    loadBlockedUserIds();
    sendResponse({ success: true });
    return true;
  }
});

let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    shadowbanUser();
  } else if (document.querySelector('article.sf-search-ad')) {
    shadowbanUser();
  }
}).observe(document, { childList: true, subtree: true });

async function extractUserIdFromItemPage(itemUrl) {
  try {
    const resp = await fetch(itemUrl, { credentials: 'same-origin' });
    if (!resp.ok) return null;
    const txt = await resp.text();

    const profileMatch = txt.match(/href="\/profile\/ads\?userId=(\d+)"/);
    if (profileMatch) return profileMatch[1];

    const userIdMatch = txt.match(/href="[^"]*\?userId=(\d+)"/);
    if (userIdMatch) return userIdMatch[1];

    const dataMatch = txt.match(/data-user-id="(\d+)"/);
    if (dataMatch) return dataMatch[1];

    const generalMatch = txt.match(/userId=(\d+)/);
    if (generalMatch) return generalMatch[1];

    const sellerSectionMatch = txt.match(/<h2[^>]*>Sold by<\/h2>[\s\S]*?href="[^"]*?userId=(\d+)"/i) ||
                               txt.match(/<div[^>]*seller[^>]*>[\s\S]*?userId=(\d+)/i);
    if (sellerSectionMatch) return sellerSectionMatch[1];

    return null;
  } catch (e) {
    console.error('Finn.no Shadowban: Error extracting user ID:', e);
    return null;
  }
}
