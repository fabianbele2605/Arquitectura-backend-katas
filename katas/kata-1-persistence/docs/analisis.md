# Kata 1: Persistencia y Transacciones

## Fecha
20/02/2026

## Lenguaje
Node.js + PostgreSQL

## ¿Qué construí?
Un servidor HTTP que guarda órdenes en PostgreSQL con transacciones ACID.

## Conceptos aprendidos

### 1. Persistencia vs Memoria

| Aspecto | Memoria (Kata 0) | PostgreSQL (Kata 1) |
|---------|------------------|---------------------|
| **Almacenamiento** | RAM | Disco |
| **Reiniciar servidor** | ❌ Datos perdidos | ✅ Datos persisten |
| **Velocidad** | Muy rápido | Rápido |
| **Durabilidad** | No | Sí |

### 2. ACID

**A - Atomicidad:** Todo o nada  
**C - Consistencia:** Reglas siempre se cumplen (CHECK constraints)  
**I - Isolation:** Transacciones no se interfieren  
**D - Durability:** Datos persisten en disco

### 3. Transacciones

```javascript
BEGIN    → Iniciar transacción
INSERT   → Operación 1
INSERT   → Operación 2
COMMIT   → Confirmar TODO
```

Si algo falla:
```javascript
BEGIN    → Iniciar transacción
INSERT   → Operación 1 ✅
INSERT   → Operación 2 ❌ (error)
ROLLBACK → Deshacer TODO
```

## Experimentos realizados

### Experimento 1: Persistencia

1. Creé 2 órdenes (Laptop, Mouse)
2. Reinicié el servidor
3. Consulté las órdenes

**Resultado:** ✅ Los datos persisten

**Conclusión:** PostgreSQL guarda en disco, no en RAM.

---

### Experimento 2: Transacción exitosa

**Request:**
```json
{
  "orders": [
    {"product": "Teclado", "quantity": 1, "price": 50},
    {"product": "Monitor", "quantity": 1, "price": 300}
  ]
}
```

**Resultado:** ✅ Ambas órdenes guardadas

**Log del servidor:**
```
Insertando: Teclado - $50
Insertando: Monitor - $300
Todas las ordenes guardadas exitosamente
```

---

### Experimento 3: Transacción con error (ROLLBACK)

**Request:**
```json
{
  "orders": [
    {"product": "Webcam", "quantity": 1, "price": 80},
    {"product": "Cable", "quantity": 1, "price": -10}
  ]
}
```

**Resultado:** ❌ NINGUNA orden guardada

**Log del servidor:**
```
Insertando: Webcam - $80
Insertando: Cable - $-10
ROLLBACK: Ninguna orden fue guardada
Error: violates check constraint "orders_price_check"
```

**¿Qué pasó?**
1. Webcam se insertó correctamente ✅
2. Cable falló (precio negativo) ❌
3. PostgreSQL hizo ROLLBACK
4. Webcam también se deshizo ✅

**Conclusión:** ATOMICIDAD = Todo o nada

---

## ¿Por qué es importante?

### Caso real: E-commerce

Sin transacción:
```
1. Descontar stock ✅
2. Crear orden ❌ (falla)
Resultado: Stock descontado pero sin orden 💥
```

Con transacción:
```
BEGIN
1. Descontar stock ✅
2. Crear orden ❌ (falla)
ROLLBACK
Resultado: Nada cambió ✅
```

### Caso real: Transferencia bancaria

Sin transacción:
```
1. Restar $100 de cuenta A ✅
2. Sumar $100 a cuenta B ❌ (falla)
Resultado: $100 desaparecieron 💸
```

Con transacción:
```
BEGIN
1. Restar $100 de cuenta A ✅
2. Sumar $100 a cuenta B ❌ (falla)
ROLLBACK
Resultado: Nada cambió ✅
```

---

## Conceptos clave de PostgreSQL

### 1. SERIAL (auto-increment)
```sql
id SERIAL PRIMARY KEY
```
- Genera IDs automáticamente
- Equivalente a `nextId++` pero en la DB

### 2. CHECK constraints
```sql
price DECIMAL(10, 2) CHECK (price > 0)
```
- Valida datos antes de insertar
- Garantiza consistencia

### 3. RETURNING *
```sql
INSERT ... RETURNING *
```
- Devuelve la fila insertada
- Incluye el ID generado

### 4. Queries parametrizadas
```javascript
'INSERT INTO orders (...) VALUES ($1, $2, $3)'
```
- Previene SQL injection
- Más seguro que concatenar strings

### 5. Pool de conexiones
```javascript
const pool = new Pool({...});
```
- Mantiene múltiples conexiones abiertas
- Reutiliza conexiones (más eficiente)
- Mejor rendimiento que crear/cerrar conexiones

---

## Comparación: Memoria vs PostgreSQL

| Aspecto | Kata 0 (Memoria) | Kata 1 (PostgreSQL) |
|---------|------------------|---------------------|
| **Estado** | Volátil | Persistente |
| **Reiniciar** | ❌ Pierde datos | ✅ Mantiene datos |
| **Transacciones** | No | Sí (ACID) |
| **Validaciones** | Manual | Automática (CHECK) |
| **Concurrencia** | Mutex manual | Manejada por DB |
| **IDs únicos** | `nextId++` | SERIAL |
| **Rollback** | No | Sí |
| **Uso en producción** | Cache, sesiones | Datos críticos |

---

## Resumen de conceptos dominados

✅ **Persistencia** - Datos sobreviven al reinicio  
✅ **ACID** - Garantías de la base de datos  
✅ **Atomicidad** - Todo o nada (BEGIN/COMMIT/ROLLBACK)  
✅ **Transacciones** - Múltiples operaciones como una sola  
✅ **CHECK constraints** - Validaciones automáticas  
✅ **SERIAL** - IDs auto-incrementales  
✅ **Pool de conexiones** - Reutilización eficiente  
✅ **Queries parametrizadas** - Seguridad contra SQL injection

---

## Siguiente paso

**Kata 2: Idempotencia**
- Evitar duplicados con `Idempotency-Key`
- UNIQUE constraints
- Tabla de deduplicación
- Manejo de reintentos
