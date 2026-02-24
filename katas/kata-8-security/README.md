# Kata 8: Seguridad - Autenticación, Autorización y Rate Limiting

## Objetivo

Implementar seguridad básica: autenticación con JWT, autorización por roles, rate limiting, y validación de inputs.

## Conceptos Clave

- **Autenticación (AuthN)** - ¿Quién eres? (JWT)
- **Autorización (AuthZ)** - ¿Qué puedes hacer? (Roles)
- **Rate Limiting** - Prevenir abuso
- **Input Validation** - Prevenir inyecciones
- **Password Hashing** - bcrypt

## Arquitectura

```
Cliente → Login → JWT Token
          ↓
     [authMiddleware] → Verifica token
          ↓
     [requireRole] → Verifica permisos
          ↓
     Endpoint protegido
```

## Setup

### 1. Instalar dependencias

```bash
cd api
npm install
```

### 2. Iniciar servidor

```bash
node server.js
```

## Usuarios de Prueba

- **admin** / admin123 (rol: admin)
- **user** / user123 (rol: user)

## Experimentos

### Experimento 1: Login y JWT

```bash
# Login como admin
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

**Resultado esperado:**
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

**Guarda el token** para los siguientes experimentos.

---

### Experimento 2: Acceso con Token

```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl http://localhost:3000/profile \
  -H "Authorization: Bearer $TOKEN"
```

**Resultado esperado:**
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

---

### Experimento 3: Sin Token (debe fallar)

```bash
curl http://localhost:3000/profile
```

**Resultado esperado:**
```json
{
  "error": "Token no proporcionado"
}
```

---

### Experimento 4: Crear Orden (autenticado)

```bash
curl -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"customerId": 1, "amount": 100}'
```

**Resultado esperado:**
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

---

### Experimento 5: Endpoint Solo Admin

```bash
# Como admin (debe funcionar)
curl http://localhost:3000/admin/users \
  -H "Authorization: Bearer $TOKEN"
```

**Resultado esperado:**
```json
{
  "message": "Lista de usuarios",
  "users": [
    {"id": 1, "username": "admin", "role": "admin"},
    {"id": 2, "username": "user", "role": "user"}
  ]
}
```

---

### Experimento 6: Usuario Normal Intenta Admin (debe fallar)

```bash
# Login como user
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"username": "user", "password": "user123"}'

# Usar token de user
USER_TOKEN="..."
curl http://localhost:3000/admin/users \
  -H "Authorization: Bearer $USER_TOKEN"
```

**Resultado esperado:**
```json
{
  "error": "No autorizado",
  "requiredRole": ["admin"],
  "yourRole": "user"
}
```

---

### Experimento 7: Rate Limiting

```bash
# Intentar login 6 veces (límite es 5)
for i in {1..6}; do
  echo "Intento $i:"
  curl -X POST http://localhost:3000/login \
    -H "Content-Type: application/json" \
    -d '{"username": "wrong", "password": "wrong"}'
  echo ""
done
```

**Resultado esperado:**
- Intentos 1-3: Error de validación
- Intentos 4-6: `{"error": "Demasiados intentos de login, intenta en 15 minutos"}`

---

### Experimento 8: Validación de Inputs

```bash
# Input inválido (amount negativo)
curl -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"customerId": 1, "amount": -100}'
```

**Resultado esperado:**
```json
{
  "error": "Datos inválidos",
  "details": "\"amount\" must be a positive number"
}
```

---

## Componentes de Seguridad

### 1. JWT (JSON Web Token)

```javascript
// Generar token
const token = jwt.sign(
    { userId, username, role },
    SECRET_KEY,
    { expiresIn: '1h' }
);

// Verificar token
const decoded = jwt.verify(token, SECRET_KEY);
```

### 2. Password Hashing (bcrypt)

```javascript
// Hash password
const hash = await bcrypt.hash(password, SALT_ROUNDS);

// Verificar password
const valid = await bcrypt.compare(password, hash);
```

### 3. Rate Limiting

```javascript
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutos
    max: 5,                     // 5 intentos
    message: { error: 'Demasiados intentos' }
});
```

### 4. Input Validation (Joi)

```javascript
const schema = Joi.object({
    customerId: Joi.number().positive().required(),
    amount: Joi.number().positive().max(10000).required()
});

const { error, value } = schema.validate(req.body);
```

---

## Códigos de Estado HTTP

- **200 OK** - Éxito
- **201 Created** - Recurso creado
- **400 Bad Request** - Input inválido
- **401 Unauthorized** - No autenticado
- **403 Forbidden** - No autorizado (sin permisos)
- **429 Too Many Requests** - Rate limit excedido

---

## Mejores Prácticas

✅ **Nunca guardar passwords en texto plano** - Usar bcrypt  
✅ **JWT con expiración** - 1 hora máximo  
✅ **Rate limiting en login** - Prevenir brute force  
✅ **Validar todos los inputs** - Prevenir inyecciones  
✅ **Separar autenticación de autorización** - Middleware independientes  
✅ **HTTPS en producción** - Nunca HTTP  
✅ **Secret key segura** - No hardcodear, usar variables de entorno

---

## Conclusiones

Ver `docs/analisis.md` para análisis detallado de experimentos.
