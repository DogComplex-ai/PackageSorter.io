// =====================================================
// Utility Helper Functions
// Common functions used throughout the game
// =====================================================

import { GameConfig } from '../config/gameConfig.js';

/**
 * Clamp a value between a minimum and maximum
 * @param {number} value - The value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Calculate distance between two points
 * @param {number} x1 - First point X
 * @param {number} y1 - First point Y
 * @param {number} x2 - Second point X
 * @param {number} y2 - Second point Y
 * @returns {number} Distance between points
 */
export function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * Get a random element from an array
 * @param {Array} array - The array to pick from
 * @returns {*} Random element from the array
 */
export function randomFrom(array) {
  if (!array || array.length === 0) return null;
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Format a number as currency
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount) {
  return `$${Math.floor(amount)}`;
}

/**
 * Check if a package is close enough to a vehicle for loading
 * @param {number} packageX - Package X position
 * @param {number} vehicleX - Vehicle X position
 * @returns {boolean} True if within proximity threshold
 */
export function isWithinProximity(packageX, vehicleX) {
  return Math.abs(packageX - vehicleX) <= GameConfig.package.proximityThreshold;
}

/**
 * Get a random shape from a specific stream
 * @param {string} stream - The stream identifier ('A' or 'B')
 * @returns {string} Random shape name
 */
export function getRandomShapeForStream(stream) {
  const shapes = GameConfig.streamShapes[stream];
  if (!shapes) return null;
  return randomFrom(shapes);
}

/**
 * Get a random color from the color palette
 * @returns {object} Color object with name and value
 */
export function getRandomColor() {
  return randomFrom(GameConfig.colors);
}

/**
 * Deep clone an object
 * @param {object} obj - Object to clone
 * @returns {object} Cloned object
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if all items in an array satisfy a condition
 * @param {Array} array - Array to check
 * @param {Function} predicate - Function to test each element
 * @returns {boolean} True if all items satisfy the condition
 */
export function every(array, predicate) {
  return array.every(predicate);
}

/**
 * Find the first item in an array that satisfies a condition
 * @param {Array} array - Array to search
 * @param {Function} predicate - Function to test each element
 * @returns {*} First matching item or undefined
 */
export function find(array, predicate) {
  return array.find(predicate);
}

/**
 * Filter an array by a condition
 * @param {Array} array - Array to filter
 * @param {Function} predicate - Function to test each element
 * @returns {Array} Filtered array
 */
export function filter(array, predicate) {
  return array.filter(predicate);
}

/**
 * Sum values in an array
 * @param {Array} array - Array of numbers
 * @returns {number} Sum of all values
 */
export function sum(array) {
  return array.reduce((total, value) => total + value, 0);
}

/**
 * Create a range of numbers
 * @param {number} start - Start value
 * @param {number} end - End value (exclusive)
 * @returns {Array} Array of numbers
 */
export function range(start, end) {
  const result = [];
  for (let i = start; i < end; i++) {
    result.push(i);
  }
  return result;
}

/**
 * Debounce a function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle a function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}