const rateLimit = require('express-rate-limit');

// Rate limiter general (100 requests por 15 minutos)
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Demasiadas peticiones, intenta más tarde' },
    standardHeaders: true,
    legacyHeaders: false
});

// Rate limiter para login (5 intentos por 15 minutos)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Demasiados intentos de login, intenta en 15 minutos' },
    standardHeaders: true,
    legacyHeaders: false
});

// Rate limiter estricto para operaciones sensibles (10 por hora)
const strictLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: { error: 'Límite de operaciones alcanzado, intenta en 1 hora' },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    generalLimiter,
    loginLimiter,
    strictLimiter
};
