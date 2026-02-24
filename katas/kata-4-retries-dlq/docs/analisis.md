# Kata 4: Reintentos y Dead Letter Queue

## Fecha
21/02/2026

## Lenguaje
Node.js + PostgreSQL + Redis

## ¿Qué construí?
Sistema de reintentos automáticos con backoff exponencial y Dead Letter Queue para jobs que fallan persistentemente.

## Problema que resuelve

### Sin reintentos ❌
```
Worker procesa job
  ↓
Fallo transitorio (DB timeout)
  ↓
Job perdido 💥
```

### Con reintentos ✅
```
Worker procesa job
  ↓
Fallo transitorio
  ↓
Reintento 1 (espera 1s)
  ↓
Reintento 2 (espera 2s)
  ↓
Reintento 3 (espera 4s)
  ↓
Éxito ✅ o DLQ ⚠️
```

## Conceptos aprendidos

### 1. **Reintentos automáticos**

**¿Por qué reintentar?**
- Fallos transitorios (red, DB timeout)
- Servicios externos caídos temporalmente
- Rate limits temporales

**¿Cuándo NO reintentar?**
- Errores de validación (400)
- Datos inválidos
- Errores de lógica

### 2. **Exponential Backoff**

```javascript
function calculateBackoff(attempt) {
    return Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s, 8s...
}
```

**¿Por qué exponencial?**
- Evita sobrecargar sistema fallido
- Da tiempo a recuperarse
- Reduce carga en la cola

**vs Linear:**
```
Linear:     1s, 2s, 3s, 4s (predecible)
Exponencial: 1s, 2s, 4s, 8s (más espacio)
```

### 3. **Dead Letter Queue (DLQ)**

**¿Qué es?**
- Cola para jobs que fallaron múltiples veces
- Permite inspección manual
- Evita reintentos infinitos

**Flujo:**
```
Job falla 3 veces
  ↓
Mover a DLQ
  ↓
Alertar equipo
  ↓
Investigar y corregir
  ↓
Reprocesar manualmente
```

### 4. **Poison Messages**

**¿Qué son?**
- Mensajes que siempre fallan
- Bloquean la cola
- Consumen recursos

**Ejemplo:**
```json
{
  "orderId": null,  // ❌ Siempre falla validación
  "amount": -100    // ❌ Siempre falla constraint
}
```

**Solución:** DLQ después de N intentos

## Experimentos realizados

### Experimento 1: Job con fallos transitorios

**Setup:**
- Simular fallo 50% probabilidad
- Max 3 reintentos

**Request:**
```bash
POST /jobs
Body: {"orderId": 1, "action": "process"}
```

**Resultado observado:**
```
📨 Trabajo recibido: job-1
⚙️  Procesando job-1...
❌ Error procesando job-1 (intento 1/3)
⏱️  Esperando 1000ms antes de reintentar...

⚙️  Procesando job-1...
❌ Error procesando job-1 (intento 2/3)
⏱️  Esperando 2000ms antes de reintentar...

⚙️  Procesando job-1...
✅ Job job-1 completado (intento 3/3)
```

**Conclusión:** Sistema se recuperó automáticamente de fallos transitorios

---

### Experimento 2: Job que falla persistentemente

**Setup:**
- Simular fallo 100% (poison message)
- Max 3 reintentos

**Request:**
```bash
POST /jobs
Body: {"orderId": null, "action": "invalid"}
```

**Resultado:**
```
📨 Trabajo recibido: job-2
⚙️  Procesando job-2...
❌ Error (intento 1/3)
⏱️  Esperando 1000ms...

⚙️  Procesando job-2...
❌ Error (intento 2/3)
⏱️  Esperando 2000ms...

⚙️  Procesando job-2...
❌ Error (intento 3/3)
💀 Job job-2 movido a DLQ después de 3 intentos
```

**Verificación DLQ:**
```bash
redis-cli LLEN dlq
# Output: 1

redis-cli LRANGE dlq 0 -1
# Output: {"jobId":"job-2","orderId":null,"attempts":3}
```

**Conclusión:** Jobs problemáticos no bloquean la cola

---

### Experimento 3: Múltiples jobs con mix de éxitos/fallos

**Test:**
```bash
# Encolar 5 jobs
for i in {1..5}; do
  curl -X POST http://localhost:3000/jobs \
    -d "{\"orderId\": $i, \"action\": \"process\"}"
done
```

**Resultado:**
- 3 jobs completados después de 1-2 reintentos
- 2 jobs movidos a DLQ
- Cola principal vacía
- Sistema sigue procesando

**Conclusión:** Sistema resiliente ante mix de fallos

---

## Implementación técnica

### 1. Tracking de intentos

```javascript
let attempts = 0;
const maxAttempts = 3;

while (attempts < maxAttempts) {
    try {
        await processJob(job);
        break; // Éxito
    } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
            await moveToDLQ(job, attempts);
        } else {
            const backoff = calculateBackoff(attempts);
            await sleep(backoff);
        }
    }
}
```

