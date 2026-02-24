# Kata 1: Persistencia y Transacciones

## Objetivo

Implementar transacciones ACID en PostgreSQL para garantizar atomicidad en operaciones de múltiples órdenes.

## Conceptos Clave

- **ACID**: Atomicidad, Consistencia, Aislamiento, Durabilidad
- **BEGIN/COMMIT/ROLLBACK**: control de transacciones
- **Atomicidad**: todo o nada
- **Persistencia**: datos sobreviven a reinicio del servidor

## Arquitectura

```
Cliente → POST /orders/batch
            ↓
         [BEGIN]
            ↓
         [INSERT orden 1]
         [INSERT orden 2]
         [INSERT orden 3]
            ↓
         ¿Error? → ROLLBACK (ninguna se guarda)
            ↓ No
         [COMMIT] (todas se guardan)
```

## Setup

### 1. Base de Datos

```bash
createdb orders_db
createuser orders_user -P  # password: orders_pass
psql orders_db < sql/schema.sql
```

### 2. Iniciar Servidor

```bash
npm install
node server.js
```

## Experimentos

### Experimento 1: Transacción Exitosa

```bash
curl -X POST http://localhost:3000/orders/batch \
  -H "Content-Type: application/json" \
  -d '{
    "orders": [
      {"customerId": 1, "amount": 100},
      {"customerId": 2, "amount": 200}
    ]
  }'
```

**Resultado esperado:**
- Ambas órdenes guardadas
- Status: `201 Created`

### Experimento 2: Transacción con Fallo

```bash
curl -X POST http://localhost:3000/orders/batch \
  -H "Content-Type: application/json" \
  -d '{
    "orders": [
      {"customerId": 1, "amount": 100},
      {"customerId": null, "amount": 200}
    ]
  }'
```

**Resultado esperado:**
- ROLLBACK automático
- Ninguna orden guardada
- Status: `500 Error`

### Experimento 3: Persistencia

```bash
# Crear órdenes
curl -X POST http://localhost:3000/orders \
  -d '{"customerId": 1, "amount": 100}'

# Reiniciar servidor (Ctrl+C y node server.js)

# Verificar que datos persisten
curl http://localhost:3000/orders
```

**Resultado esperado:**
- Datos siguen en DB después de reinicio

## Conclusiones

Ver `docs/analisis.md` para comparación con Kata 0 (memoria).
