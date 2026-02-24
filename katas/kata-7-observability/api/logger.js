class Logger {
    constructor(service) {
        this.service = service;
    }
    
    log(level, message, meta = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            service: this.service,
            message,
            ...meta
        };
        console.log(JSON.stringify(logEntry));
    }
    
    info(message, meta) {
        this.log('INFO', message, meta);
    }
    
    error(message, meta) {
        this.log('ERROR', message, meta);
    }
    
    warn(message, meta) {
        this.log('WARN', message, meta);
    }
}

module.exports = Logger;
