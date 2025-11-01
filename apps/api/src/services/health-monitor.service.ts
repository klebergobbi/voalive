import { DataSource } from '@prisma/client';
import { prisma } from '@reservasegura/database';
import { getFlightScraperService } from './flight-scraper.service';

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message: string;
  timestamp: Date;
  responseTime?: number;
  details?: any;
}

export interface SystemHealth {
  overall: 'healthy' | 'unhealthy' | 'degraded';
  checks: HealthCheck[];
  timestamp: Date;
  uptime: number;
  version: string;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  cooldown: number; // minutes
  enabled: boolean;
  lastTriggered?: Date;
}

export class HealthMonitorService {
  private alerts = new Map<string, Date>();
  private startTime = Date.now();

  private alertRules: AlertRule[] = [
    {
      id: 'high_error_rate',
      name: 'High Error Rate',
      condition: 'error_rate > 5',
      threshold: 5, // 5% error rate
      cooldown: 15,
      enabled: true
    },
    {
      id: 'high_response_time',
      name: 'High Response Time',
      condition: 'avg_response_time > 2000',
      threshold: 2000, // 2 seconds
      cooldown: 10,
      enabled: true
    },
    {
      id: 'database_connections',
      name: 'High Database Connections',
      condition: 'db_connections > 80',
      threshold: 80, // 80% of max connections
      cooldown: 5,
      enabled: true
    },
    {
      id: 'scraping_failures',
      name: 'High Scraping Failure Rate',
      condition: 'scraping_failure_rate > 30',
      threshold: 30, // 30% failure rate
      cooldown: 20,
      enabled: true
    },
    {
      id: 'disk_usage',
      name: 'High Disk Usage',
      condition: 'disk_usage > 85',
      threshold: 85, // 85% disk usage
      cooldown: 30,
      enabled: true
    },
    {
      id: 'memory_usage',
      name: 'High Memory Usage',
      condition: 'memory_usage > 90',
      threshold: 90, // 90% memory usage
      cooldown: 5,
      enabled: true
    }
  ];

  async performHealthCheck(): Promise<SystemHealth> {
    const checks: HealthCheck[] = [];
    const startTime = Date.now();

    // Database connectivity check
    checks.push(await this.checkDatabase());

    // API endpoints check
    checks.push(await this.checkAPI());

    // Flight scraper service check
    checks.push(await this.checkFlightScraper());

    // External dependencies check
    checks.push(await this.checkFirecrawl());

    // System resources check
    checks.push(await this.checkSystemResources());

    // Determine overall health
    const overall = this.calculateOverallHealth(checks);

    const health: SystemHealth = {
      overall,
      checks,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || '1.0.0'
    };

    // Check alert conditions
    await this.checkAlerts(health);

    return health;
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const start = Date.now();

    try {
      // Test database connection
      await prisma.$queryRaw`SELECT 1 as test`;

      // Check active connections
      const connections = await prisma.$queryRaw`
        SELECT count(*) as active_connections
        FROM pg_stat_activity
        WHERE state = 'active'
      ` as any[];

      const responseTime = Date.now() - start;

      return {
        service: 'database',
        status: 'healthy',
        message: 'Database is responsive',
        timestamp: new Date(),
        responseTime,
        details: {
          activeConnections: connections[0]?.active_connections || 0
        }
      };
    } catch (error) {
      return {
        service: 'database',
        status: 'unhealthy',
        message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        responseTime: Date.now() - start
      };
    }
  }

