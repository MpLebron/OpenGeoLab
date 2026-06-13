<script setup>
import { ref } from 'vue'
import earthDay from '../assets/earth/earth-day-4096.jpg'
import earthNight from '../assets/earth/earth-night-4096.jpg'
import geocopilotWorkbench from '../assets/landing/geocopilot-dark-workbench.png'
import blueMarble from '../assets/landing/nasa-blue-marble.jpg'
import blueMarbleMap from '../assets/landing/nasa-blue-marble-map.jpg'
import spatialContextModeling from '../assets/landing/spatial-context-modeling.png'
const capabilityCards = [
  {
    to: '/model',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBzCGZoBlUZWlFuweWK4_1Q-nJC-aBN5Q0BJNfS4rm0b7ZoR5q0mr1Y1MCoIEsF1_pltbptkPxB5VBDoZiUZs0jhxiIzv5OaDoAU0t5UDSJIivmeczymYcuZR6V10CWpsyg48YYbladMDhTTS_76ov2hr_SpFz9lYx5V-95CdC-rP0lhlFhlnucOuGpBnmpkWK5pWDlbctjfEtIGnNhaWpgwYgJROCOwakLgtqCJCK8optLBy53yPNgfjs8VlkGpALbU5_xNRG4I4PL',
    alt: 'Model service visualization',
    title: 'Model-service invocation',
    text: 'Turn OpenGMS computational models into parameterized notebook calls that remain readable, reusable, and linked to research context.',
    accent: 'primary'
  },
  {
    to: '/data',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDveLZfIxSchwlAt9KifLvuDnzJj6s3Boz9Mbr-ZuWaX4JGEI2WBa8RM7WVjHO4wJwbVqTw_UzLRT8djjdgAWaSSwECvph0UKgc9WMXbfk3Sa5zZrO3t7myZfKYiw3AokrUrlr7x-y8XGjWeCV1WHTGIHZfhXRJ0GaU4sl6BN33q-cYDNnfgafeTI509j8cT2pJztOAMwfUz3rHPi7zqF7oucOv5TFtFtgwX77pBKuAcsgQUW6Pxh-etJ_SgNg9zaYwsEUvrFRAvZgJ',
    alt: 'Cloud data visualization',
    title: 'Cloud data as project context',
    text: 'Bring cloud datasets and project files into Jupyter so inputs, outputs, and provenance stay close to the experiment.',
    accent: 'secondary'
  },
  {
    to: '/datamethod',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCasKd88CVR_QcXU89Hnq3YmghXntRwBbihD8VwZi_6aWqwfZi5wS3EzjbOaF0AjQW8uYx8aU6qawHCbfr1zlS435ybI-eIZ59l3_DX0lk-tm9nSVpX22syhaGaOylXpmvM-6U0LF0gjY4VJQEZrYJaL-Fu3XuK8XfDZMeEPPHkTVzZWvMRW_RLdHDIU5UXbzFAYfx_myUgJj7kqLQkF_soMvA2FZGBuOjXYfJhYTmCHPu2RSDyacyrdhXXXcvx6DA5Wogmwvq0n-vc',
    alt: 'Reusable data methods visualization',
    title: 'Reusable data methods',
    text: 'Run documented processing services for raster preparation, geostatistics, validation, and workflow standardization.',
    accent: 'tertiary'
  },
  {
    to: '/jupyter',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCNRmv0zy1Gf4CxtMN9SYskwM04vGRGoW-dPDhfm6Q1VE2xa9DU9g4-8b5t6VKN79XTXT9BYunzhd2jXG1dihy3LvojeYtiFTTLzB1SBjYDM9nRTupp3sJP9ZPzPLeVe7RAP4U--UN_yLIGy_dE92Sejw3JADohCbTs_auaCh_Xxbf_LCctgHhr5-QcefpISPOQLCwFoHfgVcPia19xozglZbhfERZ9OY78Y9bcigSr-NuYM9tF0ZYD6sbAc1rI9kzqbxYGdj0dg753',
    alt: 'Human agent collaboration visualization',
    title: 'Human-agent collaboration',
    text: 'Keep researcher control at the center while agents help discover resources, assemble calls, interpret outputs, and refine hypotheses.',
    accent: 'primary'
  }
]

const workflowIconSvgs = {
  discover: '<path d="M 12.248 21.969 a 1 1 0 0 1 -0.849 -0.17 C 9.539 20.193 4 14.993 4 10 a 8 8 0 0 1 16 0 C 20 10.42 19.961 10.841 19.888 11.262" /><path d="m22 22-1.88-1.88" /><circle cx="12" cy="10" r="3" /><circle cx="18" cy="18" r="3" />',
  compose: '<rect width="8" height="8" x="3" y="3" rx="2" /><path d="M7 11v4a2 2 0 0 0 2 2h4" /><rect width="8" height="8" x="13" y="13" rx="2" />',
  execute: '<path d="M9 9.003a1 1 0 0 1 1.517-.859l4.997 2.997a1 1 0 0 1 0 1.718l-4.997 2.997A1 1 0 0 1 9 14.996z" /><circle cx="12" cy="12" r="10" />',
  interpret: '<path d="M3 3v16a2 2 0 0 0 2 2h16" /><path d="m19 9-5 5-4-4-3 3" />',
  iterate: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" />'
}

const workflowSteps = [
  {
    number: '01',
    iconSvg: workflowIconSvgs.discover,
    title: 'Discover',
    text: 'Search model services, cloud data, case notebooks, and data methods.'
  },
  {
    number: '02',
    iconSvg: workflowIconSvgs.compose,
    title: 'Compose',
    text: 'Bind parameters, data paths, model metadata, and method IO specs.'
  },
  {
    number: '03',
    iconSvg: workflowIconSvgs.execute,
    title: 'Execute',
    text: 'Run calls inside JupyterLab with local project files and remote services.'
  },
  {
    number: '04',
    iconSvg: workflowIconSvgs.interpret,
    title: 'Interpret',
    text: 'Review maps, rasters, tables, provenance, and agent explanations.'
  },
  {
    number: '05',
    iconSvg: workflowIconSvgs.iterate,
    title: 'Iterate',
    text: 'Adjust scenarios, rerun models, compare outputs, and fork cases.'
  }
]
const workspaceContextImage = spatialContextModeling
const workspaceFeatures = [
  {
    icon: 'code',
    tone: 'primary',
    title: 'Researcher-controlled',
    badge: 'Interactive',
    text: 'Every generated call remains visible and editable in the notebook.'
  },
  {
    icon: 'network',
    tone: 'secondary',
    title: 'Resource-aware',
    badge: 'Contextual',
    text: 'Models, methods, files, and cloud data are exposed as workflow context.'
  },
  {
    icon: 'rocket',
    tone: 'tertiary',
    title: 'Runtime-oriented',
    badge: 'Execution',
    text: 'Projects launch into an environment prepared for geospatial computation.'
  }
]
const researchCaseCards = [
  {
    to: '/cases',
    accent: 'primary',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCYPxyV4t1hJaD3HfBRofkJ8lEXhAGyrLQbBBhkn8_FIbhxK4bCAgLttqy5wGVpsoF1a0dbPXaDBq5Nn_02yo5z6kwMcAuDSHX9EKdnCJBscEXg7D-fWbXUpLc4rWliaGyS2DHfV0amZmQ-Ha5go71QmFzNJIpOBwX5pIS6ow5cJQY7zVvmaYWXJYzubd1NLhYKB9EKRhoJUfA1jc0BucE7jzA3uUXAwaaW4wsVSJwhoQLCc2I3rqOYodoxVSCv_8fR8BLepw0Id3-2',
    alt: 'Suzhou urban expansion visualization',
    domain: 'Urban simulation',
    title: 'Suzhou Urban Expansion Simulation with UrbanM2M',
    text: 'Reproduce a land-use expansion workflow with historical rasters, OpenGMS UrbanM2M parameters, cached simulation outputs, and validation analysis.',
    tags: ['UrbanM2M', 'Raster simulation', 'Validation']
  },
  {
    to: '/cases',
    accent: 'tertiary',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAqAnrXwZV3JIFieOBvrmC7Y89cOmMXO0Ejh03zYqK_5_CcBr2L8GZnQe0aqyKMPdQnnyoucbnsfj2KtP0ST1LayIQ8asF87Vs5XVx_0EzJ_WfLJS2D8U4hwdyR6nGei4c8x1NblShacWANkw2yO-1eFIyo0Pwur_LreO3_CgO-EhOYNewMqvlfKn7e1zIBPmJscOpfMimBmM7B-fl0AknvdhX1cGQIOU5eB6J2a2eOCVT2vMSs4_kxVbiBiOTP2HiP05JRae52RYjv',
    alt: 'Nanjing rooftop photovoltaic potential visualization',
    domain: 'Renewable energy',
    title: 'Nanjing Rooftop Photovoltaic Potential Assessment',
    text: 'Follow a PyGeoModel research notebook for rooftop data inspection, model invocation, generated power analysis, and spatial visualization.',
    tags: ['PyGeoModel', 'OpenGMS', 'Folium']
  }
]
const runtimeGlassPressed = ref(false)

