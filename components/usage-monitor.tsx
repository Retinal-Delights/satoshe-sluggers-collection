/**
 * Usage monitoring component for RPC calls and costs
 * Shows real-time usage statistics and emergency controls
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, DollarSign, Activity, Shield, RefreshCw } from "lucide-react";
import { emergencyStopManager, getUsageStats } from "@/lib/emergency-stop";

interface UsageMonitorProps {
  className?: string;
  showEmergencyControls?: boolean;
}

export default function UsageMonitor({ 
  className = "", 
  showEmergencyControls = false 
}: UsageMonitorProps) {
  const [stats, setStats] = useState(getUsageStats());
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateStats = () => {
      setStats(getUsageStats());
    };

    // Update stats every 5 seconds
    const interval = setInterval(updateStats, 5000);
    
    // Listen for emergency stop changes
    const unsubscribe = emergencyStopManager.addListener((isStopped) => {
      updateStats();
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(2)}`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString();
  };

  const getStatusColor = () => {
    if (stats.isEmergencyStopped) return "text-red-500";
    if (stats.circuitBreaker.isOpen) return "text-orange-500";
    if (stats.rateLimiter.canMakeCall) return "text-green-500";
    return "text-yellow-500";
  };

  const getStatusText = () => {
    if (stats.isEmergencyStopped) return "EMERGENCY STOPPED";
    if (stats.circuitBreaker.isOpen) return "Rate Limited";
    if (stats.rateLimiter.canMakeCall) return "Normal";
    return "Throttled";
  };

  if (!isVisible && !stats.isEmergencyStopped) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
        className={`flex items-center gap-2 ${className}`}
      >
        <Activity className="h-4 w-4" />
        Usage Monitor
      </Button>
    );
  }

  return (
    <div className={`bg-neutral-800 border border-neutral-700 rounded-lg p-4 space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Usage Monitor
        </h3>
        <div className="flex items-center gap-2">
          <div className={`text-xs font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </div>
          {!stats.isEmergencyStopped && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className="h-6 w-6 p-0"
            >
              ×
            </Button>
          )}
        </div>
      </div>

      {/* Emergency Stop Alert */}
      {stats.isEmergencyStopped && (
        <div className="bg-red-900/20 border border-red-500/50 rounded p-3">
          <div className="flex items-center gap-2 text-red-400 text-sm font-medium">
            <AlertTriangle className="h-4 w-4" />
            Emergency Stop Active
          </div>
          <p className="text-red-300 text-xs mt-1">
            All RPC calls are blocked to prevent runaway costs.
          </p>
        </div>
      )}

      {/* Usage Stats */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-neutral-400">
            <Activity className="h-3 w-3" />
            <span>API Calls</span>
          </div>
          <div className="text-white font-mono">{stats.totalCalls}</div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1 text-neutral-400">
            <DollarSign className="h-3 w-3" />
            <span>Est. Cost</span>
          </div>
          <div className="text-white font-mono">{formatCost(stats.estimatedCost)}</div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1 text-neutral-400">
            <Shield className="h-3 w-3" />
            <span>Cache Hit</span>
          </div>
          <div className="text-white font-mono">
            {stats.cache.totalAccesses > 0 
              ? `${Math.round((stats.cache.totalAccesses / (stats.cache.totalAccesses + stats.totalCalls)) * 100)}%`
              : '0%'
            }
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1 text-neutral-400">
            <RefreshCw className="h-3 w-3" />
            <span>Last Reset</span>
          </div>
          <div className="text-white font-mono text-xs">
            {formatTime(stats.lastReset)}
          </div>
        </div>
      </div>

      {/* Circuit Breaker Status */}
      {stats.circuitBreaker.isOpen && (
        <div className="bg-orange-900/20 border border-orange-500/50 rounded p-2">
          <div className="text-orange-400 text-xs">
            Circuit Breaker: {stats.circuitBreakerTrips} failures
          </div>
        </div>
      )}

      {/* Rate Limiter Status */}
      {!stats.rateLimiter.canMakeCall && (
        <div className="bg-yellow-900/20 border border-yellow-500/50 rounded p-2">
          <div className="text-yellow-400 text-xs">
            Rate Limited: Wait {Math.ceil(stats.rateLimiter.waitTime / 1000)}s
          </div>
        </div>
      )}

      {/* Emergency Controls */}
      {showEmergencyControls && (
        <div className="pt-2 border-t border-neutral-700">
          <div className="flex gap-2">
            {stats.isEmergencyStopped ? (
              <Button
                onClick={() => emergencyStopManager.resetEmergencyStop()}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                Reset Emergency Stop
              </Button>
            ) : (
              <Button
                onClick={() => emergencyStopManager.forceStop('Manual emergency stop')}
                size="sm"
                variant="destructive"
              >
                Emergency Stop
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
