/**
 * Content script for LeetCode AI Assistant
 * Runs on LeetCode problem pages and injects the AI assistant UI
 */

// First inject required CDNs
const injectDependencies = () => {
    if (document.querySelector('#leetcode-ai-assistant-bootstrap-css')) {
        return; // Dependencies already injected
    }

    const bootstrapCSS = document.createElement('link');
    bootstrapCSS.rel = 'stylesheet';
    bootstrapCSS.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css';
    bootstrapCSS.id = 'leetcode-ai-assistant-bootstrap-css';
    document.head.appendChild(bootstrapCSS);

    const bootstrapJS = document.createElement('script');
    bootstrapJS.src = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js';
    bootstrapJS.id = 'leetcode-ai-assistant-bootstrap-js';
    document.head.appendChild(bootstrapJS);

    const lodashJS = document.createElement('script');
    lodashJS.src = 'https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js';
    lodashJS.id = 'leetcode-ai-assistant-lodash-js';
    document.head.appendChild(lodashJS);
};

// Import dependencies
import { waitForElement } from './utils/dom-utils.js';

/**
 * Extract problem details from the current LeetCode problem page
 * @returns {Object} Object containing title, description, examples, and URL
 */
function extractProblemDetails() {
    try {
        // Get problem title
        const titleElement = document.querySelector('[data-cy="question-title"]');
        const title = titleElement ? titleElement.textContent.trim() : '';

        // Get problem description
        const descriptionElement = document.querySelector('[data-cy="question-content"]');
        let description = '';
        let examples = [];

        if (descriptionElement) {
            // Clone the element to avoid modifying the actual DOM
            const clonedDesc = descriptionElement.cloneNode(true);

            // Extract examples separately (they're usually in <pre> tags)
            examples = Array.from(clonedDesc.querySelectorAll('pre'))
                .map(pre => pre.textContent.trim());

            // Get the main description text
            description = clonedDesc.textContent.trim();
        }

        // Get problem difficulty
        const difficultyElement = document.querySelector('.difficulty-label');
        const difficulty = difficultyElement ? difficultyElement.textContent.trim() : 'Unknown';

        return {
            title,
            description,
            examples,
            difficulty,
            url: window.location.href
        };
    } catch (error) {
        console.error('Error extracting problem details:', error);
        return {
            title: 'Error extracting problem',
            description: 'Could not extract problem details.',
            examples: [],
            difficulty: 'Unknown',
            url: window.location.href
        };
    }
}

/**
 * Panel UI for displaying AI-generated solutions
 */
class SolutionPanel {
    /**
     * Create a new solution panel
     * @param {HTMLElement} parentElement - The element to append the panel to
     */
    constructor(parentElement) {
        this.parentElement = parentElement;
        this.panel = null;
        this.currentLanguage = 'java'; // Default language
        this.init();
    }

    /**
     * Initialize the panel
     */
    init() {
        // Create panel container
        this.panel = document.createElement('div');
        this.panel.className = 'leetcode-ai-assistant-panel card';
        this.panel.innerHTML = `
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="m-0">LeetCode AI Assistant</h5>
        <div class="d-flex">
          <button class="btn btn-sm btn-outline-secondary me-2 btn-minimize" title="Minimize">_</button>
          <button class="btn btn-sm btn-outline-danger btn-close-panel" title="Close">×</button>
        </div>
      </div>
      
      <div class="card-body p-0">
        <div class="d-flex align-items-center p-2 bg-light">
          <select class="form-select form-select-sm me-2 language-dropdown">
            <option value="java">Java</option>
            <option value="python">Python</option>
            <option value="cpp">C++</option>
            <option value="javascript">JavaScript</option>
            <option value="go">Go</option>
          </select>
          
          <div class="btn-group btn-group-sm ms-auto">
            <button class="btn btn-outline-primary btn-action" data-action="requestProblemRephrase">Rephrase</button>
            <button class="btn btn-outline-primary btn-action" data-action="requestHints">Hints</button>
            <button class="btn btn-outline-primary btn-action" data-action="requestFullSolution">Solution</button>
          </div>
        </div>
        
        <ul class="nav nav-tabs" role="tablist">
          <li class="nav-item" role="presentation">
            <button class="nav-link active" id="rephrase-tab" data-bs-toggle="tab" data-bs-target="#rephrase-content" type="button" role="tab">Rephrase</button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="hints-tab" data-bs-toggle="tab" data-bs-target="#hints-content" type="button" role="tab">Hints</button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="solution-tab" data-bs-toggle="tab" data-bs-target="#solution-content" type="button" role="tab">Solution</button>
          </li>
        </ul>
        
        <div class="tab-content p-3">
          <div class="tab-content active" id="rephrase-content">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <div class="content-area"></div>
          </div>
          <div class="tab-content" id="hints-content">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <div class="content-area"></div>
          </div>
          <div class="tab-content" id="solution-content">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <div class="content-area"></div>
          </div>
        </div>
      </div>
    `;

        // Add to parent
        this.parentElement.appendChild(this.panel);

        // Add toggle button
        this.addToggleButton();

        // Add event listeners
        this.addEventListeners();
    }