const setRuntimeGlassDefaultVars = (target) => {
  target?.style?.setProperty('--glass-x', '50%')
  target?.style?.setProperty('--glass-y', '42%')
  target?.style?.setProperty('--glass-lift-x', '0px')
  target?.style?.setProperty('--glass-lift-y', '0px')
  target?.style?.setProperty('--glass-tilt-x', '0deg')
  target?.style?.setProperty('--glass-tilt-y', '0deg')
  target?.style?.setProperty('--glass-glint-x', '0px')
  target?.style?.setProperty('--glass-glint-y', '0px')
  target?.style?.setProperty('--glass-sheen-angle', '128deg')
  target?.style?.setProperty('--glass-edge-angle', '135deg')
  target?.style?.setProperty('--glass-edge-alpha', '0.055')
}

const updateRuntimeGlass = (event) => {
  const target = event.currentTarget

  if (!target?.getBoundingClientRect) {
    return
  }

  const rect = target.getBoundingClientRect()
  const x = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1)
  const y = Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1)
  const offsetX = x - 0.5
  const offsetY = y - 0.5
  const edgeAlpha = 0.055 + Math.abs(offsetX) * 0.025 + Math.abs(offsetY) * 0.018

  target.style.setProperty('--glass-x', `${(x * 100).toFixed(1)}%`)
  target.style.setProperty('--glass-y', `${(y * 100).toFixed(1)}%`)
  target.style.setProperty('--glass-lift-x', `${(offsetX * 1.6).toFixed(2)}px`)
  target.style.setProperty('--glass-lift-y', `${(offsetY * 1.2).toFixed(2)}px`)
  target.style.setProperty('--glass-tilt-x', `${(-offsetY * 0.42).toFixed(2)}deg`)
  target.style.setProperty('--glass-tilt-y', `${(offsetX * 0.5).toFixed(2)}deg`)
  target.style.setProperty('--glass-glint-x', `${(offsetX * 8).toFixed(2)}px`)
  target.style.setProperty('--glass-glint-y', `${(offsetY * 6).toFixed(2)}px`)
  target.style.setProperty('--glass-sheen-angle', `${(128 + offsetX * 10 - offsetY * 6).toFixed(1)}deg`)
  target.style.setProperty('--glass-edge-angle', `${(135 + offsetX * 12 + offsetY * 7).toFixed(1)}deg`)
  target.style.setProperty('--glass-edge-alpha', edgeAlpha.toFixed(3))
}

const pressRuntimeGlass = (event) => {
  runtimeGlassPressed.value = true
  updateRuntimeGlass(event)
}

const releaseRuntimeGlass = (event) => {
  runtimeGlassPressed.value = false
  updateRuntimeGlass(event)
}

const resetRuntimeGlass = (event) => {
  runtimeGlassPressed.value = false
  setRuntimeGlassDefaultVars(event.currentTarget)
}

</script>

