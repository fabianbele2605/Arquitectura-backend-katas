const { Pool } = require('pg');
const redis = require('redis');

// ============================================
// CONEXIONES
// ============================================

const pool = new Pool({
    user: 'retries_user',
    host: 'localhost',
    database: 'retries_db',
    password: 'retries_pass',
    port: 5432,
});

const redisClient = redis.createClient({
    host: 'localhost',
    port: 6379,
});

redisClient.on('error', (err) => console.error('Redis error:', err));
redisClient.on('connect', () => console.log('✅ Worker conectado a Redis'));

// ============================================
// CONFIGURACIÓN DE REINTENTOS
// ============================================

const MAX_ATTEMPTS = 3;
const BASE_DELAY = 1000; // 1 segundo

// Backoff exponencial: 1s, 2s, 4s
function getRetryDelay(attempt) {
    return BASE_DELAY * Math.pow(2, attempt - 1);
}

// ============================================
// WORKER CON REINTENTOS
// ============================================

async function processJob(job) {
    const client = await pool.connect();
    
    try {
        console.log(`⚙️  Procesando job ${job.jobId}...`);
        
        await client.query('BEGIN');
        
        // Actualizar job
        const jobResult = await client.query(
            'UPDATE jobs SET status = $1, attempts = attempts + 1, last_error_at = NOW() WHERE job_id = $2 RETURNING *',
            ['processing', job.jobId]
        );
        
        const currentJob = jobResult.rows[0];
        console.log(`📊 Intento ${currentJob.attempts}/${MAX_ATTEMPTS}`);
        
        // SIMULAR FALLO ALEATORIO (30% de probabilidad)
        if (Math.random() < 0.3) {
            throw new Error('Fallo simulado: Error de red');
        }
        
        // Simular procesamiento
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Actualizar orden
        await client.query(
            'UPDATE orders SET status = $1, processed_at = NOW() WHERE id = $2',
            ['completed', job.orderId]
        );
        
        // Actualizar job
        await client.query(
            'UPDATE jobs SET status = $1, processed_at = NOW() WHERE job_id = $2',
            ['completed', job.jobId]
        );
        
        await client.query('COMMIT');
        
        console.log(`✅ Job ${job.jobId} completado`);
        
    } catch (error) {
        await client.query('ROLLBACK');
        
        console.error(`❌ Error en job ${job.jobId}:`, error.message);
        
        // Obtener info del job
        const jobInfo = await client.query(
            'SELECT attempts, max_attempts FROM jobs WHERE job_id = $1',
            [job.jobId]
        );
        
        // Verificar que el job existe
        if (jobInfo.rows.length === 0) {
            console.error(`❌ Job ${job.jobId} no encontrado en DB`);
            return;
        }
        
        const { attempts, max_attempts } = jobInfo.rows[0];
        
        // ¿Llegamos al límite de reintentos?
        if (attempts >= max_attempts) {
            console.log(`💀 Job ${job.jobId} movido a DLQ (${attempts} intentos fallidos)`);
            
            // Mover a Dead Letter Queue
            await client.query(
                'UPDATE jobs SET status = $1, error_message = $2 WHERE job_id = $3',
                ['dead', error.message, job.jobId]
            );
            
            // Encolar en DLQ de Redis
            await redisClient.lPush('orders:dlq', JSON.stringify(job));
            
        } else {
            console.log(`🔄 Job ${job.jobId} será reintentado (intento ${attempts + 1}/${max_attempts})`);
            
            // Guardar error
            await client.query(
                'UPDATE jobs SET status = $1, error_message = $2 WHERE job_id = $3',
                ['failed', error.message, job.jobId]
            );
            
            // Calcular delay con backoff exponencial
            const delay = getRetryDelay(attempts + 1);
            console.log(`⏰ Reintentando en ${delay}ms...`);
            
            // Re-encolar con delay
            setTimeout(async () => {
                await redisClient.lPush('orders:queue', JSON.stringify(job));
                console.log(`📨 Job ${job.jobId} re-encolado`);
            }, delay);
        }
        
    } finally {
        client.release();
    }
}

// ============================================
// LOOP PRINCIPAL
// ============================================

async function startWorker() {
    console.log('🔄 Worker iniciado con reintentos automáticos...');
    console.log(`📋 Configuración: ${MAX_ATTEMPTS} intentos máximos`);
    
    while (true) {
        try {
            const result = await redisClient.blPop('orders:queue', 0);
            
            if (result) {
                const job = JSON.parse(result.element);
                console.log(`📨 Trabajo recibido: ${job.jobId}`);
                
                await processJob(job);
            }
            
        } catch (error) {
            console.error('❌ Error en worker:', error.message);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

// ============================================
// INICIAR
// ============================================

redisClient.connect().then(() => {
    console.log('🚀 Worker listo con sistema de reintentos');
    startWorker();
}).catch(err => {
    console.error('❌ Error conectando:', err);
    process.exit(1);
});

process.on('SIGINT', async () => {
    console.log('\n⏹️  Cerrando worker...');
    await redisClient.quit();
    await pool.end();
    process.exit(0);
});
