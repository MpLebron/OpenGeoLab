<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import vgeTeamWechatQr from '../assets/contact/vgeteam-wechat-qr.png'

const defaultMapMyVisitorsWidgetId = 'd7dn4tC_MVSe_ADYyvMarvZnb79V5iMKYm-Fxi9119A'
const mapMyVisitorsWidgetId = (import.meta.env.VITE_MAPMYVISITORS_WIDGET_ID || defaultMapMyVisitorsWidgetId).trim()
const hasMapMyVisitorsWidget = mapMyVisitorsWidgetId.length > 0
const mapMyVisitorsMount = ref(null)
const showVgeWechatQr = ref(false)
const mapMyVisitorsQuery = `d=${encodeURIComponent(mapMyVisitorsWidgetId)}&cl=ffffff`
const mapMyVisitorsScriptSrc = hasMapMyVisitorsWidget
  ? `https://mapmyvisitors.com/map.js?${mapMyVisitorsQuery}&w=a`
  : ''
const mapMyVisitorsPixelSrc = hasMapMyVisitorsWidget
  ? `https://mapmyvisitors.com/map.png?${mapMyVisitorsQuery}`
  : ''

const clearMapMyVisitors = () => {
  mapMyVisitorsMount.value?.replaceChildren()
}

const mountMapMyVisitors = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return
  }

  if (!mapMyVisitorsMount.value || !hasMapMyVisitorsWidget) {
    return
  }

  clearMapMyVisitors()
  const script = document.createElement('script')
  script.id = 'mapmyvisitors'
  script.type = 'text/javascript'
  script.async = true
  script.src = mapMyVisitorsScriptSrc
  mapMyVisitorsMount.value.appendChild(script)
}

onMounted(() => {
  mountMapMyVisitors()
})

onBeforeUnmount(() => {
  clearMapMyVisitors()
})
</script>

<template>
  <footer class="site-footer">
    <div class="footer-shell" :class="{ 'footer-shell--without-visitors': !hasMapMyVisitorsWidget }">
      <div class="footer-column footer-agency">
        <h3>Development<br>Agency</h3>
        <a href="https://sg.njnu.edu.cn/" target="_blank" rel="noreferrer">School of Geography, NNU</a>
        <a href="https://vgekl.njnu.edu.cn/" target="_blank" rel="noreferrer">Ministry of Education Key Laboratory of VGE</a>
        <a href="https://geomodeling.njnu.edu.cn/" target="_blank" rel="noreferrer">OpenGMS</a>
      </div>

      <div class="footer-column">
        <h3>Online Tools</h3>
        <RouterLink to="/data">Data Service Container</RouterLink>
        <RouterLink to="/model">Model Service Container</RouterLink>
        <RouterLink to="/jupyter">Jupyter Workspace</RouterLink>
      </div>

      <div class="footer-column">
        <h3>About Us</h3>
        <a href="http://opengmsteam.com" target="_blank" rel="noreferrer">About OpenGMS</a>
        <a href="https://geomodeling.njnu.edu.cn/user/register" target="_blank" rel="noreferrer">Joining Us</a>
      </div>

      <div class="footer-column">
        <h3>Contact Us</h3>
        <a href="mailto:opengms@njnu.edu.cn">Email: opengms@njnu.edu.cn</a>
        <a href="mailto:opengms@126.com">Email: opengms@126.com</a>
        <div class="footer-wechat">
          <button
            type="button"
            class="footer-wechat-trigger"
            :aria-expanded="showVgeWechatQr ? 'true' : 'false'"
            aria-controls="vgeteam-wechat-qr"
            @click="showVgeWechatQr = !showVgeWechatQr"
          >
            WeChat Public Account:<br>VGETeam
          </button>
          <div v-if="showVgeWechatQr" id="vgeteam-wechat-qr" class="wechat-qr-popover">
            <img :src="vgeTeamWechatQr" alt="VGETeam WeChat public account QR code">
            <span>Scan to follow VGETeam</span>
          </div>
        </div>
      </div>

      <div v-if="hasMapMyVisitorsWidget" class="footer-column visitor-column">
        <h3>Visitors</h3>
        <div class="visitor-widget-shell">
          <div
            ref="mapMyVisitorsMount"
            class="mapmyvisitors-widget-mount"
            aria-label="MapMyVisitors real-time visitor map"
          ></div>
          <img class="mapmyvisitors-pixel" :src="mapMyVisitorsPixelSrc" alt="" width="1" height="1">
        </div>
      </div>

      <div class="footer-bottom">
        <span>All rights reserved @2011-2026 OpenGMS.</span>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  position: relative;
  z-index: 2;
  margin-top: 0;
  padding: 0 1.5rem 1.25rem;
  background:
    linear-gradient(180deg, rgba(2, 6, 12, 0.96), #020202 34%),
    #020202;
  color: #ffffff;
}

