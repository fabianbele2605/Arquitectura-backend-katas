# ✅ Checklist de Verificación - Kata 2

## 📂 Estructura de archivos

- [x] `README.md` - Instrucciones completas
- [x] `sql/schema.sql` - Tablas payments + idempotency_keys
- [x] `node/server.js` - Servidor con idempotencia
- [x] `node/package.json` - Dependencias
- [x] `docs/analisis.md` - Documentación de experimentos

## 🔧 Configuración

- [x] PostgreSQL instalado
- [x] Base de datos `idempotency_db` creada
- [x] Usuario `idempotency_user` creado
- [x] Permisos otorgados
- [x] Tabla `payments` creada
- [x] Tabla `idempotency_keys` creada con UNIQUE constraint
- [x] Índices creados

## 💻 Código

### server.js
- [x] Pool de conexiones configurado
- [x] POST /pay con Idempotency-Key
- [x] Verificación de key existente
- [x] Inserción de key primero (para race conditions)
- [x] Manejo de UNIQUE constraint violation
- [x] Retry logic para race conditions
- [x] GET /payments para consultar
- [x] GET /idempotency-keys para ver keys
- [x] Manejo de errores con try/catch
- [x] ROLLBACK en caso de error

### schema.sql
- [x] Tabla payments con SERIAL PRIMARY KEY
- [x] Tabla idempotency_keys con UNIQUE constraint
- [x] JSONB para request_body y response_body
- [x] Índices en idempotency_key
- [x] Timestamps automáticos

## 🧪 Experimentos realizados

- [x] Crear pago simple
- [x] Reintentar con mismo key (devuelve guardado)
- [x] 10 requests simultáneos (race condition)
- [x] Observar UNIQUE constraint violation
- [x] Verificar que solo 1 pago se crea
- [x] Keys diferentes crean pagos diferentes
- [x] Request sin Idempotency-Key falla

## 📚 Documentación

- [x] README con instrucciones
- [x] Análisis con experimentos
- [x] Explicación de race conditions
- [x] Comparación con/sin idempotencia
- [x] Casos de uso reales
- [x] Conceptos clave explicados
- [x] Lecciones aprendidas

## 🎯 Conceptos dominados

- [x] Idempotency-Key header
- [x] Deduplicación de requests
- [x] UNIQUE constraint para unicidad
- [x] Tabla de control (idempotency_keys)
- [x] JSONB para flexibilidad
- [x] Race conditions en concurrencia
- [x] Retry logic
- [x] At-least-once delivery

## 🐛 Problemas encontrados y resueltos

- [x] Race condition con 10 requests simultáneos
- [x] UNIQUE constraint violation
- [x] Solución: Insertar key primero + retry logic

---

## ✅ Estado: COMPLETO

**Kata 2 lista para continuar con Kata 3: Message Queues**

## 📊 Resumen de aprendizajes

| Concepto | Kata 0 | Kata 1 | Kata 2 |
|----------|--------|--------|--------|
| **Estado** | Memoria | Disco | Disco |
| **Persistencia** | No | Sí | Sí |
| **Transacciones** | No | Sí | Sí |
| **Idempotencia** | No | No | Sí |
| **Deduplicación** | No | No | Sí |
| **Race conditions** | Mutex | DB maneja | Manejo manual |

**Progreso:** 2/8 katas completadas (25%)
