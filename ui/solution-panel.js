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