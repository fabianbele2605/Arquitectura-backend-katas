const http = require('http');
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
redisClient.on('connect', () => console.log('✅ Conectado a Redis'));

// ============================================
// SERVIDOR HTTP (PRODUCER)
// ============================================

const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');

    // ============================================
    // POST /orders - Crear orden y encolar trabajo
    // ============================================
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

                // 1. CREAR ORDEN EN DB (status: pending)
                const orderResult = await client.query(
                    'INSERT INTO orders (product, quantity, price, status) VALUES ($1, $2, $3, $4) RETURNING *',
                    [order.product, order.quantity, order.price, 'pending']
                );

                const newOrder = orderResult.rows[0];

                // 2. CREAR JOB EN DB
                const jobId = `job-${newOrder.id}-${Date.now()}`;
                await client.query(
                    'INSERT INTO jobs (job_id, order_id, status) VALUES ($1, $2, $3)',
                    [jobId, newOrder.id, 'queued']
                );

                // 3. ENCOLAR TRABAJO EN REDIS
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

                // 4. RESPONDER INMEDIATAMENTE (202 Accepted)
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

    // ============================================
    // GET /orders - Consultar ordenes
    // ============================================
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

    // ============================================
    // GET /jobs - Consultar trabajos
    // ============================================
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

    // ============================================
    // Ruta no encontrada
    // ============================================
    else {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Not found' }));
    }
});

// ============================================
// INICIAR SERVIDOR
// ============================================

const PORT = 3000;

redisClient.connect().then(() => {
    server.listen(PORT, () => {
        console.log(`🚀 API running on http://localhost:${PORT}`);
        console.log('📨 Producer: Encola trabajos en Redis');
    });
});