# Kata 3: Message Queues + Workers

## Fecha
20/02/2026

## Lenguaje
Node.js + PostgreSQL + Redis

## ¿Qué construí?
Un sistema Producer-Consumer con API que encola trabajos y Workers que procesan en background.

## Problema que resuelve

### Sin Message Queue ❌
```
Cliente → API → Procesa (2 segundos) → Responde
  ↓
Cliente espera 2 segundos
API bloqueada durante procesamiento
```

### Con Message Queue ✅
```
Cliente → API → Encola → Responde inmediato (202)
                  ↓
              Worker procesa en background
  ↓
Cliente NO espera
API responde rápido
```

## Arquitectura

```
┌─────────┐      ┌─────────┐      ┌───────────┐      ┌──────────┐
│ Cliente │─────▶│   API   │─────▶│   Redis   │◀────▶│  Worker  │
└─────────┘      │Producer │      │   Queue   │      │ Consumer │
                 └─────────┘      └───────────┘      └──────────┘
                      │                                     │
                      ▼                                     ▼
                 ┌──────────────────────────────────────────┐
                 │           PostgreSQL                      │
                 │  - orders (status: pending/completed)    │
                 │  - jobs (tracking)                       │
                 └──────────────────────────────────────────┘
```

## Conceptos aprendidos

### 1. Producer-Consumer Pattern

**Producer (API):**
- Recibe requests
- Crea orden en DB
- Encola trabajo en Redis
- Responde 202 Accepted (inmediato)

**Consumer (Worker):**
- Lee de la cola (BLPOP)
- Procesa trabajo
- Actualiza DB
- Espera siguiente trabajo

### 2. Message Queue (Redis)

**¿Por qué Redis?**
- Simple de usar
- Rápido (en memoria)
- BLPOP eficiente (no consume CPU)
- Soporta múltiples consumers

**Comandos clave:**
```javascript
LPUSH 'orders:queue' job  // Producer encola
BLPOP 'orders:queue' 0    // Consumer espera y consume
```

### 3. Respuesta asíncrona (202 Accepted)

```javascript
res.statusCode = 202;
res.end(JSON.stringify({
    message: 'Orden recibida y en proceso',
    orderId: 1,
    status: 'pending'
}));
```

**Significado:**
- 202 = Accepted (no 200 OK)
- "Tu request fue aceptado, se procesará después"
- Cliente puede consultar status después

### 4. BLPOP (Blocking Pop)

```javascript
await redisClient.blPop('orders:queue', 0);
```

**Ventajas:**
- Bloquea hasta que haya mensaje
- NO consume CPU (eficiente)
- `0` = esperar indefinidamente

**vs Polling:**
```javascript
// ❌ Polling (ineficiente)
while (true) {
    const job = await redis.get('queue');
    if (!job) await sleep(100); // Consume CPU
}

// ✅ BLPOP (eficiente)
const job = await redis.blPop('queue', 0); // No consume CPU
```

### 5. Escalabilidad horizontal

**1 Worker:**
```
10 jobs × 2s = 20 segundos
```

**4 Workers:**
```
10 jobs ÷ 4 workers × 2s = ~6 segundos
```

**Distribución automática:**
- Redis reparte trabajos entre workers
- Cada worker toma el siguiente disponible
- Sin configuración adicional

## Experimentos realizados

### Experimento 1: API responde rápido

**Request:**
```bash
POST /orders
Body: {"product": "Laptop", "quantity": 1, "price": 1200}
```

**Resultado:**
- API responde inmediatamente (202)
- Worker procesa en 2 segundos
- Cliente NO espera

**Conclusión:** API desacoplada del procesamiento

---

### Experimento 2: Procesamiento secuencial (1 worker)

**Test:**
```bash
5 órdenes con 1 worker
```

**Resultado:**
- Worker procesa una por una
- Tiempo total: 10 segundos (5 × 2s)

**Logs:**
```
📨 Trabajo recibido: job-1
⚙️  Procesando job-1...
✅ Job job-1 completado
📨 Trabajo recibido: job-2
⚙️  Procesando job-2...
✅ Job job-2 completado
...
```

**Conclusión:** Cola FIFO, procesamiento secuencial

---

### Experimento 3: Escalabilidad (4 workers)

**Test:**
```bash
10 órdenes con 4 workers
```

**Resultado:**
- Tiempo total: ~6 segundos
- Cada worker procesó 2-3 jobs
- Distribución automática

**Logs (Worker 1):**
```
📨 Trabajo recibido: job-8
📨 Trabajo recibido: job-17
📨 Trabajo recibido: job-13
```

