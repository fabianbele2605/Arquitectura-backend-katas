const http = require('http');
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
redisClient.on('connect', () => console.log('✅ Conectado a Redis'));

// ============================================
// SERVIDOR HTTP (PRODUCER)
// ============================================

const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');

    // POST /orders - Crear orden y encolar
    if (req.method === 'POST' && req.url === '/orders') {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', async () => {
            const client = await pool.connect();
            
            try {
                const order = JSON.parse(body);
                
                await client.query('BEGIN');
                
                // Crear orden
                const orderResult = await client.query(
                    'INSERT INTO orders (product, quantity, price, status) VALUES ($1, $2, $3, $4) RETURNING *',
                    [order.product, order.quantity, order.price, 'pending']
                );
                
                const newOrder = orderResult.rows[0];
                
                // Crear job
                const jobId = `job-${newOrder.id}-${Date.now()}`;
                await client.query(
                    'INSERT INTO jobs (job_id, order_id, status, max_attempts) VALUES ($1, $2, $3, $4)',
                    [jobId, newOrder.id, 'queued', 3]
                );
                
                // Encolar en Redis
                const job = {
                    jobId: jobId,
                    orderId: newOrder.id,
                    product: newOrder.product,
                    quantity: newOrder.quantity,
                    price: newOrder.price
                };
                
                await redisClient.lPush('orders:queue', JSON.stringify(job));
                
                await client.query('COMMIT');
                
                console.log(`📦 Orden ${newOrder.id} creada y encolada`);
                
                res.statusCode = 202;
                res.end(JSON.stringify({
                    message: 'Orden recibida y en proceso',
                    orderId: newOrder.id,
                    jobId: jobId,
                    status: 'pending'
                }));
                
            } catch (error) {
                await client.query('ROLLBACK');
                console.error('❌ Error:', error.message);
                
                res.statusCode = 500;
                res.end(JSON.stringify({ error: error.message }));
                
            } finally {
                client.release();
            }
        });
    }
    
    // GET /orders
    else if (req.method === 'GET' && req.url === '/orders') {
        try {
            const result = await pool.query('SELECT * FROM orders ORDER BY id');
            res.statusCode = 200;
            res.end(JSON.stringify(result.rows));
        } catch (error) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error.message }));
        }
    }
    
    // GET /jobs
    else if (req.method === 'GET' && req.url === '/jobs') {
        try {
            const result = await pool.query('SELECT * FROM jobs ORDER BY id');
            res.statusCode = 200;
            res.end(JSON.stringify(result.rows));
        } catch (error) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error.message }));
        }
    }
    
    // GET /dlq - Ver jobs en DLQ
    else if (req.method === 'GET' && req.url === '/dlq') {
        try {
            const result = await pool.query(
                'SELECT * FROM jobs WHERE status = $1 ORDER BY id',
                ['dead']
            );
            res.statusCode = 200;
            res.end(JSON.stringify(result.rows));
        } catch (error) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error.message }));
        }
    }
    
    else {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Not found' }));
    }
});

const PORT = 3000;

redisClient.connect().then(() => {
    server.listen(PORT, () => {
        console.log(`🚀 API running on http://localhost:${PORT}`);
        console.log('📨 Producer: Encola trabajos en Redis');
    });
});
