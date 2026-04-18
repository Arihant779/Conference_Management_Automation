/**
 * Centralized API Configuration
 * 
 * In development, this defaults to localhost:4000.
 * In production, it uses the REACT_APP_BACKEND_URL environment variable.
 */

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';

export default API_BASE_URL;