<template>
  <div class="home-page" :style="{
    '--earth-day': `url(${earthDay})`,
    '--earth-night': `url(${earthNight})`,
    '--blue-marble': `url(${blueMarble})`,
    '--blue-marble-map': `url(${blueMarbleMap})`
  }">
    <section class="hero-section">
      <div class="hero-announcement">
        OpenGMS model services, cloud data, reusable methods, and Jupyter runtimes in one research workspace.
      </div>

      <div class="hero-shell">
        <div class="hero-copy-block">
          <span class="hero-badge">OpenGeoLab Workbench</span>
          <h1 class="hero-title font-headline" aria-label="AI-native geographic modeling runtime">
            <span aria-hidden="true">AI-native</span>
            <span aria-hidden="true" class="hero-title-nowrap">geographic modeling</span>
            <span aria-hidden="true">runtime</span>
          </h1>
          <p class="hero-copy">
            A human-in-the-loop workspace for autonomous geocomputation:
            discover OpenGMS models, attach research data, compose methods,
            execute notebooks, and iterate with agent-assisted reasoning.
          </p>

          <div class="hero-actions">
            <router-link to="/jupyter" class="btn-primary">Open Jupyter Workspace</router-link>
            <router-link to="/cases" class="btn-secondary">Explore Cases</router-link>
          </div>
        </div>

        <div class="hero-runtime" aria-label="OpenGeoLab runtime composition preview">
          <div class="runtime-header">
            <span>Notebook workspace</span>
            <span>GeoCopilot</span>
          </div>
          <figure class="runtime-image" :class="{ 'runtime-image--pressed': runtimeGlassPressed }"
            @pointerenter="updateRuntimeGlass" @pointermove="updateRuntimeGlass" @pointerdown="pressRuntimeGlass"
            @pointerup="releaseRuntimeGlass" @pointercancel="resetRuntimeGlass" @pointerleave="resetRuntimeGlass">
            <img :src="geocopilotWorkbench" alt="OpenGeoLab GeoCopilot notebook workspace">
          </figure>
        </div>
      </div>
    </section>

    <section class="capability-section">
      <div class="section-shell capability-shell">
        <div class="section-heading capability-heading">
          <span class="section-kicker">Integrated modeling stack</span>
          <h2 class="font-headline">One workspace for data-driven and intelligent geographic modeling.</h2>
          <p>
            OpenGMS unifies models, data, methods, and human expertise in one reproducible and collaborative
            environment.
          </p>
        </div>

        <div class="capability-grid">
          <router-link v-for="card in capabilityCards" :key="card.title" :to="card.to" class="capability-card"
            :class="`capability-card--${card.accent}`">
            <div class="capability-visual">
              <img :src="card.image" :alt="card.alt">
            </div>
            <div class="capability-card-body">
              <h3 class="font-headline">{{ card.title }}</h3>
              <p>{{ card.text }}</p>
              <span class="capability-link">Learn more <span aria-hidden="true">-&gt;</span></span>
            </div>
          </router-link>
        </div>

        <div class="capability-cta">
          <div>
            <h3 class="font-headline">Built for geoscience and environmental research</h3>
            <p>
              From watershed hydrology to climate impact, land surface to ecosystem dynamics.
              Explore, model, and understand our changing planet.
            </p>
          </div>
          <router-link to="/cases" class="capability-cta-link">
            Explore use cases <span aria-hidden="true">-&gt;</span>
          </router-link>
        </div>
      </div>
    </section>

    <section class="workflow-section">
      <div class="section-shell workflow-shell">
        <div class="workflow-narrative">
          <span class="section-kicker">Autonomous geocomputation loop</span>
          <h2 class="font-headline">From research question to executable geographic computation.</h2>
          <p>
            OpenGeoLab treats a modeling project as a living runtime context,
            not a static file folder. Each step connects intent, resources,
            computation, and interpretation in a traceable notebook workflow.
          </p>
        </div>

        <div class="workflow-board">
          <div v-for="step in workflowSteps" :key="step.number" class="workflow-step">
            <div class="workflow-step-number">
              <span>{{ step.number }}</span>
            </div>
            <svg class="workflow-step-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" v-html="step.iconSvg"></svg>
            <div class="workflow-step-copy">
              <h3>{{ step.title }}</h3>
              <p>{{ step.text }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="workspace-section">
      <div class="section-shell workspace-grid">
        <div class="workspace-visual" aria-label="OpenGeoLab modeling workspace context visualization">
          <img :src="workspaceContextImage"
            alt="High-fidelity visualization of layered geospatial reasoning and context modeling">
        </div>

        <div class="workspace-copy">
          <span class="section-kicker">Built for humans and agents</span>
          <h2 class="font-headline">
            A notebook workspace that
            <span>understands modeling contexts</span>
          </h2>
          <p>
            The platform keeps the researcher, the model library, cloud data,
            project files, and intelligent assistance in the same operational surface.
          </p>

          <div class="workspace-timeline">
            <div v-for="feature in workspaceFeatures" :key="feature.title" class="workspace-feature-card"
              :class="`workspace-feature-card--${feature.tone}`">
              <span class="workspace-feature-icon" :class="`workspace-feature-icon--${feature.icon}`"
                aria-hidden="true"></span>
              <div class="workspace-feature-copy">
                <h3>
                  {{ feature.title }}
                  <span>{{ feature.badge }}</span>
                </h3>
                <p>{{ feature.text }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="case-section">
      <div class="section-shell case-shell">
        <div class="case-heading">
          <div class="case-heading-copy">
            <span class="section-kicker">Research cases</span>
            <h2 class="font-headline">Start from a reproducible geographic experiment.</h2>
          </div>
          <router-link to="/cases" class="case-library-link">
            View case library
            <span aria-hidden="true">-&gt;</span>
          </router-link>
        </div>

        <div class="case-grid">
          <router-link v-for="card in researchCaseCards" :key="card.title" :to="card.to" class="case-card"
            :class="`case-card--${card.accent}`">
            <span class="case-glow-accent" aria-hidden="true"></span>
            <div class="case-image">
              <img :src="card.image" :alt="card.alt">
              <span class="case-domain">{{ card.domain }}</span>
            </div>
            <div class="case-card-body">
              <h3 class="font-headline">{{ card.title }}</h3>
              <p>{{ card.text }}</p>
              <div class="case-tags">
                <span v-for="tag in card.tags" :key="tag">{{ tag }}</span>
              </div>
            </div>
          </router-link>
        </div>
      </div>
    </section>

    <section class="cta-section">
      <div class="cta-shell">
        <span class="cta-motion-field" aria-hidden="true"></span>
        <span class="section-kicker">OpenGeoLab runtime</span>
        <h2 class="font-headline">Build the next experiment from a model, a dataset, or a case notebook.</h2>
        <p>
          Keep resource discovery and notebook execution close together so
          geospatial experiments remain traceable, inspectable, and reusable.
        </p>
        <div class="cta-actions">
          <router-link to="/jupyter" class="btn-primary">Open Workspace</router-link>
          <router-link to="/model" class="btn-secondary">Browse Models</router-link>
        </div>
      </div>
    </section>

  </div>
</template>

<style scoped>
:global(html:has(.home-page)),
:global(body:has(.home-page)) {
  background: #10131a;
}

.home-page {
  --ink: #0f172a;
  --ink-soft: #344154;
  --muted: #66758a;
  --line: #d6deea;
  --line-strong: #aeb9c9;
  --paper: #f6f8fb;
  --card: #ffffff;
  --deep: #07131f;
  --deep-soft: #102136;
  --cyan: #7dd3fc;
  --teal: #0f766e;
  --landing-bg: #10131a;
  --landing-bg-soft: #0f1218;
  --capability-bg: var(--landing-bg);
  --card-hover-ease: cubic-bezier(0.22, 1, 0.36, 1);
  position: relative;
  min-height: calc(100vh - 78px);
  background: var(--landing-bg);
  color: var(--ink);
  isolation: isolate;
  overflow-x: hidden;
  overflow-x: clip;
  overflow-y: visible;
  overscroll-behavior-y: auto;
}

.home-page::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background:
    radial-gradient(circle at 14% 22%, rgba(77, 142, 255, 0.11), transparent 32rem),
    radial-gradient(circle at 82% 66%, rgba(183, 109, 255, 0.075), transparent 34rem),
    radial-gradient(circle at 22% 84%, rgba(74, 225, 118, 0.045), transparent 30rem),
    linear-gradient(rgba(173, 198, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(173, 198, 255, 0.03) 1px, transparent 1px),
    linear-gradient(180deg, var(--landing-bg) 0%, var(--landing-bg-soft) 52%, var(--landing-bg) 100%);
  background-size: cover, cover, cover, 40px 40px, 40px 40px, cover;
  background-position: center, center, center, center, center, center;
  pointer-events: none;
}

.home-page>* {
  position: relative;
  z-index: 1;
}

.font-headline {
  font-family: 'Manrope', 'Inter', sans-serif;
}

.hero-section {
  position: relative;
  min-height: clamp(760px, calc(100vh - 78px), 930px);
  overflow: hidden;
  isolation: isolate;
  color: #f8fbff;
  background:
    linear-gradient(90deg, rgba(4, 13, 25, 0.9) 0%, rgba(4, 13, 25, 0.72) 42%, rgba(4, 13, 25, 0.22) 74%, rgba(4, 13, 25, 0.48) 100%),
    linear-gradient(180deg, rgba(2, 9, 19, 0.08) 0%, rgba(7, 19, 31, 0.72) 64%, rgba(16, 19, 26, 0.98) 100%),
    var(--earth-day);
  background-size: cover, cover, 190% auto;
  background-position: center, center, 58% 47%;
}

.hero-section::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(circle at 70% 30%, rgba(125, 211, 252, 0.24), transparent 22rem),
    radial-gradient(circle at 20% 80%, rgba(20, 184, 166, 0.14), transparent 24rem);
  mix-blend-mode: screen;
}

.hero-section::after {
  content: '';
  position: absolute;
  inset: auto -8% -26% auto;
  width: min(60vw, 820px);
  aspect-ratio: 1;
  z-index: -1;
  border-radius: 50%;
  background:
    radial-gradient(circle at 34% 32%, rgba(255, 255, 255, 0.18), transparent 18%),
    linear-gradient(90deg, rgba(7, 19, 31, 0.04), rgba(7, 19, 31, 0.48)),
    var(--earth-night);
  background-size: cover;
  background-position: 62% 48%;
  border: 1px solid rgba(125, 211, 252, 0.28);
  box-shadow:
    0 0 0 18px rgba(125, 211, 252, 0.04),
    0 0 72px rgba(125, 211, 252, 0.36),
    inset -34px -18px 80px rgba(0, 0, 0, 0.68);
  opacity: 0.9;
}

.hero-announcement {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid rgba(219, 234, 254, 0.24);
  background: rgba(186, 230, 253, 0.12);
  color: #d9f0ff;
  font-size: 0.94rem;
  text-align: center;
  letter-spacing: 0.01em;
}

.hero-shell,
.section-shell {
  max-width: 1480px;
  margin: 0 auto;
}

.hero-shell {
  display: grid;
  grid-template-columns: minmax(430px, 0.9fr) minmax(620px, 1.1fr);
  gap: clamp(2rem, 3.2vw, 3.5rem);
  align-items: center;
  padding: 4.2rem 1.5rem 4.8rem;
}

@media (min-width: 1500px) {
  .hero-shell {
    max-width: 1600px;
    grid-template-columns: minmax(560px, 0.82fr) minmax(760px, 1.18fr);
    gap: clamp(2rem, 2.5vw, 3.2rem);
  }

  .hero-runtime {
    transform: translateX(clamp(1rem, 1.55vw, 2rem));
  }
}

.hero-badge,
.section-kicker {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 30px;
  padding: 0 0.65rem;
  border: 1px solid currentColor;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.hero-badge {
  border-color: rgba(186, 230, 253, 0.46);
  background: rgba(7, 19, 31, 0.36);
  color: #b9ecff;
}

.hero-title {
  max-width: 680px;
  margin: 1.25rem 0 0;
  font-size: clamp(2.9rem, 4.35vw, 4.55rem);
  line-height: 1.08;
  letter-spacing: -0.048em;
  color: #f8fbff;
}

.hero-title span {
  display: block;
}

.hero-title-nowrap {
  white-space: nowrap;
}

.hero-copy {
  max-width: 640px;
  margin: 1.25rem 0 0;
  font-size: clamp(0.98rem, 1.22vw, 1.12rem);
  line-height: 1.68;
  color: rgba(235, 245, 255, 0.78);
}

.hero-actions,
.cta-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.7rem;
}

.btn-primary,
.btn-secondary,
.text-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 1.1rem;
  border-radius: 4px;
  font-family: 'Manrope', 'Inter', sans-serif;
  font-weight: 800;
  text-decoration: none;
  transition: transform 0.16s ease, border-color 0.16s ease, background-color 0.16s ease;
}