  private async checkAPI(): Promise<HealthCheck> {
    const start = Date.now();

    try {
      // Test internal API endpoints
      const scraperService = getFlightScraperService();
      const stats = await scraperService.getScrapingStats();

      const responseTime = Date.now() - start;

      return {
        service: 'api',
        status: 'healthy',
        message: 'API is responsive',
        timestamp: new Date(),
        responseTime,
        details: {
          totalFlights: stats.totalFlights,
          runningJobs: stats.runningJobs
        }
      };
    } catch (error) {
      return {
        service: 'api',
        status: 'unhealthy',
        message: `API health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        responseTime: Date.now() - start
      };
    }
  }

  private async checkFlightScraper(): Promise<HealthCheck> {
    const start = Date.now();

    try {
      const scraperService = getFlightScraperService();
      const stats = await scraperService.getScrapingStats();

      const recentJobs = stats.recentJobs;
      const failedJobsCount = recentJobs.filter(job => job.status === 'FAILED').length;
      const totalJobsCount = recentJobs.length;

      const failureRate = totalJobsCount > 0 ? (failedJobsCount / totalJobsCount) * 100 : 0;

      const status = failureRate > 50 ? 'unhealthy' : failureRate > 20 ? 'degraded' : 'healthy';

      return {
        service: 'flight_scraper',
        status,
        message: `Flight scraper is ${status} (${failureRate.toFixed(1)}% failure rate)`,
        timestamp: new Date(),
        responseTime: Date.now() - start,
        details: {
          failureRate,
          totalJobs: totalJobsCount,
          failedJobs: failedJobsCount,
          runningJobs: stats.runningJobs
        }
      };
    } catch (error) {
      return {
        service: 'flight_scraper',
        status: 'unhealthy',
        message: `Flight scraper check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        responseTime: Date.now() - start
      };
    }
  }

