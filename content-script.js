/**
 * Content script for LeetCode AI Assistant
 * Runs on LeetCode problem pages and injects the AI assistant UI
 */

// Import dependencies - use relative URLs with runtime.getURL to make them work in modules
const baseUrl = chrome.runtime.getURL('');

// Dynamic imports for module support
async function loadDependencies() {
    const domUtils = await import(new URL('./utils/dom-utils.js', baseUrl).href);
    const problemExtractor = await import(new URL('./utils/problem-extractor.js', baseUrl).href);
    const SolutionPanelModule = await import(new URL('./ui/solution-panel.js', baseUrl).href);
    const ConfigManagerModule = await import(new URL('./models/config.js', baseUrl).href);
    const OllamaAdapterModule = await import(new URL('./models/ollama-adapter.js', baseUrl).href);

    // Load lodash from vendor directory
    const lodashUrl = new URL('./vendor/lodash.min.js', baseUrl).href;
    const lodashModule = await import(lodashUrl);

    return {
        domUtils: domUtils.default || domUtils,
        extractProblemDetails: problemExtractor.extractProblemDetails,
        getCurrentLanguage: problemExtractor.getCurrentLanguage,
        SolutionPanel: SolutionPanelModule.default || SolutionPanelModule,
        ConfigManager: ConfigManagerModule.default || ConfigManagerModule,
        OllamaAdapter: OllamaAdapterModule.default || OllamaAdapterModule,
        _: lodashModule.default || window._ || lodashModule
    };
}

/**
 * Main class for the LeetCode AI Assistant
 * Handles initialization, problem extraction, and AI interactions
 */
class LeetCodeAssistant {
    constructor() {
        this.panel = null;
        this.problemDetails = null;
        this.aiAdapter = null;
        this.initialized = false;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.dependencies = null;
    }