**Logs (Worker 2):**
```
📨 Trabajo recibido: job-10
📨 Trabajo recibido: job-16
📨 Trabajo recibido: job-11
```

**Conclusión:** Escalabilidad horizontal funciona

---

## Comparación de rendimiento

| Escenario | Tiempo | Throughput |
|-----------|--------|------------|
| 1 worker, 5 jobs | 10s | 0.5 jobs/s |
| 1 worker, 10 jobs | 20s | 0.5 jobs/s |
| 4 workers, 10 jobs | ~6s | 1.7 jobs/s |
| 10 workers, 10 jobs | ~2s | 5 jobs/s |

**Fórmula:**
```
Tiempo = (Total jobs ÷ Workers) × Tiempo por job
```

---

## Implementación técnica

### 1. Transacción atómica en Producer

```javascript
BEGIN
  INSERT INTO orders (status: pending)
  INSERT INTO jobs (status: queued)
  LPUSH Redis queue
COMMIT
```

**¿Por qué?**
- Si falla encolar → rollback de orden
- Garantiza consistencia

### 2. Tracking de jobs

```sql
CREATE TABLE jobs (
    job_id VARCHAR(255) UNIQUE,
    order_id INTEGER,
    status VARCHAR(20),
    attempts INTEGER,
    error_message TEXT
);
```

**Ventajas:**
- Debugging (ver qué pasó)
- Reintentos (contar attempts)
- Auditoría

### 3. Graceful shutdown

```javascript
process.on('SIGINT', async () => {
    console.log('Cerrando worker...');
    await redisClient.quit();
    await pool.end();
    process.exit(0);
});
```

**¿Por qué?**
- Termina job actual antes de cerrar
- Cierra conexiones limpiamente
- Evita jobs a medias

---

## Casos de uso reales

### 1. E-commerce
```
Usuario compra
  ↓
API: Crea orden (202)
  ↓
Worker:
  - Procesa pago
  - Envía email
  - Actualiza inventario
  - Genera factura
```

### 2. Procesamiento de imágenes
```
Usuario sube foto
  ↓
API: Guarda original (202)
  ↓
Worker:
  - Redimensiona
  - Genera thumbnails
  - Aplica filtros
  - Sube a CDN
```

### 3. Reportes
```
Usuario pide reporte
  ↓
API: Crea job (202)
  ↓
Worker:
  - Consulta millones de registros
  - Genera PDF
  - Envía por email
```

### 4. Notificaciones
```
Evento ocurre
  ↓
API: Encola notificación
  ↓
Worker:
  - Envía email
  - Envía SMS
  - Push notification
  - Webhook
```

---

## Ventajas de Message Queues

✅ **API rápida** - Responde inmediato  
✅ **Desacoplamiento** - API y Worker independientes  
✅ **Escalabilidad** - Agregar más workers  
✅ **Resiliencia** - Si worker falla, job queda en cola  
✅ **Priorización** - Colas diferentes por prioridad  
✅ **Rate limiting** - Controlar velocidad de procesamiento  
✅ **Retry** - Reintentar jobs fallidos  

---

## Desventajas / Trade-offs

❌ **Complejidad** - Más componentes (Redis, Workers)  
❌ **Eventual consistency** - Resultado no inmediato  
❌ **Debugging** - Más difícil que síncrono  
❌ **Infraestructura** - Necesitas Redis + Workers  

---

## Conceptos clave dominados

✅ **Producer-Consumer** - Patrón de arquitectura  
✅ **Message Queue** - Cola de mensajes (Redis)  
✅ **Asíncrono** - Procesamiento en background  
✅ **202 Accepted** - Respuesta para trabajos async  
✅ **BLPOP** - Espera eficiente sin polling  
✅ **Escalabilidad horizontal** - Múltiples workers  
✅ **Distribución automática** - Redis reparte trabajo  
✅ **FIFO** - First In, First Out  
✅ **Graceful shutdown** - Cerrar limpiamente  

---

## Comparación con katas anteriores

| Aspecto | Kata 1 | Kata 2 | Kata 3 |
|---------|--------|--------|--------|
| **Procesamiento** | Síncrono | Síncrono | Asíncrono |
| **Respuesta** | 200 OK | 201 Created | 202 Accepted |
| **Tiempo respuesta** | Lento | Rápido | Muy rápido |
| **Escalabilidad** | Vertical | Vertical | Horizontal |
| **Componentes** | API + DB | API + DB | API + Queue + Workers + DB |

---

## Siguiente paso

**Kata 4: Reintentos + Dead Letter Queue**

Aprenderás:
- Reintentos automáticos
- Backoff exponencial
- Dead Letter Queue (DLQ)
- Poison messages
- Idempotencia en workers (combinar Kata 2 + 3)
