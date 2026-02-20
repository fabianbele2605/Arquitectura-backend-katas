-- =================================================
-- TABLA: payments
-- =================================================
-- Almacena los pagos realizados por los clientes.
-- ==================================================

CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =================================================
-- TABLA: idempotency_keys
-- =================================================
-- Almacena las claves de idempotencia 
-- Evita procesar la misma request dos veces.
-- ==================================================

CREATE TABLE IF NOT EXISTS idempotency_keys (
    id SERIAL PRIMARY KEY,
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,
    request_body JSONB NOT NULL,
    response_body JSONB,
    response_status INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =================================================
-- INDICES
-- =================================================
CREATE INDEX IF NOT EXISTS idx_idempotency_key ON idempotency_keys(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Mensaje de confirmación
SELECT 'Schema de idempotencia creado exitosamente' AS status;