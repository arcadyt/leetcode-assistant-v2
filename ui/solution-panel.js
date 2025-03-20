/**
 * Panel UI for displaying AI-generated solutions
 */
export default class SolutionPanel {
    /**
     * Create a new solution panel
     * @param {HTMLElement} parentElement - The element to append the panel to
     */
    constructor(parentElement) {
        this.parentElement = parentElement;
        this.panel = null;
        this.currentLanguage = 'java'; // Default language
        this.tabVisibility = {
            rephrase: true,
            hints: true,
            solution: true
        };
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
          <div class="tab-pane fade show active" id="rephrase-content">
            <div class="d-flex justify-content-center">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
            </div>
            <div class="content-area"></div>
          </div>
          <div class="tab-pane fade" id="hints-content">
            <div class="d-flex justify-content-center">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
            </div>
            <div class="content-area"></div>
          </div>
          <div class="tab-pane fade" id="solution-content">
            <div class="d-flex justify-content-center">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
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

        // Inject syntax highlighting
        this.injectPrismHighlighting();
    }

    /**
     * Inject Prism.js for syntax highlighting
     */
    injectPrismHighlighting() {
        if (document.querySelector('#leetcode-ai-assistant-prism-css')) {
            return; // Already injected
        }

        const prismCSS = document.createElement('link');
        prismCSS.rel = 'stylesheet';
        prismCSS.href = 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism.min.css';
        prismCSS.id = 'leetcode-ai-assistant-prism-css';
        document.head.appendChild(prismCSS);

        const prismJS = document.createElement('script');
        prismJS.src = 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js';
        prismJS.id = 'leetcode-ai-assistant-prism-js';
        document.head.appendChild(prismJS);

        // Add language-specific components
        const languages = ['java', 'javascript', 'python', 'cpp', 'go'];
        languages.forEach(lang => {
            const script = document.createElement('script');
            script.src = `https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-${lang}.min.js`;
            document.head.appendChild(script);
        });
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

            // Change button text when minimized
            const minimizeButton = this.panel.querySelector('.btn-minimize');
            if (this.panel.classList.contains('minimized')) {
                minimizeButton.textContent = '□';
                minimizeButton.title = 'Maximize';
            } else {
                minimizeButton.textContent = '_';
                minimizeButton.title = 'Minimize';
            }
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

                // Show the corresponding tab
                const tabId = this.getTabIdFromAction(action);
                this.showTab(tabId);
            });
        });

        // Tab buttons
        const tabButtons = this.panel.querySelectorAll('[data-bs-toggle="tab"]');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                // Handle tab switching
                this.activateTab(e.target.id.replace('-tab', ''));
            });
        });
    }

    /**
     * Get tab ID from action name
     * @param {string} action - The action name
     * @returns {string} The tab ID
     */
    getTabIdFromAction(action) {
        switch (action) {
            case 'requestProblemRephrase':
                return 'rephrase';
            case 'requestHints':
                return 'hints';
            case 'requestFullSolution':
                return 'solution';
            default:
                return 'rephrase';
        }
    }

    /**
     * Show a specific tab
     * @param {string} tabId - The ID of the tab to show
     */
    showTab(tabId) {
        // Find the tab button and click it
        const tabButton = this.panel.querySelector(`#${tabId}-tab`);
        if (tabButton) {
            tabButton.click();
        }
    }

    /**
     * Activate a tab
     * @param {string} tabId - The ID of the tab to activate
     */
    activateTab(tabId) {
        // Deactivate all tabs
        const tabPanes = this.panel.querySelectorAll('.tab-pane');
        tabPanes.forEach(pane => {
            pane.classList.remove('show', 'active');
        });

        const tabButtons = this.panel.querySelectorAll('.nav-link');
        tabButtons.forEach(button => {
            button.classList.remove('active');
        });

        // Activate the selected tab
        const selectedPane = this.panel.querySelector(`#${tabId}-content`);
        if (selectedPane) {
            selectedPane.classList.add('show', 'active');
        }

        const selectedButton = this.panel.querySelector(`#${tabId}-tab`);
        if (selectedButton) {
            selectedButton.classList.add('active');
        }
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
        const spinner = tab.querySelector('.spinner-border').parentElement;
        const contentArea = tab.querySelector('.content-area');

        if (isLoading) {
            spinner.style.display = 'flex';
            contentArea.style.display = 'none';
        } else {
            spinner.style.display = 'none';
            contentArea.style.display = 'block';
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

        // Apply syntax highlighting if Prism.js is loaded
        if (window.Prism) {
            Prism.highlightAllUnder(contentArea);
        }
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
     * Set the current language
     * @param {string} language - The language to set
     */
    setLanguage(language) {
        // Map LeetCode language names to our dropdown options
        const languageMap = {
            'java': 'java',
            'python': 'python',
            'python3': 'python',
            'cpp': 'cpp',
            'javascript': 'javascript',
            'js': 'javascript',
            'go': 'go',
            'golang': 'go'
        };

        const normalizedLanguage = languageMap[language.toLowerCase()] || 'java';

        // Update dropdown
        const languageDropdown = this.panel.querySelector('.language-dropdown');
        if (languageDropdown && languageDropdown.querySelector(`option[value="${normalizedLanguage}"]`)) {
            languageDropdown.value = normalizedLanguage;
            this.currentLanguage = normalizedLanguage;
        }
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
                const langClass = language ? `language-${language}` : '';
                return `<pre><code class="${langClass}">${this.escapeHtml(code)}</code></pre>`;
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
            .replace(/^- (.*$)/gim, '<ul><li>$1</li></ul>')
            .replace(/^[0-9]+\. (.*$)/gim, '<ol><li>$1</li></ol>')
            // Convert bold and italic
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            // Paragraphs
            .replace(/\n\n/g, '</p><p>');

        return `<div class="markdown-content"><p>${formattedContent}</p></div>`;
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