  private async checkFirecrawl(): Promise<HealthCheck> {
    const start = Date.now();

    try {
      // Simple test to validate Firecrawl API key
      const apiKey = process.env.FIRECRAWL_API_KEY;

      if (!apiKey || apiKey === 'your-api-key-here') {
        return {
          service: 'firecrawl',
          status: 'unhealthy',
          message: 'Firecrawl API key not configured',
          timestamp: new Date(),
          responseTime: Date.now() - start
        };
      }

      // Test API availability (simplified check)
      const response = await fetch('https://api.firecrawl.dev/v0/status', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      const status = response.ok ? 'healthy' : 'degraded';

      return {
        service: 'firecrawl',
        status,
        message: `Firecrawl API is ${status}`,
        timestamp: new Date(),
        responseTime: Date.now() - start,
        details: {
          statusCode: response.status,
          configured: true
        }
      };
    } catch (error) {
      return {
        service: 'firecrawl',
        status: 'degraded',
        message: `Firecrawl check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        responseTime: Date.now() - start
      };
    }
  }

  private async checkSystemResources(): Promise<HealthCheck> {
    const start = Date.now();

    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      const memoryTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
      const memoryPercent = (memoryUsedMB / memoryTotalMB) * 100;

      const status = memoryPercent > 90 ? 'unhealthy' : memoryPercent > 70 ? 'degraded' : 'healthy';

      return {
        service: 'system_resources',
        status,
        message: `System resources are ${status} (${memoryPercent.toFixed(1)}% memory usage)`,
        timestamp: new Date(),
        responseTime: Date.now() - start,
        details: {
          memory: {
            used: memoryUsedMB,
            total: memoryTotalMB,
            percent: memoryPercent
          },
          uptime: process.uptime()
        }
      };
    } catch (error) {
      return {
        service: 'system_resources',
        status: 'degraded',
        message: `System resources check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        responseTime: Date.now() - start
      };
    }
  }

  private calculateOverallHealth(checks: HealthCheck[]): 'healthy' | 'unhealthy' | 'degraded' {
    const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length;
    const degradedCount = checks.filter(c => c.status === 'degraded').length;

    if (unhealthyCount > 0) {
      return 'unhealthy';
    } else if (degradedCount > 0) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  private async checkAlerts(health: SystemHealth): Promise<void> {
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      const lastTriggered = this.alerts.get(rule.id);
      const cooldownExpired = !lastTriggered ||
        (Date.now() - lastTriggered.getTime()) > rule.cooldown * 60 * 1000;

      if (!cooldownExpired) continue;

      let shouldTrigger = false;
      let alertMessage = '';

      switch (rule.id) {
        case 'high_error_rate':
          // Calculate error rate from recent requests (simplified)
          const errorRate = this.calculateErrorRate();
          shouldTrigger = errorRate > rule.threshold;
          alertMessage = `Error rate is ${errorRate.toFixed(1)}% (threshold: ${rule.threshold}%)`;
          break;

        case 'high_response_time':
          // Calculate average response time (simplified)
          const avgResponseTime = this.calculateAverageResponseTime(health);
          shouldTrigger = avgResponseTime > rule.threshold;
          alertMessage = `Average response time is ${avgResponseTime.toFixed(0)}ms (threshold: ${rule.threshold}ms)`;
          break;

        case 'scraping_failures':
          const scrapingCheck = health.checks.find(c => c.service === 'flight_scraper');
          const failureRate = scrapingCheck?.details?.failureRate || 0;
          shouldTrigger = failureRate > rule.threshold;
          alertMessage = `Scraping failure rate is ${failureRate.toFixed(1)}% (threshold: ${rule.threshold}%)`;
          break;

        default:
          // Check if any service is unhealthy for general alerts
          shouldTrigger = health.overall === 'unhealthy';
          alertMessage = `System health is ${health.overall}`;
      }

      if (shouldTrigger) {
        await this.triggerAlert(rule, alertMessage, health);
        this.alerts.set(rule.id, new Date());
      }
    }
  }

  private calculateErrorRate(): number {
    // Simplified error rate calculation - returns 0 until real metrics are implemented
    // TODO: In production, use actual metrics from the metrics middleware
    return 0; // No real metrics available yet
  }

  private calculateAverageResponseTime(health: SystemHealth): number {
    const responseTimes = health.checks
      .filter(c => c.responseTime)
      .map(c => c.responseTime!);

    if (responseTimes.length === 0) return 0;

    return responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  }

  private async triggerAlert(rule: AlertRule, message: string, health: SystemHealth): Promise<void> {
    const alert = {
      id: rule.id,
      name: rule.name,
      message,
      severity: health.overall === 'unhealthy' ? 'high' : 'medium',
      timestamp: new Date(),
      health
    };

    console.warn(`🚨 ALERT TRIGGERED: ${rule.name} - ${message}`);

    // Send to external alerting systems
    await this.sendAlert(alert);
  }

  private async sendAlert(alert: any): Promise<void> {
    // Send to Slack
    if (process.env.SLACK_WEBHOOK_URL) {
      try {
        await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚨 VoaLive Alert: ${alert.name}`,
            attachments: [{
              color: alert.severity === 'high' ? 'danger' : 'warning',
              fields: [
                {
                  title: 'Message',
                  value: alert.message,
                  short: false
                },
                {
                  title: 'Timestamp',
                  value: alert.timestamp.toISOString(),
                  short: true
                },
                {
                  title: 'Overall Status',
                  value: alert.health.overall.toUpperCase(),
                  short: true
                }
              ]
            }]
          })
        });
      } catch (error) {
        console.error('Failed to send Slack alert:', error);
      }
    }

    // Send to Discord
    if (process.env.DISCORD_WEBHOOK_URL) {
      try {
        await fetch(process.env.DISCORD_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: `🚨 VoaLive Alert: ${alert.name}`,
              description: alert.message,
              color: alert.severity === 'high' ? 15158332 : 16776960, // Red or Yellow
              fields: [
                {
                  name: 'Overall Status',
                  value: alert.health.overall.toUpperCase(),
                  inline: true
                },
                {
                  name: 'Timestamp',
                  value: alert.timestamp.toISOString(),
                  inline: true
                }
              ]
            }]
          })
        });
      } catch (error) {
        console.error('Failed to send Discord alert:', error);
      }
    }

    // Send email (if configured)
    if (process.env.SMTP_ENABLED === 'true') {
      // Email alerting implementation would go here
      console.log('Email alert would be sent here');
    }
  }

  async getHealthHistory(hours: number = 24): Promise<any> {
    // This would typically be stored in a time-series database
    // For now, return current health status
    return {
      period: `${hours} hours`,
      checks: await this.performHealthCheck(),
      alerts: Array.from(this.alerts.entries()).map(([id, timestamp]) => ({
        ruleId: id,
        triggeredAt: timestamp
      }))
    };
  }
}

// Singleton instance
let healthMonitorService: HealthMonitorService;

export function getHealthMonitorService(): HealthMonitorService {
  if (!healthMonitorService) {
    healthMonitorService = new HealthMonitorService();
  }
  return healthMonitorService;
}