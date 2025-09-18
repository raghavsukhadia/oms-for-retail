import { config, isDevelopment } from '../config/environment';

export class Logger {
  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaString = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaString}`;
  }

  info(message: string, meta?: any): void {
    if (isDevelopment) {
      console.log(this.formatMessage('info', message, meta));
    } else {
      // In production, you might want to use a proper logging service
      console.log(this.formatMessage('info', message, meta));
    }
  }

  error(message: string, meta?: any): void {
    if (isDevelopment) {
      console.error(this.formatMessage('error', message, meta));
    } else {
      console.error(this.formatMessage('error', message, meta));
    }
  }

  warn(message: string, meta?: any): void {
    if (isDevelopment) {
      console.warn(this.formatMessage('warn', message, meta));
    } else {
      console.warn(this.formatMessage('warn', message, meta));
    }
  }

  debug(message: string, meta?: any): void {
    if (isDevelopment) {
      console.debug(this.formatMessage('debug', message, meta));
    }
    // In production, debug logs are typically disabled
  }
}

export const logger = new Logger();