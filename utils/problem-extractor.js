/**
 * Utilities for extracting problem details from LeetCode
 */

/**
 * Extracts problem details from the current LeetCode problem page
 * @returns {Object} Object containing title, description, examples, and URL
 */
export function extractProblemDetails() {
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
 * Extracts the current programming language selected in the LeetCode editor
 * @returns {string} The current language
 */
export function getCurrentLanguage() {
    try {
        // Check for language selector in editor
        const languageButton = document.querySelector('[data-cy="lang-select"]');
        if (languageButton) {
            return languageButton.textContent.trim();
        }

        // Fallback to looking for code editor language
        const codeElements = document.querySelectorAll('.CodeMirror, [data-mode]');
        for (const element of codeElements) {
            const mode = element.dataset.mode;
            if (mode) {
                // Map CodeMirror mode to language name
                const modeToLanguage = {
                    'text/x-java': 'java',
                    'text/x-c++src': 'cpp',
                    'text/x-python': 'python',
                    'text/javascript': 'javascript',
                    'text/x-go': 'go',
                };
                return modeToLanguage[mode] || mode;
            }
        }

        return 'python3'; // Default fallback
    } catch (error) {
        console.error('Error extracting language:', error);
        return 'python3'; // Default fallback
    }
}

export default {
    extractProblemDetails,
    getCurrentLanguage
};