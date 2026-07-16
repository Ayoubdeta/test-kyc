import type { NextFunction, Request, Response } from 'express';

type AsyncRoute = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Envuelve un controlador async para que cualquier promesa rechazada se
 * derive automáticamente al middleware de errores. Express 4 no captura los
 * throws de funciones async por sí solo; esto evita tener try/catch en cada
 * controlador.
 */
export function asyncHandler(fn: AsyncRoute) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
