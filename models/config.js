import { get, set } from '../utils/storage-utils.js';

/**
 * Default configuration for AI models
 */
const DEFAULT_CONFIG = {
    activeModel: 'ollama',
    models: {
        ollama: {
            endpoint: 'http://localhost:11434/api/generate',
            model: 'deepseek-r1:14b',
            temperature: 0.7
        }
    }
};

/**
 * Configuration manager for AI model settings
 * Handles loading, saving, and accessing configuration
 */
class ConfigManager {
    constructor() {
        this.config = null;
        this.initialized = false;
    }

    /**
     * Initialize the configuration manager
     * @returns {Promise<Object>} The loaded configuration
     */
    async init() {
        if (this.initialized) return this.config;

        try {
            // Try to load config from storage
            const storedConfig = await get('aiAssistantConfig');
            this.config = storedConfig || DEFAULT_CONFIG;
        } catch (error) {
            console.error('Error loading config:', error);
            this.config = DEFAULT_CONFIG;
        }

        this.initialized = true;
        return this.config;
    }

    /**
     * Get configuration for a specific model
     * @param {string} modelType - The model type (optional, defaults to active model)
     * @returns {Promise<Object>} The model configuration
     */
    async getModelConfig(modelType = null) {
        await this.init();
        const modelKey = modelType || this.config.activeModel;
        return this.config.models[modelKey] || this.config.models.ollama;
    }

    /**
     * Set configuration for a specific model
     * @param {string} modelType - The model type
     * @param {Object} config - The model configuration
     * @returns {Promise<void>}
     */
    async setModelConfig(modelType, config) {
        await this.init();
        this.config.models[modelType] = config;
        await this.saveConfig();
    }

    /**
     * Set the active model
     * @param {string} modelType - The model type to set as active
     * @returns {Promise<void>}
     */
    async setActiveModel(modelType) {
        await this.init();
        this.config.activeModel = modelType;
        await this.saveConfig();
    }

    /**
     * Save the current configuration to storage
     * @returns {Promise<void>}
     */
    async saveConfig() {
        return set('aiAssistantConfig', this.config);
    }
}

// Export a singleton instance
export default new ConfigManager();