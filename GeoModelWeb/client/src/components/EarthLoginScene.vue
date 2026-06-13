<template>
  <div ref="hostRef" class="earth-login-scene" aria-hidden="true">
    <canvas ref="canvasRef" class="earth-login-canvas"></canvas>
    <div class="earth-login-vignette"></div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three/webgpu'
import { step, normalWorldGeometry, output, texture, vec3, vec4, normalize, positionWorld, bumpMap, cameraPosition, color, uniform, mix, uv, max } from 'three/tsl'
import earthDayTextureUrl from '../assets/earth/earth-day-4096.jpg'
import earthNightTextureUrl from '../assets/earth/earth-night-4096.jpg'
import earthBumpRoughnessUrl from '../assets/earth/earth-bump-roughness-clouds-4096.jpg'

const hostRef = ref(null)
const canvasRef = ref(null)

let teardown = () => {}

function createStarTexture() {
  const width = 1800
  const height = 1100
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  const sky = ctx.createLinearGradient(0, 0, width, height)
  sky.addColorStop(0, '#030717')
  sky.addColorStop(0.44, '#071433')
  sky.addColorStop(1, '#01040d')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, width, height)

  const nebula = ctx.createRadialGradient(width * 0.42, height * 0.42, 0, width * 0.42, height * 0.42, width * 0.46)
  nebula.addColorStop(0, 'rgba(92, 128, 194, 0.24)')
  nebula.addColorStop(0.5, 'rgba(72, 52, 128, 0.14)')
  nebula.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = nebula
  ctx.fillRect(0, 0, width, height)

  for (let i = 0; i < 5600; i += 1) {
    const x = Math.random() * width
    const y = Math.random() * height
    const alpha = 0.14 + Math.random() * 0.78
    const radius = Math.random() > 0.992 ? 1.8 : 0.42 + Math.random() * 0.72
    ctx.fillStyle = `rgba(236, 244, 255, ${alpha})`
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function createStarField() {
  const count = 3000
  const positions = new Float32Array(count * 3)

  for (let i = 0; i < count; i += 1) {
    const radius = 28 + Math.random() * 42
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = radius * Math.cos(phi)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: '#dcecff',
      size: 0.066,
      transparent: true,
      opacity: 0.78,
      depthWrite: false
    })
  )
}

function disposeTexture(texture) {
  if (texture?.dispose) texture.dispose()
}

onMounted(() => {
  const host = hostRef.value
  const canvas = canvasRef.value
  if (!host || !canvas) return

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  try {
    const renderer = new THREE.WebGPURenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    })
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8))

    const scene = new THREE.Scene()
    scene.background = createStarTexture()

    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 120)
    camera.position.set(0, 0, 7)

    const clock = new THREE.Clock()
    const textureLoader = new THREE.TextureLoader()
    const dayTexture = textureLoader.load(earthDayTextureUrl)
    dayTexture.colorSpace = THREE.SRGBColorSpace
    dayTexture.anisotropy = 8

    const nightTexture = textureLoader.load(earthNightTextureUrl)
    nightTexture.colorSpace = THREE.SRGBColorSpace
    nightTexture.anisotropy = 8

    const bumpRoughnessTexture = textureLoader.load(earthBumpRoughnessUrl)
    bumpRoughnessTexture.anisotropy = 8

    const stars = createStarField()
    scene.add(stars)

    const earthGroup = new THREE.Group()
    scene.add(earthGroup)

    const sun = new THREE.DirectionalLight('#ffffff', 2)
    sun.position.set(0, 0, 3)
    scene.add(sun)

    const atmosphereDayColor = uniform(color('#4db2ff'))
    const atmosphereTwilightColor = uniform(color('#2a8dde'))
    const roughnessLow = uniform(0.6)
    const roughnessHigh = uniform(0.35)

    const viewDirection = positionWorld.sub(cameraPosition).normalize()
    const fresnel = viewDirection.dot(normalWorldGeometry).abs().oneMinus().toVar()
    const sunOrientation = normalWorldGeometry.dot(normalize(sun.position)).toVar()
    const atmosphereColor = mix(
      atmosphereTwilightColor,
      atmosphereDayColor,
      sunOrientation.smoothstep(-0.25, 0.75)
    )

    const earthGeometry = new THREE.SphereGeometry(2.05, 128, 128)
    const globeMaterial = new THREE.MeshStandardNodeMaterial()
    const cloudsStrength = texture(bumpRoughnessTexture, uv()).b.smoothstep(0.2, 1)
    globeMaterial.colorNode = mix(texture(dayTexture), vec3(1), cloudsStrength.mul(2))

    const roughness = max(
      texture(bumpRoughnessTexture).g,
      step(0.01, cloudsStrength)
    )
    globeMaterial.roughnessNode = roughness.remap(0, 1, roughnessLow, roughnessHigh)

    const night = texture(nightTexture)
    const dayStrength = sunOrientation.smoothstep(-0.25, 0.5)
    const atmosphereDayStrength = sunOrientation.smoothstep(-0.5, 1)
    const atmosphereMix = atmosphereDayStrength.mul(fresnel.pow(2)).clamp(0, 1)

    let finalOutput = mix(night.rgb, output.rgb, dayStrength)
    finalOutput = mix(finalOutput, atmosphereColor, atmosphereMix)
    globeMaterial.outputNode = vec4(finalOutput, output.a)

    const bumpElevation = max(
      texture(bumpRoughnessTexture).r,
      cloudsStrength
    )
    globeMaterial.normalNode = bumpMap(bumpElevation)

    const globe = new THREE.Mesh(earthGeometry, globeMaterial)
    globe.rotation.set(-0.12, 2.45, 0.08)
    earthGroup.add(globe)

    const atmosphere = new THREE.Mesh(
      earthGeometry,
      new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, transparent: true })
    )
    let alpha = fresnel.remap(0.73, 1, 1, 0).pow(3)
    alpha = alpha.mul(sunOrientation.smoothstep(-0.5, 1))
    atmosphere.material.outputNode = vec4(atmosphereColor, alpha)
    atmosphere.scale.setScalar(1.04)
    earthGroup.add(atmosphere)

    const resize = () => {
      const { clientWidth, clientHeight } = host
      const width = Math.max(1, clientWidth)
      const height = Math.max(1, clientHeight)
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()

      const compact = width < 760
      earthGroup.position.set(compact ? -0.54 : -1.86, compact ? -0.38 : -0.04, 0)
      earthGroup.scale.setScalar(compact ? 0.744 : 0.864)
    }

    const render = () => {
      const delta = Math.min(clock.getDelta(), 0.05)
      const earthSpin = motionQuery.matches ? 0.21 : 0.34
      earthGroup.rotation.y += delta * earthSpin
      stars.rotation.y += delta * 0.024

      camera.lookAt(0, 0, 0)

      renderer.render(scene, camera)
    }

    resize()
    canvas.classList.add('is-live')
    renderer.setAnimationLoop(render)

    window.addEventListener('resize', resize)

    teardown = () => {
      renderer.setAnimationLoop(null)
      window.removeEventListener('resize', resize)
      renderer.dispose()
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose()
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          materials.forEach((material) => {
            if (material.map) material.map.dispose()
            material.dispose()
          })
        }
      })
      disposeTexture(dayTexture)
      disposeTexture(nightTexture)
      disposeTexture(bumpRoughnessTexture)
    }
  } catch (error) {
    teardown = () => {}
  }
})

