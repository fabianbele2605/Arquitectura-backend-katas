class CircuitBreaker {
    constructor(options = {}) {
        // Configuración del circuit breaker
        this.failureThreshold = options.failureThreshold || 5;  // Fallos para abrir
        this.successThreshold = options.successThreshold || 2;  // Éxitos para cerrar
        this.timeout = options.timeout || 3000;                 // Timeout por request
        this.resetTimeout = options.resetTimeout || 10000;      // Tiempo antes de probar
        
        // Estado inicial
        this.state = 'CLOSED'; // CLOSED (normal), OPEN (bloqueado), HALF_OPEN (probando)
        this.failureCount = 0;
        this.successCount = 0;
        this.nextAttempt = Date.now();
    }
    
    async execute(fn) {
        // Si está OPEN, verificar si es momento de probar
        if (this.state === 'OPEN') {
            if (Date.now() < this.nextAttempt) {
                throw new Error('Circuit breaker is OPEN');
            }
            this.state = 'HALF_OPEN';
            console.log('🔄 Circuit breaker: HALF_OPEN (probando)');
        }
        
        try {
            const result = await this.callWithTimeout(fn);
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }
    
    async callWithTimeout(fn) {
        // Ejecutar función con timeout
        return Promise.race([
            fn(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), this.timeout)
            )
        ]);
    }
    
    onSuccess() {
        this.failureCount = 0;
        
        // Si está en HALF_OPEN, contar éxitos para cerrar
        if (this.state === 'HALF_OPEN') {
            this.successCount++;
            if (this.successCount >= this.successThreshold) {
                this.state = 'CLOSED';
                this.successCount = 0;
                console.log('✅ Circuit breaker: CLOSED (recuperado)');
            }
        }
    }
    
    onFailure() {
        this.failureCount++;
        this.successCount = 0;
        
        // Si alcanza threshold, abrir circuit breaker
        if (this.failureCount >= this.failureThreshold) {
            this.state = 'OPEN';
            this.nextAttempt = Date.now() + this.resetTimeout;
            console.log(`🔴 Circuit breaker: OPEN (bloqueado por ${this.resetTimeout}ms)`);
        }
    }
    
    getState() {
        return {
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount
        };
    }
}

module.exports = CircuitBreaker;
