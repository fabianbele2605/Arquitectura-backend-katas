const redis = require('redis');
const Logger = require('../api/logger');

const logger = new Logger('worker');
const redisClient = redis.createClient({ host: 'localhost', port: 6379 });

redisClient.on('connect', () => logger.info('Worker connected to Redis'));

async function processJob(job) {
    const { order, correlationId } = JSON.parse(job);
    
    logger.info('Processing order', {
        correlationId,
        orderId: order.id,
        amount: order.amount
    });
    
    // Simular procesamiento
    await new Promise(resolve => setTimeout(resolve, Math.random() * 200));
    
    logger.info('Order processed successfully', {
        correlationId,
        orderId: order.id,
        status: 'completed'
    });
}

async function startWorker() {
    logger.info('Worker started');
    
    while (true) {
        try {
            const job = await redisClient.blPop('orders:queue', 0);
            
            if (job) {
                await processJob(job.element);
            }
        } catch (error) {
            logger.error('Error processing job', {
                error: error.message,
                stack: error.stack
            });
        }
    }
}

redisClient.connect().then(() => {
    startWorker();
});
