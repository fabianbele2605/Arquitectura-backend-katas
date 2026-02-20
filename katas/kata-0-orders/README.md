# Kata 0: Mini Servicio Orders (Estado en Memoria)

## 🎯 Objetivo

Entender los conceptos fundamentales de:
- Estado en memoria (volátil)
- Efectos secundarios
- Stateful vs Stateless
- Concurrencia vs Paralelismo
- Race conditions y Mutex

## 📁 Estructura

```
kata-0-orders/
├── node/
│   ├── package.json
│   └── server.js          # Implementación en Node.js
├── go/
│   ├── go.mod
│   ├── main.go            # Implementación en Go (con mutex)
│   └── main-broken.go     # Versión sin mutex (para demostrar bug)
└── docs/
    └── analisis.md        # Documentación y experimentos
```

## 🚀 Cómo ejecutar

### Node.js
```bash
cd node
node server.js
# Escucha en http://localhost:3000
```

### Go (versión correcta)
```bash
cd go
go run main.go
# Escucha en http://localhost:3001
```

### Go (versión con bug)
```bash
cd go
go run main-broken.go
# Escucha en http://localhost:3001
# ⚠️ ADVERTENCIA: Tiene race conditions intencionales
```

## 🧪 Pruebas

### Crear una orden
```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{"product": "Laptop", "quantity": 1, "price": 1200}'
```

### Consultar órdenes
```bash
curl http://localhost:3000/orders
```

### Test de concurrencia (100 requests)
```bash
for i in {1..100}; do
  curl -X POST http://localhost:3001/orders \
    -H "Content-Type: application/json" \
    -d "{\"product\": \"Item$i\", \"quantity\": 1, \"price\": 10}" &
done
wait

# Verificar cantidad
curl http://localhost:3001/orders | jq 'length'

# Buscar IDs duplicados
curl http://localhost:3001/orders | jq '.[].id' | sort | uniq -d
```

## 📊 Resultados esperados

| Implementación | 100 requests | Race condition | Datos perdidos |
|----------------|--------------|----------------|----------------|
| Node.js | 100 ✅ | No (single-thread) | No |
| Go sin mutex | 99 ❌ | Sí | Sí (1 orden) |
| Go con mutex | 100 ✅ | No (sincronizado) | No |

## 🧠 Conceptos clave

### Estado en memoria
- **Ventaja:** Rápido (acceso directo a RAM)
- **Desventaja:** Volátil (se pierde al reiniciar)
- **Uso:** Cache, sesiones temporales, rate limiting

### Efectos secundarios
Modificaciones que NO se pueden deshacer:
- Incrementar ID
- Agregar a array
- Generar timestamp
- Modificar estado global

### Race condition
**Problema:** Múltiples threads acceden al mismo dato sin sincronización

**Ejemplo en Go sin mutex:**
```
Thread 1: Lee nextID = 5
Thread 2: Lee nextID = 5  ← ¡Mismo valor!
Thread 1: Crea orden ID=5
Thread 2: Crea orden ID=5  ← ¡Duplicado!
```

**Resultado:** Datos corruptos o perdidos

### Mutex (Mutual Exclusion)
**Solución:** Sincronizar acceso a sección crítica

```go
mu.Lock()
// Solo UNA goroutine puede estar aquí
newOrder := Order{ID: nextID, ...}
nextID++
orders = append(orders, newOrder)
mu.Unlock()
```

### Node.js vs Go

| Aspecto | Node.js | Go |
|---------|---------|-----|
| **Modelo** | Single-threaded | Multi-threaded |
| **Concurrencia** | Event loop | Goroutines |
| **Paralelismo** | No (un core) | Sí (múltiples cores) |
| **Race conditions** | No | Sí (sin mutex) |
| **Mutex necesario** | No | Sí |

## 📚 Documentación completa

Ver `docs/analisis.md` para:
- Experimentos realizados
- Comparación Node vs Go
- Análisis detallado de race conditions
- Conclusiones y aprendizajes

## ✅ Checklist de aprendizaje

Después de completar esta kata deberías poder:

- [ ] Explicar qué es estado en memoria
- [ ] Identificar efectos secundarios en código
- [ ] Diferenciar stateful vs stateless
- [ ] Explicar concurrencia vs paralelismo
- [ ] Reconocer race conditions
- [ ] Usar mutex para proteger estado compartido
- [ ] Comparar modelos de concurrencia (Node vs Go)

## 🚀 Siguiente paso

**Kata 1: Persistencia con PostgreSQL**

Aprenderás:
- Guardar datos en base de datos
- Transacciones ACID
- Rollback en caso de error
- Unique constraints para evitar duplicados