.btn-primary {
  border: 1px solid #7dd3fc;
  background: #8bd7ff;
  color: #07131f;
}

.btn-secondary {
  border: 1px solid rgba(226, 232, 240, 0.52);
  background: rgba(7, 19, 31, 0.44);
  color: #f8fbff;
}

.btn-primary:hover,
.btn-secondary:hover,
.text-action:hover {
  transform: translateY(-1px);
}

.hero-runtime {
  align-self: stretch;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
  transform: translateX(clamp(0.75rem, 2.2vw, 2.4rem));
}

.runtime-header {
  display: none;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.3rem 0.45rem 0.8rem;
  border-bottom: 1px solid rgba(226, 232, 240, 0.2);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: rgba(226, 242, 255, 0.72);
}

.runtime-image {
  --glass-x: 50%;
  --glass-y: 42%;
  --glass-lift-x: 0px;
  --glass-lift-y: 0px;
  --glass-tilt-x: 0deg;
  --glass-tilt-y: 0deg;
  --glass-glint-x: 0px;
  --glass-glint-y: 0px;
  --glass-sheen-angle: 128deg;
  --glass-edge-angle: 135deg;
  --glass-edge-alpha: 0.055;
  position: relative;
  margin: 0;
  aspect-ratio: 3520 / 2336;
  isolation: isolate;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 13px;
  overflow: hidden;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.03) 42%, rgba(125, 211, 252, 0.07)),
    rgba(8, 19, 31, 0.38);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    inset 0 -1px 0 rgba(255, 255, 255, 0.08),
    0 0 0 1px rgba(125, 211, 252, 0.05),
    0 18px 46px rgba(0, 0, 0, 0.3),
    0 0 18px rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(18px) saturate(1.16);
  transition:
    border-color 240ms cubic-bezier(0.22, 1, 0.36, 1),
    background 240ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 240ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 240ms cubic-bezier(0.22, 1, 0.36, 1),
    backdrop-filter 240ms cubic-bezier(0.22, 1, 0.36, 1);
  transform-origin: center;
  transform-style: preserve-3d;
  will-change: transform;
}

.runtime-image img {
  position: relative;
  z-index: 0;
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
  object-position: center;
  filter: saturate(1.02) contrast(1.03);
  opacity: 0.82;
  transition:
    opacity 260ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 260ms cubic-bezier(0.22, 1, 0.36, 1);
}

.runtime-image::before {
  content: '';
  position: absolute;
  inset: -24%;
  z-index: 1;
  border-radius: inherit;
  background:
    radial-gradient(circle at var(--glass-x) var(--glass-y), rgba(255, 255, 255, 0.12), rgba(186, 230, 253, 0.04) 16%, transparent 34%),
    linear-gradient(var(--glass-sheen-angle), transparent 30%, rgba(255, 255, 255, 0.08) 45%, rgba(186, 230, 253, 0.035) 55%, transparent 72%);
  opacity: 0;
  mix-blend-mode: screen;
  transform: translate3d(var(--glass-glint-x), var(--glass-glint-y), 0) rotate(-3deg);
  transition:
    opacity 240ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 240ms cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
}

.runtime-image::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 2;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: inherit;
  background:
    linear-gradient(var(--glass-edge-angle), transparent 6%, rgba(255, 255, 255, var(--glass-edge-alpha)) 34%, transparent 62%),
    radial-gradient(circle at var(--glass-x) var(--glass-y), rgba(255, 255, 255, 0.08), rgba(186, 230, 253, 0.035) 16%, transparent 38%),
    linear-gradient(315deg, transparent 60%, rgba(186, 230, 253, 0.035));
  opacity: 0;
  mix-blend-mode: screen;
  transform: translate3d(0, 0, 0);
  transition:
    opacity 240ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 240ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 240ms cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
}

.runtime-image:hover,
.runtime-image:focus-within {
  border-color: rgba(255, 255, 255, 0.31);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.035) 42%, rgba(125, 211, 252, 0.08)),
    rgba(8, 19, 31, 0.34);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.21),
    inset 0 -1px 0 rgba(255, 255, 255, 0.09),
    0 0 0 1px rgba(125, 211, 252, 0.055),
    0 19px 46px rgba(0, 0, 0, 0.31),
    0 0 16px rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(18.5px) saturate(1.18);
  transform:
    perspective(1200px) translate3d(var(--glass-lift-x), calc(-1px + var(--glass-lift-y)), 0) rotateX(var(--glass-tilt-x)) rotateY(var(--glass-tilt-y));
}

.runtime-image:hover img,
.runtime-image:focus-within img {
  filter: saturate(1.045) contrast(1.035);
  opacity: 0.84;
}

.runtime-image:hover::before,
.runtime-image:focus-within::before {
  opacity: 0.12;
}

.runtime-image:hover::after,
.runtime-image:focus-within::after {
  border-color: rgba(255, 255, 255, 0.18);
  opacity: 0.24;
  transform: translate3d(calc(var(--glass-lift-x) * 0.55), calc(var(--glass-lift-y) * 0.55), 0);
}

.runtime-image.runtime-image--pressed {
  border-color: rgba(255, 255, 255, 0.34);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.22),
    inset 0 -1px 0 rgba(255, 255, 255, 0.1),
    0 0 0 1px rgba(125, 211, 252, 0.06),
    0 17px 42px rgba(0, 0, 0, 0.33),
    0 0 14px rgba(255, 255, 255, 0.055);
  transform:
    perspective(1200px) translate3d(var(--glass-lift-x), calc(-1px + var(--glass-lift-y)), 0) rotateX(var(--glass-tilt-x)) rotateY(var(--glass-tilt-y)) scale(0.997);
}

.runtime-image.runtime-image--pressed::before {
  opacity: 0.16;
}

.runtime-image.runtime-image--pressed::after {
  opacity: 0.3;
}

.runtime-image figcaption {
  position: absolute;
  left: 1rem;
  right: 1rem;
  bottom: 1rem;
  z-index: 1;
  padding: 0.85rem;
  border: 1px solid rgba(226, 232, 240, 0.22);
  border-radius: 4px;
  background: rgba(7, 19, 31, 0.72);
  backdrop-filter: blur(10px);
}

