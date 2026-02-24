# Kata 8: Seguridad - Autenticación, Autorización y Rate Limiting

## Fecha
24/02/2026

## Lenguaje
Node.js + Express

## ¿Qué construí?
API segura con autenticación JWT, autorización por roles, rate limiting, y validación de inputs.

## Problema que resuelve

### Sin seguridad ❌
```
Cualquiera accede a cualquier endpoint
Passwords en texto plano
Sin límite de intentos de login
Inputs sin validar → SQL injection
```

### Con seguridad ✅
```
Solo usuarios autenticados acceden
Passwords hasheados con bcrypt
Rate limiting previene brute force
Inputs validados con Joi
Roles controlan permisos
```

## Experimentos Realizados

### Experimento 1: Autenticación con JWT

**Request:**
```bash
POST /login
Body: {"username": "admin", "password": "admin123"}
```

**Resultado:**
```json
{
  "message": "Login exitoso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

**Conclusión:** JWT generado con expiración de 1 hora.

---

### Experimento 2: Acceso con Token Válido

**Request:**
```bash
GET /profile
Header: Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Resultado:**
```json
{
  "message": "Perfil de usuario",
  "user": {
    "userId": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

**Conclusión:** Middleware authMiddleware verifica token y permite acceso.

---

### Experimento 3: Acceso Sin Token

**Request:**
```bash
GET /profile
(sin header Authorization)
```

**Resultado:**
```json
{
  "error": "Token no proporcionado"
}
```

**Status:** 401 Unauthorized

**Conclusión:** Endpoints protegidos requieren token.

---

### Experimento 4: Crear Orden (Autenticado)

**Request:**
```bash
POST /orders
Header: Authorization: Bearer TOKEN
Body: {"customerId": 1, "amount": 100}
```

**Resultado:**
```json
{
  "message": "Orden creada",
  "order": {
    "id": 1771945357032,
    "customerId": 1,
    "amount": 100,
    "createdBy": "admin"
  }
}
```

**Conclusión:** Usuario autenticado puede crear órdenes.

---

### Experimento 5: Endpoint Solo Admin

**Request:**
```bash
GET /admin/users
Header: Authorization: Bearer TOKEN (admin)
```

**Resultado:**
```json
{
  "message": "Lista de usuarios",
  "users": [
    {"id": 1, "username": "admin", "role": "admin"},
    {"id": 2, "username": "user", "role": "user"}
  ]
}
```

**Conclusión:** Admin tiene acceso a endpoints administrativos.

---

### Experimento 6: Usuario Normal Intenta Admin

**Request:**
```bash
GET /admin/users
Header: Authorization: Bearer USER_TOKEN (role: user)
```

**Resultado:**
```json
{
  "error": "No autorizado",
  "requiredRole": ["admin"],
  "yourRole": "user"
}
```

**Status:** 403 Forbidden

**Conclusión:** Middleware requireRole bloquea acceso por rol.

---

### Experimento 7: Rate Limiting

**Test:**
```bash
# 6 intentos de login
for i in {1..6}; do
  POST /login {"username": "wrong", "password": "wrong"}
done
```

**Resultado:**
```
Intento 1: {"error": "Datos inválidos"} (password corto)
Intento 2: {"error": "Datos inválidos"}
Intento 3: {"error": "Datos inválidos"}
Intento 4: {"error": "Demasiados intentos de login, intenta en 15 minutos"}
Intento 5: {"error": "Demasiados intentos de login..."}
Intento 6: {"error": "Demasiados intentos de login..."}
```

**Status:** 429 Too Many Requests

**Conclusión:** Rate limiter bloquea después de 5 intentos en 15 minutos.

---

### Experimento 8: Validación de Inputs

**Request:**
```bash
POST /orders
Body: {"customerId": 1, "amount": -100}
```

**Resultado:**
```json
{
  "error": "Datos inválidos",
  "details": "\"amount\" must be a positive number"
}
```

**Status:** 400 Bad Request

**Conclusión:** Joi valida inputs antes de procesarlos.

---

## Conceptos Clave Aprendidos

### 1. Autenticación vs Autorización

**Autenticación (AuthN):** ¿Quién eres?
```javascript
// Login → Genera JWT
const token = jwt.sign({ userId, username, role }, SECRET_KEY);
```

**Autorización (AuthZ):** ¿Qué puedes hacer?
```javascript
// Verifica rol
if (!roles.includes(req.user.role)) {
  return res.status(403).json({ error: 'No autorizado' });
}
```

### 2. JWT (JSON Web Token)

**Estructura:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9  ← Header
.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4i  ← Payload
.GJ0aKV9Ke0qmSYMqGnGq11MENy_Qp0RlnVqieXKuAEk  ← Signature
```

