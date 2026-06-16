# OpenGeoLab Jupyter 功能设置指南

OpenGeoLab 的 Jupyter 功能由后端统一管理：用户点击启动后，Express 创建对应 Docker 容器，并把内网访问地址注册为 `/jupyter/<workspace-id>/`。公网部署时，外层入口是 `/OpenGeoLab/jupyter/<workspace-id>/`。

## 前置条件

- Docker 已安装并可由后端进程调用。
- Node.js 已安装。
- 已配置 `GeoModelWeb/server/.env.development` 或 `.env.production`。
- 如果启用 GitHub / Google / OpenGMS OAuth，需要在对应平台创建 OAuth 应用。

## 本地启动

后端：

```bash
cd GeoModelWeb/server
npm install
npm run dev
```

前端：

```bash
cd GeoModelWeb/client
npm install
npm run dev
```

本地访问 `http://localhost:5173`，登录后进入 Jupyter 工作区并启动容器。

## 生产访问链路

生产环境使用：

```text
https://geomodeling.njnu.edu.cn/OpenGeoLab/jupyter/<workspace-id>/
  -> public Nginx strips /OpenGeoLab/
  -> Express /jupyter/<workspace-id>/
  -> http://127.0.0.1:<dynamic-port>
  -> Jupyter Server inside Docker
```

后端启动容器时会设置：

```text
--ServerApp.base_url=/jupyter/<workspace-id>/
--ServerApp.trust_xheaders=True
```

因此 JupyterLab 的内网静态资源、API、kernel WebSocket 都会落在 `/jupyter/` 前缀下，由 Express 网关转发到对应容器。公网用户看到的是 `/OpenGeoLab/jupyter/`，这是外层 Nginx 前缀造成的。

Docker 端口发布使用回环地址：

```text
127.0.0.1:<dynamic-port>:8888
```

这表示 Jupyter 的容器端口只允许服务器本机访问，公网用户必须走 HTTPS 域名和 `/OpenGeoLab/jupyter/` 网关。

## 关键环境变量

```env
PUBLIC_ORIGIN=https://geomodeling.njnu.edu.cn/OpenGeoLab
JUPYTER_PUBLIC_BASE_PATH=/jupyter
JUPYTER_BIND_HOST=127.0.0.1
JUPYTER_OPENGEOLAB_API=http://host.docker.internal:3000/api
USER_DATA_DIR=/data/opengeolab/jupyter-data
```

本地开发可以把 `PUBLIC_ORIGIN` 设置为 `http://localhost:3000`，但生产必须使用最终 HTTPS 地址并包含 `/OpenGeoLab`。

## API 端点

认证：

- `GET /api/auth/github`
- `GET /api/auth/github/callback`
- `GET /api/auth/me`
- `POST /api/auth/logout`

Jupyter 管理：

- `GET /api/jupyter/status`
- `POST /api/jupyter/start`
- `POST /api/jupyter/stop`
- `GET /api/jupyter/projects`

`POST /api/jupyter/start` 返回的 `url`、`publicUrl`、`proxyPath`、`workspaceId` 是前端打开 JupyterLab 的依据。生产环境中返回地址应形如：

```text
https://geomodeling.njnu.edu.cn/OpenGeoLab/jupyter/<workspace-id>/lab?token=...
```

## 更新 Jupyter 镜像中的扩展

当修改了 `jupyterlab-geomodel` 或 Agent UI 后，执行：

```bash
./GeoModelWeb/scripts/release-jupyter-agent-image.sh
```

脚本会构建 JupyterLab 扩展、生成 wheel、替换 Docker 构建上下文并重建 `geomodel-jupyter:latest` 镜像。执行后需要重启已有 Jupyter 容器。

## 排查清单

- `docker ps` 中容器端口应显示为 `127.0.0.1:<dynamic-port>->8888/tcp`。
- 浏览器打开的 Jupyter 地址应以 `https://geomodeling.njnu.edu.cn/OpenGeoLab/jupyter/` 开头。
- JupyterLab 扩展访问 OpenGeoLab API 时应请求 `/OpenGeoLab/api/...`。
- Nginx 的 `/OpenGeoLab/` location 必须包含 WebSocket upgrade 配置。
- 如果页面能打开但 kernel 无法连接，优先检查 Nginx `Upgrade` / `Connection` 头和 `proxy_read_timeout`。
