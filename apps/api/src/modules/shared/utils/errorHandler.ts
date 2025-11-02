/**
 * Tratamento centralizado de erros
 * @module errorHandler
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Tipos de erro customizados
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  SCRAPING = 'SCRAPING_ERROR',
  CAPTCHA = 'CAPTCHA_DETECTED',
  TWO_FA = 'TWO_FA_REQUIRED',
  RATE_LIMIT = 'RATE_LIMIT_EXCEEDED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  TIMEOUT = 'TIMEOUT_ERROR',
  PROXY = 'PROXY_ERROR',
  DATABASE = 'DATABASE_ERROR',
  REDIS = 'REDIS_ERROR',
  INTERNAL = 'INTERNAL_ERROR',
}

/**
 * Classe de erro customizada
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    type: ErrorType = ErrorType.INTERNAL,
    statusCode: number = 500,
    details?: any
  ) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Erros específicos pré-configurados
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.VALIDATION, 400, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Não autenticado', details?: any) {
    super(message, ErrorType.AUTHENTICATION, 401, details);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Sem permissão', details?: any) {
    super(message, ErrorType.AUTHORIZATION, 403, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Recurso não encontrado', details?: any) {
    super(message, ErrorType.NOT_FOUND, 404, details);
  }
}

export class ScrapingError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.SCRAPING, 500, details);
  }
}

export class CaptchaError extends AppError {
  constructor(message: string = 'Captcha detectado', details?: any) {
    super(message, ErrorType.CAPTCHA, 429, details);
  }
}

export class TwoFAError extends AppError {
  constructor(message: string = 'Autenticação de dois fatores necessária', details?: any) {
    super(message, ErrorType.TWO_FA, 403, details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Limite de requisições excedido', details?: any) {
    super(message, ErrorType.RATE_LIMIT, 429, details);
  }
}

export class SessionExpiredError extends AppError {
  constructor(message: string = 'Sessão expirada', details?: any) {
    super(message, ErrorType.SESSION_EXPIRED, 401, details);
  }
}

export class TimeoutError extends AppError {
  constructor(message: string = 'Tempo limite excedido', details?: any) {
    super(message, ErrorType.TIMEOUT, 408, details);
  }
}

export class ProxyError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.PROXY, 502, details);
  }
}

/**
 * Middleware de tratamento de erros Express
 */
export function errorMiddleware(
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log do erro
  console.error('[Error Handler]', {
    message: error.message,
    type: error instanceof AppError ? error.type : 'UNKNOWN',
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    path: req.path,
    method: req.method,
  });

  // Se já foi enviada resposta, passa para o próximo handler
  if (res.headersSent) {
    return next(error);
  }

  // Se é um AppError customizado
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        type: error.type,
        message: error.message,
        details: error.details,
      },
    });
  }

  // Erros genéricos
  return res.status(500).json({
    success: false,
    error: {
      type: ErrorType.INTERNAL,
      message: process.env.NODE_ENV === 'production'
        ? 'Erro interno do servidor'
        : error.message,
    },
  });
}

/**
 * Wrapper para funções assíncronas de rotas
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Logger de erros estruturado
 */
export function logError(error: Error | AppError, context?: Record<string, any>) {
  const errorInfo: any = {
    timestamp: new Date().toISOString(),
    message: error.message,
    type: error instanceof AppError ? error.type : 'UNKNOWN',
    context,
  };

  if (error instanceof AppError) {
    errorInfo.statusCode = error.statusCode;
    errorInfo.details = error.details;
  }

  if (process.env.NODE_ENV === 'development') {
    errorInfo.stack = error.stack;
  }

  console.error('[Error Log]', JSON.stringify(errorInfo, null, 2));
}

/**
 * Verifica se um erro é operacional (esperado) ou de programação
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Handler de erros não capturados
 */
export function setupUncaughtHandlers() {
  process.on('uncaughtException', (error: Error) => {
    console.error('[Uncaught Exception]', error);
    logError(error, { source: 'uncaughtException' });

    // Se não for erro operacional, encerra o processo
    if (!isOperationalError(error)) {
      console.error('[Fatal] Erro não operacional detectado. Encerrando...');
      process.exit(1);
    }
  });

  process.on('unhandledRejection', (reason: any) => {
    console.error('[Unhandled Rejection]', reason);
    const error = reason instanceof Error ? reason : new Error(String(reason));
    logError(error, { source: 'unhandledRejection' });

    // Se não for erro operacional, encerra o processo
    if (!isOperationalError(error)) {
      console.error('[Fatal] Promise rejection não tratada. Encerrando...');
      process.exit(1);
    }
  });
}

/**
 * Cria uma resposta de erro padronizada
 */
export function createErrorResponse(
  error: Error | AppError,
  includeStack: boolean = false
) {
  const response: any = {
    success: false,
    error: {
      message: error.message,
      type: error instanceof AppError ? error.type : ErrorType.INTERNAL,
    },
  };

  if (error instanceof AppError) {
    response.error.statusCode = error.statusCode;
    if (error.details) {
      response.error.details = error.details;
    }
  }

  if (includeStack && process.env.NODE_ENV === 'development') {
    response.error.stack = error.stack;
  }

  return response;
}

export default {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ScrapingError,
  CaptchaError,
  TwoFAError,
  RateLimitError,
  SessionExpiredError,
  TimeoutError,
  ProxyError,
  errorMiddleware,
  asyncHandler,
  logError,
  isOperationalError,
  setupUncaughtHandlers,
  createErrorResponse,
  ErrorType,
};
