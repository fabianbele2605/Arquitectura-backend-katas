const { v4: uuidv4 } = require('uuid');

function correlationMiddleware(req, res, next) {
    // Obtener correlation-id del header o generar uno nuevo
    const correlationId = req.headers['x-correlation-id'] || uuidv4();
    
    // Agregar a request
    req.correlationId = correlationId;
    
    // Agregar a response headers
    res.setHeader('x-correlation-id', correlationId);
    
    next();
}

module.exports = correlationMiddleware;
