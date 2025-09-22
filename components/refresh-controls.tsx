/**
 * User-triggered refresh controls to prevent automatic polling
 * Implements manual refresh buttons and usage monitoring
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
import { rpcCircuitBreaker, rpcRateLimiter } from "@/lib/circuit-breaker";

interface RefreshControlsProps {
  onRefresh: () => void;
  isLoading: boolean;
  lastRefresh?: Date;
  className?: string;
}

export default function RefreshControls({ 
  onRefresh, 
  isLoading, 
  lastRefresh, 
  className = "" 
}: RefreshControlsProps) {
  const [canRefresh, setCanRefresh] = useState(true);
  const [refreshCooldown, setRefreshCooldown] = useState(0);
  const [circuitBreakerState, setCircuitBreakerState] = useState(rpcCircuitBreaker.getState());

  // Check if we can make a refresh call
  useEffect(() => {
    const checkRefreshAvailability = () => {
      const canMakeCall = rpcRateLimiter.canMakeCall();
      const circuitBreakerOpen = circuitBreakerState.isOpen;
      
      setCanRefresh(canMakeCall && !circuitBreakerOpen);
      
      if (!canMakeCall) {
        const waitTime = rpcRateLimiter.getWaitTime();
        setRefreshCooldown(Math.ceil(waitTime / 1000));
      }
    };

    checkRefreshAvailability();
    
    // Update every second to show cooldown
    const interval = setInterval(() => {
      checkRefreshAvailability();
      setCircuitBreakerState(rpcCircuitBreaker.getState());
      
      if (refreshCooldown > 0) {
        setRefreshCooldown(prev => Math.max(0, prev - 1));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [circuitBreakerState.isOpen, refreshCooldown]);

  const handleRefresh = () => {
    if (!canRefresh || isLoading) return;
    
    onRefresh();
  };

  const formatLastRefresh = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Refresh Button */}
      <Button
        onClick={handleRefresh}
        disabled={!canRefresh || isLoading}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        {isLoading ? 'Refreshing...' : 'Refresh Data'}
      </Button>

      {/* Status Indicators */}
      <div className="flex items-center gap-2 text-sm">
        {/* Circuit Breaker Status */}
        {circuitBreakerState.isOpen ? (
          <div className="flex items-center gap-1 text-red-500">
            <AlertTriangle className="h-4 w-4" />
            <span>Rate Limited</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-green-500">
            <CheckCircle className="h-4 w-4" />
            <span>Ready</span>
          </div>
        )}

        {/* Cooldown Timer */}
        {refreshCooldown > 0 && (
          <div className="text-orange-500">
            Wait {refreshCooldown}s
          </div>
        )}

        {/* Last Refresh Time */}
        {lastRefresh && (
          <div className="text-neutral-400">
            Updated {formatLastRefresh(lastRefresh)}
          </div>
        )}
      </div>
    </div>
  );
}

// Usage monitoring component
export function UsageMonitor() {
  const [stats, setStats] = useState({
    totalCalls: 0,
    failedCalls: 0,
    circuitBreakerTrips: 0
  });

  useEffect(() => {
    // This would be connected to your actual usage tracking
    // For now, we'll just show the circuit breaker state
    const interval = setInterval(() => {
      const state = rpcCircuitBreaker.getState();
      setStats(prev => ({
        ...prev,
        circuitBreakerTrips: state.failures
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-xs text-neutral-500 space-y-1">
      <div>API Calls: {stats.totalCalls}</div>
      <div>Failures: {stats.failedCalls}</div>
      <div>Circuit Breaker: {stats.circuitBreakerTrips} failures</div>
    </div>
  );
}