    /**
     * Initialize the assistant
     */
    async init() {
        if (this.initialized) return;

        // Check if we're on a LeetCode problem page
        if (!window.location.href.match(/https:\/\/leetcode\.com\/problems\/.*/)) {
            return;
        }

        try {
            console.log('Initializing LeetCode AI Assistant...');

            // Load dependencies
            this.dependencies = await loadDependencies();
            console.log('Dependencies loaded');

            // First inject required dependencies (Bootstrap)
            this.injectDependencies();

            // Wait for the problem content to load
            await this.waitForProblemContent();

            // Extract problem details
            this.problemDetails = this.dependencies.extractProblemDetails();
            console.log('Extracted problem details:', this.problemDetails);

            // Initialize AI adapter with config from storage
            await this.initializeAIAdapter();

            // Create and inject UI
            this.injectUI();

            // Setup action listeners
            this.setupActionListeners();

            // Auto-load initial content
            this.autoLoadInitialContent();

            this.initialized = true;
            console.log('LeetCode AI Assistant initialized');
        } catch (error) {
            console.error('Error initializing LeetCode Assistant:', error);

            // Retry initialization if failed
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(`Retrying initialization (${this.retryCount}/${this.maxRetries})...`);
                setTimeout(() => this.init(), 2000);
            }
        }
    }

    /**
     * Inject required external dependencies
     */
    injectDependencies() {
        if (document.querySelector('#leetcode-ai-assistant-bootstrap-css')) {
            return; // Dependencies already injected
        }

        // Add Bootstrap CSS from local vendor directory
        const bootstrapCSS = document.createElement('link');
        bootstrapCSS.rel = 'stylesheet';
        bootstrapCSS.href = chrome.runtime.getURL('vendor/bootstrap.min.css');
        bootstrapCSS.id = 'leetcode-ai-assistant-bootstrap-css';
        document.head.appendChild(bootstrapCSS);

        // Add custom styles
        const customCSS = document.createElement('link');
        customCSS.rel = 'stylesheet';
        customCSS.href = chrome.runtime.getURL('ui/styles.css');
        customCSS.id = 'leetcode-ai-assistant-custom-css';
        document.head.appendChild(customCSS);
    }

    /**
     * Wait for the problem content to load
     */
    async waitForProblemContent() {
        try {
            await this.dependencies.domUtils.waitForElement('[data-cy="question-content"]');
            // Give a small delay for the rest of the content to load
            return new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.warn('Timeout waiting for problem content, continuing anyway');
            return Promise.resolve();
        }
    }

    /**
     * Initialize the AI adapter with configuration from storage
     */
    async initializeAIAdapter() {
        try {
            const ConfigManager = this.dependencies.ConfigManager;
            const config = await ConfigManager.init();
            const modelConfig = await ConfigManager.getModelConfig();

            // Create the appropriate adapter based on the active model
            if (config.activeModel === 'ollama') {
                this.aiAdapter = new this.dependencies.OllamaAdapter(modelConfig);
            } else {
                // Default to Ollama if no matching adapter
                this.aiAdapter = new this.dependencies.OllamaAdapter(modelConfig);
            }
        } catch (error) {
            console.error('Error initializing AI adapter:', error);
            // Use default Ollama adapter as fallback
            this.aiAdapter = new this.dependencies.OllamaAdapter({
                endpoint: 'http://localhost:11434/api/generate',
                model: 'deepseek-r1:14b',
                temperature: 0.7
            });
        }
    }

    /**
     * Inject the UI into the page
     */
    injectUI() {
        // Create container for the panel
        const container = document.createElement('div');
        container.id = 'leetcode-ai-assistant-container';

        // Find the best place to inject the UI
        const injectionPoint = this.dependencies.domUtils.findInjectionPoint();
        if (injectionPoint === document.body) {
            // If we're appending to body, make sure the container is positioned properly
            container.style.position = 'fixed';
            container.style.top = '0';
            container.style.right = '0';
            container.style.zIndex = '10000';
        }

        injectionPoint.appendChild(container);

        // Initialize the panel
        this.panel = new this.dependencies.SolutionPanel(container);

        // Set the initial language based on the problem
        const detectedLanguage = this.dependencies.getCurrentLanguage();
        if (detectedLanguage) {
            this.panel.setLanguage(detectedLanguage);
        }
    }

    /**
     * Setup listeners for action buttons and language changes
     */
    setupActionListeners() {
        // Listen for action requests
        this.panel.panel.addEventListener('actionRequested', async (event) => {
            const { action, language } = event.detail;

            // Call the appropriate method based on the action
            if (action === 'requestProblemRephrase') {
                await this.loadRephrase();
            } else if (action === 'requestHints') {
                await this.loadHints();
            } else if (action === 'requestFullSolution') {
                await this.loadSolution();
            }
        });

        // Listen for language changes
        this.panel.panel.addEventListener('languageChanged', (event) => {
            console.log('Language changed:', event.detail.language);
            // If solution is already loaded, reload it with the new language
            const solutionTab = this.panel.panel.querySelector('#solution-content');
            const contentArea = solutionTab.querySelector('.content-area');
            if (contentArea.innerHTML && contentArea.innerHTML !== '') {
                this.loadSolution();
            }
        });

        // Listen for settings updates from popup
        window.addEventListener('leetcodeAISettingsUpdated', async () => {
            console.log('Settings updated, reinitializing AI adapter');
            await this.initializeAIAdapter();
        });
    }

    /**
     * Auto-load initial content
     */
    autoLoadInitialContent() {
        // Automatically load the problem rephrase when extension initializes
        setTimeout(() => {
            this.loadRephrase();
        }, 1000);
    }

    /**
     * Load problem rephrasing
     */
    async loadRephrase() {
        if (!this.problemDetails || !this.aiAdapter) return;

        try {
            this.panel.setLoading('rephrase', true);
            const rephrase = await this.aiAdapter.requestProblemRephrase(this.problemDetails);
            this.panel.updateContent('rephrase', rephrase);
        } catch (error) {
            console.error('Error loading problem rephrase:', error);
            this.panel.setError('rephrase', 'Error loading rephrase. Please check your AI model configuration.');
        }
    }

    /**
     * Load hints for solving the problem
     */
    async loadHints() {
        if (!this.problemDetails || !this.aiAdapter) return;

        try {
            this.panel.setLoading('hints', true);
            const hints = await this.aiAdapter.requestHints(this.problemDetails);
            this.panel.updateContent('hints', hints);
        } catch (error) {
            console.error('Error loading hints:', error);
            this.panel.setError('hints', 'Error loading hints. Please check your AI model configuration.');
        }
    }

    /**
     * Load full solution for the problem
     */
    async loadSolution() {
        if (!this.problemDetails || !this.aiAdapter) return;

        try {
            this.panel.setLoading('solution', true);
            // Get the selected language from the panel
            const language = this.panel.getCurrentLanguage();

            // Add language to problem details
            const problemWithLanguage = {
                ...this.problemDetails,
                language
            };

            const solution = await this.aiAdapter.requestFullSolution(problemWithLanguage);
            this.panel.updateContent('solution', solution);
        } catch (error) {
            console.error('Error loading solution:', error);
            this.panel.setError('solution', 'Error loading solution. Please check your AI model configuration.');
        }
    }
}

// Create message passing interface to communicate with background script
function sendMessageToBackground(message) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                // Suppress the error for messaging
                console.log('Message sent, no response expected');
                resolve(null);
            } else {
                resolve(response);
            }
        });
    });
}

// Initialize the assistant when the content script loads
const assistant = new LeetCodeAssistant();
assistant.init();

// Export API for the content script loader to use
window.leetcodeAIAssistant = {
    refresh: () => assistant.init(),
    reloadConfig: () => assistant.initializeAIAdapter()
};