onBeforeUnmount(() => {
  teardown()
})
</script>

<style scoped>
.earth-login-scene {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 31% 45%, rgba(63, 112, 184, 0.38), transparent 30%),
    linear-gradient(125deg, #020510 0%, #071432 48%, #02040d 100%);
}

.earth-login-scene::before {
  content: '';
  position: absolute;
  left: 12%;
  bottom: 9%;
  width: min(55.2vw, 864px);
  aspect-ratio: 1;
  border-radius: 50%;
  background:
    radial-gradient(circle at 30% 24%, rgba(255, 255, 255, 0.62), transparent 3%),
    radial-gradient(circle at 41% 42%, rgba(126, 197, 255, 0.52), transparent 10%),
    radial-gradient(circle at 55% 50%, rgba(45, 117, 179, 0.78), transparent 42%),
    radial-gradient(circle at 38% 34%, rgba(127, 176, 119, 0.88), transparent 18%),
    radial-gradient(circle at 58% 58%, rgba(211, 188, 129, 0.72), transparent 20%),
    radial-gradient(circle at 48% 48%, #2d7abc 0%, #0b315d 53%, #031022 72%);
  box-shadow:
    0 0 42px rgba(89, 185, 255, 0.68),
    0 0 150px rgba(44, 132, 241, 0.38);
  opacity: 0.78;
  transform: translateX(-44%);
  animation: fallbackEarthSpin 44s linear infinite;
  transform-origin: 6% 50%;
}

.earth-login-scene::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle, rgba(255, 255, 255, 0.86) 0 1px, transparent 1.5px),
    radial-gradient(circle, rgba(150, 190, 255, 0.72) 0 1px, transparent 1.5px),
    radial-gradient(circle at 30% 42%, rgba(91, 126, 194, 0.22), transparent 28%);
  background-size: 74px 74px, 118px 118px, 100% 100%;
  background-position: 0 0, 37px 21px, 0 0;
  opacity: 0.78;
}

.earth-login-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  z-index: 1;
}

.earth-login-canvas.is-live ~ .earth-login-vignette {
  background:
    radial-gradient(circle at 27% 50%, transparent 0 38%, rgba(2, 6, 18, 0.08) 58%, rgba(2, 6, 18, 0.36) 100%),
    linear-gradient(90deg, rgba(3, 7, 18, 0.04), rgba(3, 7, 18, 0.02) 48%, rgba(3, 7, 18, 0.56)),
    linear-gradient(180deg, rgba(1, 4, 12, 0.18), transparent 28%, rgba(1, 4, 12, 0.38));
}

.earth-login-vignette {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background:
    radial-gradient(circle at 27% 50%, transparent 0 38%, rgba(2, 6, 18, 0.08) 58%, rgba(2, 6, 18, 0.36) 100%),
    linear-gradient(90deg, rgba(3, 7, 18, 0.04), rgba(3, 7, 18, 0.02) 48%, rgba(3, 7, 18, 0.56)),
    linear-gradient(180deg, rgba(1, 4, 12, 0.18), transparent 28%, rgba(1, 4, 12, 0.38));
}

@media (max-width: 760px) {
  .earth-login-scene::before {
    left: -28%;
    bottom: 16%;
    width: 124.8vw;
    transform: none;
    opacity: 0.48;
  }
}

@keyframes fallbackEarthSpin {
  from {
    background-position: 0 0, 0 0, 0 0, 0 0, 0 0, 0 0;
  }

  to {
    background-position: 44px 0, -38px 0, 120px 0, 80px 0, -100px 0, 0 0;
  }
}
</style>