**Ventajas:**
- Stateless (no necesita sesión en servidor)
- Contiene información del usuario
- Firmado (no se puede modificar)

**Desventajas:**
- No se puede revocar (hasta que expire)
- Tamaño mayor que session ID

### 3. Password Hashing con bcrypt

**¿Por qué bcrypt?**
- Lento por diseño (previene brute force)
- Salt automático (previene rainbow tables)
- Adaptable (aumentar rounds con el tiempo)

**Implementación:**
```javascript
// Hash (al registrar)
const hash = await bcrypt.hash('password123', 10);
// $2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy

// Verificar (al login)
const valid = await bcrypt.compare('password123', hash);
```

### 4. Rate Limiting

**Estrategias:**

```javascript
// Por IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  max: 100                    // 100 requests
});

// Por endpoint
app.post('/login', loginLimiter);  // 5 intentos
app.delete('/admin/*', strictLimiter);  // 10 por hora
```

**Previene:**
- Brute force attacks
- DDoS
- Scraping
- Abuso de API

### 5. Input Validation con Joi

**Schema:**
```javascript
const schema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  amount: Joi.number().positive().max(10000).required()
});
```

**Previene:**
- SQL injection
- XSS
- Buffer overflow
- Datos inválidos

---

## Códigos de Estado HTTP

| Código | Significado | Cuándo usar |
|--------|-------------|-------------|
| **200** | OK | Éxito |
| **201** | Created | Recurso creado |
| **400** | Bad Request | Input inválido |
| **401** | Unauthorized | No autenticado (sin token) |
| **403** | Forbidden | No autorizado (sin permisos) |
| **429** | Too Many Requests | Rate limit excedido |
| **500** | Internal Server Error | Error del servidor |

---

## Implementación Técnica

### 1. Middleware de Autenticación

```javascript
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }
  
  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ error: 'Token inválido' });
  }
  
  req.user = decoded;
  next();
}
```

**Ventajas:**
- Reutilizable
- No invasivo
- Fácil de testear

### 2. Middleware de Autorización

```javascript
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    next();
  };
}

// Uso
app.get('/admin/users', authMiddleware, requireRole('admin'), handler);
```

**Ventajas:**
- Flexible (múltiples roles)
- Composable
- Declarativo

### 3. Rate Limiting

```javascript
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Demasiados intentos' }
});

app.post('/login', loginLimiter, handler);
```

**Ventajas:**
- Fácil de configurar
- Por endpoint
- Headers informativos

---

## Mejores Prácticas de Seguridad

### 1. Passwords

✅ **Hacer:**
- Usar bcrypt (o argon2)
- Salt rounds >= 10
- Nunca guardar en texto plano
- Nunca loggear passwords

❌ **No hacer:**
- MD5 o SHA1 (inseguros)
- Passwords en URLs
- Passwords en logs

### 2. JWT

✅ **Hacer:**
- Expiración corta (1 hora)
- Secret key fuerte
- HTTPS siempre
- Refresh tokens para sesiones largas

❌ **No hacer:**
- Guardar datos sensibles en payload
- Secret key en código
- JWT sin expiración

### 3. Rate Limiting

✅ **Hacer:**
- Login: 5 intentos / 15 min
- API general: 100 req / 15 min
- Admin: 10 req / hora
- Headers informativos

❌ **No hacer:**
- Sin rate limiting
- Límites muy altos
- Mismo límite para todo

### 4. Input Validation

