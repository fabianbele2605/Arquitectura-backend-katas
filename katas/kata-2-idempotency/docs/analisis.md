# Kata 2: Idempotencia y Deduplicación

## Fecha
20/02/2026

## Lenguaje
Node.js + PostgreSQL

## ¿Qué construí?
Un sistema de pagos que NO procesa duplicados usando Idempotency-Key.

## Problema que resuelve

### Sin idempotencia ❌
```
Cliente: POST /pay (pagar $100)
  ↓
Red lenta... timeout ⏱️
  ↓
Cliente reintenta: POST /pay
  ↓
Resultado: Se cobró 2 veces 💸💸
```

### Con idempotencia ✅
```
Cliente: POST /pay + Idempotency-Key: abc123
  ↓
Servidor: Procesa y guarda resultado
  ↓
Cliente reintenta: POST /pay + Idempotency-Key: abc123
  ↓
Servidor: Devuelve resultado guardado (NO procesa)
  ↓
Resultado: Se cobró 1 vez ✅
```

## Conceptos aprendidos

### 1. Idempotency-Key

**Header HTTP que identifica una operación única:**
```
Idempotency-Key: pago-001
```

- Generado por el **cliente** (UUID, timestamp, etc.)
- Mismo key = misma operación
- Key diferente = operación diferente

### 2. Tabla de deduplicación

```sql
CREATE TABLE idempotency_keys (
    idempotency_key VARCHAR(255) UNIQUE,
    request_body JSONB,
    response_body JSONB,
    response_status INTEGER
);
```

**¿Qué guarda?**
- La key (UNIQUE → no se puede repetir)
- Lo que pidió el cliente
- Lo que respondimos
- El código HTTP

### 3. Flujo de idempotencia

```javascript
1. Recibir Idempotency-Key del header
2. Buscar en tabla: ¿Ya existe?
   - SÍ → Devolver respuesta guardada
   - NO → Procesar + Guardar + Responder
```

## Experimentos realizados

### Experimento 1: Reintento simple

**Request 1:**
```bash
POST /pay
Idempotency-Key: pago-001
Body: {"amount": 100, "description": "Laptop"}
```

**Resultado:** 
- 🆕 Key nueva
- 💰 Pago procesado
- ✅ Guardado en DB

**Request 2 (mismo key):**
```bash
POST /pay
Idempotency-Key: pago-001
Body: {"amount": 100, "description": "Laptop"}
```

**Resultado:**
- ✅ Key ya existe
- 🚫 NO procesa
- 📦 Devuelve respuesta guardada

**Verificación:**
```bash
curl /payments → 1 pago (no 2)
curl /idempotency-keys → 1 key guardada
```

---

### Experimento 2: 10 reintentos simultáneos (Race Condition)

**Comando:**
```bash
for i in {1..10}; do
  curl POST /pay -H "Idempotency-Key: pago-002" &
done
```

**Resultado observado:**
- Solo 1 pago creado ✅
- Algunos requests tuvieron race condition
- Error: "duplicate key value violates unique constraint"

**¿Qué pasó?**

```
10 requests llegan AL MISMO TIEMPO
  ↓
Varios pasan el check "¿existe?" → NO (simultáneamente)
  ↓
Varios intentan INSERT
  ↓
Solo 1 tiene éxito
  ↓
Los demás fallan con UNIQUE constraint violation
```

**Solución implementada:**
1. Insertar key PRIMERO (antes del pago)
2. Si falla por duplicado → Esperar y reintentar lectura
3. Devolver respuesta del request que ganó la carrera

**Conclusión:** Idempotencia bajo concurrencia requiere manejo de race conditions

---

### Experimento 3: Keys diferentes

**Request 1:**
```bash
Idempotency-Key: pago-003
```

**Request 2:**
```bash
Idempotency-Key: pago-004
```

**Resultado:**
- 2 pagos creados ✅
- Cada key única = operación única

---

## ¿Por qué es importante?

### Caso real 1: Timeout en red

```
Usuario hace clic en "Pagar"
  ↓
Request enviado
  ↓
Red lenta... usuario espera 30s
  ↓
Usuario hace clic de nuevo (reintento)
  ↓
Sin idempotencia: 2 cargos 💸💸
Con idempotencia: 1 cargo ✅
```

