const axios = require('axios');

const LOG_SERVER_URL = 'http://localhost:4000/log';
const SERVICE_NAME = 'location-tracker';

const sendLog = async (level, message) => {
    const logEntry = {
        service: SERVICE_NAME,
        level,
        message,
        timestamp: new Date().toISOString(),
    };

    try {
        await axios.post(LOG_SERVER_URL, logEntry);
    } catch {
        // Fallback: print to console if dashboard is unreachable
        console[level === 'error' ? 'error' : 'log'](`[${level.toUpperCase()}] ${message}`);
    }
};

const logger = {
    info:  (message) => sendLog('INFO', message),
    warn:  (message) => sendLog('WARN', message),
    error: (message) => sendLog('ERROR', message),
    debug: (message) => sendLog('DEBUG', message),
};

module.exports = logger;