.runtime-image figcaption span,
.evidence-card figcaption span {
  display: block;
  color: rgba(203, 213, 225, 0.82);
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.runtime-image figcaption strong,
.evidence-card figcaption strong {
  display: block;
  margin-top: 0.28rem;
  color: #f8fbff;
  line-height: 1.35;
}

.capability-section,
.workflow-section,
.workspace-section,
.case-section,
.cta-section {
  padding-left: 1.5rem;
  padding-right: 1.5rem;
}

.capability-section {
  position: relative;
  min-height: calc(100vh - 78px);
  display: grid;
  align-items: center;
  padding: clamp(3rem, 5.4vh, 4.8rem) 1.5rem;
  background: linear-gradient(180deg, rgba(16, 19, 26, 0.92) 0%, rgba(16, 19, 26, 0.34) 100%);
  color: #e1e2ec;
  overflow: hidden;
}

.capability-section::before {
  content: '';
  position: absolute;
  inset: -96px 0 auto;
  height: 160px;
  z-index: 0;
  background: linear-gradient(180deg, rgba(16, 19, 26, 0), rgba(16, 19, 26, 0.78) 62%, rgba(16, 19, 26, 0));
  pointer-events: none;
}

.capability-shell {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: min(1580px, calc(100vw - clamp(10rem, 14vw, 26rem)));
  display: grid;
  gap: clamp(2rem, 3.7vh, 3.4rem);
}

.section-heading {
  display: grid;
  gap: 0.75rem;
  margin-bottom: 1.45rem;
}

.section-heading.compact h2,
.workflow-narrative h2,
.workspace-copy h2,
.section-heading h2,
.cta-shell h2 {
  margin: 0;
  max-width: 880px;
  color: var(--ink);
  font-size: clamp(2rem, 4vw, 4rem);
  line-height: 1;
  letter-spacing: -0.045em;
}

.section-kicker {
  border-color: var(--line);
  background: #ffffff;
  color: var(--teal);
}

.capability-heading {
  justify-items: center;
  gap: 0.85rem;
  margin-bottom: 0;
  text-align: center;
}

.capability-heading .section-kicker {
  min-height: auto;
  padding: 0;
  border: 0;
  background: transparent;
  color: #9fb5e9;
  letter-spacing: 0.18em;
}

.capability-heading h2 {
  max-width: 1080px;
  color: #e6e8f2;
  font-size: clamp(2rem, 3.05vw, 3.25rem);
  line-height: 1.16;
  letter-spacing: -0.026em;
  text-wrap: balance;
}

.capability-heading p {
  max-width: min(1160px, 100%);
  margin: 0;
  color: #a9adba;
  font-size: clamp(0.95rem, 1.15vw, 1.24rem);
  line-height: 1.45;
  white-space: nowrap;
}

.capability-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(1rem, 1.35vw, 1.6rem);
}

.capability-card {
  min-height: clamp(320px, 37vh, 400px);
  display: flex;
  flex-direction: column;
  padding: 0;
  border: 1px solid rgba(100, 116, 139, 0.26);
  border-radius: 8px;
  background: #191b23;
  color: inherit;
  text-decoration: none;
  overflow: hidden;
  transition:
    transform 0.22s cubic-bezier(0.22, 1, 0.36, 1),
    border-color 0.22s cubic-bezier(0.22, 1, 0.36, 1),
    background-color 0.22s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}

.capability-card:last-child {
  border-right: 1px solid rgba(100, 116, 139, 0.26);
}

.capability-card:hover {
  border-color: rgba(173, 198, 255, 0.42);
  background: #1d2027;
  box-shadow: 0 0 24px rgba(173, 198, 255, 0.11);
  transform: translateY(-2px);
}

.case-domain {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 0.55rem;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: #f1f5f9;
  color: var(--ink-soft);
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.capability-card--secondary:hover {
  border-color: rgba(74, 225, 118, 0.34);
  box-shadow: 0 0 24px rgba(74, 225, 118, 0.08);
}

.capability-card--tertiary:hover {
  border-color: rgba(183, 109, 255, 0.35);
  box-shadow: 0 0 24px rgba(183, 109, 255, 0.09);
}

.capability-visual {
  height: clamp(122px, 14.6vh, 164px);
  border-bottom: 1px solid rgba(173, 198, 255, 0.16);
  background: #32353c;
  overflow: hidden;
}

.capability-visual img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  opacity: 0.58;
  filter: saturate(0.95) contrast(1.05);
  transition:
    opacity 0.22s cubic-bezier(0.22, 1, 0.36, 1),
    filter 0.22s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}

.capability-card:hover .capability-visual img {
  opacity: 0.76;
  filter: saturate(1.02) contrast(1.08);
  transform: scale(1.025);
}

.capability-card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: clamp(1.05rem, 1.35vw, 1.45rem);
}

.capability-card h3 {
  margin: 0;
  color: #e1e2ec;
  font-size: clamp(1.08rem, 1.24vw, 1.35rem);
  line-height: 1.18;
  letter-spacing: -0.02em;
}

.workflow-narrative p,
.workflow-step p,
.workspace-copy p,
.workspace-points span,
.case-card p,
.cta-shell p {
  color: var(--ink-soft);
  line-height: 1.62;
}

.capability-card p {
  display: -webkit-box;
  margin: 0.8rem 0 0;
  overflow: hidden;
  color: #aeb3c1;
  font-size: clamp(0.86rem, 0.92vw, 0.98rem);
  line-height: 1.42;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.capability-link {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  width: fit-content;
  margin-top: auto;
  padding-top: 1.2rem;
  color: #a9bfff;
  font-family: 'Manrope', 'Inter', sans-serif;
  font-size: 0.84rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.capability-link span,
.capability-cta-link span {
  transition: transform 0.18s cubic-bezier(0.22, 1, 0.36, 1);
}

.capability-card:hover .capability-link span,
.capability-cta-link:hover span {
  transform: translateX(3px);
}

.capability-cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.2rem;
  padding: clamp(1.25rem, 2vw, 2rem) clamp(1.35rem, 2.2vw, 2.3rem);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 8px;
  background:
    linear-gradient(90deg, rgba(173, 198, 255, 0.045), transparent 34%),
    #191b23;
}

.capability-cta h3 {
  margin: 0;
  color: #e1e2ec;
  font-size: clamp(1.25rem, 1.55vw, 1.7rem);
  line-height: 1.18;
}

.capability-cta p {
  max-width: 820px;
  margin: 0.55rem 0 0;
  color: #a9adba;
  font-size: clamp(0.92rem, 1vw, 1.08rem);
  line-height: 1.45;
}

.capability-cta-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  min-height: 52px;
  min-width: 220px;
  padding: 0 1.2rem;
  border: 1px solid rgba(140, 144, 159, 0.5);
  border-radius: 6px;
  color: #adc6ff;
  font-family: 'Manrope', 'Inter', sans-serif;
  font-weight: 800;
  text-decoration: none;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease;
}

.capability-cta-link:hover {
  border-color: rgba(173, 198, 255, 0.58);
  background: rgba(173, 198, 255, 0.07);
  color: #d8e2ff;
}

.workflow-section {
  position: relative;
  min-height: calc(100vh - 78px);
  display: grid;
  align-items: center;
  padding: clamp(3rem, 6vh, 5rem) clamp(1.25rem, 4vw, 4rem);
  background: transparent;
  color: #e1e2ec;
  overflow: hidden;
  isolation: isolate;
}

.workflow-section::before {
  content: none;
}

.workflow-section::after {
  content: none;
}

.workflow-shell {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 1360px;
  min-height: min(780px, calc(100vh - 130px));
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7.6fr);
  gap: clamp(2.8rem, 4.8vw, 5.4rem);
  align-items: center;
}

.workflow-narrative {
  display: flex;
  flex-direction: column;
  gap: clamp(1.65rem, 3.4vh, 2.25rem);
  position: relative;
}

.workflow-narrative .section-kicker {
  width: max-content;
  border-color: rgba(74, 225, 118, 0.2);
  background: rgba(74, 225, 118, 0.1);
  color: #4ae176;
  box-shadow: 0 0 15px rgba(74, 225, 118, 0.1);
  backdrop-filter: blur(10px);
}

.workflow-narrative h2 {
  max-width: 620px;
  margin: 0;
  color: #ffffff;
  font-size: clamp(2.55rem, 3.7vw, 3.28rem);
  line-height: 1.14;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 40px rgba(165, 180, 252, 0.28);
}

.workflow-narrative p {
  max-width: 500px;
  margin: 0;
  color: #c2c6d6;
  font-size: clamp(1.04rem, 1.42vw, 1.18rem);
  line-height: 1.62;
}

.workflow-board {
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
}

.workflow-step {
  position: relative;
  z-index: 0;
  display: flex;
  align-items: center;
  gap: 1.2rem;
  min-height: 98px;
  padding: clamp(1.18rem, 1.9vw, 1.45rem);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  background: rgba(31, 41, 55, 0.4);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  transform-origin: center;
  transition:
    transform 0.22s var(--card-hover-ease),
    border-color 0.22s var(--card-hover-ease),
    background-color 0.22s var(--card-hover-ease),
    box-shadow 0.22s var(--card-hover-ease);
}

.workflow-step:hover {
  z-index: 2;
  border-color: rgba(173, 198, 255, 0.42);
  background: rgba(31, 41, 55, 0.52);
  box-shadow: 0 0 24px rgba(173, 198, 255, 0.11);
  transform: translateY(-2px);
}