    /**
     * Add a button to toggle the panel visibility
     */
    addToggleButton() {
        this.toggleButton = document.createElement('button');
        this.toggleButton.className = 'assistant-toggle-btn btn btn-primary';
        this.toggleButton.textContent = 'AI Assistant';
        this.toggleButton.addEventListener('click', () => {
            this.toggle();
        });

        document.body.appendChild(this.toggleButton);
    }

    /**
     * Add event listeners to the panel
     */
    addEventListeners() {
        // Close button
        this.panel.querySelector('.btn-close-panel').addEventListener('click', () => {
            this.hide();
        });

        // Minimize button
        this.panel.querySelector('.btn-minimize').addEventListener('click', () => {
            this.panel.classList.toggle('minimized');
        });

        // Language dropdown
        const languageDropdown = this.panel.querySelector('.language-dropdown');
        languageDropdown.addEventListener('change', (e) => {
            this.currentLanguage = e.target.value;
            // Trigger event for language change
            const event = new CustomEvent('languageChanged', {
                detail: { language: this.currentLanguage }
            });
            this.panel.dispatchEvent(event);
        });

        // Action buttons
        const actionButtons = this.panel.querySelectorAll('.btn-action');
        actionButtons.forEach(button => {
            button.addEventListener('click', () => {
                const action = button.dataset.action;
                // Trigger event for action button click
                const event = new CustomEvent('actionRequested', {
                    detail: { action, language: this.currentLanguage }
                });
                this.panel.dispatchEvent(event);
            });
        });
    }

    /**
     * Show the panel
     */
    show() {
        this.panel.classList.remove('hidden');
        this.toggleButton.textContent = 'Hide AI Assistant';
    }

    /**
     * Hide the panel
     */
    hide() {
        this.panel.classList.add('hidden');
        this.toggleButton.textContent = 'Show AI Assistant';
    }

    /**
     * Toggle the panel visibility
     */
    toggle() {
        if (this.panel.classList.contains('hidden')) {
            this.show();
        } else {
            this.hide();
        }
    }

    /**
     * Set the loading state for a tab
     * @param {string} tabName - The name of the tab
     * @param {boolean} isLoading - Whether the tab is loading
     */
    setLoading(tabName, isLoading) {
        const tab = this.panel.querySelector(`#${tabName}-content`);
        const spinner = tab.querySelector('.spinner-border');

        if (isLoading) {
            spinner.style.display = 'inline-block';
        } else {
            spinner.style.display = 'none';
        }
    }

    /**
     * Update the content of a tab
     * @param {string} tabName - The name of the tab
     * @param {string} content - The content to set
     */
    updateContent(tabName, content) {
        const tab = this.panel.querySelector(`#${tabName}-content`);
        const contentArea = tab.querySelector('.content-area');

        contentArea.innerHTML = this.formatContent(content);
        this.setLoading(tabName, false);
    }

    /**
     * Set an error message for a tab
     * @param {string} tabName - The name of the tab
     * @param {string} message - The error message
     */
    setError(tabName, message) {
        const tab = this.panel.querySelector(`#${tabName}-content`);
        const contentArea = tab.querySelector('.content-area');

        contentArea.innerHTML = `<div class="alert alert-danger">${message}</div>`;
        this.setLoading(tabName, false);
    }

    /**
     * Get the current selected language
     * @returns {string} The current language
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    /**
     * Format content for display (convert markdown to HTML)
     * @param {string} content - The content to format
     * @returns {string} The formatted content
     */
    formatContent(content) {
        if (!content) return '';

        // Convert markdown code blocks to HTML
        const formattedContent = content
            .replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language, code) => {
                const langClass = language ? ` class="language-${language}"` : '';
                return `<pre><code${langClass}>${this.escapeHtml(code)}</code></pre>`;
            })
            .replace(/`([^`]+)`/g, (match, code) => {
                return `<code>${this.escapeHtml(code)}</code>`;
            })
            // Convert headers
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            // Convert lists
            .replace(/^\* (.*$)/gim, '<ul><li>$1</li></ul>')
            .replace(/^[0-9]+\. (.*$)/gim, '<ol><li>$1</li></ol>')
            // Paragraphs
            .replace(/\n\n/g, '</p><p>');

        return `<p>${formattedContent}</p>`;
    }

    /**
     * Escape HTML special characters
     * @param {string} text - The text to escape
     * @returns {string} The escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

/**
 * Adapter for Ollama API
 */
class OllamaAdapter {
    constructor(config) {
        // Default configuration
        this.endpoint = config.endpoint || 'http://localhost:11434/api/generate';
        this.model = config.model || 'deepseek-r1:14b';
        this.temperature = config.temperature || 0.7;
    }

    /**
     * Request a simpler rephrasing of the problem
     * @param {Object} problemDetails - The extracted problem details
     * @returns {Promise<string>} The rephrased problem
     */
    async requestProblemRephrase(problemDetails) {
        const prompt = `Rephrase the following LeetCode problem in simpler terms:
