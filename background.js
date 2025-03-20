/**
 * Background script for LeetCode AI Assistant
 * Handles API requests
 */

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