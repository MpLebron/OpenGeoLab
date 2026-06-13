export function getJupyterLaunchErrorMessage(error) {
  const payload = error?.response?.data || error || {}
  const code = payload.code || ''

  if (code === 'docker_unavailable') {
    return payload.message || 'Docker Desktop 未启动或 Docker daemon 无法连接。'
  }

  if (code === 'runtime_image_missing') {
    return payload.message || `当前项目绑定环境未安装：${payload.imageName || '未知镜像'}`
  }

  if (code === 'runtime_not_registered') {
    return payload.message || `当前项目绑定的运行环境未注册：${payload.imageId || '未知环境'}`
  }

  return payload.error || payload.message || error?.message || '启动 JupyterLab 失败。'
}
