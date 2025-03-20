/**
 * Popup script for LeetCode AI Assistant
 * Handles configuration UI and settings management
 */

import ConfigManager from '../models/config.js';

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
        const config = await ConfigManager.init();
        const modelConfig = await ConfigManager.getModelConfig();

        // Populate form fields
        document.getElementById('model-select').value = config.activeModel;
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

        // Save settings
        await ConfigManager.setActiveModel(modelType);
        await ConfigManager.setModelConfig(modelType, modelConfig);

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
    statusElement.className = `status ${type}`;

    // Hide after 5 seconds
    setTimeout(() => {
        statusElement.className = 'status';
    }, 5000);
}