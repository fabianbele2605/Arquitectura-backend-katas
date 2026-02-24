# Kata 5: Sagas y Transacciones Distribuidas

## Objetivo

Implementar el patrón Saga para coordinar transacciones distribuidas entre múltiples servicios con compensación automática en caso de fallo.

## Conceptos Clave

- **Saga Pattern**: alternativa a transacciones distribuidas (2PC)
- **Orquestación**: coordinador central controla el flujo
- **Compensación**: rollback distribuido manual
- **Consistencia eventual**: cambios visibles inmediatamente

## Arquitectura

```
POST /orders
    ↓
Orchestrator
    ↓
[Paso 1] → Crear Orden
    ↓
[Paso 2] → Procesar Pago
    ↓
[Paso 3] → Reservar Inventario
    ↓
✅ Success → Completar
❌ Fallo → Compensar (rollback)
```

## Setup

### 1. Base de Datos

```bash
createdb orders_saga_db
createuser saga_user -P  # password: saga_pass
psql orders_saga_db < sql/schema.sql
```

### 2. Instalar Dependencias

```bash
cd orchestrator
npm install
```

### 3. Iniciar Orchestrator

```bash
node orchestrator.js
```

## Experimentos

### Experimento 1: Saga Exitosa

```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": 1,
    "amount": 100,
    "productId": 1,
    "quantity": 5
  }'
```

**Resultado esperado:**
- ✅ Orden creada
- ✅ Pago procesado
- ✅ Inventario reservado
- Status: `completed`

### Experimento 2: Saga con Fallo (Compensación)

```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": 2,
    "amount": 200,
    "productId": 3,
    "quantity": 10
  }'
```

**Resultado esperado:**
- ✅ Orden creada
- ❌ Pago rechazado (10% probabilidad)
- 🔄 Compensación automática
- Status: `compensated`

### Verificar Estado

```bash
# Ver sagas
curl http://localhost:3000/sagas | jq

# Ver órdenes
curl http://localhost:3000/orders | jq

# Ver pagos
curl http://localhost:3000/payments | jq

# Ver inventario
curl http://localhost:3000/inventory | jq
```

## Flujo de Compensación

Si falla un paso, se ejecuta compensación en orden inverso:

```javascript
if (inventory_reserved) → liberar inventario
if (payment_completed) → reembolsar pago
if (order_created) → cancelar orden
```

## Diferencias con ACID

| Aspecto | ACID | Saga |
|---------|------|------|
| Alcance | Una DB | Múltiples servicios |
| Atomicidad | Garantizada | Eventual |
| Rollback | Automático | Manual (código) |
| Visibilidad | Oculta hasta commit | Inmediata |

## Conclusiones

Ver `docs/analisis.md` para análisis detallado de experimentos.
