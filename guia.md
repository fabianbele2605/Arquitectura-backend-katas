Fase 0 — Fundamentos que no dependen del lenguaje (1–2 semanas)
0.1 Modelos mentales

Sistema = Entrada → Proceso → Estado → Salida

Estado: stateless vs stateful

Efectos secundarios: dinero, emails, inventario, cambios persistentes

Determinismo: misma entrada → misma salida (ideal), vs efectos

Práctica

Construye un mini servicio “Orders” que reciba pedidos y guarde estado (DB o en memoria).

Identifica dónde hay efectos secundarios.

Fase 1 — Concurrencia y paralelismo (2–3 semanas)
Conceptos clave

Concurrencia vs paralelismo

Race conditions

Locks / mutex / semáforos (para entender el riesgo)

Modelo de memoria (qué significa “data race”)

Comunicación por mensajes vs memoria compartida

Backpressure (qué hacer cuando llega más de lo que puedes procesar)

Work stealing / thread pools (concepto)

Cómo se ve por lenguaje

Node: event loop + async IO

Go: goroutines + channels (CSP)

Rust: threads + ownership / async runtimes (Tokio)

Práctica

Implementa un “contador de stock” con 100 requests concurrentes.

Provoca un race condition y luego arréglalo:

con lock

con cola/worker (serializando)

Fase 2 — Persistencia y consistencia (2–3 semanas)
Conceptos clave

ACID (transacciones clásicas)

Aislamiento: read committed / repeatable read / serializable (entender qué evita)

Optimistic vs pessimistic locking

Índices, unique constraints (herramienta clave de idempotencia)

Consistencia fuerte vs eventual

CAP (no memorizar, entender decisiones)

Práctica

Haz una operación “transferir saldo” con transacción.

Luego hazlo “sin transacción” y observa inconsistencias.

Agrega un UNIQUE(payment_id) y prueba duplicados.

Fase 3 — Mensajería, colas y workers (3–4 semanas)

Aquí está el corazón de “arquitectura seria”.

Conceptos clave de MQ

Producer / Broker / Consumer

Ack/Nack (confirmación de procesamiento)

At-least-once (lo normal) vs at-most-once

Retries (reintentos) y Dead Letter Queue (DLQ)

Visibility timeout (SQS-style)

Consumer groups (Kafka)

Ordering (por qué se rompe y cómo se preserva)

Poison messages (mensajes que siempre fallan)

Outbox pattern (para publicar eventos sin perderlos)

Práctica

API recibe “crear orden” → encola job → responde 202.

Worker procesa y actualiza DB.

Mete DLQ para fallos y reintentos.

Fase 4 — Idempotencia y deduplicación (1–2 semanas)
Conceptos clave

Idempotency-Key (en HTTP y en jobs)

Dedup por “fingerprint” del request

Exactly-once (semántica) vs realidad (casi siempre “at least once + idempotencia”)

Idempotencia por diseño:

INSERT ... ON CONFLICT DO NOTHING

UNIQUE constraints

tabla idempotency_keys con status/resultado

Práctica

Implementa endpoint POST /pay con header Idempotency-Key.

Simula timeout y reintento: que no se cobre dos veces.

Haz lo mismo en un worker consumiendo mensajes duplicados.

Fase 5 — Consistencia distribuida en microservicios (3–4 semanas)
Conceptos clave

Sagas (compensaciones) vs transacciones distribuidas

Orquestación vs coreografía

Event-driven architecture

Eventual consistency aplicada (y cómo explicarla al negocio)

Diseño de “estado”: source of truth

Lecturas desacopladas: CQRS (separar lectura/escritura)

Práctica

Flujo: Order → Payment → Inventory → Shipping

Si shipping falla: compensación (refund o cancel order)

Publica eventos: OrderCreated, PaymentAuthorized, etc.

Fase 6 — Resiliencia (2–3 semanas)
Conceptos clave

Timeouts (siempre)

Retries con backoff + jitter (no reintentar a lo loco)

Circuit breaker

Bulkheads (aislar recursos)

Rate limiting (por usuario/endpoint)

Graceful degradation (modo “parcial”)

Load shedding (rechazar para sobrevivir)

Chaos engineering (mentalidad)

Práctica

Simula fallos de DB/Redis y verifica:

que el sistema no colapse

que degrade

que registre métricas

Fase 7 — Observabilidad (2 semanas)
Conceptos clave

Logs estructurados (JSON)

Métricas (latencia p95/p99, errores, colas)

Tracing distribuido (correlation id / trace id)

SLI/SLO/SLA (lenguaje de negocio para confiabilidad)

Alertas por síntoma (no por ruido)

Práctica

Implementa un request_id que viaje:

HTTP → MQ → Worker → DB

Mide p95 y tasa de errores.

Fase 8 — Seguridad y plataforma (continuo)
Conceptos clave

AuthN/AuthZ (JWT, OAuth2)

Secret management

TLS

Principio de mínimo privilegio

Seguridad de APIs (rate limit, input validation)

Supply chain (dependencias)

Contenedores: Docker, k8s (conceptos)

CI/CD: despliegues seguros, rollback

Práctica

Protege endpoints críticos.

Separa roles.

Añade rate limiting.

Cómo esto te vuelve “multi-lenguaje”

Porque estas habilidades se aplican igual en Go, Rust, Node, Java, Python:

Concurrencia: cambia la sintaxis, no el problema.

Idempotencia: casi siempre DB + claves únicas + storage de key.

Consistencia: patrones (saga/outbox/CQRS), no frameworks.

Resiliencia: timeouts/retries/circuit breakers siempre.

Observabilidad: logs/métricas/traces siempre.

Ruta práctica recomendada (sin volverte loco)
Proyecto 1 (2–3 semanas): “API + DB”

Orders + Payments (sin colas al inicio)

Proyecto 2 (3–4 semanas): “MQ + Worker”

Orders encola → worker procesa

retries + DLQ + idempotencia

Proyecto 3 (4–6 semanas): “Microservicios + Saga”

3 servicios + eventos + compensación

observabilidad completa

Lista corta de “conceptos bandera” que debes dominar sí o sí

Concurrencia vs paralelismo

Race conditions + locks + message passing

ACID + aislamiento

Consistencia fuerte vs eventual + CAP

Message queues: ack/retries/DLQ/ordering

Idempotencia y deduplicación

Outbox pattern

Sagas

CQRS (cuando sí, cuando no)

Resiliencia: timeouts, backoff, circuit breaker

Observabilidad: logs, métricas, tracing

SLI/SLO/SLA (para hablar con negocio)