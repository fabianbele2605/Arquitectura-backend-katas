# Kata 4: Reintentos y Dead Letter Queue

## Objetivo

Implementar sistema de reintentos automáticos con backoff exponencial y Dead Letter Queue (DLQ) para jobs que fallan persistentemente.

## Conceptos Clave

- **Retry**: reintentar jobs fallidos automáticamente
- **Exponential Backoff**: esperar 1s, 2s, 4s entre reintentos
- **Dead Letter Queue**: cola para jobs que fallaron 3+ veces
- **Resiliencia**: recuperación automática de fallos transitorios

## Arquitectura

```
API → Redis Queue → Worker
                      ↓
                   [Intento 1]
                      ↓ fallo
                   [Intento 2] (espera 1s)
                      ↓ fallo
                   [Intento 3] (espera 2s)
                      ↓ fallo
                   [DLQ] (espera 4s)
```

## Setup

```bash
cd worker
npm install
node worker.js
```

## Experimentos

### Experimento 1: Job con Fallos Transitorios

```bash
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -d '{"orderId": 1, "action": "process"}'
```

**Resultado esperado:**
- Intento 1: fallo (50% probabilidad)
- Intento 2: fallo (espera 1s)
- Intento 3: éxito
- Job completado después de reintentos

### Verificar DLQ

```bash
redis-cli LLEN dlq
redis-cli LRANGE dlq 0 -1
```

## Conclusiones

Ver `docs/analisis.md` para resultados detallados.
