const express = require('express');
const axios = require('axios');
const CircuitBreaker = require('./circuit-breaker');

const app = express();
app.use(express.json());

// Configurar circuit breaker para servicio de pagos
const paymentBreaker = new CircuitBreaker({
    failureThreshold: 3,    // 3 fallos para abrir
    successThreshold: 2,    // 2 éxitos para cerrar
    timeout: 2000,          // 2 segundos de timeout
    resetTimeout: 10000     // 10 segundos antes de probar
});

app.post('/orders', async (req, res) => {
    try {
        // Ejecutar llamada a servicio de pagos con circuit breaker
        const payment = await paymentBreaker.execute(async () => {
            const response = await axios.post('http://localhost:4000/process-payment', {
                amount: req.body.amount
            });
            return response.data;
        });
        
        res.json({
            success: true,
            order: { id: Date.now(), amount: req.body.amount },
            payment
        });
        
    } catch (error) {
        // Si circuit breaker está abierto, responder con fallback
        if (error.message === 'Circuit breaker is OPEN') {
            return res.status(503).json({
                error: 'Payment service unavailable',
                fallback: 'Order saved, payment will be processed later'
            });
        }
        
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para ver estado del circuit breaker
app.get('/circuit-breaker/status', (req, res) => {
    res.json(paymentBreaker.getState());
});

app.listen(3000, () => {
    console.log('🚀 API running on http://localhost:3000');
});
