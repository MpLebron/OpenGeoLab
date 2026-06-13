# OpenGeoLab 环境配置指南

OpenGeoLab 同时支持本地开发和服务器生产部署。长期维护时建议明确分成两套配置：

- 本地开发：前端 Vite 运行在 `http://localhost:5173`，后端运行在 `http://localhost:3000`。
- 生产部署：浏览器只访问一个 HTTPS 域名，前端、`/api/`、`/jupyter/` 都走同源入口。

## 配置文件

| 位置 | 本地模板 | 生产模板 |
|------|----------|----------|
| `GeoModelWeb/client` | `.env.development.example` | `.env.production.example` |
| `GeoModelWeb/server` | `.env.development.example` | `.env.production.example` |

创建实际配置时复制模板，不要把真实 `.env` 提交到 Git：

```bash
cp GeoModelWeb/client/.env.development.example GeoModelWeb/client/.env.development
cp GeoModelWeb/server/.env.development.example GeoModelWeb/server/.env.development
```

生产服务器上使用：

```bash
cp GeoModelWeb/client/.env.production.example GeoModelWeb/client/.env.production
cp GeoModelWeb/server/.env.production.example GeoModelWeb/server/.env.production
```

## 本地开发

前端开发时可以显式指定后端地址：

```env
VITE_API_BASE_URL=http://localhost:3000
```

后端本地配置保留前后端分端口模式：

```env
PORT=3000
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000
PUBLIC_ORIGIN=http://localhost:5173
JUPYTER_PUBLIC_BASE_PATH=/jupyter
JUPYTER_BIND_HOST=127.0.0.1
```

这种模式方便调试，浏览器扩展代码在本地仍可回退到 `hostname:3000` 调后端。

## 生产部署

生产环境应使用同源配置：浏览器入口只有一个域名，例如：

```env
FRONTEND_URL=https://opengeolab.geomodeling.njnu.edu.cn
BACKEND_URL=https://opengeolab.geomodeling.njnu.edu.cn
PUBLIC_ORIGIN=https://opengeolab.geomodeling.njnu.edu.cn
JUPYTER_PUBLIC_BASE_PATH=/jupyter
JUPYTER_BIND_HOST=127.0.0.1
JUPYTER_OPENGEOLAB_API=https://opengeolab.geomodeling.njnu.edu.cn/api
```

前端生产配置不需要写死内网 IP：

```env
VITE_API_BASE_URL=https://opengeolab.geomodeling.njnu.edu.cn
```

生产访问链路是：

```text
Browser
  -> https://opengeolab.geomodeling.njnu.edu.cn
  -> Nginx
  -> Express /api/ and /jupyter/
  -> local Jupyter container bound on 127.0.0.1
```

这样浏览器不会感知学校内网服务器的 IP，也不会依赖 Jupyter 的动态端口。

## 变量说明

| 变量 | 位置 | 说明 |
|------|------|------|
| `VITE_API_BASE_URL` | client | 前端调用后端的基础地址。本地用 `http://localhost:3000`，生产用 HTTPS 同源地址。 |
| `FRONTEND_URL` | server | OAuth、CORS、跳转使用的前端地址。生产应为 HTTPS 域名。 |
| `BACKEND_URL` | server | OAuth callback 等后端地址。生产应为同一个 HTTPS 域名。 |
| `PUBLIC_ORIGIN` | server | 生成 Jupyter 公开访问 URL 的来源地址。生产必须是 HTTPS 域名。 |
| `JUPYTER_PUBLIC_BASE_PATH` | server | Jupyter 网关路径，默认 `/jupyter`。 |
| `JUPYTER_BIND_HOST` | server | Docker 发布端口绑定地址。生产建议固定为 `127.0.0.1`。 |
| `JUPYTER_OPENGEOLAB_API` | server | 注入 Jupyter 容器的 OpenGeoLab API 地址。生产使用同源 `/api`。 |
| `USER_DATA_DIR` | server | Jupyter 用户工作目录。生产建议放到可备份的数据盘。 |
| `JWT_SECRET` | server | JWT 签名密钥。生产必须使用长随机值。 |

## 维护建议

- 本地配置只服务开发效率，生产配置只服务稳定公网访问，不要混用。
- 生产域名、HTTPS 证书、Nginx 入口由外层服务器负责；Node 服务只监听内网或本机端口。
- `JUPYTER_BIND_HOST=127.0.0.1` 是安全边界：Jupyter 容器端口只给 Express 网关访问。
- 真实 token、OAuth secret、JWT secret 必须保存在服务器环境变量或未提交的 `.env.production` 中。
