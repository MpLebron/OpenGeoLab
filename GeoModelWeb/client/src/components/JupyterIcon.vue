<template>
  <svg
    class="jupyter-icon"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <path :d="siJupyter.path" />
  </svg>
</template>

<script setup>
import { siJupyter } from 'simple-icons'
</script>

<style scoped>
.jupyter-icon {
  width: 1em;
  height: 1em;
  display: block;
  flex: 0 0 auto;
  fill: #f37626;
}
</style>
