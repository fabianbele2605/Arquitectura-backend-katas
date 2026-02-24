# Kata 6: Resiliencia - Circuit Breaker

## Fecha
24/02/2026

## Lenguaje
Node.js + Express

## ¿Qué construí?
Sistema con Circuit Breaker para proteger contra fallos de servicios externos (Payment API).

## Problema que resuelve

### Sin Circuit Breaker ❌
```
100 requests → Servicio caído
  ↓
100 × 2s timeout = 200 segundos esperando
  ↓
Sistema colapsado 💥
```

### Con Circuit Breaker ✅
```
3 requests × 2s = 6s (detecta fallo)
  ↓
Circuit breaker se abre
  ↓
97 requests × 0.01s = 1s (fallo inmediato)
  ↓
Total: 7 segundos ✅
```

## Arquitectura

```
Cliente → API → [Circuit Breaker] → Payment Service
                      ↓
                   Estados:
                   - CLOSED (normal)
                   - OPEN (bloqueado)
                   - HALF_OPEN (probando)
```

## Experimentos Realizados

### Experimento 1: Sistema Normal

**Request:**
```bash
POST /orders {"amount": 100}
```

**Resultado:**
- ✅ Orden creada exitosamente
- ✅ Pago procesado
- Circuit breaker: `CLOSED`
- `failureCount: 0`
- Latencia: ~100ms

**Conclusión:** Sistema funcionando normalmente.

---

### Experimento 2: Provocar Fallos (Abrir Circuit Breaker)

**Setup:**
```bash
# Activar modo fallo en Payment API
POST /admin/fail

# Hacer 3 requests
for i in {1..3}; do
  POST /orders {"amount": 100}
done
```

**Resultado:**
```
Request 1: {"error": "Timeout"} (2 segundos)
Request 2: {"error": "Timeout"} (2 segundos)
Request 3: {"error": "Timeout"} (2 segundos)

Circuit breaker: CLOSED → OPEN
failureCount: 3
```

**Log del servidor:**
```
🔴 Circuit breaker: OPEN (bloqueado por 10000ms)
```

**Conclusión:** Después de 3 fallos consecutivos, el circuit breaker se abre automáticamente.

---

### Experimento 3: Fallo Inmediato (Fail Fast)

**Request:**
```bash
time POST /orders {"amount": 100}
```

**Resultado:**
```json
{
  "error": "Payment service unavailable",
  "fallback": "Order saved, payment will be processed later"
}
```

**Tiempo:** **0.008 segundos** (vs 2 segundos de timeout)

**Conclusión:** 
- Circuit breaker bloqueó el request SIN intentar llamar al servicio
- Respuesta inmediata con fallback
- Sistema no desperdicia recursos esperando servicio caído

---

### Experimento 4: Recuperación Automática

**Setup:**
```bash
# Recuperar Payment API
POST /admin/recover

# Esperar 10 segundos
sleep 10

# Hacer 2 requests exitosos
for i in {1..2}; do
  POST /orders {"amount": 100}
done
```

**Resultado:**
```
Request 1: {"success": true, "order": {...}, "payment": {...}}
Request 2: {"success": true, "order": {...}, "payment": {...}}

Circuit breaker: OPEN → HALF_OPEN → CLOSED
failureCount: 0
successCount: 0
```

**Logs del servidor:**
```
🔄 Circuit breaker: HALF_OPEN (probando)
✅ Circuit breaker: CLOSED (recuperado)
```

**Conclusión:** 
- Después de 10s, circuit breaker probó automáticamente
- 2 requests exitosos → Sistema completamente recuperado
- No requiere intervención manual

---

## Conceptos Clave Aprendidos

### 1. Circuit Breaker States

```
┌─────────┐
│ CLOSED  │ ← Estado normal
└────┬────┘
     │ 3 fallos (failureThreshold)
     ↓
┌─────────┐
│  OPEN   │ ← Bloqueado, falla inmediato
└────┬────┘
     │ 10 segundos (resetTimeout)
     ↓
┌──────────┐
│HALF_OPEN │ ← Probando recuperación
└────┬────┘
     │ 2 éxitos (successThreshold)
     ↓
┌─────────┐
│ CLOSED  │ ← Recuperado
└─────────┘
```

