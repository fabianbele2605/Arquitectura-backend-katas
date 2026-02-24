const express = require('express');
const redis = require('redis');
const Logger = require('./logger');
const correlationMiddleware = require('./correlation-middleware');
const { metricsMiddleware, getMetrics } = require('./metrics-middleware');

const app = express();
app.use(express.json());

const logger = new Logger('api');
const redisClient = redis.createClient({ host: 'localhost', port: 6379 });

redisClient.on('connect', () => logger.info('Connected to Redis'));

// Middlewares de observabilidad
app.use(correlationMiddleware);
app.use(metricsMiddleware);

// Logging de requests
app.use((req, res, next) => {
    logger.info('Request received', {
        correlationId: req.correlationId,
        method: req.method,
        path: req.path,
        ip: req.ip
    });
    next();
});

// Endpoint principal
app.post('/orders', async (req, res) => {
    const { correlationId } = req;
    
    try {
        logger.info('Creating order', {
            correlationId,
            customerId: req.body.customerId,
            amount: req.body.amount
        });
        
        // Simular procesamiento
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        
        // Simular fallo ocasional (10%)
        if (Math.random() < 0.1) {
            throw new Error('Database timeout');
        }
        
        const order = {
            id: Date.now(),
            customerId: req.body.customerId,
            amount: req.body.amount,
            status: 'pending'
        };
        
        // Encolar para worker
        await redisClient.rPush('orders:queue', JSON.stringify({
            order,
            correlationId
        }));
        
        logger.info('Order created and queued', {
            correlationId,
            orderId: order.id
        });
        
        res.status(202).json({
            success: true,
            order,
            correlationId
        });
        
    } catch (error) {
        logger.error('Error creating order', {
            correlationId,
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            error: error.message,
            correlationId
        });
    }
});

// Endpoint de métricas
app.get('/metrics', (req, res) => {
    res.json(getMetrics());
});

// Endpoint de health
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'api' });
});

redisClient.connect().then(() => {
    app.listen(3000, () => {
        logger.info('API started', { port: 3000 });
    });
});
