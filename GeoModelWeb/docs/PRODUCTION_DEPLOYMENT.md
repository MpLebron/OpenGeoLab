# OpenGeoLab 生产部署指南

本文档描述当前推荐的长期部署方式：OpenGeoLab 挂载在学院既有根域名的 `/OpenGeoLab/` 后缀下。

公网入口：

```text
https://geomodeling.njnu.edu.cn/OpenGeoLab/
```

## 目标架构

```text
Browser
  -> https://geomodeling.njnu.edu.cn/OpenGeoLab/
  -> public Nginx gateway on geomodeling.njnu.edu.cn
  -> strip /OpenGeoLab/ and proxy to http://172.21.212.155/
  -> internal OpenGeoLab Nginx / Express service
  -> Express API /api/ and Jupyter gateway /jupyter/<workspace-id>/
  -> Docker Jupyter container on 127.0.0.1:<dynamic-port>
```

公网用户始终访问 `/OpenGeoLab/...`。内网 OpenGeoLab 服务收到的仍是根路径 `/`、`/api/`、`/jupyter/`，因为外层 Nginx 的 `proxy_pass http://172.21.212.155/;` 会剥离 `/OpenGeoLab/` 前缀。

## 生产环境变量

在服务器上复制并填写：

```bash
cp GeoModelWeb/client/.env.production.example GeoModelWeb/client/.env.production
cp GeoModelWeb/server/.env.production.example GeoModelWeb/server/.env.production
```

核心变量应类似：

```env
VITE_PUBLIC_BASE_PATH=/OpenGeoLab/
VITE_API_BASE_URL=/OpenGeoLab

PORT=3000
FRONTEND_URL=https://geomodeling.njnu.edu.cn/OpenGeoLab
BACKEND_URL=https://geomodeling.njnu.edu.cn/OpenGeoLab
PUBLIC_ORIGIN=https://geomodeling.njnu.edu.cn/OpenGeoLab
JUPYTER_PUBLIC_BASE_PATH=/jupyter
JUPYTER_BIND_HOST=127.0.0.1
JUPYTER_OPENGEOLAB_API=http://host.docker.internal:3000/api
USER_DATA_DIR=/data/opengeolab/jupyter-data
JWT_SECRET=replace-with-a-long-random-production-secret
```

`JUPYTER_PUBLIC_BASE_PATH` 保持 `/jupyter`，不要改成 `/OpenGeoLab/jupyter`。公网前缀由 `PUBLIC_ORIGIN` 提供，容器和内网代理仍使用 `/jupyter/<workspace-id>/`。

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

可以用 systemd、PM2 或容器管理后端进程。后端只需要监听内网或本机端口，由内网 Nginx 和公网根域名网关对外提供 HTTPS。

PM2 示例：

```bash
cd GeoModelWeb/server
pm2 start index.js --name opengeolab-api --env production
pm2 save
```

## 公网根域名 Nginx 配置

在 `geomodeling.njnu.edu.cn` 的公网 Nginx 上，新增或保持如下 location：

```nginx
location = /OpenGeoLab {
    return 301 /OpenGeoLab/;
}

location ^~ /OpenGeoLab/ {
    proxy_pass http://172.21.212.155/;
    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    proxy_read_timeout 86400;
    proxy_send_timeout 86400;
    proxy_buffering off;
}
```

这个配置和已有 `/YangtzeVGLab/`、`/geoml-hub/`、`/OpenGMP/` 的后缀式挂载方式保持一致。

## 内网 OpenGeoLab 服务

内网服务器 `172.21.212.155` 可以继续按根路径服务 OpenGeoLab：

- `/`：Vue 前端静态文件。
- `/api/`：Express API。
- `/jupyter/`：Express 管理的 Jupyter 反向代理。

如果内网服务器也使用 Nginx 托管前端，SPA fallback 需要保留：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}

location /api/ {
    proxy_pass http://127.0.0.1:3000;
}

location /jupyter/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400;
    proxy_send_timeout 86400;
    proxy_buffering off;
}
```

## Jupyter 网关行为

用户启动 Jupyter 后，后端会：

1. 生成稳定的 `workspaceId`。
2. 选择一个服务器本地动态端口。
3. 用 `127.0.0.1:<dynamic-port>:8888` 发布 Docker 端口。
4. 用 `--ServerApp.base_url=/jupyter/<workspaceId>/` 启动 Jupyter。
5. 把 `/jupyter/<workspaceId>/` 注册到 Express 网关。
6. 返回 `https://geomodeling.njnu.edu.cn/OpenGeoLab/jupyter/<workspaceId>/lab?...`。

这样 kernel WebSocket、Jupyter REST API、Lab 静态资源都走同一个公网 HTTPS 入口。

## 验证清单

部署后依次检查：

```bash
curl -I https://geomodeling.njnu.edu.cn/OpenGeoLab/
curl -I https://geomodeling.njnu.edu.cn/OpenGeoLab/api/health
curl -I http://127.0.0.1:3000/api/health
docker ps --format 'table {{.Names}}\t{{.Ports}}'
```

然后从浏览器启动一个 Jupyter 工作区，确认：

- 返回的 JupyterLab 地址以 `https://geomodeling.njnu.edu.cn/OpenGeoLab/jupyter/` 开头。
- `docker ps` 里对应容器端口显示为 `127.0.0.1:<dynamic-port>->8888/tcp`。
- JupyterLab 页面能加载，Notebook kernel 能启动并保持连接。
- OpenGeoLab JupyterLab 扩展中的模型、数据方法和 Agent API 访问 `/OpenGeoLab/api/...`。
- 浏览器开发者工具中没有跨域错误，也没有 WebSocket 失败。

## 后续演进

当前实现是轻量级 Express Jupyter 网关，适合论文系统和实验室持续维护。未来如果迁移到子域名、JupyterHub 或 Kubernetes，应保留“公网前缀”和“内网 Jupyter base path”分离的配置原则。