✅ **Hacer:**
- Validar todo input
- Whitelist (permitir solo válidos)
- Sanitizar antes de usar
- Mensajes de error claros

❌ **No hacer:**
- Confiar en el cliente
- Blacklist (bloquear inválidos)
- Validación solo en frontend

---

## Comparación: Con vs Sin Seguridad

| Aspecto | Sin Seguridad | Con Seguridad |
|---------|---------------|---------------|
| **Autenticación** | No | JWT |
| **Passwords** | Texto plano | bcrypt |
| **Autorización** | No | Roles |
| **Rate limiting** | No | Sí |
| **Input validation** | No | Joi |
| **Brute force** | Vulnerable | Protegido |
| **SQL injection** | Vulnerable | Protegido |

---

## Casos de Uso Reales

### 1. Brute Force Attack

**Sin rate limiting:**
```
Atacante intenta 10,000 passwords
Sistema colapsa o password descubierto
```

**Con rate limiting:**
```
Atacante intenta 5 passwords
Rate limiter bloquea por 15 minutos
Ataque inviable
```

### 2. SQL Injection

**Sin validación:**
```javascript
// Input: {"username": "admin' OR '1'='1"}
const query = `SELECT * FROM users WHERE username = '${username}'`;
// SQL: SELECT * FROM users WHERE username = 'admin' OR '1'='1'
// Resultado: Todos los usuarios 💥
```

**Con validación:**
```javascript
const schema = Joi.object({
  username: Joi.string().alphanum().required()
});
// Input rechazado: "username must only contain alpha-numeric characters"
```

### 3. Acceso No Autorizado

**Sin roles:**
```
Usuario normal accede a /admin/delete-all-users
Sistema comprometido
```

**Con roles:**
```
Usuario normal intenta /admin/delete-all-users
requireRole('admin') bloquea
403 Forbidden
```

---

## Conceptos Dominados

✅ **Autenticación (JWT)** - Verificar identidad  
✅ **Autorización (Roles)** - Verificar permisos  
✅ **Password hashing (bcrypt)** - Guardar passwords seguros  
✅ **Rate limiting** - Prevenir abuso  
✅ **Input validation (Joi)** - Prevenir inyecciones  
✅ **HTTP status codes** - 401 vs 403  
✅ **Middleware pattern** - Seguridad modular  
✅ **Bearer token** - Estándar de autenticación

---

## Lecciones Aprendidas

### 1. Seguridad en capas
- Autenticación + Autorización + Validación + Rate limiting
- Una capa falla → otras protegen

### 2. JWT es stateless
- Ventaja: Escalable
- Desventaja: No se puede revocar

### 3. bcrypt es lento por diseño
- Previene brute force
- 10 rounds = ~100ms (aceptable)

### 4. Rate limiting es crítico
- Especialmente en login
- Previene ataques automatizados

### 5. Validar TODO input
- Nunca confiar en el cliente
- Whitelist > Blacklist

---

## Comparación con Katas Anteriores

| Aspecto | Kata 7 (Observabilidad) | Kata 8 (Seguridad) |
|---------|-------------------------|-------------------|
| **Objetivo** | Entender qué pasa | Prevenir ataques |
| **Herramientas** | Logs, métricas | JWT, bcrypt, Joi |
| **Cuándo usar** | Siempre | Siempre |
| **Complemento** | Sí - se usan juntos | Sí - se usan juntos |

**Ejemplo combinado:**
```javascript
// Seguridad (Kata 8)
app.post('/orders', authMiddleware, requireRole('user'), handler);

// Observabilidad (Kata 7)
logger.info('Order created', {
  correlationId,
  userId: req.user.userId,
  role: req.user.role
});
```

---

## 🎉 Fin del Roadmap

**8/8 katas completadas (100%)**

Has dominado:
1. Estado y race conditions
2. Transacciones ACID
3. Idempotencia
4. Message queues
5. Reintentos y DLQ
6. Sagas
7. Resiliencia
8. Observabilidad
9. Seguridad

**¡Felicitaciones! Ahora tienes las bases de arquitectura backend.**
