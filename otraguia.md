🧠 Arquitectura Multi-Lenguaje Lab

Objetivo: Formarme como arquitecto empresarial dominando los conceptos universales de sistemas distribuidos, practicándolos en múltiples lenguajes.

🎯 Filosofía

El lenguaje es una herramienta.

La arquitectura es el arma.

La lógica es la base.

El criterio viene de romper sistemas y entender por qué fallan.

Este laboratorio NO busca construir sistemas gigantes.
Busca dominar fundamentos arquitectónicos replicando los mismos conceptos en varios lenguajes.

🏗 Enfoque General

Cada ejercicio (Kata) cumple estas reglas:

Un concepto arquitectónico claro.

Implementación pequeña.

Repetición en 2–3 lenguajes.

Medición y análisis.

Reflexión sobre trade-offs.

🌍 Lenguajes a Usar

Base recomendada:

TypeScript / Node

Go

Rust

Python

Java o C#

(Opcional) Elixir

No todos en cada ejercicio.
Rotarlos estratégicamente.

📚 BLOQUES DE APRENDIZAJE
🔵 BLOQUE 1 — Concurrencia
Conceptos

Concurrencia vs Paralelismo

Race conditions

Mutex

Message passing

Worker pools

Backpressure

Thread scheduling

Katas
Kata 1 — 10k Requests Concurrentes

Simular alta carga y medir:

Latencia promedio

p95 / p99

Throughput

Lenguajes:

Node

Go

Rust

Kata 2 — Race Condition en Saldo

Escenario:

Saldo inicial = 100
Dos procesos descuentan al mismo tiempo.

Provocar error.

Arreglar con:

Lock

Serialización por cola

Lenguajes:

Go

Rust

Java/C#

🟢 BLOQUE 2 — Consistencia y Base de Datos
Conceptos

ACID

Isolation levels

Deadlocks

Optimistic locking

Pessimistic locking

Unique constraints

Transacciones

Katas
Kata 3 — Transferencia Bancaria

Usar transacción

Probar fallo intermedio

Probar sin transacción

Kata 4 — Over-selling Inventory

Simular 100 compras simultáneas

Resolver con:

Locking

Serializable isolation

Lenguaje irrelevante (Postgres manda).

🟡 BLOQUE 3 — Idempotencia
Conceptos

Idempotency-Key

Deduplicación

Exactly-once vs At-least-once

Unique constraints

Fingerprint de request

Katas
Kata 5 — Idempotencia en HTTP

POST /pay con header:

Idempotency-Key: xyz123

Guardar resultado

Repetir request

Verificar que no duplica efecto

Lenguajes:

Node

Go

Kata 6 — Idempotencia en Worker

Simular:

Mensaje duplicado

Retry automático

Confirmar que efecto ocurre solo una vez

Lenguajes:

Go

Rust

🟠 BLOQUE 4 — Message Queues y Workers
Conceptos

Producer / Consumer

Ack / Nack

Retries

Dead Letter Queue

Consumer groups

Ordering

Poison messages

Visibility timeout

Katas
Kata 7 — Worker con Retries

Fallo aleatorio 30%

Implementar retry con backoff

Kata 8 — Dead Letter Queue

Mensaje que siempre falla

Tras N intentos → DLQ

Lenguajes:

Go

Node

🔴 BLOQUE 5 — Patrones Distribuidos
Conceptos

Saga Pattern

Orquestación vs Coreografía

Eventual Consistency

Outbox Pattern

CQRS

Event Sourcing (básico)

CAP theorem

Katas
Kata 9 — Mini Saga

Servicios:

Order

Payment

Inventory

Si falla inventory → compensar payment.

Lenguaje:

Go o Node

Kata 10 — Outbox Pattern

Problema:

DB commit exitoso
Publicación de evento falla

Solución:

Tabla outbox

Worker que publica eventos pendientes

🟣 BLOQUE 6 — Resiliencia
Conceptos

Timeouts

Retry con backoff + jitter

Circuit breaker

Bulkhead

Rate limiting

Load shedding

Katas
Kata 11 — Circuit Breaker

Servicio externo falla 50%.

Implementar breaker

Medir comportamiento

Kata 12 — Load Test + Backpressure

Productor rápido

Consumidor lento

Implementar límite de cola

🧪 BLOQUE 7 — Observabilidad
Conceptos

Logs estructurados

Correlation ID

Métricas p95/p99

Tracing distribuido

SLI / SLO / SLA

Kata 13 — End-to-End Trace

Request viaja:

HTTP → MQ → Worker → DB

Agregar:

request_id

métricas

logging estructurado

🧠 Cómo Analizar Cada Kata

Para cada ejercicio documentar:

¿Qué fallo ocurrió?

¿Qué propiedad arquitectónica se buscaba?

¿Qué patrón lo resolvió?

¿Qué trade-off introduce?

¿Cómo medirlo en producción?

Esto es lo que te vuelve arquitecto.

📈 Orden Recomendado (6 Meses)

Mes 1–2:
Concurrencia + DB + Idempotencia (Go + Node)

Mes 3–4:
MQ + Workers + Resiliencia

Mes 5:
Sagas + Outbox + CQRS

Mes 6:
Rust para servicio crítico

🏆 Resultado Esperado

Al terminar este laboratorio deberías poder:

Diseñar un sistema que soporte alta concurrencia.

Evitar duplicación de efectos.

Manejar retries sin romper consistencia.

Diseñar microservicios con compensación.

Pensar en fallos antes que en features.

Elegir lenguaje según necesidad, no por moda.

🧭 Mentalidad Final

Un arquitecto senior:

Diseña para el fallo.

Asume duplicación.

Mide todo.

Entiende consistencia.

No depende del lenguaje.

Sabe cuándo usar Go.

Sabe cuándo usar Rust.

Sabe cuándo usar Node.

Sabe cuándo no complicarse.