# Kata 0: Estado en Memoria y Race Conditions

## Objetivo

Entender race conditions y cómo prevenirlas usando mutex en sistemas concurrentes.

## Conceptos Clave

- **Estado en memoria**: datos volátiles (se pierden al reiniciar)
- **Race condition**: múltiples threads acceden a estado compartido
- **Mutex**: lock para sincronizar acceso
- **Concurrencia**: Node.js (single-thread) vs Go (multi-thread)

## Implementaciones

### Node.js (server.js)

```bash
npm install
node server.js
```

**Características:**
- Single-threaded (event loop)
- No necesita mutex
- Race conditions solo con async I/O

### Go (main.go)

```bash
go run main.go
```

**Características:**
- Multi-threaded (goroutines)
- Necesita mutex para estado compartido
- Race conditions con acceso concurrente

## Experimentos

### Experimento 1: 100 Requests Concurrentes (Sin Mutex)

```bash
# Go
go run main-broken.go

# En otra terminal
for i in {1..100}; do
  curl -X POST http://localhost:8080/orders \
    -H "Content-Type: application/json" \
    -d '{"customerId": 1, "amount": 100}' &
done
wait

curl http://localhost:8080/orders
```

**Resultado esperado:**
- Solo 99/100 órdenes guardadas
- Race condition: múltiples goroutines escriben simultáneamente

### Experimento 2: 100 Requests Concurrentes (Con Mutex)

```bash
# Go
go run main.go

# Repetir test
for i in {1..100}; do
  curl -X POST http://localhost:8080/orders \
    -d '{"customerId": 1, "amount": 100}' &
done
wait

curl http://localhost:8080/orders
```

**Resultado esperado:**
- 100/100 órdenes guardadas
- Mutex previene race condition

## Diferencias Node.js vs Go

| Aspecto | Node.js | Go |
|---------|---------|-----|
| Modelo | Single-thread | Multi-thread |
| Mutex | No necesario | Necesario |
| Race Condition | Raro | Común |
| Concurrencia | Event loop | Goroutines |

## Conclusiones

Ver `docs/analisis.md` para análisis detallado de race conditions.
