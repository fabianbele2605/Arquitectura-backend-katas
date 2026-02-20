# ✅ Checklist de Verificación - Kata 1

## 📂 Estructura de archivos

- [x] `README.md` - Instrucciones completas
- [x] `sql/schema.sql` - Definición de tabla
- [x] `node/server.js` - Servidor con transacciones
- [x] `node/package.json` - Dependencias
- [x] `docs/analisis.md` - Documentación de experimentos

## 🔧 Configuración

- [x] PostgreSQL instalado
- [x] Base de datos `orders_db` creada
- [x] Usuario `orders_user` creado
- [x] Permisos otorgados
- [x] Tabla `orders` creada
- [x] Índice `idx_orders_created_at` creado

## 💻 Código

### server.js
- [x] Pool de conexiones configurado
- [x] POST /orders con transacción
- [x] POST /orders/batch con transacción
- [x] GET /orders para consultar
- [x] Manejo de errores con try/catch
- [x] ROLLBACK en caso de error
- [x] client.release() en finally

### schema.sql
- [x] Tabla orders con SERIAL PRIMARY KEY
- [x] CHECK constraint en quantity > 0
- [x] CHECK constraint en price > 0
- [x] Índice en created_at
- [x] Timestamp automático

## 🧪 Experimentos realizados

- [x] Crear órdenes simples
- [x] Verificar persistencia (reiniciar servidor)
- [x] Transacción exitosa (batch válido)
- [x] Transacción con rollback (precio negativo)
- [x] Observar logs del servidor

## 📚 Documentación

- [x] README con instrucciones
- [x] Análisis con experimentos
- [x] Comparación Memoria vs PostgreSQL
- [x] Explicación de ACID
- [x] Casos de uso reales
- [x] Conceptos clave explicados

## 🎯 Conceptos dominados

- [x] Persistencia en disco
- [x] Transacciones (BEGIN/COMMIT/ROLLBACK)
- [x] Atomicidad (todo o nada)
- [x] CHECK constraints
- [x] SERIAL (auto-increment)
- [x] Pool de conexiones
- [x] Queries parametrizadas

---

## ✅ Estado: COMPLETO

**Kata 1 lista para continuar con Kata 2: Idempotencia**