.workflow-step-number {
  flex: 0 0 auto;
  width: 52px;
  height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(173, 198, 255, 0.2);
  border-radius: 999px;
  background: rgba(173, 198, 255, 0.1);
}

.workflow-step-number span {
  color: #adc6ff;
  font-family: 'Manrope', 'Inter', sans-serif;
  font-size: 1.55rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.workflow-step-icon {
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  display: block;
  color: rgba(173, 198, 255, 0.7);
}

.workflow-step-copy {
  flex: 1;
  min-width: 0;
}

.workflow-step h3 {
  margin: 0;
  color: #e1e2ec;
  font-size: 1.18rem;
  font-weight: 700;
  line-height: 1.35;
}

.workflow-step p {
  margin: 0.25rem 0 0;
  color: #c2c6d6;
  font-size: 0.92rem;
  line-height: 1.42;
}

.workspace-section {
  position: relative;
  min-height: calc(100vh - 78px);
  display: grid;
  align-items: center;
  padding: clamp(3rem, 6vh, 5rem) clamp(1.25rem, 4vw, 4rem);
  background: transparent;
  color: #e1e2ec;
  overflow: hidden;
  isolation: isolate;
}

.workspace-section::before {
  content: none;
}

.workspace-grid {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 1280px;
  min-height: min(760px, calc(100vh - 150px));
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(420px, 0.86fr);
  gap: clamp(2.2rem, 4vw, 4rem);
  align-items: center;
}

.workspace-visual {
  position: relative;
  width: 100%;
  min-height: auto;
  display: block;
  overflow: hidden;
  padding: 0;
  background: transparent;
  border-radius: 6px;
}

.workspace-visual::before,
.workspace-visual::after {
  content: none;
}

.workspace-visual img {
  position: relative;
  z-index: 0;
  width: 100%;
  max-width: none;
  height: auto;
  max-height: none;
  display: block;
  margin: 0;
  object-fit: cover;
  border: 0;
  border-radius: 6px;
  box-shadow: none;
}

.workspace-copy {
  max-height: calc(100vh - 190px);
  overflow-y: auto;
  padding: 0.5rem 0.15rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.16) transparent;
}

.workspace-copy::-webkit-scrollbar {
  width: 4px;
}

.workspace-copy::-webkit-scrollbar-track {
  background: transparent;
}

.workspace-copy::-webkit-scrollbar-thumb {
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.14);
}

.workspace-copy .section-kicker {
  border-color: rgba(74, 225, 118, 0.2);
  background: rgba(74, 225, 118, 0.1);
  color: #4ae176;
  box-shadow: 0 0 15px rgba(74, 225, 118, 0.1);
}

.workspace-copy h2 {
  max-width: 560px;
  margin: clamp(1rem, 2vh, 1.5rem) 0 0;
  color: #e1e2ec;
  font-size: clamp(2.2rem, 3.2vw, 3rem);
  line-height: 1.16;
  letter-spacing: -0.02em;
}

.workspace-copy h2 span {
  color: #4d8eff;
}

.workspace-copy>p {
  max-width: 620px;
  margin: 1.1rem 0 0;
  color: #c2c6d6;
  font-size: 1rem;
  line-height: 1.58;
}

.workspace-timeline {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: clamp(1.6rem, 3vh, 3rem);
}

.workspace-timeline::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 1rem;
  width: 1px;
  background: rgba(66, 71, 84, 0.3);
}

.workspace-feature-card {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 1.5rem;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transform-origin: center;
  transition:
    transform 0.22s var(--card-hover-ease),
    border-color 0.22s var(--card-hover-ease),
    background-color 0.22s var(--card-hover-ease),
    box-shadow 0.22s var(--card-hover-ease);
}

.workspace-feature-card:hover {
  z-index: 2;
  border-color: rgba(173, 198, 255, 0.42);
  background: rgba(15, 23, 42, 0.72);
  box-shadow: 0 0 24px rgba(173, 198, 255, 0.11);
  transform: translateY(-2px);
}

.workspace-feature-icon {
  flex: 0 0 auto;
  width: 2rem;
  height: 2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #424754;
  border-radius: 999px;
  background: #272a31;
  color: #adc6ff;
}

.workspace-feature-card--secondary .workspace-feature-icon {
  color: #4ae176;
}

.workspace-feature-card--tertiary .workspace-feature-icon {
  color: #ddb7ff;
}

.workspace-feature-icon::before {
  content: '';
  width: 1rem;
  height: 1rem;
  display: block;
  background: currentColor;
  mask: var(--workspace-icon) center / contain no-repeat;
  -webkit-mask: var(--workspace-icon) center / contain no-repeat;
}

.workspace-feature-icon--code {
  --workspace-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m8 9-3 3 3 3'/%3E%3Cpath d='m16 9 3 3-3 3'/%3E%3Cpath d='m13 5-2 14'/%3E%3C/svg%3E");
}

.workspace-feature-icon--network {
  --workspace-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='6' cy='7' r='3'/%3E%3Ccircle cx='18' cy='7' r='3'/%3E%3Ccircle cx='12' cy='18' r='3'/%3E%3Cpath d='m8.5 9.5 2.1 5.1'/%3E%3Cpath d='m15.5 9.5-2.1 5.1'/%3E%3Cpath d='M9 7h6'/%3E%3C/svg%3E");
}

.workspace-feature-icon--rocket {
  --workspace-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4.5 16.5c-1 1-1.5 3-1.5 4.5 1.5 0 3.5-.5 4.5-1.5'/%3E%3Cpath d='M9 15 6 18l-2-2 3-3'/%3E%3Cpath d='m15 9 3-3 2 2-3 3'/%3E%3Cpath d='M9 15s1.5 0 4.5-3S17 5 17 5s-4 .5-7 3.5S6.5 13 6.5 13'/%3E%3Cpath d='M14 10h.01'/%3E%3C/svg%3E");
}

.workspace-feature-copy {
  min-width: 0;
}

.workspace-feature-copy h3 {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  color: #e1e2ec;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.35;
}

.workspace-feature-copy h3 span {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 0.5rem;
  border-radius: 4px;
  background: rgba(77, 142, 255, 0.1);
  color: #adc6ff;
  font-family: 'Manrope', 'Inter', sans-serif;
  font-size: 0.625rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.workspace-feature-card--secondary h3 span {
  background: rgba(74, 225, 118, 0.1);
  color: #4ae176;
}

.workspace-feature-card--tertiary h3 span {
  background: rgba(221, 183, 255, 0.1);
  color: #ddb7ff;
}

.workspace-feature-copy p {
  margin: 0.5rem 0 0;
  color: #c2c6d6;
  font-size: 0.875rem;
  line-height: 1.42;
}

.case-section {
  position: relative;
  min-height: calc(100vh - 78px);
  display: grid;
  align-items: center;
  padding: clamp(3.4rem, 6vh, 5rem) clamp(1.25rem, 4vw, 4rem);
  background: transparent;
  color: #e1e2ec;
  overflow: hidden;
}

.case-shell {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
}

.case-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: clamp(1.5rem, 4vw, 3rem);
  margin-bottom: clamp(1.8rem, 4vh, 3rem);
}

.case-heading-copy {
  max-width: 720px;
}

.case-heading .section-kicker {
  border-color: rgba(221, 183, 255, 0.22);
  background: rgba(221, 183, 255, 0.08);
  color: #ddb7ff;
}

.case-heading h2 {
  margin: 0.75rem 0 0;
  color: #e1e2ec;
  font-size: clamp(2.5rem, 4.2vw, 4rem);
  line-height: 1.04;
  letter-spacing: -0.045em;
}

.case-library-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  min-height: 48px;
  padding: 0 1.5rem;
  border: 1px solid rgba(66, 71, 84, 0.8);
  border-radius: 4px;
  color: #e1e2ec;
  font-family: 'Manrope', 'Inter', sans-serif;
  font-size: 0.88rem;
  font-weight: 800;
  text-decoration: none;
  transition:
    border-color 0.3s ease,
    color 0.3s ease,
    box-shadow 0.3s ease,
    transform 0.16s ease;
}

