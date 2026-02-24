-- ============================================
-- BASE DE DATOS: orders_db
-- ============================================
CREATE DATABASE IF NOT EXISTS orders_saga_db;

-- ============================================
-- TABLA: orders
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA: payments
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    payment_method VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    refunded_at TIMESTAMP
);

-- ============================================
-- TABLA: inventory
-- ============================================
CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL UNIQUE,
    quantity INTEGER NOT NULL CHECK (quantity >= 0),
    reserved INTEGER DEFAULT 0 CHECK (reserved >= 0),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA: saga_state
-- ============================================
-- Tracking del estado de cada saga
CREATE TABLE IF NOT EXISTS saga_state (
    id SERIAL PRIMARY KEY,
    saga_id VARCHAR(255) NOT NULL UNIQUE,
    order_id INTEGER,
    payment_id INTEGER,
    current_step VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'started',
    data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar productos de ejemplo
INSERT INTO inventory (product_id, quantity, reserved) VALUES
(1, 100, 0),
(2, 50, 0),
(3, 0, 0)  -- Sin stock para probar compensación
ON CONFLICT (product_id) DO NOTHING;

SELECT 'Schema de Sagas creado exitosamente' AS status;
