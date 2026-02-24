# Kata 3: Message Queues + Workers

## Objetivo

Implementar patrón Producer-Consumer usando Redis como message queue para procesamiento asíncrono.

## Conceptos Clave

- **Producer**: API que encola jobs
- **Consumer**: Worker que procesa jobs
- **BLPOP**: operación bloqueante para consumir mensajes
- **Escalabilidad horizontal**: múltiples workers en paralelo

## Arquitectura

```
Cliente → API (Producer) → Redis Queue
                              ↓
                          Workers (Consumers)
```

## Setup

### 1. Base de Datos

```bash
createdb mq_db
createuser mq_user -P  # password: mq_pass
psql mq_db < sql/schema.sql
```

### 2. Iniciar API

```bash
cd api
npm install
node server.js
```

### 3. Iniciar Workers

```bash
cd worker
npm install
node worker.js  # Terminal 1
node worker.js  # Terminal 2 (opcional)
```

## Experimentos

### Experimento 1: Encolar Jobs

```bash
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -d '{"orderId": 1, "action": "process"}'
```

**Resultado esperado:**
- API responde `202 Accepted` inmediatamente
- Worker procesa job en background
- Job guardado en DB

### Experimento 2: Escalabilidad (4 Workers)

```bash
# Encolar 10 jobs
for i in {1..10}; do
  curl -X POST http://localhost:3000/jobs \
    -H "Content-Type: application/json" \
    -d "{\"orderId\": $i, \"action\": \"process\"}"
done
```

**Resultado esperado:**
- 1 worker: ~10 segundos
- 4 workers: ~6 segundos (paralelismo)

## Conclusiones

Ver `docs/analisis.md` para métricas de rendimiento.
