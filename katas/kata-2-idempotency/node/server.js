const http = require('http');
const { Pool } = require('pg');

// =======================================
// CONEXION A POSTGRESQL
// =======================================

const pool = new Pool({
    user: 'idempotency_user',
    host: 'localhost',
    database: 'idempotency_db',
    password: 'idempotency_pass',
    port: 5432,
});

// =======================================
// SERVIDOR HTTP
// =======================================

const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');

    // ===================================
    // POST /pay - Procesar pago (CON IDEMPOTENCIA)
    if (req.method === 'POST' && req.url === '/pay') {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            const client = await pool.connect();

            try {
                // 1. OBTENER IDEMPOTENCY-KEY DEL HEADER
                const idempotencyKey = req.headers['idempotency-key'];

                if (!idempotencyKey) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({
                        error: 'Idempotency-Key header requerido'
                    }));
                    return;
                }

                const payment = JSON.parse(body);

                console.log(`🔑 Idempotency-Key: ${idempotencyKey}`);

                // 2. VERIFICAR SI YA PROCESAMOS ESTA KEY
                const existingKey = await client.query(
                    'SELECT * FROM idempotency_keys WHERE idempotency_key = $1',
                    [idempotencyKey]
                );

                // 3. SI YA EXISTE, DEVOLVER RESULTADO GUARDADO
                if (existingKey.rows.length > 0) {
                    const cached = existingKey.rows[0];
                    console.log('✅ Key ya procesada, devolviendo respuesta guardada');

                    res.statusCode = cached.response_status;
                    res.end(JSON.stringify(cached.response_body));
                    return;
                }

                console.log('🆕 Key nueva, procesando pago...');

                // 4. PROCESAR PAGO (NUEVA KEY)
                await client.query('BEGIN');

                // Insertar idempotency key PRIMERO (para bloquear)
                try {
                    await client.query(
                        'INSERT INTO idempotency_keys (idempotency_key, request_body, response_status) VALUES ($1, $2, $3)',
                        [idempotencyKey, payment, 0] // status 0 = procesando
                    );
                } catch (insertError) {
                    // Race condition: Otro request insertó primero
                    await client.query('ROLLBACK');
                    
                    // Esperar un poco y reintentar lectura
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    const retryKey = await client.query(
                        'SELECT * FROM idempotency_keys WHERE idempotency_key = $1',
                        [idempotencyKey]
                    );
                    
                    if (retryKey.rows.length > 0 && retryKey.rows[0].response_status > 0) {
                        const cached = retryKey.rows[0];
                        console.log('✅ Key procesada por otro request, devolviendo respuesta');
                        
                        res.statusCode = cached.response_status;
                        res.end(JSON.stringify(cached.response_body));
                        return;
                    }
                    
                    throw insertError;
                }

                // Insertar pago
                const paymentResult = await client.query(
                    'INSERT INTO payments (amount, currency, description, status) VALUES ($1, $2, $3, $4) RETURNING *',
                    [payment.amount, payment.currency || 'USD', payment.description, 'completed']
                );

                const newPayment = paymentResult.rows[0];

                // Actualizar idempotency key con la respuesta
                await client.query(
                    'UPDATE idempotency_keys SET response_body = $1, response_status = $2, updated_at = NOW() WHERE idempotency_key = $3',
                    [newPayment, 201, idempotencyKey]
                );

                await client.query('COMMIT');

                console.log('💰 Pago procesado exitosamente');

                res.statusCode = 201;
                res.end(JSON.stringify(newPayment));
            } catch (error) {
                await client.query('ROLLBACK');
                console.log('❌ Error:', error.message);

                res.statusCode = 500;
                res.end(JSON.stringify({
                    error: error.message
                }));
            } finally {
                client.release();
            }
        });
    }

    // ========================================
    // GET /payments - Consultar pagos
    // ========================================

    else if (req.method === 'GET' && req.url === '/payments') {
        try {
            const result = await pool.query('SELECT * FROM payments ORDER BY id');

            res.statusCode = 200;
            res.end(JSON.stringify(result.rows));
        } catch (error) {
            res.statusCode = 500;
            res.end(JSON.stringify({
                error: error.message
            }));
        }
    }
    // ========================================
    // GET /idempotency-keys - Ver keys guardadas
    // ========================================

    else if (req.method === 'GET' && req.url === '/idempotency-keys') {
        try {
            const result = await pool.query('SELECT * FROM idempotency_keys ORDER BY id');

            res.statusCode = 200;
            res.end(JSON.stringify(result.rows));
        } catch (error) {
            res.statusCode = 500;
            res.end(JSON.stringify({
                error: error.message
            }));
        }
    }

    // ========================================
    // Ruta no encontrada
    // ========================================

    else {
        res.statusCode = 404;
        res.end(JSON.stringify({
            error: 'Not Found'
        }));
    }
});

// =======================================
// INICIAR SERVIDOR
// =======================================
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Estado: IDEMPOTENTE (no procesa duplicados)');
});