/**
 * Utilities for Chrome storage operations
 */

/**
 * Get a value from Chrome storage
 * @param {string} key - The key to retrieve
 * @returns {Promise<any>} The stored value
 */
export function get(key) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(key, (result) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(result[key]);
            }
        });
    });
}

/**
 * Set a value in Chrome storage
 * @param {string} key - The key to set
 * @param {any} value - The value to store
 * @returns {Promise<void>}
 */
export function set(key, value) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.set({ [key]: value }, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}

/**
 * Remove a key from Chrome storage
 * @param {string} key - The key to remove
 * @returns {Promise<void>}
 */
export function remove(key) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.remove(key, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}

export default {
    get,
    set,
    remove
};