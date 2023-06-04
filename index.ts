import * as http from "http"
import EventEmitter from 'events'

interface IContext {
    req: http.IncomingMessage;
    rsp: http.ServerResponse;
}

class Router {
    private static routes: Object = {};
    private static middleware: Function[] = [];
    public static eventEmitter: EventEmitter = new EventEmitter();
    
    public static addRoute(route: string, fn: (ctx: IContext) => void) {
      Router.routes[route] = fn;
    }

    public static err(ctx: IContext, code: number, msg: string) {
        Router.eventEmitter.emit('err', {ctx, code, msg});
    }

    static  {
        Router.eventEmitter.on('err', ({ctx, code, msg}) => {
            ctx.rsp.writeHead(code, msg);
            ctx.rsp.end()
        });
    }

    public static route(req: http.IncomingMessage, rsp: http.ServerResponse)  {
        
        const route = req.url;

        const buildCtx = (req: http.IncomingMessage, rsp: http.ServerResponse): IContext => {
            return {
                req: req,
                rsp: rsp
            }
        }

        let ctx: IContext = buildCtx(req, rsp);

        let job = Router.routes[route] || function(ctx: IContext) {
            Router.err(ctx, 404, 'not found');
        };

        Router.middleware.forEach((fn) => {
            fn(ctx);
        });

        job(ctx);
    }

    public static withJSON(req: http.IncomingMessage, rsp: http.ServerResponse) {
        Router.addMiddleware((ctx: IContext) => {
            ctx.rsp.writeHead(200, {'Content-Type': 'application/json'});
        });

        return Router.route(req, rsp);
    }

    public static addMiddleware(fn: (ctx: IContext) => void) {
        Router.middleware.push(fn);
    }
}

Router.addRoute('/skuxx', (ctx: IContext) => {
    ctx.rsp.write(JSON.stringify({key: 'demo', val: 'lol'}));
    ctx.rsp.end();
})

const start = () => {
    http.createServer(Router.withJSON).listen(8080);
}

start();
