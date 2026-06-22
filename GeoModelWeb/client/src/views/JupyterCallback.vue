<template>
  <div class="callback-page">
    <div class="spinner"></div>
    <p>正在完成登录...</p>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const PENDING_CASE_ACTION_KEY = 'opengeolab_pending_case_action'

const getPendingCaseRedirect = () => {
  try {
    const raw = localStorage.getItem(PENDING_CASE_ACTION_KEY)
    if (!raw) return ''
    const parsed = JSON.parse(raw)
    if (!parsed?.projectId || !parsed?.action) return ''
    if (Date.now() - Number(parsed.createdAt || 0) > 15 * 60 * 1000) {
      localStorage.removeItem(PENDING_CASE_ACTION_KEY)
      return ''
    }
    return `/cases/${encodeURIComponent(parsed.projectId)}?caseAction=${encodeURIComponent(parsed.action)}`
  } catch (error) {
    return ''
  }
}

onMounted(() => {
  // 从 URL 获取 token
  const token = route.query.token
  
  if (token) {
    // 保存 token
    localStorage.setItem('jupyter_token', token)
  }
  
  const pendingRedirect = getPendingCaseRedirect()
  router.replace(pendingRedirect || '/jupyter')
})
</script>

<style scoped>
.callback-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  color: #fff;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  border-top-color: #4CAF50;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

p {
  color: #888;
}
</style>