.case-library-link:hover {
  border-color: rgba(173, 198, 255, 0.58);
  color: #adc6ff;
  box-shadow: 0 0 18px rgba(173, 198, 255, 0.12);
  transform: translateY(-1px);
}

.case-library-link span {
  transition: transform 0.18s ease;
}

.case-library-link:hover span {
  transform: translateX(3px);
}

.case-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(1.1rem, 2vw, 1.5rem);
}

.case-card {
  position: relative;
  min-height: clamp(480px, 48vh, 560px);
  display: flex;
  flex-direction: column;
  color: inherit;
  text-decoration: none;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transform-origin: center;
  transition:
    transform 0.22s var(--card-hover-ease),
    border-color 0.22s var(--card-hover-ease),
    background-color 0.22s var(--card-hover-ease),
    box-shadow 0.22s var(--card-hover-ease);
}

.case-card:hover {
  z-index: 2;
  border-color: rgba(173, 198, 255, 0.42);
  background: rgba(15, 23, 42, 0.72);
  box-shadow: 0 0 24px rgba(173, 198, 255, 0.11);
  transform: translateY(-2px);
}

.case-glow-accent {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2;
  height: 2px;
  background: linear-gradient(90deg, transparent, #adc6ff, transparent);
  opacity: 0;
}

.case-card--tertiary .case-glow-accent {
  background: linear-gradient(90deg, transparent, #ddb7ff, transparent);
}

.case-image {
  position: relative;
  height: clamp(210px, 24vh, 256px);
  overflow: hidden;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.case-image img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.case-domain {
  position: absolute;
  top: 1rem;
  left: 1rem;
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 0.65rem;
  border: 1px solid rgba(66, 71, 84, 0.5);
  border-radius: 4px;
  background: rgba(16, 19, 26, 0.8);
  color: #6bff8f;
  font-family: 'Manrope', 'Inter', sans-serif;
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  backdrop-filter: blur(8px);
}

.case-card--tertiary .case-domain {
  color: #ddb7ff;
}

.case-card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: clamp(1.2rem, 2vw, 1.5rem);
}

.case-card h3 {
  margin: 0;
  color: #e1e2ec;
  font-size: clamp(1.38rem, 2vw, 1.75rem);
  line-height: 1.14;
  letter-spacing: -0.035em;
}

.case-card p {
  flex: 1;
  margin: 0.9rem 0 0;
  color: #c2c6d6;
  font-size: 0.92rem;
  line-height: 1.5;
}

.case-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1.5rem;
}

.case-tags span {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 0.72rem;
  border: 1px solid rgba(173, 198, 255, 0.2);
  border-radius: 999px;
  background: rgba(173, 198, 255, 0.1);
  color: #adc6ff;
  font-family: 'Manrope', 'Inter', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.case-card--tertiary .case-tags span {
  border-color: rgba(221, 183, 255, 0.2);
  background: rgba(221, 183, 255, 0.1);
  color: #ddb7ff;
}

.cta-section {
  position: relative;
  min-height: auto;
  display: grid;
  align-items: center;
  padding: clamp(3.2rem, 5vh, 4.5rem) clamp(1.25rem, 4vw, 4rem) clamp(2rem, 3.6vh, 3rem);
  background: transparent;
  color: #e1e2ec;
  overflow: hidden;
}

.cta-shell {
  position: relative;
  width: 100%;
  display: grid;
  justify-items: center;
  align-content: center;
  text-align: center;
  min-height: min(560px, calc(100vh - 220px));
  max-width: 1280px;
  margin: 0 auto;
  padding: clamp(3.3rem, 8vh, 5.6rem) clamp(1.25rem, 4vw, 4rem);
  border: 1px solid rgba(188, 203, 255, 0.13);
  border-radius: 32px;
  background:
    radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.05), transparent 20rem),
    linear-gradient(135deg, rgba(19, 20, 24, 0.98), rgba(9, 10, 13, 0.98) 54%, rgba(18, 20, 27, 0.96));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.065),
    inset 0 0 0 1px rgba(173, 198, 255, 0.025),
    0 24px 90px rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  overflow: hidden;
  isolation: isolate;
}

.cta-shell::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: inherit;
  background:
    radial-gradient(circle at 50% 52%, rgba(6, 7, 10, 0.16) 0 13%, rgba(11, 12, 16, 0.38) 31%, rgba(5, 6, 9, 0.74) 72%, rgba(5, 6, 9, 0.9) 100%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.05), transparent 22%, rgba(0, 0, 0, 0.26) 100%);
  pointer-events: none;
}

.cta-shell::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 2;
  border-radius: inherit;
  background:
    radial-gradient(ellipse at center, transparent 0 28%, rgba(0, 0, 0, 0.16) 45%, rgba(0, 0, 0, 0.62) 100%),
    repeating-radial-gradient(circle at 48% 51%, rgba(255, 255, 255, 0.034) 0 1px, transparent 1px 4px);
  background-size: cover, 4px 4px;
  opacity: 0.82;
  pointer-events: none;
}

.cta-motion-field {
  position: absolute;
  inset: -18%;
  z-index: 0;
  border-radius: inherit;
  background:
    radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.14), transparent 11rem),
    radial-gradient(circle at 50% 50%, rgba(82, 146, 212, 0.18), transparent 24rem),
    #111214;
  overflow: hidden;
  pointer-events: none;
  transform: translateZ(0);
}

.cta-motion-field::before {
  content: '';
  position: absolute;
  inset: -36%;
  background:
    conic-gradient(from 218deg at 50% 51%,
      rgba(255, 255, 255, 0) 0deg,
      rgba(111, 133, 148, 0.5) 10deg,
      rgba(230, 194, 107, 0.3) 20deg,
      rgba(255, 255, 255, 0) 34deg,
      rgba(255, 255, 255, 0) 50deg,
      rgba(68, 105, 141, 0.46) 69deg,
      rgba(126, 146, 126, 0.26) 86deg,
      rgba(255, 255, 255, 0) 104deg,
      rgba(255, 255, 255, 0) 123deg,
      rgba(204, 151, 81, 0.34) 139deg,
      rgba(103, 134, 159, 0.26) 151deg,
      rgba(255, 255, 255, 0) 170deg,
      rgba(255, 255, 255, 0) 196deg,
      rgba(93, 150, 179, 0.44) 216deg,
      rgba(178, 150, 95, 0.28) 229deg,
      rgba(255, 255, 255, 0) 246deg,
      rgba(255, 255, 255, 0) 271deg,
      rgba(147, 134, 90, 0.32) 293deg,
      rgba(77, 112, 153, 0.32) 308deg,
      rgba(255, 255, 255, 0) 330deg,
      rgba(255, 255, 255, 0) 360deg),
    radial-gradient(circle at 50% 51%, rgba(255, 255, 255, 0.2), transparent 10rem);
  filter: blur(38px) saturate(1.2) contrast(1.08);
  opacity: 0.9;
  mix-blend-mode: screen;
  transform: translate3d(-2%, 1%, 0) rotate(-4deg) scale(1.28);
  transform-origin: center;
  animation: ctaSameBeam 13s ease-in-out infinite alternate;
  will-change: transform, opacity;
}

.cta-motion-field::after {
  content: '';
  position: absolute;
  inset: -12%;
  background:
    linear-gradient(112deg, transparent 0 26%, rgba(255, 236, 166, 0.12) 36%, transparent 46%),
    linear-gradient(244deg, transparent 0 24%, rgba(112, 166, 212, 0.16) 38%, transparent 50%),
    linear-gradient(18deg, transparent 0 30%, rgba(81, 117, 151, 0.12) 44%, transparent 56%);
  filter: blur(22px);
  opacity: 0.72;
  mix-blend-mode: screen;
  transform: translate3d(1%, -1%, 0) scale(1.08);
  animation: ctaSameStreaks 9s ease-in-out infinite alternate;
  will-change: transform, opacity;
}

.cta-shell> :not(.cta-motion-field) {
  position: relative;
  z-index: 3;
}