### 2. Timeouts

**Sin timeout:**
```javascript
await fetch(url); // Espera infinita si servicio cuelga
```

**Con timeout:**
```javascript
Promise.race([
    fetch(url),
    timeout(2000) // Falla después de 2s
]);
```

**Ventaja:** Libera recursos, no bloquea sistema.

### 3. Fail Fast

**Problema sin circuit breaker:**
- Cada request espera timeout completo
- Recursos bloqueados (conexiones, memoria)
- Sistema se degrada

**Solución con circuit breaker:**
- Detecta patrón de fallos
- Falla inmediatamente
- Protege recursos

### 4. Fallback

**Estrategias:**
```javascript
// 1. Respuesta default
return { status: 'pending', message: 'Processing...' };

// 2. Cache
return cachedData || defaultData;

// 3. Degraded mode
return { features: ['basic'], premium: false };

// 4. Queue para después
await queue.push(request);
return { status: 'queued' };
```

### 5. Configuración

```javascript
{
    failureThreshold: 3,    // Fallos para abrir
    successThreshold: 2,    // Éxitos para cerrar
    timeout: 2000,          // Timeout por request
    resetTimeout: 10000     // Tiempo antes de probar
}
```

**Ajustar según:**
- Criticidad del servicio
- Latencia esperada
- Tasa de fallos aceptable
- Tiempo de recuperación típico

---

## Comparación: Con vs Sin Circuit Breaker

| Aspecto | Sin Circuit Breaker | Con Circuit Breaker |
|---------|---------------------|---------------------|
| **Detección de fallos** | Manual | Automática |
| **Tiempo de respuesta** | 2s timeout × N requests | 0.01s después de detectar |
| **Recursos bloqueados** | Alto | Bajo |
| **Recuperación** | Manual | Automática |
| **Fallback** | No | Sí |
| **Observabilidad** | No | Estado visible |

---

## Casos de Uso Reales

### 1. E-commerce: API de pagos externa

**Escenario:**
- Stripe/PayPal caído temporalmente
- 1000 requests/minuto

**Sin circuit breaker:**
```
1000 requests × 5s timeout = 5000s de recursos bloqueados
Sistema colapsa
```

**Con circuit breaker:**
```
5 requests × 5s = 25s (detecta fallo)
995 requests × 0.01s = 10s (fallo inmediato)
Total: 35s
Sistema sigue funcionando
```

**Fallback:**
- Guardar orden sin pago
- Worker procesa pagos después
- Usuario recibe confirmación

### 2. Microservicios: Servicio de inventario lento

**Escenario:**
- Inventario tiene latencia alta (DB sobrecargada)
- Afecta checkout

**Con circuit breaker:**
```
Timeout: 1s (vs 30s default)
Circuit breaker se abre después de 5 fallos
Fallback: Asumir stock disponible
Orden se crea, inventario se valida después
```

### 3. APIs externas: Servicio de geolocalización

**Escenario:**
- API de Google Maps caída
- Necesario para calcular envío

**Con circuit breaker:**
```
Circuit breaker detecta fallo
Fallback: Usar última ubicación conocida
O: Pedir al usuario que ingrese manualmente
Sistema no se bloquea
```

---

## Implementación Técnica

### 1. Timeout con Promise.race

```javascript
async callWithTimeout(fn) {
    return Promise.race([
        fn(),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), this.timeout)
        )
    ]);
}
```

**¿Por qué Promise.race?**
- Resuelve con la primera promesa que termina
- Si timeout termina primero → Error
- Si función termina primero → Resultado

### 2. Tracking de fallos

```javascript
onFailure() {
    this.failureCount++;
    
    if (this.failureCount >= this.failureThreshold) {
        this.state = 'OPEN';
        this.nextAttempt = Date.now() + this.resetTimeout;
    }
}
```

### 3. Recuperación automática

