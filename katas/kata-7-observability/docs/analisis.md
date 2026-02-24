# Kata 7: Observabilidad - Logs, Métricas y Tracing

## Fecha
24/02/2026

## Lenguaje
Node.js + Redis

## ¿Qué construí?
Sistema con observabilidad completa: logs estructurados en JSON, correlation IDs para tracing distribuido, y métricas de rendimiento.

## Problema que resuelve

### Sin observabilidad ❌
```
Sistema falla
  ↓
¿Qué pasó? No sé
¿Dónde falló? No sé
¿Cuánto tardó? No sé
  ↓
Debugging imposible 💥
```

### Con observabilidad ✅
```
Sistema falla
  ↓
Logs: "Database timeout" en API
Correlation ID: "abc-123"
  ↓
Buscar "abc-123" en Worker
  ↓
Ver flujo completo del request
Métricas: p99 = 113ms, errorRate = 3.77%
  ↓
Debugging rápido ✅
```

## Experimentos Realizados

### Experimento 1: Logs Estructurados

**Request:**
```bash
POST /orders {"customerId": 1, "amount": 100}
```

**Logs en API:**
```json
{
  "timestamp": "2026-02-24T14:45:36.453Z",
  "level": "INFO",
  "service": "api",
  "message": "Request received",
  "correlationId": "fa601513-475f-4fb7-bfd8-0f1c05f63d37",
  "method": "POST",
  "path": "/orders",
  "ip": "::1"
}
```

**Logs en Worker:**
```json
{
  "timestamp": "2026-02-24T14:45:36.536Z",
  "level": "INFO",
  "service": "worker",
  "message": "Processing order",
  "correlationId": "fa601513-475f-4fb7-bfd8-0f1c05f63d37",
  "orderId": 1771944336532,
  "amount": 100
}
```

**Conclusión:** Logs en formato JSON son fáciles de parsear y buscar.

---

### Experimento 2: Tracing Distribuido con Correlation ID

**Request con correlation-id personalizado:**
```bash
POST /orders
Header: x-correlation-id: my-trace-001
Body: {"customerId": 2, "amount": 200}
```

**Flujo completo rastreado:**

1. **API - Request received**
   - `correlationId: "my-trace-001"`
   - `message: "Request received"`

2. **API - Creating order**
   - `correlationId: "my-trace-001"`
   - `customerId: 2, amount: 200`

3. **API - Order created and queued**
   - `correlationId: "my-trace-001"`
   - `orderId: 1771944383772`

4. **Worker - Processing order**
   - `correlationId: "my-trace-001"`
   - `orderId: 1771944383772`

5. **Worker - Order processed successfully**
   - `correlationId: "my-trace-001"`
   - `status: "completed"`

**Conclusión:** Mismo correlation-id viaja a través de API → Queue → Worker, permitiendo tracing completo.

---

### Experimento 3: Métricas de Rendimiento

**Test:**
```bash
# 50 requests concurrentes
for i in {1..50}; do
  POST /orders &
done
```

**Métricas capturadas:**
```json
{
  "totalRequests": 53,
  "totalErrors": 2,
  "errorRate": "3.77%",
  "latency": {
    "p50": "71ms",
    "p95": "99ms",
    "p99": "113ms",
    "avg": "67ms"
  }
}
```

**Análisis:**
- **p50 (mediana):** 71ms - La mitad de requests tardaron menos
- **p95:** 99ms - 95% de requests tardaron menos
- **p99:** 113ms - 99% de requests tardaron menos
- **avg:** 67ms - Promedio
- **errorRate:** 3.77% - 2 de 53 requests fallaron

**Conclusión:** Métricas revelan rendimiento real del sistema.

---

### Experimento 4: Buscar Errores en Logs

**Test:**
```bash
# 20 requests (algunos fallarán por simulación)
for i in {1..20}; do
  POST /orders
done
```

**Errores encontrados:**
```json
{
  "timestamp": "2026-02-24T14:47:13.650Z",
  "level": "ERROR",
  "service": "api",
  "message": "Error creating order",
  "correlationId": "abdfc1b0-6364-4266-9129-b10a5e6d6cc8",
  "error": "Database timeout",
  "stack": "Error: Database timeout\n    at /home/.../server.js:46:19"
}
```

