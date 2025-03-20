/**
 * Popup script for LeetCode AI Assistant
 * Handles configuration UI and settings management
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Load saved configuration
    await loadConfig();

    // Add event listeners
    document.getElementById('save-btn').addEventListener('click', saveSettings);
    document.getElementById('model-select').addEventListener('change', handleModelChange);
});

/**
 * Load configuration from storage and populate form fields
 */
async function loadConfig() {
    try {
        const config = await getConfig();

        // Get the current model config
        const modelType = config.activeModel;
        const modelConfig = config.models[modelType];

        // Populate form fields
        document.getElementById('model-select').value = modelType;
        document.getElementById('endpoint').value = modelConfig.endpoint || 'http://localhost:11434/api/generate';
        document.getElementById('model').value = modelConfig.model || 'deepseek-r1:14b';
        document.getElementById('temperature').value = modelConfig.temperature || 0.7;

        // Show appropriate model settings
        handleModelChange();
    } catch (error) {
        console.error('Error loading config:', error);
        showStatus('Error loading settings. Using defaults.', 'error');
    }
}

/**
 * Get the current configuration from storage
 * @returns {Promise<Object>} The configuration object
 */
async function getConfig() {
    return new Promise((resolve) => {
        chrome.storage.sync.get('aiAssistantConfig', (result) => {
            const defaultConfig = {
                activeModel: 'ollama',
                models: {
                    ollama: {
                        endpoint: 'http://localhost:11434/api/generate',
                        model: 'deepseek-r1:14b',
                        temperature: 0.7
                    }
                }
            };

            resolve(result.aiAssistantConfig || defaultConfig);
        });
    });
}

/**
 * Save settings to storage
 */
async function saveSettings() {
    try {
        const modelType = document.getElementById('model-select').value;
        const modelConfig = {
            endpoint: document.getElementById('endpoint').value.trim(),
            model: document.getElementById('model').value.trim(),
            temperature: parseFloat(document.getElementById('temperature').value) || 0.7
        };

        // Validate settings
        if (!modelConfig.endpoint) {
            throw new Error('Endpoint URL is required');
        }

        if (!modelConfig.model) {
            throw new Error('Model name is required');
        }

        if (modelConfig.temperature < 0 || modelConfig.temperature > 2) {
            throw new Error('Temperature must be between 0 and 2');
        }

        // Get current config
        const config = await getConfig();

        // Update config
        config.activeModel = modelType;
        config.models[modelType] = modelConfig;

        // Save to storage
        await saveConfig(config);

        // Show success message
        showStatus('Settings saved successfully!', 'success');

        // Notify any active tabs that settings have changed
        chrome.tabs.query({url: 'https://leetcode.com/problems/*'}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, { action: 'settingsUpdated' });
            });
        });
    } catch (error) {
        console.error('Error saving settings:', error);
        showStatus(`Error: ${error.message}`, 'error');
    }
}

/**
 * Save configuration to storage
 * @param {Object} config - The configuration to save
 * @returns {Promise<void>}
 */
function saveConfig(config) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.set({ 'aiAssistantConfig': config }, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}

/**
 * Handle model type change
 * Shows/hides appropriate configuration sections
 */
function handleModelChange() {
    const modelType = document.getElementById('model-select').value;

    // Show configuration for selected model
    // Currently only Ollama is supported, but this allows for future expansion
    if (modelType === 'ollama') {
        document.getElementById('ollama-config').style.display = 'block';
    } else {
        document.getElementById('ollama-config').style.display = 'none';
    }
}

/**
 * Show status message
 * @param {string} message - The message to show
 * @param {string} type - The type of message ('success' or 'error')
 */
function showStatus(message, type) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.className = `alert ${type === 'success' ? 'alert-success' : 'alert-danger'} status`;

    // Hide after 5 seconds
    setTimeout(() => {
        statusElement.className = 'status';
    }, 5000);
}