```javascript
if (this.state === 'OPEN') {
    if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
    }
    this.state = 'HALF_OPEN'; // Probar
}
```

### 4. Observabilidad

```javascript
app.get('/circuit-breaker/status', (req, res) => {
    res.json({
        state: breaker.state,
        failureCount: breaker.failureCount,
        successCount: breaker.successCount
    });
});
```

**Útil para:**
- Dashboards
- Alertas
- Debugging

---

## Métricas Importantes

### 1. Tasa de fallos
```
Fallos / Total requests
```
- Alta → Problema sistémico
- Baja → Fallos transitorios

### 2. Tiempo en estado OPEN
```
Tiempo total en OPEN / Tiempo total
```
- Alto → Servicio inestable
- Bajo → Fallos ocasionales

### 3. Latencia p95/p99
```
Con circuit breaker: p99 < 100ms
Sin circuit breaker: p99 > 2000ms
```

### 4. Requests bloqueados
```
Requests rechazados por circuit breaker
```
- Indica cuántos requests se salvaron de timeout

---

## Patrones Relacionados

### 1. Retry + Circuit Breaker

```javascript
// Reintentar antes de abrir circuit breaker
for (let i = 0; i < 3; i++) {
    try {
        return await circuitBreaker.execute(fn);
    } catch (error) {
        if (i === 2) throw error;
        await sleep(1000 * Math.pow(2, i));
    }
}
```

### 2. Bulkhead + Circuit Breaker

```javascript
// Aislar recursos por servicio
const paymentBreaker = new CircuitBreaker();
const inventoryBreaker = new CircuitBreaker();

// Si payment falla, inventory sigue funcionando
```

### 3. Rate Limiting + Circuit Breaker

```javascript
// Limitar requests antes de circuit breaker
if (rateLimiter.isAllowed()) {
    return await circuitBreaker.execute(fn);
}
```

---

## Conceptos Dominados

✅ **Circuit Breaker** - 3 estados (CLOSED/OPEN/HALF_OPEN)  
✅ **Timeout** - No esperar infinitamente  
✅ **Fail Fast** - Fallo inmediato cuando detecta patrón  
✅ **Fallback** - Respuesta alternativa  
✅ **Recuperación automática** - Detecta cuando servicio vuelve  
✅ **Failure Threshold** - Cuántos fallos para abrir  
✅ **Success Threshold** - Cuántos éxitos para cerrar  
✅ **Reset Timeout** - Tiempo antes de probar  
✅ **Observabilidad** - Estado visible

---

## Lecciones Aprendidas

### 1. Timeouts son obligatorios
- Sin timeout = riesgo de recursos bloqueados
- Timeout debe ser menor que latencia esperada × 2

### 2. Circuit breaker protege tu sistema
- No solo el servicio externo
- Protege tus recursos (conexiones, memoria, CPU)

### 3. Fallback es crítico
- Circuit breaker detecta fallo
- Fallback decide qué hacer
- Sin fallback = error al usuario

### 4. Configuración depende del contexto
- Servicio crítico: threshold alto, timeout corto
- Servicio no crítico: threshold bajo, timeout largo

### 5. Observabilidad es clave
- Necesitas saber cuándo circuit breaker se abre
- Alertas automáticas
- Dashboards en tiempo real

---

## Comparación con Katas Anteriores

| Aspecto | Kata 4 (Retries) | Kata 6 (Circuit Breaker) |
|---------|------------------|--------------------------|
| **Problema** | Fallos transitorios | Servicio caído |
| **Estrategia** | Reintentar | Dejar de intentar |
| **Cuándo usar** | Fallo ocasional | Fallo persistente |
| **Recursos** | Consume más | Protege recursos |
| **Recuperación** | Por request | Automática global |

**Combinación ideal:**
```
Retry (3 intentos) → Circuit Breaker (detecta patrón)
```

---

## Siguiente Paso

**Kata 7: Observabilidad**

Aprenderás:
- Logs estructurados
- Métricas (latencia, errores)
- Tracing distribuido
- Correlation IDs
- Dashboards
