const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const SECRET_KEY = 'your-secret-key-change-in-production';
const SALT_ROUNDS = 10;

// Base de datos simulada de usuarios
const users = [
    {
        id: 1,
        username: 'admin',
        passwordHash: '', // Se inicializa en createUser
        role: 'admin'
    },
    {
        id: 2,
        username: 'user',
        passwordHash: '',
        role: 'user'
    }
];

// Inicializar passwords
async function initUsers() {
    users[0].passwordHash = await bcrypt.hash('admin123', SALT_ROUNDS);
    users[1].passwordHash = await bcrypt.hash('user123', SALT_ROUNDS);
}

// Generar JWT
function generateToken(user) {
    return jwt.sign(
        { 
            userId: user.id, 
            username: user.username, 
            role: user.role 
        },
        SECRET_KEY,
        { expiresIn: '1h' }
    );
}

// Verificar JWT
function verifyToken(token) {
    try {
        return jwt.verify(token, SECRET_KEY);
    } catch (error) {
        return null;
    }
}

// Login
async function login(username, password) {
    const user = users.find(u => u.username === username);
    
    if (!user) {
        return { success: false, error: 'Usuario no encontrado' };
    }
    
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!validPassword) {
        return { success: false, error: 'Contraseña incorrecta' };
    }
    
    const token = generateToken(user);
    
    return {
        success: true,
        token,
        user: {
            id: user.id,
            username: user.username,
            role: user.role
        }
    };
}

// Middleware de autenticación
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
    
    req.user = decoded;
    next();
}

// Middleware de autorización por rol
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'No autenticado' });
        }
        
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: 'No autorizado',
                requiredRole: roles,
                yourRole: req.user.role
            });
        }
        
        next();
    };
}

module.exports = {
    initUsers,
    login,
    authMiddleware,
    requireRole
};
