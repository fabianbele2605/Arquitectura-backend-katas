const express = require('express');
const Joi = require('joi');
const { initUsers, login, authMiddleware, requireRole } = require('./auth');
const { generalLimiter, loginLimiter, strictLimiter } = require('./rate-limiter');

const app = express();
app.use(express.json());

// Rate limiter general
app.use(generalLimiter);

// Inicializar usuarios
initUsers().then(() => {
    console.log('✅ Usuarios inicializados');
});

// ============================================
// VALIDACIÓN DE INPUTS
// ============================================

const loginSchema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().min(6).required()
});

const orderSchema = Joi.object({
    customerId: Joi.number().integer().positive().required(),
    amount: Joi.number().positive().max(10000).required(),
    items: Joi.array().items(Joi.string()).optional()
});

// ============================================
// ENDPOINTS PÚBLICOS
// ============================================

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Login (con rate limiting estricto)
app.post('/login', loginLimiter, async (req, res) => {
    // Validar input
    const { error, value } = loginSchema.validate(req.body);
    
    if (error) {
        return res.status(400).json({ 
            error: 'Datos inválidos',
            details: error.details[0].message
        });
    }
    
    const result = await login(value.username, value.password);
    
    if (!result.success) {
        return res.status(401).json({ error: result.error });
    }
    
    res.json({
        message: 'Login exitoso',
        token: result.token,
        user: result.user
    });
});

// ============================================
// ENDPOINTS PROTEGIDOS (requieren autenticación)
// ============================================

// Endpoint para cualquier usuario autenticado
app.get('/profile', authMiddleware, (req, res) => {
    res.json({
        message: 'Perfil de usuario',
        user: req.user
    });
});

// Crear orden (cualquier usuario autenticado)
app.post('/orders', authMiddleware, (req, res) => {
    // Validar input
    const { error, value } = orderSchema.validate(req.body);
    
    if (error) {
        return res.status(400).json({ 
            error: 'Datos inválidos',
            details: error.details[0].message
        });
    }
    
    res.status(201).json({
        message: 'Orden creada',
        order: {
            id: Date.now(),
            ...value,
            createdBy: req.user.username
        }
    });
});

// ============================================
// ENDPOINTS SOLO PARA ADMIN
// ============================================

// Ver todos los usuarios (solo admin)
app.get('/admin/users', authMiddleware, requireRole('admin'), (req, res) => {
    res.json({
        message: 'Lista de usuarios',
        users: [
            { id: 1, username: 'admin', role: 'admin' },
            { id: 2, username: 'user', role: 'user' }
        ]
    });
});

// Eliminar orden (solo admin, con rate limiting estricto)
app.delete('/admin/orders/:id', authMiddleware, requireRole('admin'), strictLimiter, (req, res) => {
    res.json({
        message: 'Orden eliminada',
        orderId: req.params.id,
        deletedBy: req.user.username
    });
});

// ============================================
// INICIAR
// ============================================

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`🚀 Secure API running on http://localhost:${PORT}`);
    console.log('👤 Usuarios de prueba:');
    console.log('   - admin / admin123 (rol: admin)');
    console.log('   - user / user123 (rol: user)');
});
