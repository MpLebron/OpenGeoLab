# OpenGeoLab 环境配置指南

OpenGeoLab 同时支持本地开发和服务器生产部署。长期维护时建议明确分成两套配置：

- 本地开发：前端 Vite 运行在 `http://localhost:5173`，后端运行在 `http://localhost:3000`。
- 生产部署：公网访问 `https://geomodeling.njnu.edu.cn/OpenGeoLab/`，外层 Nginx 剥离 `/OpenGeoLab/` 后转发到内网 OpenGeoLab 服务。

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

前端开发配置：

```env
VITE_PUBLIC_BASE_PATH=/
VITE_API_BASE_URL=http://localhost:3000
```

后端本地配置保留前后端分端口模式：

```env
PORT=3000
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000
PUBLIC_ORIGIN=http://localhost:3000
JUPYTER_PUBLIC_BASE_PATH=/jupyter
JUPYTER_BIND_HOST=127.0.0.1
JUPYTER_OPENGEOLAB_API=http://host.docker.internal:3000/api
```

这种模式方便调试，浏览器扩展代码在本地仍可回退到 `hostname:3000` 调后端。

## 生产部署

生产前端配置：

```env
VITE_PUBLIC_BASE_PATH=/OpenGeoLab/
VITE_API_BASE_URL=/OpenGeoLab
```

生产后端配置：

```env
FRONTEND_URL=https://geomodeling.njnu.edu.cn/OpenGeoLab
BACKEND_URL=https://geomodeling.njnu.edu.cn/OpenGeoLab
PUBLIC_ORIGIN=https://geomodeling.njnu.edu.cn/OpenGeoLab
JUPYTER_PUBLIC_BASE_PATH=/jupyter
JUPYTER_BIND_HOST=127.0.0.1
JUPYTER_OPENGEOLAB_API=http://host.docker.internal:3000/api
```

生产访问链路是：

```text
Browser
  -> https://geomodeling.njnu.edu.cn/OpenGeoLab/
  -> public Nginx strips /OpenGeoLab/
  -> internal OpenGeoLab service receives /, /api/, /jupyter/
  -> local Jupyter container bound on 127.0.0.1
```

## 变量说明

| 变量 | 位置 | 说明 |
|------|------|------|
| `VITE_PUBLIC_BASE_PATH` | client | Vite 构建静态资源和 Vue Router 的公网前缀。本地 `/`，生产 `/OpenGeoLab/`。 |
| `VITE_API_BASE_URL` | client | 前端调用后端的基础地址。本地 `http://localhost:3000`，生产 `/OpenGeoLab`。 |
| `FRONTEND_URL` | server | OAuth、CORS、跳转使用的前端地址。生产包含 `/OpenGeoLab`。 |
| `BACKEND_URL` | server | OAuth callback 等后端地址。生产包含 `/OpenGeoLab`。 |
| `PUBLIC_ORIGIN` | server | 生成 Jupyter 公开访问 URL 的来源地址。生产包含 `/OpenGeoLab`。 |
| `JUPYTER_PUBLIC_BASE_PATH` | server | 内网 Jupyter 网关路径，默认 `/jupyter`，生产不要改成 `/OpenGeoLab/jupyter`。 |
| `JUPYTER_BIND_HOST` | server | Docker 发布端口绑定地址。生产建议固定为 `127.0.0.1`。 |
| `JUPYTER_OPENGEOLAB_API` | server | 注入 Jupyter 容器的 OpenGeoLab API 地址。生产建议用容器可访问的内部 API。 |
| `USER_DATA_DIR` | server | Jupyter 用户工作目录。生产建议放到可备份的数据盘。 |
| `JWT_SECRET` | server | JWT 签名密钥。生产必须使用长随机值。 |

## 维护建议

- 本地配置只服务开发效率，生产配置只服务稳定公网访问，不要混用。
- 公网 `/OpenGeoLab/` 前缀只在浏览器可见；内网 Node 和 Jupyter 仍按 `/api/`、`/jupyter/` 工作。
- `JUPYTER_BIND_HOST=127.0.0.1` 是安全边界：Jupyter 容器端口只给 Express 网关访问。
- 真实 token、OAuth secret、JWT secret 必须保存在服务器环境变量或未提交的 `.env.production` 中。
