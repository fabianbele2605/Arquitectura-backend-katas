const http = require('http');
const { Pool } = require('pg');

// ============================================
// CONEXIÓN A POSTGRESQL
// ============================================
const pool = new Pool({
    user: 'orders_user',
    host: 'localhost',
    database: 'orders_db',
    password: 'orders_pass',
    port: 5432,
});

// ============================================
// SERVIDOR HTTP
// ============================================
const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');

    // ============================================
    // POST /orders - Crear orden (CON TRANSACCIÓN)
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
                
                // INICIAR TRANSACCIÓN
                await client.query('BEGIN');
                
                // INSERTAR ORDEN
                const result = await client.query(
                    'INSERT INTO orders (product, quantity, price) VALUES ($1, $2, $3) RETURNING *',
                    [order.product, order.quantity, order.price]
                );
                
                // COMMIT: Confirmar cambios
                await client.query('COMMIT');
                
                res.statusCode = 201;
                res.end(JSON.stringify(result.rows[0]));
                
            } catch (error) {
                // ROLLBACK: Deshacer cambios si hay error
                await client.query('ROLLBACK');
                
                res.statusCode = 500;
                res.end(JSON.stringify({ error: error.message }));
                
            } finally {
                client.release();
            }
        });
    }

    // ============================================
    // POST /orders/batch - Crear múltiples órdenes (CON TRANSACCIÓN)
    // ============================================
    else if (req.method === 'POST' && req.url === '/orders/batch') {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            const client = await pool.connect();

            try {
                const { orders } = JSON.parse(body);

                // INICIAR TRANSACCIÓN
                await client.query('BEGIN');
                console.log('Insertando órdenes:', orders);

                const results = [];

                // Insertar cada orden
                for (const order of orders) {
                    console.log(`Insertando: ${order.product} - $${order.price}`);

                    const result = await client.query(
                        'INSERT INTO orders (product, quantity, price) VALUES ($1, $2, $3) RETURNING *',
                        [order.product, order.quantity, order.price]
                    );

                    results.push(result.rows[0]);
                }

                // COMMIT: Confirmar TODAS las órdenes
                await client.query('COMMIT');
                console.log('Todas las ordenes guardadas exitosamente');

                res.statusCode = 201;
                res.end(JSON.stringify({
                    message: 'Todas las ordenes creadas',
                    orders: results
                }));
            } catch (error) {
                // ROLLBACK: Deshacer TODAS las ordenes
                await client.query('ROLLBACK');
                console.log('ROLLBACK: Ninguna orden fue guardada');
                console.log('Error:', error.message);

                res.statusCode = 500;
                res.end(JSON.stringify({
                    error: error.message,
                    message: 'Ninguna orden fue guardada (rollback)'
                }));
            } finally {
                client.release();
            }
        });
    }
    
    // ============================================
    // GET /orders - Consultar todas las órdenes
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
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Estado: PERSISTENTE (PostgreSQL)');
});
