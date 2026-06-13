# OpenGeoLab 生产部署指南

本文档描述长期可维护的推荐部署方式：使用一个 HTTPS 子域名承载前端、后端 API 和 JupyterLab 网关。

示例域名：

```text
https://opengeolab.geomodeling.njnu.edu.cn
```

## 目标架构

```text
Browser
  -> https://opengeolab.geomodeling.njnu.edu.cn
  -> Nginx on public gateway server
  -> Express service on 127.0.0.1:3000
  -> Jupyter gateway path /jupyter/<workspace-id>/
  -> Docker container on 127.0.0.1:<dynamic-port>
```

对浏览器来说，所有请求都在同一个 HTTPS origin 下：

- `/`：Vue 前端静态文件。
- `/api/`：Express API。
- `/jupyter/`：Express 管理的 Jupyter 反向代理。

## 生产环境变量

在服务器上复制并填写：

```bash
cp GeoModelWeb/client/.env.production.example GeoModelWeb/client/.env.production
cp GeoModelWeb/server/.env.production.example GeoModelWeb/server/.env.production
```

核心变量应类似：

```env
VITE_API_BASE_URL=https://opengeolab.geomodeling.njnu.edu.cn

PORT=3000
FRONTEND_URL=https://opengeolab.geomodeling.njnu.edu.cn
BACKEND_URL=https://opengeolab.geomodeling.njnu.edu.cn
PUBLIC_ORIGIN=https://opengeolab.geomodeling.njnu.edu.cn
JUPYTER_PUBLIC_BASE_PATH=/jupyter
JUPYTER_BIND_HOST=127.0.0.1
JUPYTER_OPENGEOLAB_API=https://opengeolab.geomodeling.njnu.edu.cn/api
USER_DATA_DIR=/data/opengeolab/jupyter-data
JWT_SECRET=replace-with-a-long-random-production-secret
```

`JWT_SECRET`、OAuth secret、OpenGMS token 必须使用真实安全值，并保存在未提交的环境文件或系统环境变量中。

## 构建与启动

前端构建：

```bash
cd GeoModelWeb/client
npm ci
npm run build
```

后端安装依赖：

```bash
cd GeoModelWeb/server
npm ci
```

可以用 systemd、PM2 或容器管理后端进程。后端只需要监听 `3000`，由 Nginx 对外提供 HTTPS。

PM2 示例：

```bash
cd GeoModelWeb/server
pm2 start index.js --name opengeolab-api --env production
pm2 save
```

## Nginx 配置

以下配置假设：

- 前端构建产物在 `/srv/opengeolab/client/dist`。
- Express 运行在 `127.0.0.1:3000`。
- HTTPS 证书已由学校或运维团队签发。

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

upstream opengeolab_api {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name opengeolab.geomodeling.njnu.edu.cn;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name opengeolab.geomodeling.njnu.edu.cn;

    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    client_max_body_size 2g;

    root /srv/opengeolab/client/dist;
    index index.html;

    location /api/ {
        proxy_pass http://opengeolab_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /jupyter/ {
        proxy_pass http://opengeolab_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_buffering off;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

如果部署在根域名的某个子路径下，需要同步调整 `PUBLIC_ORIGIN`、前端 base path、Nginx `location`，并重新验证 JupyterLab 静态资源和 WebSocket。

## Jupyter 网关行为

用户启动 Jupyter 后，后端会：

1. 生成稳定的 `workspaceId`。
2. 选择一个服务器本地动态端口。
3. 用 `127.0.0.1:<dynamic-port>:8888` 发布 Docker 端口。
4. 用 `--ServerApp.base_url=/jupyter/<workspaceId>/` 启动 Jupyter。
5. 把 `/jupyter/<workspaceId>/` 注册到 Express 网关。
6. 返回 HTTPS 域名下的 JupyterLab 打开地址。

这样 kernel WebSocket、Jupyter REST API、Lab 静态资源都走同一个域名，便于 HTTPS、Cookie、CORS 和运维监控统一处理。

## 验证清单

部署后依次检查：

```bash
curl -I https://opengeolab.geomodeling.njnu.edu.cn
curl -I https://opengeolab.geomodeling.njnu.edu.cn/api/health
curl -I http://127.0.0.1:3000/api/health
docker ps --format 'table {{.Names}}\t{{.Ports}}'
```

然后从浏览器启动一个 Jupyter 工作区，确认：

- 返回的 JupyterLab 地址以 `https://opengeolab.geomodeling.njnu.edu.cn/jupyter/` 开头。
- `docker ps` 里对应容器端口显示为 `127.0.0.1:<dynamic-port>->8888/tcp`。
- JupyterLab 页面能加载，Notebook kernel 能启动并保持连接。
- 浏览器开发者工具中没有跨域错误，也没有 WebSocket 失败。

## 后续演进

当前实现是轻量级 Express Jupyter 网关，适合论文系统和实验室内部持续维护。未来如果需要更大规模的用户隔离、配额和调度，可以迁移到 JupyterHub 或 Kubernetes，但建议保留公网 `/jupyter/` 路径契约，这样前端和论文复现实验入口不需要大幅改动。
