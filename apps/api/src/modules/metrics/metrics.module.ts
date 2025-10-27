import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import {
  PrometheusModule,
  makeCounterProvider,
  makeHistogramProvider
} from '@willsoto/nestjs-prometheus';
import { MetricsInterceptor } from './metrics.interceptor';

@Module({
  imports: [
    PrometheusModule.register({
      defaultLabels: {
        service: 'api'
      }
    })
  ],
  providers: [
    makeCounterProvider({
      name: 'api_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status']
    }),
    makeHistogramProvider({
      name: 'api_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path'],
      buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5]
    }),
    MetricsInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useExisting: MetricsInterceptor
    }
  ],
  exports: [PrometheusModule, MetricsInterceptor]
})
export class MetricsModule {}
