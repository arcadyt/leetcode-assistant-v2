/**
 * Base adapter interface for AI models
 * This follows the adapter pattern to allow easy swapping of different AI models
 */
class AIModelAdapter {
    constructor(config) {
        if (new.target === AIModelAdapter) {
            throw new Error("Cannot instantiate abstract class AIModelAdapter");
        }
        this.config = config;
    }

    /**
     * Request a simpler rephrasing of the problem
     * @param {Object} problemDetails - The extracted problem details
     * @returns {Promise<string>} The rephrased problem
     */
    async requestProblemRephrase(problemDetails) {
        throw new Error("Method 'requestProblemRephrase' must be implemented");
    }

    /**
     * Request hints for solving the problem
     * @param {Object} problemDetails - The extracted problem details
     * @returns {Promise<string>} Hints for solving the problem
     */
    async requestHints(problemDetails) {
        throw new Error("Method 'requestHints' must be implemented");
    }

    /**
     * Request a full solution for the problem
     * @param {Object} problemDetails - The extracted problem details
     * @returns {Promise<string>} The complete solution
     */
    async requestFullSolution(problemDetails) {
        throw new Error("Method 'requestFullSolution' must be implemented");
    }
}

export default AIModelAdapter;