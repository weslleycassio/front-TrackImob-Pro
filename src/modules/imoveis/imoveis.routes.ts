import { ImoveisController } from './imoveis.controller';

type Handler = (req: any, res: any, next: (error?: unknown) => void) => void | Promise<void>;

export interface RouterLike {
  get(path: string, ...handlers: Handler[]): void;
}

export function registerImoveisRoutes(router: RouterLike, controller: ImoveisController, authMiddleware: Handler): void {
  router.get('/imoveis', authMiddleware, controller.list);
  router.get('/imoveis/:id', authMiddleware, controller.getById);
}
