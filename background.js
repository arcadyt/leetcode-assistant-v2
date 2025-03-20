/**
 * Background script for LeetCode AI Assistant
 * Handles API requests and messaging
 */

// Track active tabs that have our content script
const activeTabs = new Set();

// Listen for content script registrations
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Handle content script ready notification
    if (request.action === 'contentScriptReady' && sender.tab) {
        console.log('Content script ready in tab:', sender.tab.id);
        activeTabs.add(sender.tab.id);
        sendResponse({status: 'registered'});
        return true;
    }

    // Handle API requests from content script
    if (request.action === 'makeApiRequest') {
        console.log('Making API request to:', request.endpoint);

        // Make API request on behalf of content script (to avoid CORS issues)
        fetch(request.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request.data)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`API responded with status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('API request successful');
                sendResponse({ success: true, data });
            })
            .catch(error => {
                console.error('API request error:', error);
                sendResponse({ success: false, error: error.message });
            });

        // Return true to indicate that the response will be sent asynchronously
        return true;
    }
});

// Handle tab updates to track active tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Only proceed if the tab's URL is on LeetCode problems
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('leetcode.com/problems/')) {
        console.log('LeetCode problem page loaded:', tab.url);
    }
});

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
    if (activeTabs.has(tabId)) {
        activeTabs.delete(tabId);
    }
});

// Handle extension install or update
chrome.runtime.onInstalled.addListener(() => {
    console.log('LeetCode AI Assistant installed or updated');
});