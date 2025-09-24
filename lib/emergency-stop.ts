/**
 * Emergency stop mechanisms and usage monitoring
 * Prevents runaway RPC costs and provides monitoring
 */

import { rpcCircuitBreaker, rpcRateLimiter } from "./circuit-breaker";
import { cacheManager } from "./cache-manager";

interface UsageStats {
  totalCalls: number;
  failedCalls: number;
  circuitBreakerTrips: number;
  lastReset: Date;
  estimatedCost: number; // In USD (rough estimate)
}

class EmergencyStopManager {
  private stats: UsageStats = {
    totalCalls: 0,
    failedCalls: 0,
    circuitBreakerTrips: 0,
    lastReset: new Date(),
    estimatedCost: 0
  };

  private readonly maxCallsPerHour = 1000; // Emergency limit
  private readonly maxCostPerHour = 10; // $10 emergency limit
  private readonly costPerCall = 0.01; // Rough estimate

  private isEmergencyStopped = false;
  private listeners: Array<(isStopped: boolean) => void> = [];

  constructor() {
    // Load stats from localStorage
    this.loadStats();
    
    // Reset stats every hour
    setInterval(() => {
      this.resetHourlyStats();
    }, 60 * 60 * 1000);
  }

  recordCall(success: boolean = true) {
    if (this.isEmergencyStopped) return false;

    this.stats.totalCalls++;
    this.stats.estimatedCost += this.costPerCall;

    if (!success) {
      this.stats.failedCalls++;
    }

    // Check for emergency conditions
    this.checkEmergencyConditions();
    
    // Save stats
    this.saveStats();
    
    return !this.isEmergencyStopped;
  }

  recordCircuitBreakerTrip() {
    this.stats.circuitBreakerTrips++;
    this.saveStats();
  }

  private checkEmergencyConditions() {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    // Check if we've exceeded limits in the last hour
    if (this.stats.totalCalls > this.maxCallsPerHour) {
      this.triggerEmergencyStop('Too many API calls in the last hour');
      return;
    }

    if (this.stats.estimatedCost > this.maxCostPerHour) {
      this.triggerEmergencyStop('Estimated cost exceeded hourly limit');
      return;
    }

    // Check circuit breaker state
    const circuitState = rpcCircuitBreaker.getState();
    if (circuitState.isOpen && this.stats.circuitBreakerTrips > 10) {
      this.triggerEmergencyStop('Circuit breaker opened too many times');
      return;
    }
  }

  private triggerEmergencyStop(reason: string) {
    if (this.isEmergencyStopped) return;

    this.isEmergencyStopped = true;
    console.error(`[EMERGENCY STOP] ${reason}`);
    console.error('[EMERGENCY STOP] All RPC calls are now blocked to prevent runaway costs');
    
    // Notify listeners
    this.listeners.forEach(listener => listener(true));
    
    // Save emergency state (client side only)
    if (typeof window !== 'undefined') {
      localStorage.setItem('emergency-stop', JSON.stringify({
        isStopped: true,
        reason,
        timestamp: Date.now()
      }));
    }
  }

  resetEmergencyStop() {
    this.isEmergencyStopped = false;
    this.resetHourlyStats();
    
    // Clear emergency state (client side only)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('emergency-stop');
    }
    
    // Reset circuit breaker
    rpcCircuitBreaker.reset();
    
    // Notify listeners
    this.listeners.forEach(listener => listener(false));
    
  }

  private resetHourlyStats() {
    this.stats = {
      totalCalls: 0,
      failedCalls: 0,
      circuitBreakerTrips: 0,
      lastReset: new Date(),
      estimatedCost: 0
    };
    this.saveStats();
  }

  private loadStats() {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    try {
      const saved = localStorage.getItem('usage-stats');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.stats = {
          ...this.stats,
          ...parsed,
          lastReset: new Date(parsed.lastReset || Date.now())
        };
      }

      // Check for existing emergency stop
      const emergencyStop = localStorage.getItem('emergency-stop');
      if (emergencyStop) {
        const parsed = JSON.parse(emergencyStop);
        this.isEmergencyStopped = parsed.isStopped;
      }
    } catch (error) {
      console.warn('Failed to load usage stats:', error);
    }
  }

  private saveStats() {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('usage-stats', JSON.stringify(this.stats));
    } catch (error) {
      console.warn('Failed to save usage stats:', error);
    }
  }

  getStats(): UsageStats & { isEmergencyStopped: boolean } {
    return {
      ...this.stats,
      isEmergencyStopped: this.isEmergencyStopped
    };
  }

  addListener(listener: (isStopped: boolean) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  isStopped(): boolean {
    return this.isEmergencyStopped;
  }

  // Force stop (for manual emergency)
  forceStop(reason: string = 'Manual emergency stop') {
    this.triggerEmergencyStop(reason);
  }
}

// Global emergency stop manager
export const emergencyStopManager = new EmergencyStopManager();

// Enhanced safe RPC call with emergency stop protection
export async function emergencySafeRpcCall<T>(
  operation: () => Promise<T>,
  operationName: string = 'RPC call'
): Promise<T> {
  // Check emergency stop first
  if (emergencyStopManager.isStopped()) {
    throw new Error('EMERGENCY STOP: All RPC calls are blocked to prevent runaway costs');
  }

  try {
    const result = await operation();
    emergencyStopManager.recordCall(true);
    return result;
  } catch (error) {
    emergencyStopManager.recordCall(false);
    throw error;
  }
}

// Usage monitoring component data
export function getUsageStats() {
  const stats = emergencyStopManager.getStats();
  const cacheStats = cacheManager.getStats();
  
  return {
    ...stats,
    cache: cacheStats,
    circuitBreaker: rpcCircuitBreaker.getState(),
    rateLimiter: {
      canMakeCall: rpcRateLimiter.canMakeCall(),
      waitTime: rpcRateLimiter.getWaitTime()
    }
  };
}
