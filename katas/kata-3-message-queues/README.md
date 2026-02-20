# Kata 3: Message Queues + Workers

## 🎯 Objetivo

Entender:
- Producer-Consumer pattern
- Message Queues (Redis)
- Procesamiento asíncrono
- Escalabilidad horizontal
- Workers en background

## 📁 Estructura

```
kata-3-message-queues/
├── sql/
│   └── schema.sql         # Tablas: orders + jobs
├── api/
│   ├── package.json
│   └── server.js          # Producer (encola trabajos)
├── worker/
│   ├── package.json
│   └── worker.js          # Consumer (procesa trabajos)
└── docs/
    └── analisis.md        # Experimentos y conclusiones
```

## 🚀 Cómo ejecutar

### 1. Instalar Redis

```bash
sudo apt update
sudo apt install redis-server -y
sudo service redis-server start
redis-cli ping  # Debe responder PONG
```

### 2. Crear base de datos

```bash
sudo -u postgres psql
CREATE DATABASE mq_db;
CREATE USER mq_user WITH PASSWORD 'mq_pass';
GRANT ALL PRIVILEGES ON DATABASE mq_db TO mq_user;
\c mq_db
GRANT ALL ON SCHEMA public TO mq_user;
\q
```

### 3. Ejecutar schema

```bash
psql -U mq_user -d mq_db -h localhost -f sql/schema.sql
```

### 4. Instalar dependencias

```bash
cd api && npm install
cd ../worker && npm install
```

### 5. Iniciar API (Terminal 1)

```bash
cd api
node server.js
```

### 6. Iniciar Worker (Terminal 2)

```bash
cd worker
node worker.js
```

### 7. Iniciar más workers (Opcional)

```bash
# Terminal 3
cd worker && node worker.js

# Terminal 4
cd worker && node worker.js
```

## 🧪 Pruebas

### Crear orden

```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{"product": "Laptop", "quantity": 1, "price": 1200}'
```

**Respuesta:**
```json
{
  "message": "Orden recibida y en proceso",
  "orderId": 1,
  "jobId": "job-1-1234567890",
  "status": "pending"
}
```

### Crear múltiples órdenes

```bash
for i in {1..10}; do
  curl -X POST http://localhost:3000/orders \
    -H "Content-Type: application/json" \
    -d "{\"product\": \"Item$i\", \"quantity\": 1, \"price\": 10}" &
done
wait
```

### Consultar órdenes

```bash
curl http://localhost:3000/orders
```

### Consultar jobs

```bash
curl http://localhost:3000/jobs
```

## 📊 Resultados esperados

| Experimento | Resultado |
|-------------|-----------|
| 1 orden, 1 worker | Procesa en 2s |
| 5 órdenes, 1 worker | Procesa en 10s (secuencial) |
| 10 órdenes, 4 workers | Procesa en ~6s (paralelo) |
| API responde | Inmediato (202 Accepted) |

## 🧠 Conceptos clave

### Producer-Consumer

```
API (Producer)          Redis Queue          Worker (Consumer)
      │                      │                       │
      ├─ Encola trabajo ────▶│                       │
      │                      │◀──── Lee trabajo ─────┤
      │                      │                       │
      └─ Responde 202        │                  Procesa
```

### 202 Accepted

```javascript
res.statusCode = 202;  // No 200 OK
```

Significa: "Tu request fue aceptado, se procesará después"

### BLPOP (Blocking Pop)

```javascript
await redisClient.blPop('orders:queue', 0);
```

- Espera hasta que haya mensaje
- NO consume CPU (eficiente)
- `0` = esperar indefinidamente

### Escalabilidad horizontal

```
1 worker:  10 jobs × 2s = 20s
4 workers: 10 jobs ÷ 4 × 2s = ~6s
```

Más workers = Más rápido

## ✅ Checklist

- [ ] Entender Producer-Consumer
- [ ] Implementar API que encola
- [ ] Implementar Worker que procesa
- [ ] Ver API responder rápido (202)
- [ ] Ver Worker procesar en background
- [ ] Probar con múltiples workers
- [ ] Observar escalabilidad

## 🎯 Casos de uso reales

### 1. E-commerce
- Procesar pagos
- Enviar emails
- Actualizar inventario

### 2. Procesamiento de imágenes
- Redimensionar
- Generar thumbnails
- Aplicar filtros

### 3. Reportes
- Consultar millones de registros
- Generar PDF
- Enviar por email

### 4. Notificaciones
- Email
- SMS
- Push notifications

## 🚀 Siguiente paso

**Kata 4: Reintentos + Dead Letter Queue**

Aprenderás:
- Reintentos automáticos
- Backoff exponencial
- Dead Letter Queue
- Poison messages