### Caso real 2: Retry automático

```
API Gateway reintenta automáticamente
  ↓
Request 1: Procesa OK pero respuesta se pierde
  ↓
Request 2: Retry automático
  ↓
Sin idempotencia: Duplicado
Con idempotencia: Devuelve resultado original
```

### Caso real 3: Doble clic

```
Usuario impaciente hace doble clic
  ↓
2 requests simultáneos
  ↓
Sin idempotencia: 2 órdenes
Con idempotencia: 1 orden
```

---

## Comparación: Con vs Sin idempotencia

| Aspecto | Sin idempotencia | Con idempotencia |
|---------|------------------|------------------|
| **Reintento** | Crea duplicado ❌ | Devuelve guardado ✅ |
| **Doble clic** | 2 operaciones ❌ | 1 operación ✅ |
| **Timeout** | Riesgo de duplicado ❌ | Seguro ✅ |
| **Complejidad** | Simple | Requiere tabla extra |
| **Uso en producción** | Peligroso | Recomendado |

---

## Implementación técnica

### 1. UNIQUE constraint

```sql
idempotency_key VARCHAR(255) UNIQUE
```

- PostgreSQL garantiza que no se puede insertar 2 veces
- Si intentas insertar duplicado → Error
- Usamos esto para detectar reintentos

### 2. Transacción atómica

```javascript
BEGIN
  INSERT INTO idempotency_keys (...) // Primero
  INSERT INTO payments (...)         // Después
  UPDATE idempotency_keys (...)      // Actualizar con respuesta
COMMIT
```

- Insertar key primero bloquea otros requests
- Si falla → rollback completo
- Garantiza consistencia

### 3. Manejo de race conditions

```javascript
try {
  INSERT INTO idempotency_keys
} catch (duplicateError) {
  // Otro request insertó primero
  await sleep(100ms)
  SELECT * FROM idempotency_keys
  return cached_response
}
```

- Detecta cuando otro request ganó la carrera
- Espera a que termine de procesar
- Devuelve el resultado del ganador

### 4. JSONB para flexibilidad

```sql
request_body JSONB
response_body JSONB
```

- Guarda cualquier estructura JSON
- No necesitas columnas específicas
- Flexible para diferentes tipos de requests

---

## Conceptos clave dominados

✅ **Idempotency-Key** - Header que identifica operación única  
✅ **Deduplicación** - Evitar procesar duplicados  
✅ **UNIQUE constraint** - Garantía de unicidad en DB  
✅ **Tabla de control** - Guardar request + response  
✅ **At-least-once** - Cliente puede reintentar sin miedo  
✅ **JSONB** - Almacenamiento flexible de datos  
✅ **Race conditions** - Manejo de requests simultáneos  
✅ **Retry logic** - Esperar y reintentar en caso de conflicto

---

## Lecciones aprendidas

### 1. Idempotencia NO es gratis
- Requiere tabla extra
- Requiere lógica adicional
- Requiere manejo de race conditions

### 2. UNIQUE constraint es tu amigo
- Garantiza unicidad a nivel de DB
- Detecta duplicados automáticamente
- Más confiable que checks en código

### 3. Race conditions son reales
- Requests simultáneos pueden pasar el check
- Necesitas manejo de errores robusto
- Insertar key primero ayuda

### 4. Idempotencia es crítica en producción
- Usuarios reintentan
- Redes fallan
- APIs reintentan automáticamente
- Sin idempotencia = duplicados garantizados

---

## Comparación con Kata 1

| Aspecto | Kata 1 (Transacciones) | Kata 2 (Idempotencia) |
|---------|------------------------|------------------------|
| **Problema** | Consistencia interna | Duplicados externos |
| **Solución** | BEGIN/COMMIT/ROLLBACK | Idempotency-Key |
| **Scope** | Dentro de 1 request | Entre múltiples requests |
| **Tabla extra** | No | Sí (idempotency_keys) |
| **Uso** | Siempre | APIs críticas |

---

## Siguiente paso

**Kata 3: Message Queues + Workers**
- Procesar trabajos en background
- Reintentos automáticos
- Dead Letter Queue
- Idempotencia en workers (combinar Kata 1 + 2)
