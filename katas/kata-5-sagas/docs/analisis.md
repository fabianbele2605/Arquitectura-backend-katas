# Análisis: Sagas y Transacciones Distribuidas

## Experimentos Realizados

### Experimento 1: Saga Exitosa
**Request:**
```json
{
  "customerId": 1,
  "amount": 100,
  "productId": 1,
  "quantity": 5
}
```

**Resultado:**
- ✅ Orden 1: status `completed`
- ✅ Pago 1: status `completed`, amount $100
- ✅ Inventario: 5 unidades reservadas
- ✅ Saga: status `completed`, step `finished`

**Conclusión:** Los 3 pasos se ejecutaron secuencialmente sin errores.

---

### Experimento 2: Saga con Fallo (Compensación)
**Request:**
```json
{
  "customerId": 2,
  "amount": 200,
  "productId": 3,
  "quantity": 10
}
```

**Resultado:**
- ✅ Orden 2 creada
- ❌ Pago rechazado (simulado 10% probabilidad)
- 🔄 **Compensación automática:**
  - Orden 2: status `cancelled`
  - Pago: no se creó registro
- ✅ Saga: status `compensated`, step `rolled_back`

**Conclusión:** El sistema detectó el fallo y ejecutó rollback distribuido automáticamente.

---

## Conceptos Clave Aprendidos

### 1. **Saga Pattern**
- Alternativa a transacciones distribuidas (2PC)
- Cada paso es una transacción local independiente
- Si falla un paso → compensación de pasos anteriores

### 2. **Orquestación vs Coreografía**
- **Orquestación** (implementado): coordinador central controla el flujo
- **Coreografía**: servicios reaccionan a eventos sin coordinador

### 3. **Compensación (Rollback Distribuido)**
```javascript
// Orden de compensación (inverso a ejecución):
if (inventory_reserved) → liberar inventario
if (payment_completed) → reembolsar pago
if (order_created) → cancelar orden
```

### 4. **Estado de Saga**
Tabla `saga_state` registra:
- `current_step`: dónde está la saga
- `status`: in_progress / completed / compensated
- `data`: payload original para compensación

---

## Diferencias con Transacciones ACID

| Aspecto | ACID (Kata 1) | Saga (Kata 5) |
|---------|---------------|---------------|
| **Alcance** | Una DB | Múltiples servicios |
| **Atomicidad** | Garantizada | Eventual (con compensación) |
| **Consistencia** | Fuerte | Eventual |
| **Rollback** | Automático (DB) | Manual (código) |
| **Visibilidad** | Cambios ocultos hasta commit | Cambios visibles inmediatamente |

---

## Cuándo Usar Sagas

✅ **Usar cuando:**
- Operaciones span múltiples servicios/DBs
- No puedes usar transacciones distribuidas (2PC)
- Tolerancia a consistencia eventual

❌ **No usar cuando:**
- Todo está en una DB (usa ACID)
- Necesitas consistencia fuerte inmediata
- Compensación es imposible (ej: email enviado)

---

## Mejoras Posibles

1. **Timeouts:** cada paso debe tener timeout
2. **Retries:** reintentar pasos fallidos antes de compensar
3. **Idempotencia:** cada paso debe ser idempotente
4. **Eventos:** publicar `OrderCreated`, `PaymentCompleted` para observabilidad
5. **Saga Log:** persistir cada acción para debugging
