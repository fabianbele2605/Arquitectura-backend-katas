# Kata 1: Persistencia y Transacciones

## 🎯 Objetivo

Entender:
- Persistencia en base de datos
- Transacciones ACID
- Atomicidad (todo o nada)
- Rollback automático

## 📁 Estructura

Copy
kata-1-persistence/
├── sql/
│ └── schema.sql # Definición de tabla
├── node/
│ ├── package.json
│ └── server.js # Servidor con transacciones
└── docs/
└── analisis.md # Experimentos y conclusiones


## 🚀 Cómo ejecutar

### 1. Crear base de datos

```bash
sudo -u postgres psql
CREATE DATABASE orders_db;
CREATE USER orders_user WITH PASSWORD 'orders_pass';
GRANT ALL PRIVILEGES ON DATABASE orders_db TO orders_user;
\c orders_db
GRANT ALL ON SCHEMA public TO orders_user;
\q