import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';

// In-memory metrics storage (in production, use Redis or dedicated metrics store)
class MetricsCollector {
  private httpRequests = new Map<string, number>();
  private httpDuration = new Map<string, number[]>();
  private httpErrors = new Map<string, number>();
  private scrapingJobs = {
    total: 0,
    completed: 0,
    failed: 0,
    running: 0
  };
  private scrapedFlights = {
    total: 0,
    flightradar24: 0,
    flightaware: 0
  };

  incrementHttpRequest(method: string, path: string, statusCode: number) {
    const key = `${method}:${path}:${statusCode}`;
    this.httpRequests.set(key, (this.httpRequests.get(key) || 0) + 1);

    if (statusCode >= 400) {
      const errorKey = `${method}:${path}`;
      this.httpErrors.set(errorKey, (this.httpErrors.get(errorKey) || 0) + 1);
    }
  }

  recordHttpDuration(method: string, path: string, duration: number) {
    const key = `${method}:${path}`;
    const durations = this.httpDuration.get(key) || [];
    durations.push(duration);

    // Keep only last 1000 measurements
    if (durations.length > 1000) {
      durations.shift();
    }

    this.httpDuration.set(key, durations);
  }

  updateScrapingJobMetrics(type: 'completed' | 'failed' | 'running', delta: number = 1) {
    this.scrapingJobs[type] += delta;
    this.scrapingJobs.total += delta;
  }

  updateScrapedFlightsMetrics(source: 'flightradar24' | 'flightaware', count: number) {
    this.scrapedFlights[source] += count;
    this.scrapedFlights.total += count;
  }

  getPrometheusMetrics(): string {
    const metrics: string[] = [];

    // HTTP request metrics
    metrics.push('# HELP http_requests_total Total number of HTTP requests');
    metrics.push('# TYPE http_requests_total counter');

    for (const [key, value] of this.httpRequests.entries()) {
      const [method, path, code] = key.split(':');
      metrics.push(`http_requests_total{method="${method}",path="${path}",code="${code}"} ${value}`);
    }

    // HTTP error metrics
    metrics.push('# HELP http_errors_total Total number of HTTP errors');
    metrics.push('# TYPE http_errors_total counter');

    for (const [key, value] of this.httpErrors.entries()) {
      const [method, path] = key.split(':');
      metrics.push(`http_errors_total{method="${method}",path="${path}"} ${value}`);
    }

    // HTTP duration metrics (simplified percentiles)
    metrics.push('# HELP http_request_duration_seconds HTTP request duration in seconds');
    metrics.push('# TYPE http_request_duration_seconds histogram');

    for (const [key, durations] of this.httpDuration.entries()) {
      const [method, path] = key.split(':');
      const sorted = durations.sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
      const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
      const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;

      metrics.push(`http_request_duration_seconds{method="${method}",path="${path}",quantile="0.5"} ${(p50/1000).toFixed(3)}`);
      metrics.push(`http_request_duration_seconds{method="${method}",path="${path}",quantile="0.95"} ${(p95/1000).toFixed(3)}`);
      metrics.push(`http_request_duration_seconds{method="${method}",path="${path}",quantile="0.99"} ${(p99/1000).toFixed(3)}`);
    }

    // Scraping job metrics
    metrics.push('# HELP reservasegura_scraping_jobs_total Total number of scraping jobs');
    metrics.push('# TYPE reservasegura_scraping_jobs_total counter');
    metrics.push(`reservasegura_scraping_jobs_total ${this.scrapingJobs.total}`);

    metrics.push('# HELP reservasegura_scraping_jobs_completed_total Completed scraping jobs');
    metrics.push('# TYPE reservasegura_scraping_jobs_completed_total counter');
    metrics.push(`reservasegura_scraping_jobs_completed_total ${this.scrapingJobs.completed}`);

    metrics.push('# HELP reservasegura_scraping_jobs_failed_total Failed scraping jobs');
    metrics.push('# TYPE reservasegura_scraping_jobs_failed_total counter');
    metrics.push(`reservasegura_scraping_jobs_failed_total ${this.scrapingJobs.failed}`);

    metrics.push('# HELP reservasegura_scraping_jobs_running Current running scraping jobs');
    metrics.push('# TYPE reservasegura_scraping_jobs_running gauge');
    metrics.push(`reservasegura_scraping_jobs_running ${this.scrapingJobs.running}`);

    // Scraped flights metrics
    metrics.push('# HELP reservasegura_scraped_flights_total Total number of scraped flights');
    metrics.push('# TYPE reservasegura_scraped_flights_total counter');
    metrics.push(`reservasegura_scraped_flights_total ${this.scrapedFlights.total}`);

    metrics.push('# HELP reservasegura_scraped_flights_by_source Scraped flights by source');
    metrics.push('# TYPE reservasegura_scraped_flights_by_source counter');
    metrics.push(`reservasegura_scraped_flights_by_source{source="flightradar24"} ${this.scrapedFlights.flightradar24}`);
    metrics.push(`reservasegura_scraped_flights_by_source{source="flightaware"} ${this.scrapedFlights.flightaware}`);

    return metrics.join('\n') + '\n';
  }

  getJsonMetrics() {
    return {
      http: {
        requests: Object.fromEntries(this.httpRequests),
        errors: Object.fromEntries(this.httpErrors),
        durations: Object.fromEntries(
          Array.from(this.httpDuration.entries()).map(([key, durations]) => [
            key,
            {
              count: durations.length,
              avg: durations.reduce((a, b) => a + b, 0) / durations.length || 0,
              min: Math.min(...durations) || 0,
              max: Math.max(...durations) || 0
            }
          ])
        )
      },
      scraping: {
        jobs: this.scrapingJobs,
        flights: this.scrapedFlights
      },
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton metrics collector
export const metricsCollector = new MetricsCollector();

// Middleware to collect HTTP metrics
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = performance.now();

  // Override res.end to capture metrics when response finishes
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = performance.now() - start;
    const path = req.route?.path || req.path;

    metricsCollector.incrementHttpRequest(req.method, path, res.statusCode);
    metricsCollector.recordHttpDuration(req.method, path, duration);

    return originalEnd.call(this, chunk, encoding);
  };

  next();
}

// Route handler for Prometheus metrics endpoint
export function prometheusMetricsHandler(req: Request, res: Response) {
  res.set('Content-Type', 'text/plain');
  res.send(metricsCollector.getPrometheusMetrics());
}

// Route handler for JSON metrics endpoint
export function jsonMetricsHandler(req: Request, res: Response) {
  res.json(metricsCollector.getJsonMetrics());
}