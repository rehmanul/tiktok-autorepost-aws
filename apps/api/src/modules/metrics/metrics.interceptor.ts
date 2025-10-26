import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import type { Counter, Histogram } from 'prom-client';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('api_http_requests_total')
    private readonly requestCounter: Counter<string>,
    @InjectMetric('api_http_request_duration_seconds')
    private readonly requestDuration: Histogram<string>
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const response = httpContext.getResponse();

    const method = request.method;
    const rawPath: string = request.route?.path ?? request.path ?? request.url ?? 'unknown';
    const path = normalizePath(rawPath);
    const stopTimer = this.requestDuration.startTimer({ method, path });

    const record = (status: number) => {
      this.requestCounter.inc({ method, path, status: status.toString() });
      stopTimer();
    };

    return next.handle().pipe(
      tap(() => record(response.statusCode ?? 200)),
      catchError((err) => {
        const status =
          typeof err?.status === 'number'
            ? err.status
            : typeof err?.getStatus === 'function'
              ? err.getStatus()
              : 500;
        record(status);
        return throwError(() => err);
      })
    );
  }
}

function normalizePath(path: string): string {
  if (!path) {
    return 'unknown';
  }
  return path.replace(/\d+/g, ':id');
}
