const express = require('express');
const app = express();

let failureMode = false; // Controlar fallos manualmente

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.post('/process-payment', (req, res) => {
    // Simular latencia
    const delay = failureMode ? 5000 : 100;
    
    setTimeout(() => {
        if (failureMode) {
            res.status(503).json({ error: 'Service unavailable' });
        } else {
            res.json({ success: true, transactionId: Date.now() });
        }
    }, delay);
});

// Endpoint para controlar fallos
app.post('/admin/fail', (req, res) => {
    failureMode = true;
    res.json({ message: 'Failure mode enabled' });
});

app.post('/admin/recover', (req, res) => {
    failureMode = false;
    res.json({ message: 'Service recovered' });
});

app.listen(4000, () => {
    console.log('💳 Payment API running on http://localhost:4000');
});
