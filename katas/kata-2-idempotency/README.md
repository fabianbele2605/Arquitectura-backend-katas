# Kata 2: Idempotencia y Deduplicación

## 🎯 Objetivo

Entender:
- Idempotency-Key para evitar duplicados
- Deduplicación de requests
- Manejo de reintentos
- Race conditions en idempotencia

## 📁 Estructura

```
kata-2-idempotency/
├── sql/
│   └── schema.sql         # Tablas: payments + idempotency_keys
├── node/
│   ├── package.json
│   └── server.js          # Servidor con idempotencia
└── docs/
    └── analisis.md        # Experimentos y conclusiones
```

## 🚀 Cómo ejecutar

### 1. Crear base de datos

```bash
sudo -u postgres psql
CREATE DATABASE idempotency_db;
CREATE USER idempotency_user WITH PASSWORD 'idempotency_pass';
GRANT ALL PRIVILEGES ON DATABASE idempotency_db TO idempotency_user;
\c idempotency_db
GRANT ALL ON SCHEMA public TO idempotency_user;
\q
```

### 2. Ejecutar schema

```bash
psql -U idempotency_user -d idempotency_db -h localhost -f sql/schema.sql
```

### 3. Instalar dependencias

```bash
cd node
npm install
```

### 4. Iniciar servidor

```bash
node server.js
```

## 🧪 Pruebas

### Crear pago (primera vez)

```bash
curl -X POST http://localhost:3000/pay \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: pago-001" \
  -d '{"amount": 100, "description": "Compra de laptop"}'
```

### Reintentar (mismo key)

```bash
curl -X POST http://localhost:3000/pay \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: pago-001" \
  -d '{"amount": 100, "description": "Compra de laptop"}'
```

**Resultado:** Devuelve respuesta guardada (NO procesa de nuevo)

### Test de concurrencia (10 requests simultáneos)

```bash
for i in {1..10}; do
  curl -X POST http://localhost:3000/pay \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: pago-002" \
    -d '{"amount": 50, "description": "Mouse"}' &
done
wait
```

**Resultado:** Solo 1 pago creado

### Consultar pagos

```bash
curl http://localhost:3000/payments
```

### Ver keys guardadas

```bash
curl http://localhost:3000/idempotency-keys
```

## 📊 Resultados esperados

| Experimento | Resultado |
|-------------|-----------|
| Primera vez con key única | ✅ Procesa y guarda |
| Reintento con mismo key | ✅ Devuelve guardado (no procesa) |
| 10 requests simultáneos | ✅ Solo 1 pago creado |
| Sin Idempotency-Key | ❌ Error 400 |

## 🧠 Conceptos clave

### Idempotency-Key

Header HTTP que identifica una operación única:
```
Idempotency-Key: abc-123-xyz
```

- Generado por el cliente
- Mismo key = misma operación
- Key diferente = operación diferente

### Flujo

```
1. Cliente envía request + Idempotency-Key
2. Servidor busca: ¿Ya procesé esta key?
   - SÍ → Devuelve respuesta guardada
   - NO → Procesa + Guarda + Responde
```

### Tabla de deduplicación

```sql
CREATE TABLE idempotency_keys (
    idempotency_key VARCHAR(255) UNIQUE,
    request_body JSONB,
    response_body JSONB,
    response_status INTEGER
);
```

Guarda:
- La key (UNIQUE)
- Lo que pidió el cliente
- Lo que respondimos
- El código HTTP

### Race conditions

Cuando múltiples requests llegan simultáneamente:
```
Request 1: ¿Existe key? NO → Procesa
Request 2: ¿Existe key? NO → Intenta procesar
  ↓
UNIQUE constraint violation
  ↓
Request 2 espera y reintenta lectura
  ↓
Devuelve resultado de Request 1
```

## ✅ Checklist

- [ ] Entender qué es idempotencia
- [ ] Implementar Idempotency-Key
- [ ] Crear tabla de deduplicación
- [ ] Manejar reintentos
- [ ] Observar race conditions
- [ ] Implementar manejo de duplicados

## 🎯 Casos de uso reales

### 1. Pagos
Usuario hace doble clic → Solo 1 cargo

### 2. Órdenes
Timeout en red → Cliente reintenta → Solo 1 orden

### 3. APIs con retry
API Gateway reintenta automáticamente → No duplica

## 🚀 Siguiente paso

**Kata 3: Message Queues + Workers**

Combinarás:
- Transacciones (Kata 1)
- Idempotencia (Kata 2)
- Procesamiento asíncrono (Kata 3)
