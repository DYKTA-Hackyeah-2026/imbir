# Deploying the frontend to Dokploy

Deploy the frontend as a separate Dokploy Application using the monorepo's frontend directory as its build root.

## Dokploy build settings

1. Create an Application from this repository and select the branch to deploy.
2. Set **Build Path** to `/frontend`.
3. Choose **Dockerfile** as the build type.
   - **Dockerfile path**: `Dockerfile`
   - **Docker context path**: `.`
4. Set the application container port and domain target port to **`80`**.
5. Deploy.

Dokploy builds `frontend/Dockerfile` with `frontend/` as the context. The Dockerfile compiles the Vite app and serves it with nginx; the runtime container does not need Node.js.

## Runtime environment

Set these values in the Dokploy application's Environment section:

```dotenv
NGINX_PORT=80
BACKEND_URL=https://your-backend-domain.example.com
```

`BACKEND_URL` is the reachable backend base URL used by nginx to proxy API requests. Set it to the backend's public HTTPS domain, or to an internal Dokploy network address if both applications share a network. The default Vite build uses relative API paths, so leave the `VITE_API_URL` build argument empty to keep requests same-origin through nginx.

The container health check uses `/healthz`, which is served by nginx and does not depend on the backend.