**Información capturada:**
- ✅ Timestamp exacto
- ✅ Correlation ID para rastrear
- ✅ Mensaje de error
- ✅ Stack trace completo
- ✅ Servicio que falló

**Conclusión:** Errores son rastreables y debuggeables.

---

## Conceptos Clave Aprendidos

### 1. Logs Estructurados (JSON)

**vs Logs de texto:**
```
// ❌ Texto (difícil de parsear)
"2026-02-24 14:45:36 INFO Request received POST /orders"

// ✅ JSON (fácil de parsear)
{
  "timestamp": "2026-02-24T14:45:36.453Z",
  "level": "INFO",
  "message": "Request received",
  "method": "POST",
  "path": "/orders"
}
```

**Ventajas:**
- Fácil de buscar: `grep '"level":"ERROR"'`
- Fácil de parsear: `jq '.correlationId'`
- Fácil de indexar en herramientas (Elasticsearch, Splunk)

### 2. Correlation ID

**¿Qué es?**
- Identificador único que viaja con el request
- Permite seguir el flujo a través de múltiples servicios

**Implementación:**
```javascript
// Middleware
const correlationId = req.headers['x-correlation-id'] || uuidv4();
req.correlationId = correlationId;
res.setHeader('x-correlation-id', correlationId);
```

**Uso:**
```javascript
logger.info('Creating order', {
  correlationId: req.correlationId,
  customerId: req.body.customerId
});
```

### 3. Métricas de Latencia

**Percentiles (más útiles que promedio):**

```
p50 (mediana): 50% de requests tardaron menos
p95: 95% de requests tardaron menos
p99: 99% de requests tardaron menos
```

**¿Por qué percentiles?**

Ejemplo con 10 requests:
```
Latencias: 10ms, 10ms, 10ms, 10ms, 10ms, 10ms, 10ms, 10ms, 10ms, 1000ms

Promedio: 109ms (engañoso)
p50: 10ms (realidad para mayoría)
p99: 1000ms (detecta outliers)
```

**Implementación:**
```javascript
const sorted = latencies.sort((a, b) => a - b);
const p95 = sorted[Math.floor(sorted.length * 0.95)];
```

### 4. Tasa de Errores

```javascript
errorRate = (totalErrors / totalRequests) * 100
```

**Útil para:**
- Detectar degradación del sistema
- Alertas automáticas
- SLOs (Service Level Objectives)

### 5. Middleware Pattern

**Ventaja:** Observabilidad sin modificar lógica de negocio

```javascript
// Middleware de correlation ID
app.use(correlationMiddleware);

// Middleware de métricas
app.use(metricsMiddleware);

// Middleware de logging
app.use(loggingMiddleware);

// Lógica de negocio (sin cambios)
app.post('/orders', handler);
```

---

## Comparación: Con vs Sin Observabilidad

| Aspecto | Sin Observabilidad | Con Observabilidad |
|---------|-------------------|-------------------|
| **Debugging** | Imposible | Rápido |
| **Tiempo de resolución** | Horas/días | Minutos |
| **Detección de problemas** | Usuarios reportan | Métricas alertan |
| **Rastreo de requests** | No | Correlation ID |
| **Análisis de rendimiento** | No | Percentiles |
| **Búsqueda de errores** | Difícil | `grep '"level":"ERROR"'` |

---

## Casos de Uso Reales

### 1. Usuario reporta: "Mi orden no se procesó"

**Sin observabilidad:**
```
¿Qué orden? No sé
¿Cuándo? No sé
¿Qué pasó? No sé
```

**Con observabilidad:**
```
1. Usuario da orderId: 1771944336532
2. Buscar en logs: grep "1771944336532"
3. Ver correlation-id: fa601513-475f-4fb7-bfd8-0f1c05f63d37
4. Buscar en worker: grep "fa601513"
5. Ver: "Order processed successfully"
6. Conclusión: Orden SÍ se procesó
```

### 2. Sistema lento

**Sin observabilidad:**
```
¿Qué endpoint? No sé
¿Cuánto tarda? No sé
```

**Con observabilidad:**
```
GET /metrics
{
  "latency": {
    "p50": "71ms",
    "p95": "99ms",
    "p99": "2000ms"  ← Problema aquí
  }
}

Buscar requests > 1000ms
Identificar patrón
Optimizar
```

