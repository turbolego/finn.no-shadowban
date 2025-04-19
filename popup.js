// popup.js - Handles the extension popup functionality

// Function to load and display blocked users
function loadBlockedUsers() {
  chrome.storage.local.get(['blockedUserIds'], function(result) {
    const userList = document.getElementById('user-list');
    
    // Clear current list
    userList.innerHTML = '';
    
    if (result.blockedUserIds && result.blockedUserIds.length > 0) {
      // Display each blocked user
      result.blockedUserIds.forEach(userId => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        
        const userIdSpan = document.createElement('span');
        userIdSpan.textContent = `User ID: ${userId}`;
        
        const removeButton = document.createElement('button');
        removeButton.className = 'remove-btn';
        removeButton.textContent = 'Remove';
        removeButton.onclick = function() {
          removeBlockedUser(userId);
        };
        
        userItem.appendChild(userIdSpan);
        userItem.appendChild(removeButton);
        userList.appendChild(userItem);
      });
    } else {
      // Show empty message
      userList.innerHTML = '<div class="empty-message">No sellers have been blocked yet</div>';
    }
  });
}

// Function to remove a user from the blocked list
function removeBlockedUser(userId) {
  chrome.storage.local.get(['blockedUserIds'], function(result) {
    if (result.blockedUserIds) {
      // Filter out the user to be removed
      const updatedList = result.blockedUserIds.filter(id => id !== userId);
      
      // Save the updated list
      chrome.storage.local.set({blockedUserIds: updatedList}, function() {
        console.log(`Removed user ${userId} from blocked list`);
        
        // Refresh the display
        loadBlockedUsers();
        
        // Notify content scripts to update their blocked list
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          if (tabs[0] && tabs[0].url.includes('finn.no')) {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'refreshBlockedList'});
          }
        });
      });
    }
  });
}

// Load blocked users when popup opens
document.addEventListener('DOMContentLoaded', loadBlockedUsers);
