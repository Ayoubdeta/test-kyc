/**
 * Error de aplicación con un código de estado HTTP asociado. Permite que los
 * services/controllers lancen errores "de negocio" (ej. credenciales
 * inválidas → 401) y que un único middleware de errores los traduzca a una
 * respuesta HTTP coherente, sin repetir manejo de errores por todas partes.
 */
export interface FieldError {
  field: string;
  message: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  /** Detalle opcional por campo (p. ej. errores de validación de formulario). */
  public readonly details?: FieldError[];

  constructor(
    statusCode: number,
    message: string,
    isOperational = true,
    details?: FieldError[],
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message = 'Petición inválida') {
    return new AppError(400, message);
  }

  static unauthorized(message = 'No autorizado') {
    return new AppError(401, message);
  }

  static forbidden(message = 'Acceso denegado') {
    return new AppError(403, message);
  }

  static notFound(message = 'Recurso no encontrado') {
    return new AppError(404, message);
  }

  static conflict(message = 'Conflicto con el estado actual') {
    return new AppError(409, message);
  }
}
