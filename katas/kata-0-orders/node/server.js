const http = require('http');

// ============================================
// ESTADO GLOBAL (EN MEMORIA)
// ============================================
// Este array vive en la RAM del proceso
// Se pierde cuando el servidor se reinicia
const orders = [];
let nextId = 1;

// ============================================
// SERVIDOR HTTP
// ============================================
const server = http.createServer((req, res) => {
    // Configurar respuesta JSON
    res.setHeader('Content-Type', 'application/json');

    // ============================================
    // POST /orders - Crear nueva orden
    // ============================================
    if (req.method === 'POST' && req.url === '/orders') {
        let body = '';

        // Recibir datos del request
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        // Cuando termina de recibir datos
        req.on('end', () => {
            const order = JSON.parse(body);

            // EFECTO SECUNDARIO: Modificamos el estado global
            // Esta operación NO se puede deshacer
            const newOrder = {
                id: nextId++,           // ID único incremental
                ...order,               // Datos del cliente
                createdAt: new Date().toISOString()  // Timestamp
            };
            
            // Agregar al array (modifica estado)
            orders.push(newOrder);
            
            // Responder con la orden creada
            res.statusCode = 201;  // Created
            res.end(JSON.stringify(newOrder));
        });
    }

    // ============================================
    // GET /orders - Consultar todas las órdenes
    // ============================================
    else if (req.method === 'GET' && req.url === '/orders') {
        // Solo lectura, NO modifica estado
        res.statusCode = 200;  // OK
        res.end(JSON.stringify(orders));
    }
    
    // ============================================
    // Ruta no encontrada
    // ============================================
    else {
        res.statusCode = 404;  // Not Found
        res.end(JSON.stringify({ error: 'Not found' }));
    }
});

// ============================================
// INICIAR SERVIDOR
// ============================================
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Estado: EN MEMORIA (se pierde al reiniciar)');
});