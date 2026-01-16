// Performance metrics and monitoring utilities
import { Request, Response, NextFunction } from 'express';

export interface Metrics {
  requestCount: number;
  successCount: number;
  errorCount: number;
  averageResponseTime: number;
  totalResponseTime: number;
  lastRequestTime: Date | null;
  errorsByCode: Record<string, number>;
}

class MetricsCollector {
  private metrics: Metrics = {
    requestCount: 0,
    successCount: 0,
    errorCount: 0,
    averageResponseTime: 0,
    totalResponseTime: 0,
    lastRequestTime: null,
    errorsByCode: {}
  };

  recordRequest(duration: number, success: boolean, errorCode?: string) {
    this.metrics.requestCount++;
    this.metrics.totalResponseTime += duration;
    this.metrics.averageResponseTime = this.metrics.totalResponseTime / this.metrics.requestCount;
    this.metrics.lastRequestTime = new Date();

    if (success) {
      this.metrics.successCount++;
    } else {
      this.metrics.errorCount++;
      if (errorCode) {
        this.metrics.errorsByCode[errorCode] = (this.metrics.errorsByCode[errorCode] || 0) + 1;
      }
    }
  }

  getMetrics(): Metrics {
    return { ...this.metrics };
  }

  reset() {
    this.metrics = {
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      totalResponseTime: 0,
      lastRequestTime: null,
      errorsByCode: {}
    };
  }

  getSuccessRate(): number {
    return this.metrics.requestCount > 0 ? (this.metrics.successCount / this.metrics.requestCount) * 100 : 0;
  }
}

export const metricsCollector = new MetricsCollector();

// Middleware for performance monitoring
export function performanceMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  const originalSend = res.send;
  res.send = function(this: Response, ...args: any[]) {
    const duration = Date.now() - startTime;
    const success = res.statusCode < 400;
    const errorCode = success ? undefined : (res.statusCode.toString());
    
    metricsCollector.recordRequest(duration, success, errorCode);
    
    // Add performance headers
    res.set('X-Response-Time', `${duration}ms`);
    res.set('X-Request-ID', req.headers['x-request-id'] as string || 'unknown');
    
    return originalSend.call(this, ...args);
  };
  
  next();
}
