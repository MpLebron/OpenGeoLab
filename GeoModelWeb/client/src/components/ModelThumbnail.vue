<template>
  <div class="model-thumbnail" aria-hidden="true">
    <svg viewBox="0 0 72 72" role="img" focusable="false">
      <defs>
        <clipPath :id="clipId">
          <rect x="0.75" y="0.75" width="70.5" height="70.5" rx="7" ry="7" />
        </clipPath>
      </defs>
      <rect class="thumb-bg" x="0.75" y="0.75" width="70.5" height="70.5" rx="7" ry="7" />
      <g :clip-path="`url(#${clipId})`">
        <ellipse
          v-for="field in colorFields"
          :key="field.key"
          class="color-field"
          :cx="field.x"
          :cy="field.y"
          :rx="field.rx"
          :ry="field.ry"
          :fill="field.fill"
          :opacity="field.opacity"
          :transform="`rotate(${field.rotate} ${field.x} ${field.y})`"
        />
        <path class="soft-veil" :d="veilPath" />
        <circle class="light-pool" :cx="36 + thumbnail.offset" :cy="34 - thumbnail.offset" r="24" />
        <text
          class="model-letter"
          x="36"
          y="38"
          text-anchor="middle"
          dominant-baseline="middle"
        >
          {{ glyph }}
        </text>
      </g>
    </svg>
  </div>
</template>

<script setup>
import { computed, getCurrentInstance } from 'vue'

const props = defineProps({
  model: {
    type: Object,
    required: true
  }
})

const instance = getCurrentInstance()
const clipId = `model-thumb-clip-${instance?.uid ?? hashString(Math.random().toString())}`

const palettes = [
  {
    bg: '#f6fbf7',
    fieldA: '#8be095',
    fieldB: '#b8eef2',
    fieldC: '#f2d177',
    ink: '#17201c'
  },
  {
    bg: '#f4fbff',
    fieldA: '#2db9f1',
    fieldB: '#7fd9e7',
    fieldC: '#91caff',
    ink: '#111a20'
  },
  {
    bg: '#fff8d8',
    fieldA: '#f7df72',
    fieldB: '#98d8bd',
    fieldC: '#f2a76b',
    ink: '#1d1a14'
  },
  {
    bg: '#f7fbff',
    fieldA: '#9bc8ff',
    fieldB: '#d1ddff',
    fieldC: '#ffb7a2',
    ink: '#151822'
  },
  {
    bg: '#fff5fb',
    fieldA: '#ee9fd4',
    fieldB: '#a7d7ff',
    fieldC: '#f4b24d',
    ink: '#19141d'
  },
  {
    bg: '#f8fbf8',
    fieldA: '#c5e7b8',
    fieldB: '#83cfd3',
    fieldC: '#b8c6f4',
    ink: '#15201f'
  }
]

const sourceText = computed(() => [
  props.model.id,
  props.model.name,
  props.model.alias,
  props.model.description,
  props.model.domain,
  props.model.category,
  ...(Array.isArray(props.model.tags) ? props.model.tags : [])
].filter(Boolean).join(' ').toLowerCase())

const seed = computed(() => hashString(sourceText.value || 'geo-model'))

const thumbnail = computed(() => ({
  ...palettes[seed.value % palettes.length],
  offset: (seed.value % 7) - 3
}))

const glyph = computed(() => {
  const label = String(props.model.name || props.model.alias || 'M').trim()
  const first = Array.from(label.replace(/^[\s"'([{\-–—]+/, ''))[0] || 'M'
  return /[a-z]/i.test(first) ? first.toUpperCase() : first
})

const colorFields = computed(() => {
  const random = seededRandom(seed.value + 401)
  const palette = thumbnail.value
  return [palette.fieldA, palette.fieldB, palette.fieldC].map((fill, index) => ({
    key: `field-${index}`,
    x: Number((10 + random() * 52).toFixed(1)),
    y: Number((8 + random() * 52).toFixed(1)),
    rx: Number((22 + random() * 18).toFixed(1)),
    ry: Number((16 + random() * 24).toFixed(1)),
    rotate: Math.round(-40 + random() * 80),
    fill,
    opacity: [0.92, 0.74, 0.62][index]
  }))
})

const veilPath = computed(() => {
  const shift = thumbnail.value.offset
  return `M-5 ${48 + shift}C11 ${32 - shift} 26 ${48 + shift} 40 ${30 - shift}C53 ${15 + shift} 63 ${20 - shift} 77 8V76H-5Z`
})

function hashString(value) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function seededRandom(initialSeed) {
  let state = initialSeed >>> 0
  return () => {
    state = Math.imul(1664525, state) + 1013904223
    return ((state >>> 0) / 4294967296)
  }
}
</script>

<style scoped>
.model-thumbnail {
  width: 72px;
  height: 72px;
  border-radius: 8px;
  background: #f7fafb;
  flex: 0 0 auto;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.18);
}

.model-thumbnail svg {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: inherit;
}

.thumb-bg {
  fill: v-bind('thumbnail.bg');
  stroke: rgba(181, 196, 207, 0.62);
  stroke-width: 1.1;
}

.color-field {
  filter: blur(8px);
  transform-origin: center;
}

.soft-veil {
  fill: rgba(255, 255, 255, 0.24);
  filter: blur(4px);
}

.light-pool {
  fill: rgba(255, 255, 255, 0.18);
  stroke: rgba(255, 255, 255, 0.38);
  stroke-width: 0.8;
}

.model-letter {
  fill: v-bind('thumbnail.ink');
  font-family: 'Manrope', 'Noto Sans SC', 'Microsoft YaHei', sans-serif;
  font-size: 25px;
  font-weight: 850;
  letter-spacing: 0;
  paint-order: stroke fill;
  stroke: rgba(255, 255, 255, 0.22);
  stroke-width: 0.8px;
}

.model-thumbnail:hover .color-field {
  opacity: 0.9;
}
</style>