Problem: ${problemDetails.title}
Description: ${problemDetails.description}`;

        return this.makeRequest(prompt);
    }

    /**
     * Request hints for solving the problem
     * @param {Object} problemDetails - The extracted problem details
     * @returns {Promise<string>} Hints for solving the problem
     */
    async requestHints(problemDetails) {
        const prompt = `Provide hints for solving this LeetCode problem without giving away the full solution:
Problem: ${problemDetails.title}
Description: ${problemDetails.description}`;

        return this.makeRequest(prompt);
    }

    /**
     * Request a full solution for the problem
     * @param {Object} problemDetails - The extracted problem details
     * @returns {Promise<string>} The complete solution
     */
    async requestFullSolution(problemDetails) {
        const language = problemDetails.language || 'python3';

        const prompt = `Provide a complete solution with explanation for the following LeetCode problem:
Problem: ${problemDetails.title}
Description: ${problemDetails.description}
Language: ${language}

Please structure your response with:
1. Problem understanding
2. Approach explanation
3. Time and space complexity analysis
4. Complete code solution in ${language}
5. Step by step explanation of the solution`;

        return this.makeRequest(prompt);
    }

    /**
     * Make request to the Ollama API
     * @param {string} prompt - The prompt to send to the API
     * @returns {Promise<string>} The API response
     */
    async makeRequest(prompt) {
        try {
            // Use the background script to make the request to avoid CORS issues
            return new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: 'makeApiRequest',
                    endpoint: this.endpoint,
                    data: {
                        model: this.model,
                        prompt: prompt,
                        temperature: this.temperature,
                        stream: false
                    }
                }, response => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }

                    if (response && response.success) {
                        resolve(response.data.response);
                    } else {
                        reject(new Error(response?.error || 'Unknown error'));
                    }
                });
            });
        } catch (error) {
            console.error('Error making API request:', error);
            throw error;
        }
    }
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

            // Inject required dependencies
            injectDependencies();

            // Wait for the page to fully load
            await this.waitForProblemContent();

            // Extract problem details
            this.problemDetails = extractProblemDetails();
            console.log('Extracted problem details:', this.problemDetails);

            // Initialize AI adapter with default config
            this.aiAdapter = new OllamaAdapter({
                endpoint: 'http://localhost:11434/api/generate',
                model: 'deepseek-r1:14b',
                temperature: 0.7
            });

            // Create and inject UI
            this.injectUI();

            // Setup action listeners
            this.setupActionListeners();

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
     * Wait for the problem content to load
     */
    waitForProblemContent() {
        return new Promise((resolve) => {
            // If content already exists, resolve immediately
            if (document.querySelector('[data-cy="question-content"]')) {
                resolve();
                return;
            }

            // Otherwise, set up a mutation observer to wait for it
            const observer = new MutationObserver((mutations, obs) => {
                if (document.querySelector('[data-cy="question-content"]')) {
                    obs.disconnect();
                    // Give a small delay for the rest of the content to load
                    setTimeout(resolve, 500);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            // Set a timeout to prevent waiting forever
            setTimeout(() => {
                observer.disconnect();
                resolve();
            }, 10000);
        });
    }

    /**
     * Inject the UI into the page
     */
    injectUI() {
        // Create container for the panel
        const container = document.createElement('div');
        container.id = 'leetcode-ai-assistant-container';
        document.body.appendChild(container);

        // Initialize the panel
        this.panel = new SolutionPanel(container);
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
            // We'll use this when making requests
        });
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

// Initialize the assistant when the content script loads
const assistant = new LeetCodeAssistant();

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);
    if (request.action === 'initialize') {
        assistant.init();
        // Send response to prevent "Receiving end does not exist" errors
        sendResponse({status: 'initializing'});
    }
    return true; // Indicates we'll handle the response asynchronously
});

// Also initialize on page load
window.addEventListener('load', () => {
    console.log('Page loaded, initializing assistant...');
    assistant.init();
});