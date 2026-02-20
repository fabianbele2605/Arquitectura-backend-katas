# Guía de Arquitectura de Software Backend

> Roadmap práctico para dominar arquitectura de sistemas distribuidos, independiente del lenguaje de programación.

**Duración total:** 18-26 semanas | **Nivel:** Intermedio a Avanzado

![Progress](https://img.shields.io/badge/Progress-50%25-yellow)
![Katas](https://img.shields.io/badge/Katas-4%2F8-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Node](https://img.shields.io/badge/Node.js-18+-brightgreen)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-blue)
![Redis](https://img.shields.io/badge/Redis-7+-red)


---

## 📋 Tabla de Contenidos

- [Sobre esta guía](#sobre-esta-guía)
- [Prerequisitos](#prerequisitos)
- [Progreso](#progreso)
- [Fase 0: Fundamentos](#fase-0--fundamentos-que-no-dependen-del-lenguaje-12-semanas)
- [Fase 1: Concurrencia y Paralelismo](#fase-1--concurrencia-y-paralelismo-23-semanas)
- [Fase 2: Persistencia y Consistencia](#fase-2--persistencia-y-consistencia-23-semanas)
- [Fase 3: Mensajería, Colas y Workers](#fase-3--mensajería-colas-y-workers-34-semanas)
- [Fase 4: Idempotencia y Deduplicación](#fase-4--idempotencia-y-deduplicación-12-semanas)
- [Fase 5: Consistencia Distribuida](#fase-5--consistencia-distribuida-en-microservicios-34-semanas)
- [Fase 6: Resiliencia](#fase-6--resiliencia-23-semanas)
- [Fase 7: Observabilidad](#fase-7--observabilidad-2-semanas)
- [Fase 8: Seguridad y Plataforma](#fase-8--seguridad-y-plataforma-continuo)
- [Proyectos Prácticos](#ruta-práctica-recomendada)
- [Conceptos Clave](#conceptos-bandera-que-debes-dominar)
- [Recursos](#recursos)

---

## Sobre esta guía

Esta guía te enseña los **fundamentos de arquitectura backend** que aplican en cualquier lenguaje (Go, Rust, Node.js, Java, Python). En lugar de frameworks específicos, aprenderás **patrones y conceptos** que resuelven problemas reales en sistemas distribuidos.

**¿Para quién es?**
- Desarrolladores backend que quieren dar el salto a arquitectura
- Ingenieros que trabajan con microservicios
- Cualquiera que necesite entender sistemas distribuidos en producción

---

## Prerequisitos

- Conocimiento básico de programación en al menos un lenguaje
- Experiencia con APIs REST y bases de datos
- Familiaridad con HTTP y JSON
- Acceso a Docker (recomendado para prácticas)

---

## Progreso

Marca tu avance:

- [ ] Fase 0: Fundamentos
- [ ] Fase 1: Concurrencia y Paralelismo
- [ ] Fase 2: Persistencia y Consistencia
- [ ] Fase 3: Mensajería, Colas y Workers
- [ ] Fase 4: Idempotencia y Deduplicación
- [ ] Fase 5: Consistencia Distribuida
- [ ] Fase 6: Resiliencia
- [ ] Fase 7: Observabilidad
- [ ] Fase 8: Seguridad y Plataforma
- [ ] Proyecto 1: API + DB
- [ ] Proyecto 2: MQ + Worker
- [ ] Proyecto 3: Microservicios + Saga

---

## Fase 0 — Fundamentos que no dependen del lenguaje (1–2 semanas)

### 0.1 Modelos mentales

**Conceptos clave:**
- **Sistema** = Entrada → Proceso → Estado → Salida
- **Estado:** stateless vs stateful
- **Efectos secundarios:** dinero, emails, inventario, cambios persistentes
- **Determinismo:** misma entrada → misma salida (ideal), vs efectos

### 💻 Práctica

1. Construye un mini servicio "Orders" que reciba pedidos y guarde estado (DB o en memoria)
2. Identifica dónde hay efectos secundarios

---

## Fase 1 — Concurrencia y paralelismo (2–3 semanas)

### Conceptos clave

- Concurrencia vs paralelismo
- Race conditions
- Locks / mutex / semáforos (para entender el riesgo)
- Modelo de memoria (qué significa "data race")
- Comunicación por mensajes vs memoria compartida
- Backpressure (qué hacer cuando llega más de lo que puedes procesar)
- Work stealing / thread pools (concepto)

### Cómo se ve por lenguaje

- **Node:** event loop + async IO
- **Go:** goroutines + channels (CSP)
- **Rust:** threads + ownership / async runtimes (Tokio)

### 💻 Práctica

1. Implementa un "contador de stock" con 100 requests concurrentes
2. Provoca un race condition y luego arréglalo:
   - con lock
   - con cola/worker (serializando)

---

## Fase 2 — Persistencia y consistencia (2–3 semanas)

### Conceptos clave

- **ACID** (transacciones clásicas)
- **Aislamiento:** read committed / repeatable read / serializable (entender qué evita)
- Optimistic vs pessimistic locking
- Índices, unique constraints (herramienta clave de idempotencia)
- Consistencia fuerte vs eventual
- **CAP** (no memorizar, entender decisiones)

### 💻 Práctica

1. Haz una operación "transferir saldo" con transacción
2. Luego hazlo "sin transacción" y observa inconsistencias
3. Agrega un `UNIQUE(payment_id)` y prueba duplicados

---

## Fase 3 — Mensajería, colas y workers (3–4 semanas)

> 🎯 **Aquí está el corazón de "arquitectura seria"**

### Conceptos clave de MQ

- Producer / Broker / Consumer
- **Ack/Nack** (confirmación de procesamiento)
- **At-least-once** (lo normal) vs at-most-once
- **Retries** (reintentos) y **Dead Letter Queue (DLQ)**
- Visibility timeout (SQS-style)
- Consumer groups (Kafka)
- **Ordering** (por qué se rompe y cómo se preserva)
- Poison messages (mensajes que siempre fallan)
- **Outbox pattern** (para publicar eventos sin perderlos)

### 💻 Práctica

1. API recibe "crear orden" → encola job → responde 202
2. Worker procesa y actualiza DB
3. Mete DLQ para fallos y reintentos

---

## Fase 4 — Idempotencia y deduplicación (1–2 semanas)

### Conceptos clave

- **Idempotency-Key** (en HTTP y en jobs)
- Dedup por "fingerprint" del request
- **Exactly-once** (semántica) vs realidad (casi siempre "at least once + idempotencia")
- Idempotencia por diseño:
  - `INSERT ... ON CONFLICT DO NOTHING`
  - `UNIQUE` constraints
  - tabla `idempotency_keys` con status/resultado

### 💻 Práctica

1. Implementa endpoint `POST /pay` con header `Idempotency-Key`
2. Simula timeout y reintento: que no se cobre dos veces
3. Haz lo mismo en un worker consumiendo mensajes duplicados

---

## Fase 5 — Consistencia distribuida en microservicios (3–4 semanas)

### Conceptos clave

- **Sagas** (compensaciones) vs transacciones distribuidas
- Orquestación vs coreografía
- Event-driven architecture
- Eventual consistency aplicada (y cómo explicarla al negocio)
- Diseño de "estado": source of truth
- Lecturas desacopladas: **CQRS** (separar lectura/escritura)

### 💻 Práctica

1. Flujo: Order → Payment → Inventory → Shipping
2. Si shipping falla: compensación (refund o cancel order)
3. Publica eventos: `OrderCreated`, `PaymentAuthorized`, etc.

---

## Fase 6 — Resiliencia (2–3 semanas)

### Conceptos clave

- **Timeouts** (siempre)
- **Retries** con backoff + jitter (no reintentar a lo loco)
- **Circuit breaker**
- **Bulkheads** (aislar recursos)
- **Rate limiting** (por usuario/endpoint)
- Graceful degradation (modo "parcial")
- Load shedding (rechazar para sobrevivir)
- Chaos engineering (mentalidad)

### 💻 Práctica

Simula fallos de DB/Redis y verifica:
- que el sistema no colapse
- que degrade
- que registre métricas

---

## Fase 7 — Observabilidad (2 semanas)

### Conceptos clave

- **Logs estructurados** (JSON)
- **Métricas** (latencia p95/p99, errores, colas)
- **Tracing distribuido** (correlation id / trace id)
- **SLI/SLO/SLA** (lenguaje de negocio para confiabilidad)
- Alertas por síntoma (no por ruido)

### 💻 Práctica

1. Implementa un `request_id` que viaje: HTTP → MQ → Worker → DB
2. Mide p95 y tasa de errores

---

## Fase 8 — Seguridad y plataforma (continuo)

### Conceptos clave

- **AuthN/AuthZ** (JWT, OAuth2)
- Secret management
- TLS
- Principio de mínimo privilegio
- Seguridad de APIs (rate limit, input validation)
- Supply chain (dependencias)
- Contenedores: Docker, k8s (conceptos)
- CI/CD: despliegues seguros, rollback

### 💻 Práctica

1. Protege endpoints críticos
2. Separa roles
3. Añade rate limiting

---

## Cómo esto te vuelve "multi-lenguaje"

Estas habilidades se aplican igual en **Go, Rust, Node, Java, Python:**

| Concepto | Realidad |
|----------|----------|
| **Concurrencia** | Cambia la sintaxis, no el problema |
| **Idempotencia** | Casi siempre DB + claves únicas + storage de key |
| **Consistencia** | Patrones (saga/outbox/CQRS), no frameworks |
| **Resiliencia** | Timeouts/retries/circuit breakers siempre |
| **Observabilidad** | Logs/métricas/traces siempre |

---

## Ruta práctica recomendada

### Proyecto 1 (2–3 semanas): "API + DB"
- Orders + Payments (sin colas al inicio)

### Proyecto 2 (3–4 semanas): "MQ + Worker"
- Orders encola → worker procesa
- Retries + DLQ + idempotencia

### Proyecto 3 (4–6 semanas): "Microservicios + Saga"
- 3 servicios + eventos + compensación
- Observabilidad completa

---

## Conceptos bandera que debes dominar

✅ **Concurrencia vs paralelismo**  
✅ **Race conditions + locks + message passing**  
✅ **ACID + aislamiento**  
✅ **Consistencia fuerte vs eventual + CAP**  
✅ **Message queues: ack/retries/DLQ/ordering**  
✅ **Idempotencia y deduplicación**  
✅ **Outbox pattern**  
✅ **Sagas**  
✅ **CQRS** (cuando sí, cuando no)  
✅ **Resiliencia: timeouts, backoff, circuit breaker**  
✅ **Observabilidad: logs, métricas, tracing**  
✅ **SLI/SLO/SLA** (para hablar con negocio)

---

## Recursos

### Libros recomendados
- **Designing Data-Intensive Applications** - Martin Kleppmann
- **Building Microservices** - Sam Newman
- **Release It!** - Michael Nygard

### Herramientas para practicar
- **Message Queues:** RabbitMQ, Redis, AWS SQS, Kafka
- **Databases:** PostgreSQL, MongoDB
- **Observabilidad:** Prometheus, Grafana, Jaeger
- **Contenedores:** Docker, Docker Compose

### Comunidades
- [r/softwarearchitecture](https://reddit.com/r/softwarearchitecture)


---

## Licencia

Este contenido es de uso libre para aprendizaje personal.

---

**¿Preguntas o sugerencias?** Abre un issue o contribuye con un PR.
