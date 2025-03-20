/**
 * Background script for LeetCode AI Assistant
 * Handles API requests and content script initialization
 */

// Listen for navigation to LeetCode problem pages
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Check if the URL matches a LeetCode problem page and the page has finished loading
    if (changeInfo.status === 'complete' && tab.url && tab.url.match(/https:\/\/leetcode\.com\/problems\/.*/)) {
        console.log('LeetCode problem page detected:', tab.url);

        // Inject the content script (will only inject if not already present)
        chrome.scripting.executeScript({
            target: { tabId },
            files: ['content-script.js'],
        })
            .then(() => {
                console.log('Content script injected successfully');

                // Wait a bit before sending the initialize message
                setTimeout(() => {
                    try {
                        chrome.tabs.sendMessage(tabId, { action: 'initialize' })
                            .catch(err => console.log('Non-critical messaging error:', err));
                    } catch (err) {
                        console.log('Messaging error handled:', err);
                    }
                }, 1000);
            })
            .catch(err => {
                console.error('Error injecting content script:', err);
            });
    }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
            .then(response => response.json())
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