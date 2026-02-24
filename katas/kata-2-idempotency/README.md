# Kata 2: Idempotencia

## Objetivo

Implementar idempotencia usando `Idempotency-Key` header para prevenir procesamiento duplicado de pagos.

## Conceptos Clave

- **Idempotency-Key**: identificador único por request
- **Deduplicación**: detectar y rechazar duplicados
- **Race Condition**: múltiples requests simultáneos con misma key
- **UNIQUE Constraint**: garantía a nivel DB

## Arquitectura

```
Cliente → POST /pay (Idempotency-Key: abc123)
            ↓
         [Verificar key en DB]
            ↓
         ¿Existe? → Retornar respuesta cacheada
            ↓ No
         [Procesar pago]
            ↓
         [Guardar key + respuesta]
```

## Setup

### 1. Base de Datos

```bash
createdb idempotency_db
createuser idem_user -P  # password: idem_pass
psql idempotency_db < sql/schema.sql
```

### 2. Iniciar Servidor

```bash
npm install
node server.js
```

## Experimentos

### Experimento 1: Request Normal

```bash
curl -X POST http://localhost:3000/pay \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: key-001" \
  -d '{"amount": 100, "userId": 1}'
```

**Resultado esperado:**
- Status: `200 OK`
- Pago procesado

### Experimento 2: Request Duplicado

```bash
# Mismo Idempotency-Key
curl -X POST http://localhost:3000/pay \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: key-001" \
  -d '{"amount": 100, "userId": 1}'
```

**Resultado esperado:**
- Status: `200 OK`
- Respuesta cacheada (no se procesa de nuevo)

### Experimento 3: Race Condition

```bash
# Enviar 2 requests simultáneos
curl -X POST http://localhost:3000/pay \
  -H "Idempotency-Key: key-race" \
  -d '{"amount": 50, "userId": 2}' &
curl -X POST http://localhost:3000/pay \
  -H "Idempotency-Key: key-race" \
  -d '{"amount": 50, "userId": 2}' &
```

**Resultado esperado:**
- Solo 1 request procesa
- El otro recibe respuesta cacheada
- UNIQUE constraint previene duplicados

## Conclusiones

Ver `docs/analisis.md` para análisis detallado.
