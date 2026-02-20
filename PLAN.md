# 📅 Plan de Estudio: Arquitectura Backend

> Roadmap de 6 meses combinando teoría (README.md) + práctica (otraguia.md)

**Objetivo:** Dominar arquitectura de sistemas distribuidos con práctica multi-lenguaje

---

## 🎯 Cómo usar este plan

- **Lunes-Miércoles:** Lee conceptos del README.md
- **Jueves-Domingo:** Implementa katas de otraguia.md
- **Cada 2 semanas:** Revisa y documenta aprendizajes

---

## 📊 Progreso General

- [ ] Mes 1: Fundamentos + Concurrencia
- [ ] Mes 2: Persistencia + Idempotencia
- [ ] Mes 3: Message Queues + Workers
- [ ] Mes 4: Consistencia Distribuida
- [ ] Mes 5: Resiliencia + Observabilidad
- [ ] Mes 6: Proyecto Final Integrado

---

## 🗓️ MES 1 — Fundamentos + Concurrencia

### Semana 1-2: Fundamentos
**Teoría:** README Fase 0
- [ ] Leer conceptos: Sistema, Estado, Efectos secundarios
- [ ] Entender stateless vs stateful

**Práctica:**
- [ ] Mini servicio "Orders" (en memoria o DB simple)
- [ ] Identificar efectos secundarios

**Lenguaje:** El que más domines (Node/Python/Go)

---

### Semana 3-4: Concurrencia
**Teoría:** README Fase 1
- [ ] Concurrencia vs paralelismo
- [ ] Race conditions
- [ ] Locks vs message passing
- [ ] Backpressure

**Práctica:**
- [ ] **Kata 1:** 10k requests concurrentes
  - Implementar en: **Node + Go**
  - Medir: latencia, p95, p99, throughput
- [ ] **Kata 2:** Race condition en saldo
  - Implementar en: **Go + Rust** (o Java si no sabes Rust)
  - Resolver con lock y con cola

**Entregable:** Documento comparando rendimiento Node vs Go

---

## 🗓️ MES 2 — Persistencia + Idempotencia

### Semana 5-6: Persistencia y Consistencia
**Teoría:** README Fase 2
- [ ] ACID
- [ ] Isolation levels
- [ ] Optimistic vs pessimistic locking
- [ ] CAP theorem

**Práctica:**
- [ ] **Kata 3:** Transferencia bancaria
  - Con transacción
  - Sin transacción (observar fallo)
- [ ] **Kata 4:** Over-selling inventory
  - 100 compras simultáneas
  - Resolver con locking + serializable isolation

**Lenguaje:** Cualquiera + PostgreSQL

**Entregable:** Ejemplos de cada isolation level

---

### Semana 7-8: Idempotencia
**Teoría:** README Fase 4
- [ ] Idempotency-Key
- [ ] Exactly-once vs at-least-once
- [ ] Deduplicación

**Práctica:**
- [ ] **Kata 5:** POST /pay con Idempotency-Key
  - Implementar en: **Node o Go**
  - Simular timeout y retry
- [ ] **Kata 6:** Idempotencia en worker
  - Mensaje duplicado
  - Verificar efecto único

**Entregable:** Endpoint idempotente funcionando

---

## 🗓️ MES 3 — Message Queues + Workers

### Semana 9-10: Fundamentos de MQ
**Teoría:** README Fase 3
- [ ] Producer/Consumer
- [ ] Ack/Nack
- [ ] At-least-once delivery
- [ ] Retries y DLQ
- [ ] Ordering

**Práctica:**
- [ ] **Kata 7:** Worker con retries
  - Fallo aleatorio 30%
  - Backoff exponencial
- [ ] **Kata 8:** Dead Letter Queue
  - Mensaje que siempre falla
  - Tras 3 intentos → DLQ

**Herramientas:** RabbitMQ o Redis Streams

**Lenguaje:** Go + Node

---

### Semana 11-12: Outbox Pattern
**Teoría:** README Fase 3 (Outbox)
- [ ] Problema: DB commit OK pero evento falla
- [ ] Solución: Tabla outbox

**Práctica:**
- [ ] **Kata 10:** Implementar outbox pattern
  - Tabla outbox en DB
  - Worker que publica eventos pendientes

**Entregable:** Sistema que nunca pierde eventos

---

## 🗓️ MES 4 — Consistencia Distribuida

### Semana 13-14: Event-Driven + Sagas
**Teoría:** README Fase 5
- [ ] Sagas (compensaciones)
- [ ] Orquestación vs coreografía
- [ ] Eventual consistency
- [ ] CQRS

**Práctica:**
- [ ] **Kata 9:** Mini Saga
  - Servicios: Order → Payment → Inventory
  - Si falla inventory → compensar payment
  - Publicar eventos: OrderCreated, PaymentAuthorized

**Lenguaje:** Go o Node (3 servicios pequeños)

---

