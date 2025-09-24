/**
 * Circuit Breaker for RPC calls to prevent runaway costs
 * Implements exponential backoff and automatic recovery
 */

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  nextAttempt: number;
}

class CircuitBreaker {
  private state: CircuitBreakerState = {
    failures: 0,
    lastFailureTime: 0,
    state: 'CLOSED',
    nextAttempt: 0
  };

  private readonly maxFailures = 5;
  private readonly timeout = 60000; // 1 minute
  private readonly backoffMultiplier = 2;
  private readonly maxBackoff = 300000; // 5 minutes

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state.state === 'OPEN') {
      if (Date.now() < this.state.nextAttempt) {
        throw new Error('Circuit breaker is OPEN - too many failures. Please try again later.');
      }
      this.state.state = 'HALF_OPEN';
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.state.failures = 0;
    this.state.state = 'CLOSED';
  }

  private onFailure() {
    this.state.failures++;
    this.state.lastFailureTime = Date.now();

    if (this.state.failures >= this.maxFailures) {
      this.state.state = 'OPEN';
      const backoffTime = Math.min(
        this.timeout * Math.pow(this.backoffMultiplier, this.state.failures - this.maxFailures),
        this.maxBackoff
      );
      this.state.nextAttempt = Date.now() + backoffTime;
      
      console.warn(`Circuit breaker OPEN after ${this.state.failures} failures. Next attempt in ${Math.round(backoffTime / 1000)}s`);
    }
  }

  getState() {
    return {
      ...this.state,
      isOpen: this.state.state === 'OPEN',
      canAttempt: this.state.state !== 'OPEN' || Date.now() >= this.state.nextAttempt
    };
  }

  reset() {
    this.state = {
      failures: 0,
      lastFailureTime: 0,
      state: 'CLOSED',
      nextAttempt: 0
    };
  }
}

// Global circuit breaker instance
export const rpcCircuitBreaker = new CircuitBreaker();

// Rate limiter to prevent too many calls in a short time
class RateLimiter {
  private calls: number[] = [];
  private readonly maxCalls = 10; // Max 10 calls per window
  private readonly windowMs = 30000; // 30 second window

  canMakeCall(): boolean {
    const now = Date.now();
    // Remove calls outside the window
    this.calls = this.calls.filter(time => now - time < this.windowMs);
    
    return this.calls.length < this.maxCalls;
  }

  recordCall(): void {
    this.calls.push(Date.now());
  }

  getWaitTime(): number {
    if (this.calls.length === 0) return 0;
    
    const oldestCall = Math.min(...this.calls);
    const waitTime = this.windowMs - (Date.now() - oldestCall);
    return Math.max(0, waitTime);
  }
}

export const rpcRateLimiter = new RateLimiter();

// Safe RPC call wrapper
export async function safeRpcCall<T>(
  operation: () => Promise<T>,
  operationName: string = 'RPC call'
): Promise<T> {
  // Check rate limiter first
  if (!rpcRateLimiter.canMakeCall()) {
    const waitTime = rpcRateLimiter.getWaitTime();
    throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds before trying again.`);
  }

  // Record the call
  rpcRateLimiter.recordCall();

  // Execute with circuit breaker
  return rpcCircuitBreaker.execute(async () => {
    console.log(`[RPC] Executing: ${operationName}`);
    return operation();
  });
}