.cta-shell .section-kicker {
  border-color: rgba(74, 225, 118, 0.2);
  background: rgba(74, 225, 118, 0.1);
  color: #4ae176;
  box-shadow: 0 0 15px rgba(74, 225, 118, 0.1);
}

.cta-shell h2 {
  margin-top: 1rem;
  max-width: 920px;
  color: #e1e2ec;
  font-size: clamp(2.7rem, 5vw, 4.35rem);
  line-height: 1.04;
  letter-spacing: -0.055em;
  text-shadow: 0 14px 52px rgba(0, 0, 0, 0.5);
}

.cta-shell p {
  max-width: 760px;
  margin: 1rem 0 0;
  color: #c2c6d6;
  font-size: clamp(1rem, 1.12vw, 1.12rem);
  line-height: 1.6;
}

.cta-shell .btn-primary {
  border-color: #8bd7ff;
  background: #8bd7ff;
  color: #07131f;
  box-shadow: 0 0 22px rgba(139, 215, 255, 0.16);
}

.cta-shell .btn-secondary {
  border-color: rgba(173, 198, 255, 0.28);
  background: rgba(15, 23, 42, 0.54);
  color: #e1e2ec;
}

.cta-shell .btn-secondary:hover {
  border-color: rgba(173, 198, 255, 0.5);
  background: rgba(29, 32, 39, 0.78);
  color: #adc6ff;
}

@keyframes ctaSameBeam {
  0% {
    opacity: 0.74;
    transform: translate3d(-2.8%, 1.4%, 0) rotate(-5deg) scale(1.22);
  }

  50% {
    opacity: 0.96;
    transform: translate3d(1.6%, -1.2%, 0) rotate(5deg) scale(1.32);
  }

  100% {
    opacity: 0.8;
    transform: translate3d(2.4%, 1.8%, 0) rotate(-7deg) scale(1.38);
  }
}

@keyframes ctaSameStreaks {
  0% {
    opacity: 0.52;
    transform: translate3d(-1.2%, 1.2%, 0) scale(1.04);
  }

  100% {
    opacity: 0.84;
    transform: translate3d(1.6%, -1.4%, 0) scale(1.13);
  }
}

@media (max-width: 1120px) {

  .hero-shell,
  .workflow-shell,
  .workspace-grid {
    grid-template-columns: 1fr;
  }

  .hero-runtime {
    max-width: 680px;
  }

  .capability-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .capability-card:nth-child(2) {
    border-right: 1px solid rgba(100, 116, 139, 0.26);
  }

  .capability-card:nth-child(1),
  .capability-card:nth-child(2) {
    border-bottom: 1px solid rgba(100, 116, 139, 0.26);
  }

  .capability-section {
    min-height: auto;
    padding-top: 3.6rem;
    padding-bottom: 3.6rem;
  }

  .capability-shell {
    max-width: 100%;
  }

  .capability-cta {
    align-items: flex-start;
    flex-direction: column;
  }

  .capability-cta-link {
    min-width: 0;
  }

  .workflow-section {
    min-height: auto;
    padding-top: 4rem;
    padding-bottom: 4rem;
  }

  .workflow-shell {
    max-width: 820px;
    min-height: auto;
    gap: 2.45rem;
  }

  .workflow-narrative h2 {
    max-width: 620px;
    font-size: clamp(2.45rem, 7vw, 3.25rem);
  }

  .workflow-narrative p {
    max-width: 560px;
  }

  .workflow-board {
    width: 100%;
  }

  .workflow-step {
    min-height: 92px;
  }

  .workspace-section {
    min-height: auto;
    padding-top: 4rem;
    padding-bottom: 4rem;
  }

  .workspace-grid {
    max-width: 760px;
    min-height: auto;
    gap: 2.4rem;
  }

  .workspace-visual {
    min-height: auto;
  }

  .workspace-copy {
    max-height: none;
    overflow: visible;
  }

  .case-section {
    min-height: auto;
    padding-top: 4rem;
    padding-bottom: 4rem;
  }

  .case-shell {
    max-width: 760px;
  }

  .case-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .case-grid {
    grid-template-columns: 1fr;
  }

}

@media (max-width: 960px) {
  .home-page {
    min-height: calc(100vh - 136px);
  }
}

@media (max-width: 780px) {
  .hero-section {
    min-height: auto;
    background-size: cover, cover, 260% auto;
    background-position: center, center, 55% 48%;
  }

  .hero-section::after {
    width: 88vw;
    right: -36%;
    bottom: -14%;
    opacity: 0.58;
  }

  .hero-shell {
    padding: 3.2rem 1rem 3.8rem;
  }

  .hero-title {
    max-width: 100%;
    font-size: clamp(2.65rem, 12.5vw, 3.2rem);
  }

  .hero-title-nowrap {
    white-space: normal;
  }

  .hero-runtime {
    min-height: auto;
    transform: none;
  }

  .runtime-image {
    aspect-ratio: 3520 / 2336;
  }

  .capability-section,
  .workflow-section,
  .workspace-section,
  .case-section,
  .cta-section {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .capability-grid,
  .case-grid {
    grid-template-columns: 1fr;
  }

  .capability-card {
    min-height: auto;
    border: 1px solid rgba(100, 116, 139, 0.26);
  }

  .capability-card:last-child {
    border-bottom: 1px solid rgba(100, 116, 139, 0.26);
  }

  .capability-heading h2 {
    font-size: clamp(2rem, 9vw, 2.65rem);
  }

  .capability-heading p {
    white-space: normal;
  }

  .capability-visual {
    height: 150px;
  }

  .capability-cta-link {
    width: 100%;
  }

  .workflow-narrative h2 {
    font-size: clamp(2.25rem, 11vw, 3.1rem);
  }

  .workflow-narrative p {
    font-size: 1rem;
  }

  .workflow-step {
    align-items: flex-start;
    gap: 0.8rem;
    min-height: auto;
    padding: 1.05rem 1rem;
  }

  .workflow-step-number {
    width: 42px;
    height: 42px;
  }

  .workflow-step-number span {
    font-size: 1.1rem;
  }

  .workflow-step-icon {
    width: 24px;
    height: 24px;
    margin-top: 0.55rem;
  }

  .workflow-step p {
    font-size: 0.95rem;
  }

  .workspace-visual {
    min-height: auto;
    padding: 0;
  }

  .workspace-visual img {
    max-height: none;
  }

  .workspace-copy h2 {
    font-size: clamp(2.15rem, 10vw, 3rem);
  }

  .workspace-feature-card {
    gap: 1rem;
    padding: 1.1rem;
  }

  .workspace-feature-copy h3 {
    gap: 0.4rem;
  }

  .case-heading h2 {
    font-size: clamp(2.15rem, 10vw, 3rem);
  }

  .case-library-link {
    width: 100%;
  }

  .case-card {
    min-height: auto;
  }

  .case-image {
    height: 190px;
  }

  .case-card-body {
    padding: 1.1rem;
  }

  .case-card h3 {
    font-size: clamp(1.25rem, 8vw, 1.7rem);
  }

}

@media (prefers-reduced-motion: reduce) {
  .home-page {
    scroll-behavior: auto;
  }

  .runtime-image,
  .runtime-image img,
  .runtime-image::before,
  .runtime-image::after,
  .cta-motion-field::before,
  .cta-motion-field::after,
  .workflow-step,
  .workspace-feature-card,
  .case-card,
  .case-image img {
    transition-duration: 0.01ms;
    animation-duration: 0.01ms;
    animation-iteration-count: 1;
  }

  .runtime-image:hover,
  .runtime-image:focus-within,
  .runtime-image.runtime-image--pressed,
  .runtime-image:hover::before,
  .runtime-image:focus-within::before,
  .runtime-image:hover::after,
  .runtime-image:focus-within::after,
  .workflow-step:hover,
  .workspace-feature-card:hover,
  .case-card:hover {
    transform: none;
  }

  .cta-motion-field::before,
  .cta-motion-field::after {
    animation: none;
  }

  .cta-motion-field::before {
    transform: translate3d(0, 0, 0) rotate(-3deg) scale(1.28);
  }

  .cta-motion-field::after {
    transform: translate3d(0, 0, 0) scale(1.08);
  }
}
</style>