### 2. Backoff exponencial con jitter

```javascript
function calculateBackoff(attempt) {
    const base = Math.pow(2, attempt - 1) * 1000;
    const jitter = Math.random() * 1000; // 0-1s aleatorio
    return base + jitter;
}
```

**¿Por qué jitter?**
- Evita "thundering herd" (todos reintentan al mismo tiempo)
- Distribuye carga
- Más realista

### 3. DLQ con metadata

```javascript
await redisClient.rPush('dlq', JSON.stringify({
    jobId: job.jobId,
    orderId: job.orderId,
    attempts: attempts,
    lastError: error.message,
    timestamp: new Date().toISOString()
}));
```

**Metadata útil:**
- Cuántos intentos
- Último error
- Timestamp
- Payload original

### 4. Actualizar DB

```javascript
await pool.query(
    'UPDATE jobs SET status = $1, attempts = $2, error_message = $3 WHERE job_id = $4',
    ['failed', attempts, error.message, jobId]
);
```

**Ventajas:**
- Auditoría completa
- Debugging
- Métricas (tasa de fallos)

---

## Casos de uso reales

### 1. Llamadas a APIs externas

```
Worker llama API de pago
  ↓
API timeout (red lenta)
  ↓
Reintento 1: Éxito ✅
```

### 2. DB temporalmente caída

```
Worker actualiza DB
  ↓
DB en mantenimiento
  ↓
Reintento después de 2s: Éxito ✅
```

### 3. Rate limiting

```
Worker llama API (100 req/min)
  ↓
429 Too Many Requests
  ↓
Reintento después de 4s: Éxito ✅
```

### 4. Datos inválidos (DLQ)

```
Worker procesa orden
  ↓
customerId null (siempre falla)
  ↓
3 reintentos fallan
  ↓
DLQ → Investigación manual
```

---

## Estrategias de reintentos

### 1. **Exponential Backoff**
```
1s, 2s, 4s, 8s, 16s...
```
✅ Mejor para fallos transitorios  
✅ Da tiempo a recuperarse

### 2. **Linear Backoff**
```
1s, 2s, 3s, 4s, 5s...
```
✅ Más predecible  
❌ Puede sobrecargar

### 3. **Fixed Backoff**
```
5s, 5s, 5s, 5s...
```
✅ Simple  
❌ No se adapta

### 4. **Exponential + Jitter**
```
1s + random(0-1s)
2s + random(0-1s)
4s + random(0-1s)
```
✅ Evita thundering herd  
✅ Distribuye carga

---

## Métricas importantes

### 1. **Tasa de reintentos**
```
Reintentos / Total jobs
```
- Alta → Problema sistémico
- Baja → Fallos transitorios normales

### 2. **Jobs en DLQ**
```
LLEN dlq
```
- Creciendo → Investigar
- Estable → Normal

### 3. **Tiempo promedio de procesamiento**
```
Incluye reintentos
```
- Aumentando → Sistema degradado

### 4. **Distribución de intentos**
```
Intento 1: 70%
Intento 2: 20%
Intento 3: 8%
DLQ: 2%
```

---

## Conceptos clave dominados

✅ **Reintentos automáticos** - Recuperación de fallos transitorios  
✅ **Exponential backoff** - Espera creciente entre reintentos  
✅ **Jitter** - Aleatorización para evitar thundering herd  
✅ **Dead Letter Queue** - Cola para jobs problemáticos  
✅ **Poison messages** - Mensajes que siempre fallan  
✅ **Max attempts** - Límite de reintentos  
✅ **Graceful degradation** - Sistema sigue funcionando con fallos  
✅ **Metadata tracking** - Auditoría de fallos

---

## Comparación con Kata 3

| Aspecto | Kata 3 | Kata 4 |
|---------|--------|--------|
| **Fallos** | Job se pierde | Reintentos automáticos |
| **Poison messages** | Bloquean cola | Van a DLQ |
| **Resiliencia** | Baja | Alta |
| **Complejidad** | Simple | Media |
| **Producción** | No recomendado | Recomendado |

---

## Lecciones aprendidas

### 1. **Reintentos son críticos**
- Fallos transitorios son comunes
- Sin reintentos = pérdida de datos
- Con reintentos = sistema resiliente

### 2. **DLQ es necesaria**
- Evita reintentos infinitos
- Permite inspección manual
- Alertas para equipo

### 3. **Backoff exponencial > linear**
- Da tiempo a recuperarse
- Reduce carga
- Más efectivo

### 4. **Jitter es importante**
- Evita picos de carga
- Distribuye reintentos
- Más estable

---

## Siguiente paso

**Kata 5: Sagas y Transacciones Distribuidas**

Aprenderás:
- Coordinar múltiples servicios
- Compensación (rollback distribuido)
- Consistencia eventual
- Orquestación vs coreografía