### 3. Tasa de errores aumenta

**Sin observabilidad:**
```
¿Qué errores? No sé
¿Desde cuándo? No sé
```

**Con observabilidad:**
```
Alerta: errorRate > 5%
Buscar: grep '"level":"ERROR"'
Ver patrón: "Database timeout"
Conclusión: DB sobrecargada
Acción: Escalar DB
```

---

## Herramientas de Observabilidad

### Logs
- **Elasticsearch + Kibana** - Búsqueda y visualización
- **Splunk** - Análisis de logs
- **CloudWatch Logs** - AWS
- **Datadog** - SaaS

### Métricas
- **Prometheus** - Recolección de métricas
- **Grafana** - Visualización
- **CloudWatch Metrics** - AWS
- **Datadog** - SaaS

### Tracing
- **Jaeger** - Tracing distribuido
- **Zipkin** - Tracing distribuido
- **AWS X-Ray** - AWS
- **Datadog APM** - SaaS

---

## Implementación Técnica

### 1. Logger Estructurado

```javascript
class Logger {
    log(level, message, meta = {}) {
        console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            level,
            service: this.service,
            message,
            ...meta
        }));
    }
}
```

**Ventajas:**
- Consistente
- Fácil de parsear
- Incluye metadata

### 2. Correlation Middleware

```javascript
function correlationMiddleware(req, res, next) {
    const correlationId = req.headers['x-correlation-id'] || uuidv4();
    req.correlationId = correlationId;
    res.setHeader('x-correlation-id', correlationId);
    next();
}
```

**Ventajas:**
- Automático
- No invasivo
- Viaja en headers

### 3. Metrics Middleware

```javascript
function metricsMiddleware(req, res, next) {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        metrics.latencies.push(duration);
        
        if (res.statusCode >= 400) {
            metrics.errors++;
        }
    });
    
    next();
}
```

**Ventajas:**
- Captura automática
- No bloquea requests
- Métricas en tiempo real

---

## Conceptos Dominados

✅ **Logs estructurados (JSON)** - Fáciles de parsear  
✅ **Correlation ID** - Tracing distribuido  
✅ **Métricas de latencia** - p50, p95, p99  
✅ **Tasa de errores** - Detectar degradación  
✅ **Middleware pattern** - Observabilidad no invasiva  
✅ **Percentiles** - Más útiles que promedio  
✅ **Stack traces** - Debugging rápido  
✅ **Timestamp ISO** - Estándar internacional

---

## Lecciones Aprendidas

### 1. Observabilidad NO es opcional
- Sin logs: debugging imposible
- Sin métricas: no sabes si sistema está sano
- Sin tracing: no puedes seguir requests

### 2. JSON > Texto
- Fácil de parsear
- Fácil de buscar
- Fácil de indexar

### 3. Correlation ID es crítico
- Permite seguir requests
- Esencial en microservicios
- Debe viajar en headers

### 4. Percentiles > Promedio
- p99 detecta outliers
- Promedio oculta problemas
- p95/p99 son estándar en SLOs

### 5. Middleware es tu amigo
- Observabilidad sin modificar código
- Consistente en toda la app
- Fácil de mantener

---

## Comparación con Katas Anteriores

| Aspecto | Kata 6 (Resiliencia) | Kata 7 (Observabilidad) |
|---------|----------------------|-------------------------|
| **Objetivo** | Sobrevivir a fallos | Entender qué pasa |
| **Herramientas** | Circuit breaker, timeouts | Logs, métricas, tracing |
| **Cuándo usar** | Siempre | Siempre |
| **Complemento** | Sí - se usan juntos | Sí - se usan juntos |

**Ejemplo combinado:**
```javascript
// Circuit breaker (Kata 6)
const result = await circuitBreaker.execute(fn);

// Observabilidad (Kata 7)
logger.info('Circuit breaker executed', {
  correlationId,
  state: circuitBreaker.state,
  duration: Date.now() - start
});
```

---

## Siguiente Paso

**Kata 8: Seguridad**

Aprenderás:
- Autenticación (JWT)
- Autorización (roles)
- Rate limiting
- Input validation
- Secret management
