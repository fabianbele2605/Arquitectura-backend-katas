-- ==================================================================
-- TABLA: orders
-- ==================================================================
-- Almacena las ordenes de compra
-- ID es auto-incremental (SERIAL)
-- ==================================================================

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    product VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================================================================
-- ÍNDICE: Para búsquedas rápidas por fecha
-- ==================================================================
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Mensaje de confirmación
SELECT 'Schema creado exitosamente' AS status;
