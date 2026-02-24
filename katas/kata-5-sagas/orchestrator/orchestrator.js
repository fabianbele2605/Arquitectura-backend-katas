const express = require('express');
const { Pool } = require('pg');
const redis = require('redis');

const app = express();
app.use(express.json());

// ============================================
// CONEXIONES
// ============================================

const pool = new Pool({
    user: 'saga_user',
    host: 'localhost',
    database: 'orders_saga_db',
    password: 'saga_pass',
    port: 5432,
});

const redisClient = redis.createClient({
    host: 'localhost',
    port: 6379,
});

redisClient.on('connect', () => console.log('✅ Orchestrator conectado a Redis'));

// ============================================
// SAGA ORCHESTRATOR
// ============================================

async function executeSaga(orderData) {
    const sagaId = `saga-${Date.now()}`;
    const client = await pool.connect();
    
    try {
        console.log(`🎬 Iniciando Saga: ${sagaId}`);
        
        // Crear registro de saga
        await client.query(
            'INSERT INTO saga_state (saga_id, current_step, status, data) VALUES ($1, $2, $3, $4)',
            [sagaId, 'started', 'in_progress', orderData]
        );
        
        // PASO 1: Crear orden
        console.log('📝 Paso 1: Creando orden...');
        const orderResult = await client.query(
            'INSERT INTO orders (customer_id, total_amount, status) VALUES ($1, $2, $3) RETURNING *',
            [orderData.customerId, orderData.amount, 'pending']
        );
        const order = orderResult.rows[0];
        console.log(`✅ Orden ${order.id} creada`);
        
        await client.query(
            'UPDATE saga_state SET order_id = $1, current_step = $2 WHERE saga_id = $3',
            [order.id, 'order_created', sagaId]
        );
        
        // PASO 2: Procesar pago
        console.log('💳 Paso 2: Procesando pago...');
        
        // Simular fallo de pago (10% probabilidad)
        if (Math.random() < 0.1) {
            throw new Error('Pago rechazado por el banco');
        }
        
        const paymentResult = await client.query(
            'INSERT INTO payments (order_id, amount, status, payment_method) VALUES ($1, $2, $3, $4) RETURNING *',
            [order.id, orderData.amount, 'completed', 'credit_card']
        );
        const payment = paymentResult.rows[0];
        console.log(`✅ Pago ${payment.id} procesado`);
        
        await client.query(
            'UPDATE saga_state SET payment_id = $1, current_step = $2 WHERE saga_id = $3',
            [payment.id, 'payment_completed', sagaId]
        );
        
        // PASO 3: Reservar inventario
        console.log('📦 Paso 3: Reservando inventario...');
        
        const inventoryResult = await client.query(
            'UPDATE inventory SET reserved = reserved + $1 WHERE product_id = $2 AND (quantity - reserved) >= $3 RETURNING *',
            [orderData.quantity, orderData.productId, orderData.quantity]
        );
        
        if (inventoryResult.rows.length === 0) {
            throw new Error('Stock insuficiente');
        }
        
        console.log(`✅ Inventario reservado`);
        
        await client.query(
            'UPDATE saga_state SET current_step = $1 WHERE saga_id = $2',
            ['inventory_reserved', sagaId]
        );
        
        // SAGA COMPLETADA
        await client.query(
            'UPDATE orders SET status = $1 WHERE id = $2',
            ['completed', order.id]
        );
        
        await client.query(
            'UPDATE saga_state SET status = $1, current_step = $2 WHERE saga_id = $3',
            ['completed', 'finished', sagaId]
        );
        
        console.log(`🎉 Saga ${sagaId} completada exitosamente`);
        
        return { success: true, orderId: order.id, sagaId };
        
    } catch (error) {
        console.error(`❌ Error en Saga ${sagaId}:`, error.message);
        
        // COMPENSACIÓN (deshacer cambios)
        await compensate(client, sagaId);
        
        return { success: false, error: error.message, sagaId };
        
    } finally {
        client.release();
    }
}

// ============================================
// COMPENSACIÓN (Rollback distribuido)
// ============================================

async function compensate(client, sagaId) {
    console.log(`🔄 Iniciando compensación para Saga ${sagaId}`);
    
    try {
        // Obtener estado de la saga
        const sagaResult = await client.query(
            'SELECT * FROM saga_state WHERE saga_id = $1',
            [sagaId]
        );
        
        const saga = sagaResult.rows[0];
        
        // Compensar según el paso donde falló
        if (saga.current_step === 'inventory_reserved' || saga.current_step === 'payment_completed') {
            // Liberar inventario si fue reservado
            console.log('↩️  Liberando inventario...');
            await client.query(
                'UPDATE inventory SET reserved = reserved - $1 WHERE product_id = $2',
                [saga.data.quantity, saga.data.productId]
            );
        }
        
        if (saga.payment_id) {
            // Reembolsar pago
            console.log('💸 Reembolsando pago...');
            await client.query(
                'UPDATE payments SET status = $1, refunded_at = NOW() WHERE id = $2',
                ['refunded', saga.payment_id]
            );
        }
        
        if (saga.order_id) {
            // Cancelar orden
            console.log('🚫 Cancelando orden...');
            await client.query(
                'UPDATE orders SET status = $1 WHERE id = $2',
                ['cancelled', saga.order_id]
            );
        }
        
        // Marcar saga como compensada
        await client.query(
            'UPDATE saga_state SET status = $1, current_step = $2 WHERE saga_id = $3',
            ['compensated', 'rolled_back', sagaId]
        );
        
        console.log(`✅ Compensación completada para Saga ${sagaId}`);
        
    } catch (error) {
        console.error(`❌ Error en compensación:`, error.message);
    }
}

// ============================================
// API ENDPOINTS
// ============================================

// Crear orden (inicia saga)
app.post('/orders', async (req, res) => {
    const result = await executeSaga(req.body);
    
    if (result.success) {
        res.status(201).json(result);
    } else {
        res.status(400).json(result);
    }
});

// Ver sagas
app.get('/sagas', async (req, res) => {
    const result = await pool.query('SELECT * FROM saga_state ORDER BY id DESC');
    res.json(result.rows);
});

// Ver órdenes
app.get('/orders', async (req, res) => {
    const result = await pool.query('SELECT * FROM orders ORDER BY id DESC');
    res.json(result.rows);
});

// Ver pagos
app.get('/payments', async (req, res) => {
    const result = await pool.query('SELECT * FROM payments ORDER BY id DESC');
    res.json(result.rows);
});

// Ver inventario
app.get('/inventory', async (req, res) => {
    const result = await pool.query('SELECT * FROM inventory ORDER BY product_id');
    res.json(result.rows);
});

// ============================================
// INICIAR
// ============================================

const PORT = 3000;

redisClient.connect().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Saga Orchestrator running on http://localhost:${PORT}`);
        console.log('🎭 Listo para coordinar sagas distribuidas');
    });
});
