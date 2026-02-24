# Kata 7: Observabilidad - Logs, Métricas y Tracing

## Objetivo

Implementar observabilidad completa con logs estructurados, correlation IDs para tracing distribuido, y métricas de rendimiento.

## Conceptos Clave

- **Logs estructurados (JSON)** - Fáciles de parsear y buscar
- **Correlation ID** - Seguir requests a través de servicios
- **Métricas** - Latencia (p50/p95/p99), tasa de errores
- **Tracing distribuido** - Ver flujo completo de un request

## Arquitectura

```
Cliente → API → Redis Queue → Worker
          ↓         ↓            ↓
     [Logs con correlation-id]
     [Métricas: latencia, errores]
```

## Setup

### 1. Instalar dependencias

```bash
# API
cd api
npm install

# Worker
cd worker
npm install
```

### 2. Iniciar servicios (3 terminales)

**Terminal 1: API**
```bash
cd api
node server.js
```

**Terminal 2: Worker**
```bash
cd worker
node worker.js
```

**Terminal 3: Pruebas**

## Experimentos

### Experimento 1: Logs Estructurados

```bash
# Crear orden
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{"customerId": 1, "amount": 100}'
```

**Observar en Terminal 1 (API) y Terminal 2 (Worker):**
- Logs en formato JSON
- Campos: timestamp, level, service, message, correlationId

**Resultado esperado:**
```json
{
  "timestamp": "2026-02-24T14:45:36.453Z",
  "level": "INFO",
  "service": "api",
  "message": "Request received",
  "correlationId": "fa601513-475f-4fb7-bfd8-0f1c05f63d37"
}
```

---

### Experimento 2: Tracing Distribuido

```bash
# Request con correlation-id personalizado
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -H "x-correlation-id: my-trace-001" \
  -d '{"customerId": 2, "amount": 200}'
```

**Buscar en logs:**
```bash
# En Terminal 1 (API)
grep "my-trace-001"

# En Terminal 2 (Worker)
grep "my-trace-001"
```

**Resultado esperado:**
- Mismo correlation-id aparece en API y Worker
- Puedes seguir el request completo

---

### Experimento 3: Métricas de Rendimiento

```bash
# Generar 50 requests
for i in {1..50}; do
  curl -X POST http://localhost:3000/orders \
    -H "Content-Type: application/json" \
    -d "{\"customerId\": $i, \"amount\": 100}" &
done
wait

# Ver métricas
curl http://localhost:3000/metrics | jq
```

**Resultado esperado:**
```json
{
  "totalRequests": 50,
  "totalErrors": 5,
  "errorRate": "10.00%",
  "latency": {
    "p50": "71ms",
    "p95": "99ms",
    "p99": "113ms",
    "avg": "67ms"
  }
}
```

---

### Experimento 4: Buscar Errores

```bash
# Generar requests (algunos fallarán)
for i in {1..20}; do
  curl -X POST http://localhost:3000/orders \
    -H "Content-Type: application/json" \
    -d '{"customerId": 1, "amount": 100}'
done
```

**Buscar errores en logs:**
```bash
# En Terminal 1
grep '"level":"ERROR"'
```

**Resultado esperado:**
```json
{
  "level": "ERROR",
  "message": "Error creating order",
  "correlationId": "...",
  "error": "Database timeout",
  "stack": "..."
}
```

---

## Componentes

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

### 2. Correlation Middleware

```javascript
function correlationMiddleware(req, res, next) {
    const correlationId = req.headers['x-correlation-id'] || uuidv4();
    req.correlationId = correlationId;
    res.setHeader('x-correlation-id', correlationId);
    next();
}
```

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

---

## Métricas Importantes

### Latencia (Percentiles)

- **p50 (mediana):** 50% de requests tardaron menos
- **p95:** 95% de requests tardaron menos
- **p99:** 99% de requests tardaron menos

### Tasa de Errores

```
errorRate = (totalErrors / totalRequests) * 100
```

---

## Ventajas

✅ **Debugging rápido** - Logs estructurados fáciles de buscar  
✅ **Tracing distribuido** - Seguir requests entre servicios  
✅ **Métricas en tiempo real** - Detectar problemas antes que usuarios  
✅ **No invasivo** - Middleware no modifica lógica de negocio  
✅ **Producción-ready** - Estándar en sistemas reales

---

## Herramientas Recomendadas

### Logs
- Elasticsearch + Kibana
- Splunk
- CloudWatch Logs

### Métricas
- Prometheus + Grafana
- Datadog
- CloudWatch Metrics

### Tracing
- Jaeger
- Zipkin
- AWS X-Ray

---

## Conclusiones

Ver `docs/analisis.md` para análisis detallado de experimentos.
