/**
 * Content script for LeetCode AI Assistant
 * Runs on LeetCode problem pages and injects the AI assistant UI
 */

// Dynamic imports for module support
async function loadDependencies() {
    const domUtils = await import(chrome.runtime.getURL('utils/dom-utils.js'));
    const problemExtractor = await import(chrome.runtime.getURL('utils/problem-extractor.js'));
    const SolutionPanelModule = await import(chrome.runtime.getURL('ui/solution-panel.js'));
    const ConfigManagerModule = await import(chrome.runtime.getURL('models/config.js'));
    const OllamaAdapterModule = await import(chrome.runtime.getURL('models/ollama-adapter.js'));

    // Load lodash from vendor directory
    const lodashUrl = chrome.runtime.getURL('vendor/lodash.min.js');
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

    async init() {
        if (this.initialized) return;

        if (!window.location.href.match(/https:\/\/leetcode\.com\/problems\/.*/)) {
            return;
        }

        try {
            console.log('Initializing LeetCode AI Assistant...');

            this.dependencies = await loadDependencies();
            console.log('Dependencies loaded');

            this.injectDependencies();
            await this.waitForProblemContent();

            this.problemDetails = this.dependencies.extractProblemDetails();
            console.log('Extracted problem details:', this.problemDetails);

            await this.initializeAIAdapter();

            this.injectUI();
            this.setupActionListeners();
            this.autoLoadInitialContent();

            this.initialized = true;
            console.log('LeetCode AI Assistant initialized');
        } catch (error) {
            console.error('Error initializing LeetCode Assistant:', error);

            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(`Retrying initialization (${this.retryCount}/${this.maxRetries})...`);
                setTimeout(() => this.init(), 2000);
            }
        }
    }

    injectDependencies() {
        if (document.querySelector('#leetcode-ai-assistant-bootstrap-css')) {
            return;
        }

        const bootstrapCSS = document.createElement('link');
        bootstrapCSS.rel = 'stylesheet';
        bootstrapCSS.href = chrome.runtime.getURL('vendor/bootstrap.min.css');
        bootstrapCSS.id = 'leetcode-ai-assistant-bootstrap-css';
        document.head.appendChild(bootstrapCSS);

        const customCSS = document.createElement('link');
        customCSS.rel = 'stylesheet';
        customCSS.href = chrome.runtime.getURL('ui/styles.css');
        customCSS.id = 'leetcode-ai-assistant-custom-css';
        document.head.appendChild(customCSS);
    }

    async waitForProblemContent() {
        try {
            await this.dependencies.domUtils.waitForElement('[data-cy="question-content"]');
            return new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.warn('Timeout waiting for problem content, continuing anyway');
            return Promise.resolve();
        }
    }

    async initializeAIAdapter() {
        try {
            const ConfigManager = this.dependencies.ConfigManager;
            const config = await ConfigManager.init();
            const modelConfig = await ConfigManager.getModelConfig();

            if (config.activeModel === 'ollama') {
                this.aiAdapter = new this.dependencies.OllamaAdapter(modelConfig);
            } else {
                this.aiAdapter = new this.dependencies.OllamaAdapter(modelConfig);
            }
        } catch (error) {
            console.error('Error initializing AI adapter:', error);
            this.aiAdapter = new this.dependencies.OllamaAdapter({
                endpoint: 'http://localhost:11434/api/generate',
                model: 'deepseek-r1:14b',
                temperature: 0.7
            });
        }
    }

    injectUI() {
        const container = document.createElement('div');
        container.id = 'leetcode-ai-assistant-container';

        const injectionPoint = this.dependencies.domUtils.findInjectionPoint();
        if (injectionPoint === document.body) {
            container.style.position = 'fixed';
            container.style.top = '0';
            container.style.right = '0';
            container.style.zIndex = '10000';
        }

        injectionPoint.appendChild(container);
        this.panel = new this.dependencies.SolutionPanel(container);

        const detectedLanguage = this.dependencies.getCurrentLanguage();
        if (detectedLanguage) {
            this.panel.setLanguage(detectedLanguage);
        }
    }

    setupActionListeners() {
        this.panel.panel.addEventListener('actionRequested', async (event) => {
            const { action, language } = event.detail;

            if (action === 'requestProblemRephrase') {
                await this.loadRephrase();
            } else if (action === 'requestHints') {
                await this.loadHints();
            } else if (action === 'requestFullSolution') {
                await this.loadSolution();
            }
        });

        this.panel.panel.addEventListener('languageChanged', (event) => {
            console.log('Language changed:', event.detail.language);
            const solutionTab = this.panel.panel.querySelector('#solution-content');
            const contentArea = solutionTab.querySelector('.content-area');
            if (contentArea.innerHTML) {
                this.loadSolution();
            }
        });

        window.addEventListener('leetcodeAISettingsUpdated', async () => {
            console.log('Settings updated, reinitializing AI adapter');
            await this.initializeAIAdapter();
        });
    }

    autoLoadInitialContent() {
        setTimeout(() => {
            this.loadRephrase();
        }, 1000);
    }

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

    async loadSolution() {
        if (!this.problemDetails || !this.aiAdapter) return;

        try {
            this.panel.setLoading('solution', true);
            const language = this.panel.getCurrentLanguage();

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

function sendMessageToBackground(message) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(message, (response) => {
            resolve(response);
        });
    });
}

const assistant = new LeetCodeAssistant();
assistant.init();

window.leetcodeAIAssistant = {
    refresh: () => assistant.init(),
    reloadConfig: () => assistant.initializeAIAdapter()
};
