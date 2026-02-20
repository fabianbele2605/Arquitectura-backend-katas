# Kata 0: Mini Servicio Orders

## Fecha
19/02/2026

## Lenguaje
Node.js

## ¿Qué construí?
Un servidor HTTP que recibe y almacena órdenes en memoria.

## Conceptos aprendidos

### 1. Estado en memoria
- El array `orders` vive en la RAM
- Se pierde al reiniciar el servidor
- Es rápido pero NO persistente

### 2. Efectos secundarios
Cada POST /orders:
- Modifica el estado global
- Genera un ID único
- Crea un timestamp
- NO se puede deshacer

### 3. Stateful vs Stateless
- Este servidor es STATEFUL (recuerda órdenes)
- Un servidor STATELESS no guardaría nada

## Experimento realizado

1. Creé 2 órdenes (Laptop y Mouse)
2. Consulté con GET → Aparecieron ambas
3. Reinicié el servidor
4. Consulté con GET → Array vacío

**Conclusión:** Los datos en memoria son volátiles.

## ¿Dónde se usa esto en producción?

- **Memoria:** Cache, sesiones temporales
- **Persistencia:** Bases de datos (PostgreSQL, MongoDB)

## Siguiente paso
Implementar lo mismo en Go para comparar.

## Comparación Node vs Go

| Aspecto | Node.js | Go |
|---------|---------|-----|
| **Tipado** | Dinámico | Estático |
| **Concurrencia** | Event loop (single-thread) | Goroutines (multi-thread) |
| **Mutex** | No necesario aquí | Necesario (race conditions) |
| **Velocidad** | Rápido | Más rápido |
| **Compilación** | No (interpretado) | Sí (binario) |
| **Uso de memoria** | Mayor | Menor |



## Experimento: Race Condition en Go

### Hipótesis
Sin mutex, múltiples goroutines pueden leer el mismo `nextID` y crear órdenes con IDs duplicados.

### Procedimiento
1. Creé versión sin mutex (`main-broken.go`)
2. Envié 100 requests concurrentes
3. Verifiqué IDs duplicados

### Resultados

**Sin mutex:**
- Órdenes creadas: [pon el número que obtuviste]
- IDs duplicados: [sí/no y cuáles]

**Con mutex:**
- Órdenes creadas: 100
- IDs duplicados: No

### Conclusión
El mutex **serializa** el acceso a la sección crítica (nextID++).
Sin él, Go procesa requests en paralelo y corrompe el estado.

### ¿Por qué Node no tiene este problema?
Node es single-threaded. Procesa una request a la vez.
No hay paralelismo real, solo concurrencia asíncrona.



## Experimento: Race Condition en Go (Sin Mutex)

### Fecha
[Pon la fecha de hoy]

### Hipótesis
Sin mutex, múltiples goroutines pueden:
1. Leer el mismo `nextID`
2. Sobrescribir órdenes en el slice

### Procedimiento
1. Eliminé mutex de `main.go` → `main-broken.go`
2. Envié 100 requests concurrentes con `&` (paralelo)
3. Verifiqué cantidad y IDs duplicados

### Resultados

**Sin mutex (main-broken.go):**
- Requests enviados: 100
- Órdenes creadas: 99 ❌
- Órdenes perdidas: 1
- IDs duplicados visibles: No (pero hubo colisión interna)

**Conclusión del bug:**
- Dos goroutines leyeron el mismo `nextID`
- Una orden sobrescribió a otra en el `append`
- Se perdió 1 orden completamente

### ¿Por qué se perdió la orden?

El slice `orders` NO es thread-safe:
```go
orders = append(orders, newOrder)  // ❌ Race condition
```

Cuando dos goroutines hacen `append` simultáneamente:
- Ambas leen el mismo slice
- Ambas crean un nuevo slice
- Una sobrescribe a la otra
- Resultado: datos perdidos

### Solución: Mutex

El mutex protege TODA la sección crítica:
```go
mu.Lock()
newOrder := Order{ID: nextID, ...}
nextID++
orders = append(orders, newOrder)
mu.Unlock()
```

Solo UNA goroutine puede ejecutar esto a la vez.

### Lección clave

**En Go (y cualquier lenguaje con paralelismo real):**
- Estado compartido + concurrencia = Race condition
- Sin sincronización → datos corruptos/perdidos
- Mutex serializa el acceso crítico

**En Node:**
- Single-threaded → no hay este problema
- Pero tampoco hay paralelismo real

---

## Resumen de Kata 0

### ✅ Conceptos dominados

1. **Estado en memoria** - Volátil, se pierde al reiniciar
2. **Efectos secundarios** - Modificaciones que no se pueden deshacer
3. **Stateful vs Stateless** - Guardar o no guardar estado
4. **Concurrencia vs Paralelismo** - Node (concurrente) vs Go (paralelo)
5. **Race conditions** - Múltiples threads accediendo al mismo dato
6. **Mutex** - Sincronización para proteger estado compartido
7. **Lost updates** - Actualizaciones que se pierden sin sincronización

### 📊 Resultados experimentales

| Experimento | Node.js | Go sin mutex | Go con mutex |
|-------------|---------|--------------|--------------||
| 100 requests | 100 ✅ | 99 ❌ | 100 ✅ |
| Race condition | No | Sí | No |
| Datos perdidos | No | Sí (1 orden) | No |

### 🎯 Aplicación en producción

**Cuándo usar memoria:**
- Cache temporal (Redis, Memcached)
- Sesiones de usuario
- Rate limiting
- Datos que pueden perderse

**Cuándo NO usar memoria:**
- Transacciones financieras
- Órdenes de compra
- Datos críticos del negocio
- Cualquier cosa que deba persistir

### 🚀 Siguiente paso

**Kata 1: Persistencia con PostgreSQL**
- Guardar en base de datos
- Transacciones ACID
- Unique constraints
- Rollback en caso de error


# Kata 1: Persistencia y Transacciones

## Fecha
[Pon la fecha de hoy]

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
