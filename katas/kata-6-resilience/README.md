# Kata 6: Resiliencia - Circuit Breaker

## Objetivo

Implementar Circuit Breaker para proteger el sistema contra fallos de servicios externos.

## Conceptos Clave

- **Circuit Breaker**: Patrón que detecta fallos y deja de llamar servicios caídos
- **Timeout**: Límite de tiempo para operaciones
- **Fail Fast**: Fallar rápido sin esperar timeout
- **Fallback**: Respuesta alternativa cuando falla
- **Estados**: CLOSED (normal), OPEN (bloqueado), HALF_OPEN (probando)

## Arquitectura

```
Cliente → API → [Circuit Breaker] → Payment Service
                      ↓
                   Estados:
                   CLOSED → OPEN → HALF_OPEN → CLOSED
```

## Setup

### 1. Instalar dependencias

```bash
# API
cd api
npm install

# External Service
cd external-service
npm install
```

### 2. Iniciar servicios (3 terminales)

**Terminal 1: Payment API**
```bash
cd external-service
node payment-api.js
```

**Terminal 2: API con Circuit Breaker**
```bash
cd api
node server.js
```

**Terminal 3: Pruebas**

## Experimentos

### Experimento 1: Sistema Normal

```bash
# Crear orden
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{"amount": 100}'

# Ver estado del circuit breaker
curl http://localhost:3000/circuit-breaker/status
```

**Resultado esperado:**
- Orden creada exitosamente
- Circuit breaker: `CLOSED`
- `failureCount: 0`

---

### Experimento 2: Provocar Fallos

```bash
# Activar modo fallo
curl -X POST http://localhost:4000/admin/fail

# Hacer 3 requests (alcanzar threshold)
for i in {1..3}; do
  curl -X POST http://localhost:3000/orders \
    -H "Content-Type: application/json" \
    -d '{"amount": 100}'
  echo ""
done

# Ver estado
curl http://localhost:3000/circuit-breaker/status
```

**Resultado esperado:**
- 3 requests fallan con timeout (2s cada uno)
- Circuit breaker: `CLOSED` → `OPEN`
- Log: "🔴 Circuit breaker: OPEN"

---

### Experimento 3: Fallo Inmediato (Fail Fast)

```bash
# Intentar crear orden (debería fallar inmediatamente)
time curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{"amount": 100}'
```

**Resultado esperado:**
- Tiempo: ~0.01s (vs 2s de timeout)
- Error: "Payment service unavailable"
- Fallback: "Order saved, payment will be processed later"

---

### Experimento 4: Recuperación Automática

```bash
# Recuperar Payment API
curl -X POST http://localhost:4000/admin/recover

# Esperar 10 segundos
sleep 10

# Hacer 2 requests exitosos
for i in {1..2}; do
  curl -X POST http://localhost:3000/orders \
    -H "Content-Type: application/json" \
    -d '{"amount": 100}'
  echo ""
done

# Ver estado
curl http://localhost:3000/circuit-breaker/status
```

**Resultado esperado:**
- Circuit breaker: `OPEN` → `HALF_OPEN` → `CLOSED`
- Log: "✅ Circuit breaker: CLOSED (recuperado)"

---

## Configuración

```javascript
{
    failureThreshold: 3,    // Fallos para abrir
    successThreshold: 2,    // Éxitos para cerrar
    timeout: 2000,          // Timeout por request (ms)
    resetTimeout: 10000     // Tiempo antes de probar (ms)
}
```

## Estados del Circuit Breaker

| Estado | Descripción | Comportamiento |
|--------|-------------|----------------|
| **CLOSED** | Normal | Permite requests |
| **OPEN** | Bloqueado | Rechaza requests inmediatamente |
| **HALF_OPEN** | Probando | Permite requests de prueba |

## Ventajas

✅ Protege recursos del sistema  
✅ Fallo rápido (fail fast)  
✅ Recuperación automática  
✅ Fallback para degradación elegante  
✅ Observabilidad del estado

## Conclusiones

Ver `docs/analisis.md` para análisis detallado de experimentos.
