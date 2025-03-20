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

        // Use debounce when lodash is available, or create a simple version
        this._debounce = (func, wait) => {
            let timeout;
            return function(...args) {
                const later = () => {
                    timeout = null;
                    func.apply(this, args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        };

        // Create debounced request function with fallback
        this.debouncedRequest = typeof _ !== 'undefined' ?
            _.debounce(this._makeRequest.bind(this), 1000) :
            this._makeRequest.bind(this);
    }

    /**
     * Request a simpler rephrasing of the problem
     * @param {Object} problemDetails - The extracted problem details
     * @returns {Promise<string>} The rephrased problem
     */
    async requestProblemRephrase(problemDetails) {
        const prompt = `You are an expert in explaining complex programming problems in simple terms.

Rephrase the following LeetCode problem in the most beginner-friendly way possible:

Problem Title: ${problemDetails.title}

Original Description:
${problemDetails.description}

Your rephrasing should:
- Use simple, clear language
- Break down complex concepts
- Explain the core problem in 3-4 sentences
- Highlight the key challenge the problem presents
- Avoid technical jargon where possible
- Make the problem intuitive and easy to understand for a novice programmer`;

        return this._makeRequest(prompt);
    }

    /**
     * Request hints for solving the problem
     * @param {Object} problemDetails - The extracted problem details
     * @returns {Promise<string>} Hints for solving the problem
     */
    async requestHints(problemDetails) {
        const prompt = `You are a coding mentor providing strategic guidance to a student.

Provide progressive, thought-provoking hints for solving this LeetCode problem without revealing the complete solution:

Problem Title: ${problemDetails.title}

Problem Description:
${problemDetails.description}

Your hints should:
- Start with high-level strategy hints
- Progressively become more specific
- Ask guiding questions that lead to solution discovery
- Suggest potential algorithmic approaches
- Avoid direct code implementation
- Help the student think through the problem step by step
- Encourage independent problem-solving

Format your response as a series of increasingly specific hints that guide the student towards solving the problem independently.`;

        return this._makeRequest(prompt);
    }

    /**
     * Request a full solution for the problem
     * @param {Object} problemDetails - The extracted problem details
     * @returns {Promise<string>} The complete solution
     */
    async requestFullSolution(problemDetails) {
        const language = problemDetails.language || 'python3';

        const prompt = `You are an expert software engineer providing a comprehensive solution to a coding problem.

Solve the following LeetCode problem with a professional, educational approach:

Problem Title: ${problemDetails.title}

Problem Description:
${problemDetails.description}

Solution Requirements:
1. Provide a detailed problem analysis
2. Explain multiple solution approaches (if applicable)
3. Choose the most optimal solution
4. Analyze time and space complexity thoroughly
5. Write clean, production-ready code in ${language}
6. Include comprehensive code comments
7. Discuss potential edge cases and optimizations

Solution Structure:
## Problem Understanding
- Clearly articulate the problem constraints
- Identify key input/output requirements
- Discuss potential challenges

## Solution Approach
- Explain the chosen algorithm
- Discuss alternative approaches
- Justify solution selection

## Complexity Analysis
- Time Complexity: O(?) explanation
- Space Complexity: O(?) explanation
- Detailed reasoning behind complexity

## Code Solution
\`\`\`${language}
# Implement solution here
\`\`\`

## Detailed Code Walkthrough
- Line-by-line explanation of the implementation
- Highlight key algorithmic steps
- Discuss implementation choices

## Additional Insights
- Potential follow-up optimizations
- Real-world application scenarios
- Common pitfalls to avoid`;

        return this._makeRequest(prompt);
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
                    if (chrome.runtime.lastError) {
                        console.error('Error sending message:', chrome.runtime.lastError);
                        reject(new Error('Error communicating with background script'));
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

export default OllamaAdapter;