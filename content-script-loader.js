/**
 * Content script loader
 * This script loads the actual content script as a module
 */
(function() {
    // Create a script tag to load the module
    const script = document.createElement('script');
    script.type = 'text/javascript'; // Change from 'module' to 'text/javascript'
    script.src = chrome.runtime.getURL('content-script.js');

    // Add error handling
    script.onerror = (error) => {
        console.error('Error loading content script module:', error);
    };

    // Append to document
    (document.head || document.documentElement).appendChild(script);

    // Set up communication with the background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'settingsUpdated') {
            // Forward the message to the window for the module to handle
            window.dispatchEvent(new CustomEvent('leetcodeAISettingsUpdated'));
            sendResponse({status: 'settings update event dispatched'});
        }
        return true; // Keep the message channel open for async responses
    });

    // Let the background script know the content script is ready
    chrome.runtime.sendMessage({action: 'contentScriptReady'}, (response) => {
        if (chrome.runtime.lastError) {
            // Suppress the error about receiving end not existing
            console.log('Notified background script (ignored response)');
        }
    });
})();
