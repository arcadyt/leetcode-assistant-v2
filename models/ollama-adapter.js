import AIModelAdapter from './adapter.js';

/**
 * Adapter for Ollama API
 * Implements the AIModelAdapter interface for the Ollama API
 */
class OllamaAdapter extends AIModelAdapter {
    constructor(config) {
        super(config);
        // Default configuration
        this.endpoint = config.endpoint || 'http://localhost:11434/api/generate';
        this.model = config.model || 'deepseek-r1:14b';
        this.temperature = config.temperature || 0.7;

        // Debounce API calls to prevent overloading
        this.debouncedRequest = _.debounce(this._makeRequest.bind(this), 1000);
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

        return this.debouncedRequest(prompt);
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

        return this.debouncedRequest(prompt);
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

        return this.debouncedRequest(prompt);
    }

    /**
     * Make request to the Ollama API
     * @param {string} prompt - The prompt to send to the API
     * @returns {Promise<string>} The API response
     * @private
     */
    async _makeRequest(prompt) {
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

export default OllamaAdapter;