.footer-shell {
  display: grid;
  grid-template-columns:
    minmax(170px, 1.1fr) minmax(150px, 0.95fr) minmax(140px, 0.85fr) minmax(210px, 1.08fr) minmax(210px, 1fr);
  gap: clamp(0.85rem, 2.25vw, 2.9rem);
  max-width: var(--max-shell-width);
  margin: 0 auto;
  padding: 3.35rem 0 2.15rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.footer-shell--without-visitors {
  grid-template-columns:
    minmax(180px, 1.15fr) minmax(160px, 1fr) minmax(150px, 0.9fr) minmax(220px, 1.18fr);
}

.footer-column {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.72rem;
  min-width: 0;
}

.footer-column h3 {
  margin: 0 0 0.35rem;
  color: #ffffff;
  font-family: 'Manrope', 'Inter', sans-serif;
  font-size: clamp(1.2rem, 1.8vw, 1.55rem);
  line-height: 1.18;
  letter-spacing: -0.02em;
}

.footer-column a,
.footer-column button,
.footer-column span {
  color: rgba(255, 255, 255, 0.82);
  font-family: inherit;
  font-size: 0.95rem;
  line-height: 1.58;
  text-decoration: none;
}

.footer-column a,
.footer-column button {
  transition: color 0.16s ease, transform 0.16s ease;
}

.footer-column a:hover,
.footer-column button:hover {
  color: #8bd7ff;
  transform: translateX(2px);
}

.footer-wechat {
  position: relative;
  width: 100%;
}

.footer-wechat-trigger {
  border: none;
  background: transparent;
  padding: 0;
  text-align: left;
  cursor: pointer;
}

.wechat-qr-popover {
  position: absolute;
  right: calc(100% + 0.85rem);
  bottom: -0.1rem;
  z-index: 12;
  width: 132px;
  padding: 0.55rem;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 5px;
  background: rgba(5, 12, 20, 0.98);
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.34);
}

.wechat-qr-popover::before {
  content: '';
  position: absolute;
  top: 50%;
  right: -6px;
  width: 10px;
  height: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.16);
  border-right: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(5, 12, 20, 0.98);
  transform: translateY(-50%) rotate(45deg);
}

.wechat-qr-popover img {
  width: 100%;
  height: auto;
  border-radius: 3px;
  background: #ffffff;
}

.wechat-qr-popover span {
  display: block;
  margin-top: 0.42rem;
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.72rem;
  line-height: 1.3;
  text-align: center;
}

.visitor-column {
  min-width: 210px;
}

.visitor-widget-shell {
  position: relative;
  width: 100%;
  max-width: 260px;
  min-height: 138px;
  overflow: hidden;
}

.mapmyvisitors-widget-mount {
  width: 100%;
  min-height: 132px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mapmyvisitors-pixel {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.visitor-column :deep(#mapmyvisitors-widget),
.visitor-column :deep(.mapmyvisitors-map-container),
.visitor-column :deep(.mapmyvisitors-map) {
  max-width: 100% !important;
}

.visitor-column :deep(#mapmyvisitors-widget) {
  margin: 0 auto !important;
}

.visitor-column :deep(.mapmyvisitors-bottom-text) {
  font-family: 'Manrope', 'Inter', sans-serif !important;
}

.footer-bottom {
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  margin-top: 1.2rem;
  padding-top: 1.45rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.88rem;
}

@media (max-width: 1120px) {
  .footer-shell {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .footer-bottom {
    justify-content: flex-start;
  }
}

@media (max-width: 780px) {
  .site-footer {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .footer-shell {
    grid-template-columns: 1fr;
    gap: 1.8rem;
    padding: 2.5rem 0 1.75rem;
  }

  .wechat-qr-popover {
    right: auto;
    left: 0;
    bottom: calc(100% + 0.7rem);
  }

  .wechat-qr-popover::before {
    top: auto;
    right: auto;
    bottom: -6px;
    left: 1rem;
    border-top: none;
    border-right: none;
    border-left: 1px solid rgba(255, 255, 255, 0.16);
    border-bottom: 1px solid rgba(255, 255, 255, 0.16);
    transform: rotate(-45deg);
  }

  .visitor-widget-shell,
  .mapmyvisitors-widget-mount {
    max-width: 100%;
  }
}
</style>
