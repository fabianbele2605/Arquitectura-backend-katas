const metrics = {
    requests: 0,
    errors: 0,
    latencies: []
};

function metricsMiddleware(req, res, next) {
    const start = Date.now();
    
    metrics.requests++;
    
    // Capturar cuando termina el response
    res.on('finish', () => {
        const duration = Date.now() - start;
        metrics.latencies.push(duration);
        
        if (res.statusCode >= 400) {
            metrics.errors++;
        }
        
        // Mantener solo últimas 1000 latencias
        if (metrics.latencies.length > 1000) {
            metrics.latencies.shift();
        }
    });
    
    next();
}

function getMetrics() {
    const sorted = [...metrics.latencies].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
    
    return {
        totalRequests: metrics.requests,
        totalErrors: metrics.errors,
        errorRate: metrics.requests > 0 ? (metrics.errors / metrics.requests * 100).toFixed(2) + '%' : '0%',
        latency: {
            p50: p50 + 'ms',
            p95: p95 + 'ms',
            p99: p99 + 'ms',
            avg: sorted.length > 0 ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length) + 'ms' : '0ms'
        }
    };
}

module.exports = { metricsMiddleware, getMetrics };
