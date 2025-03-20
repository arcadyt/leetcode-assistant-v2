/**
 * Utilities for DOM manipulation
 */

/**
 * Waits for an element to appear in the DOM
 * @param {string} selector - CSS selector for the element
 * @param {number} timeout - Maximum time to wait in milliseconds
 * @returns {Promise<Element>} The found element
 */
export function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
        // Check if element already exists
        const element = document.querySelector(selector);
        if (element) {
            resolve(element);
            return;
        }

        // Set up a mutation observer to wait for the element
        const observer = new MutationObserver((mutations, obs) => {
            const element = document.querySelector(selector);
            if (element) {
                obs.disconnect();
                resolve(element);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Set a timeout to prevent waiting forever
        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        }, timeout);
    });
}

/**
 * Creates and injects a stylesheet into the document
 * @param {string} cssText - CSS text to inject
 * @returns {HTMLStyleElement} The created style element
 */
export function injectStyles(cssText) {
    const style = document.createElement('style');
    style.textContent = cssText;
    document.head.appendChild(style);
    return style;
}

/**
 * Safely parses HTML and returns a document fragment
 * @param {string} html - HTML string to parse
 * @returns {DocumentFragment} The parsed document fragment
 */
export function parseHTML(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const fragment = document.createDocumentFragment();

    // Move all body children to the fragment
    while (doc.body.firstChild) {
        fragment.appendChild(doc.body.firstChild);
    }

    return fragment;
}

/**
 * Finds the best location to inject our UI based on LeetCode's layout
 * @returns {HTMLElement} The element to append our UI to
 */
export function findInjectionPoint() {
    // First try: content area
    const contentArea = document.querySelector('.content__2U8Ht');
    if (contentArea) return contentArea;

    // Second try: problem content
    const problemContent = document.querySelector('[data-cy="question-content"]');
    if (problemContent && problemContent.parentElement) {
        return problemContent.parentElement;
    }

    // Fallback: body
    return document.body;
}

export default {
    waitForElement,
    injectStyles,
    parseHTML,
    findInjectionPoint
};