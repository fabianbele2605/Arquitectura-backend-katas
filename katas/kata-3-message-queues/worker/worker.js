const { Pool } = require('pg');
const redis = require('redis');

// ============================================
// CONEXIONES
// ============================================

const pool = new Pool({
    user: 'mq_user',
    host: 'localhost',
    database: 'mq_db',
    password: 'mq_pass',
    port: 5432,
});

const redisClient = redis.createClient({
    host: 'localhost',
    port: 6379,
});

redisClient.on('error', (err) => console.error('Redis error:', err));
redisClient.on('connect', () => console.log('✅ Worker conectado a Redis'));

// ============================================
// WORKER (CONSUMER)
// ============================================

async function processJob(job) {
    const client = await pool.connect();
    
    try {
        console.log(`⚙️  Procesando job ${job.jobId}...`);
        
        await client.query('BEGIN');
        
        // 1. ACTUALIZAR JOB (status: processing)
        await client.query(
            'UPDATE jobs SET status = $1, attempts = attempts + 1 WHERE job_id = $2',
            ['processing', job.jobId]
        );
        
        // 2. SIMULAR PROCESAMIENTO (trabajo pesado)
        // En producción: enviar email, procesar pago, etc.
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 segundos
        
        // 3. ACTUALIZAR ORDEN (status: completed)
        await client.query(
            'UPDATE orders SET status = $1, processed_at = NOW() WHERE id = $2',
            ['completed', job.orderId]
        );
        
        // 4. ACTUALIZAR JOB (status: completed)
        await client.query(
            'UPDATE jobs SET status = $1, processed_at = NOW() WHERE job_id = $2',
            ['completed', job.jobId]
        );
        
        await client.query('COMMIT');
        
        console.log(`✅ Job ${job.jobId} completado (Orden ${job.orderId})`);
        
    } catch (error) {
        await client.query('ROLLBACK');
        
        console.error(`❌ Error procesando job ${job.jobId}:`, error.message);
        
        // Guardar error en DB
        await client.query(
            'UPDATE jobs SET status = $1, error_message = $2 WHERE job_id = $3',
            ['failed', error.message, job.jobId]
        );
        
        throw error;
        
    } finally {
        client.release();
    }
}

// ============================================
// LOOP PRINCIPAL DEL WORKER
// ============================================

async function startWorker() {
    console.log('🔄 Worker iniciado, esperando trabajos...');
    
    while (true) {
        try {
            // BLPOP: Bloquea hasta que haya un mensaje (eficiente)
            const result = await redisClient.blPop('orders:queue', 0);
            
            if (result) {
                const job = JSON.parse(result.element);
                console.log(`📨 Trabajo recibido: ${job.jobId}`);
                
                await processJob(job);
            }
            
        } catch (error) {
            console.error('❌ Error en worker:', error.message);
            
            // Esperar antes de reintentar
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

// ============================================
// INICIAR WORKER
// ============================================

redisClient.connect().then(() => {
    console.log('🚀 Worker listo para procesar trabajos');
    startWorker();
}).catch(err => {
    console.error('❌ Error conectando a Redis:', err);
    process.exit(1);
});

// Manejo de señales para cerrar gracefully
process.on('SIGINT', async () => {
    console.log('\n⏹️  Cerrando worker...');
    await redisClient.quit();
    await pool.end();
    process.exit(0);
});