### Semana 15-16: CQRS
**Teoría:** README Fase 5 (CQRS)
- [ ] Separar lectura/escritura
- [ ] Cuándo sí, cuándo no

**Práctica:**
- [ ] Extender Kata 9 con:
  - Vista de lectura separada
  - Proyección de eventos

**Entregable:** Sistema con 3 servicios + compensación

---

## 🗓️ MES 5 — Resiliencia + Observabilidad

### Semana 17-18: Resiliencia
**Teoría:** README Fase 6
- [ ] Timeouts
- [ ] Circuit breaker
- [ ] Bulkheads
- [ ] Rate limiting
- [ ] Load shedding

**Práctica:**
- [ ] **Kata 11:** Circuit breaker
  - Servicio externo falla 50%
  - Implementar breaker
  - Medir comportamiento
- [ ] **Kata 12:** Backpressure
  - Productor rápido, consumidor lento
  - Límite de cola

**Entregable:** Sistema que degrada gracefully

---

### Semana 19-20: Observabilidad
**Teoría:** README Fase 7
- [ ] Logs estructurados
- [ ] Métricas p95/p99
- [ ] Tracing distribuido
- [ ] SLI/SLO/SLA

**Práctica:**
- [ ] **Kata 13:** End-to-end trace
  - HTTP → MQ → Worker → DB
  - request_id en todo el flujo
  - Métricas de latencia

**Herramientas:** Prometheus + Grafana (básico)

**Entregable:** Dashboard con métricas clave

---

## 🗓️ MES 6 — Proyecto Final

### Semana 21-24: Sistema E-commerce Completo

**Requisitos:**
- 4 microservicios: Orders, Payments, Inventory, Shipping
- Message queue (RabbitMQ/Kafka)
- Saga con compensación
- Idempotencia en todos los endpoints
- Circuit breakers
- Observabilidad completa
- Rate limiting

**Tecnologías sugeridas:**
- **Orders:** Node/TypeScript
- **Payments:** Go (crítico, alta concurrencia)
- **Inventory:** Go o Rust
- **Shipping:** Python o Node
- **DB:** PostgreSQL
- **MQ:** RabbitMQ
- **Observabilidad:** Prometheus + Grafana + Jaeger

**Entregable:**
- Código en GitHub
- README con arquitectura
- Diagramas de flujo
- Métricas de rendimiento
- Documentación de decisiones

---

## 📝 Plantilla de Documentación por Kata

Para cada kata, documenta:

```markdown
## Kata X: [Nombre]

### Problema
[Qué fallo arquitectónico resuelve]

### Implementación
- Lenguaje: 
- Herramientas:
- Tiempo: 

### Código clave
[Snippet más importante]

### Resultados
- Métrica 1:
- Métrica 2:

### Aprendizajes
1. [Qué funcionó]
2. [Qué falló]
3. [Trade-offs]

### Aplicación real
[Cuándo usarías esto en producción]
```

---

## 🎯 Hitos Clave

Al final de cada mes deberías poder:

**Mes 1:** Explicar race conditions y resolverlas  
**Mes 2:** Diseñar operaciones idempotentes  
**Mes 3:** Implementar sistema con workers y retries  
**Mes 4:** Diseñar saga con compensación  
**Mes 5:** Hacer sistema resiliente y observable  
**Mes 6:** Arquitectar sistema distribuido completo

---

## 📚 Recursos por Fase

### Concurrencia
- Go by Example: Goroutines
- Node.js Event Loop explicado

### Persistencia
- PostgreSQL Isolation Levels (docs oficiales)
- "Designing Data-Intensive Applications" Cap 7

### Message Queues
- RabbitMQ Tutorials
- AWS SQS Best Practices

### Sagas
- Microservices Patterns (Chris Richardson)
- Saga Pattern explicado

### Resiliencia
- "Release It!" (Michael Nygard)
- Netflix Hystrix (conceptos)

---

## ✅ Checklist Final

Antes de considerarte "arquitecto backend" debes poder:

- [ ] Diseñar API idempotente
- [ ] Implementar saga con compensación
- [ ] Configurar circuit breaker
- [ ] Debuggear con tracing distribuido
- [ ] Explicar CAP theorem con ejemplos reales
- [ ] Elegir entre Go/Rust/Node según caso de uso
- [ ] Diseñar para el fallo (no para el happy path)
- [ ] Medir y optimizar p99
- [ ] Implementar outbox pattern
- [ ] Explicar trade-offs de consistencia eventual

---

## 🚀 Siguiente Nivel

Después de este plan:

1. **Contribuye a proyectos open source** de infraestructura
2. **Lee código de producción:** Kubernetes, Kafka, etcd
3. **Practica chaos engineering:** Simula fallos reales
4. **Aprende Kubernetes:** Orquestación en producción
5. **Estudia casos reales:** Post-mortems de AWS, Google, Netflix

---

**¿Dudas?** Revisa README.md para teoría y otraguia.md para katas específicas.

**¡Éxito en tu camino a arquitecto!** 🎯
