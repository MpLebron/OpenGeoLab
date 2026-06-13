<template>
  <div class="research-page">
    <section class="research-hero">
      <div class="research-shell hero-grid">
        <div class="hero-copy">
          <p class="eyebrow">OpenGeoLab Research</p>
          <h1 class="font-headline">Publications behind the modeling workspace</h1>
          <p class="hero-lede">
            A curated reading map for geographic model services, GeoAI code generation,
            Jupyter-based cyberinfrastructure, and reusable modeling knowledge.
          </p>
        </div>
      </div>
    </section>

    <section class="research-shell research-toolbar" aria-label="Research filters">
      <div class="search-field">
        <span aria-hidden="true">⌕</span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search title, authors, keywords..."
        >
      </div>

      <div class="track-tabs" aria-label="Research tracks">
        <button
          v-for="track in researchTracks"
          :key="track"
          type="button"
          :class="['track-tab', { active: activeTrack === track }]"
          @click="activeTrack = track"
        >
          {{ track }}
        </button>
      </div>
    </section>

    <section class="research-shell publication-section">
      <div class="section-heading compact">
        <div>
          <p class="eyebrow">Library</p>
          <h2 class="font-headline">Team-related publications and reference papers</h2>
        </div>
        <span class="result-count">{{ filteredPapers.length }} shown</span>
      </div>

      <div class="publication-list">
        <article v-for="paper in filteredPapers" :key="paper.title" class="publication-row">
          <div :class="['paper-cover', { 'paper-cover--empty': !paper.cover }]">
            <img
              v-if="paper.cover"
              :src="paper.cover"
              :alt="`${paper.title} first-page preview`"
              loading="lazy"
            >
            <div v-else class="paper-cover-fallback" aria-label="Cover image pending">
              <span>Cover pending</span>
            </div>
          </div>
          <div class="row-main">
            <div class="row-kicker">
              <span class="status-pill">{{ paper.status || paper.type }}</span>
              <span>{{ publicationSource(paper) }}</span>
              <a
                v-if="paper.doi"
                :href="doiUrl(paper.doi)"
                target="_blank"
                rel="noreferrer"
                class="doi-inline"
              >
                DOI: {{ paper.doi }}
              </a>
            </div>
            <div class="row-title-line">
              <h3>{{ paper.title }}</h3>
            </div>
            <p class="authors">{{ paper.authors }}</p>
            <p class="summary">{{ paper.summary }}</p>
            <div class="keyword-row">
              <span v-for="keyword in paper.keywords" :key="keyword">{{ keyword }}</span>
            </div>
          </div>
          <div class="row-action">
            <a
              v-if="paper.url"
              :href="paper.url"
              target="_blank"
              rel="noreferrer"
            >
              Read Paper ->
            </a>
            <span v-else>{{ paper.type }}</span>
          </div>
        </article>
      </div>

      <div v-if="!filteredPapers.length" class="empty-state">
        <p>No publications match the current filter.</p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import aiSimulationSchedulingCover from '../assets/research/ai-simulation-scheduling.webp'
import geographicalModalCover from '../assets/research/geographical-modal-integration.webp'
import hydrologySensitivityCover from '../assets/research/hydrology-sensitivity-analysis.webp'
import mapmateCover from '../assets/research/mapmate-llm-map-design.webp'
import modelAcademicInfluenceCover from '../assets/research/model-academic-influence-2023.webp'
import openKnowledgeFrameworkCover from '../assets/research/open-knowledge-framework.webp'
import regionalDecisionAgentCover from '../assets/research/regional-decision-making-agent.webp'
import resourceNetworkCover from '../assets/research/resource-network-recommendation.webp'
import steeringOpenSourceAiSdgsCover from '../assets/research/steering-open-source-ai-sdgs.webp'
import urbanClimateHeatIslandCover from '../assets/research/urban-climate-heat-island.webp'
import wildfireKnowledgeHypergraphsCover from '../assets/research/wildfire-knowledge-hypergraphs.webp'

const activeTrack = ref('All')
const searchQuery = ref('')

const papers = [
  {
    year: '2026',
    title: 'Steering open-source AI to accelerate the sustainable development goals',
    authors: 'Min Chen, Kai Wu, Prajal Pradhan, Cameron Allen, Stefano Nativi, et al.',
    journal: 'Nature Communications',
    doi: '10.1038/s41467-026-73866-8',
    url: 'https://www.nature.com/articles/s41467-026-73866-8',
    status: 'Published',
    track: 'Sustainable AI',
    type: 'Comment',
    cover: steeringOpenSourceAiSdgsCover,
    keywords: ['open-source AI', 'sustainable development goals', 'AI governance'],
    summary: 'Introduces governance actions for open-source AI across sustainability, impact evaluation, safety, and cooperation to help align AI development with the Sustainable Development Goals.'
  },
  {
    year: '2026',
    title: 'Optimizing AI-driven Geographic Simulation Task Scheduling through Intelligent Runtime Estimation for Distributed Heterogeneous Clusters',
    authors: 'Wanhao Li, Min Chen, Fengyuan Zhang, Peilong Ma, Zaiyang Ma, et al.',
    journal: 'SSRN Preprint',
    doi: '10.2139/ssrn.6049746',
    url: 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6049746',
    status: 'Preprint',
    track: 'Model Services',
    type: 'Preprint',
    cover: aiSimulationSchedulingCover,
    keywords: ['geo-simulation', 'LLM scheduling', 'distributed clusters'],
    summary: 'Uses LLM-assisted runtime estimation and resource-aware scheduling to improve AI-driven geographic simulation tasks on heterogeneous clusters.'
  },
  {
    year: '2026',
    title: 'Exploring geographical modal and its implications to support geographical integration',
    authors: 'Zhuo Sun, Tianyu Sheng, Kai Wu, Peilong Ma, Zihao Tang, et al.',
    journal: 'Science Bulletin',
    doi: '10.1016/j.scib.2026.04.011',
    url: 'https://www.sciencedirect.com/science/article/abs/pii/S2095927326003609',
    status: 'Published',
    track: 'Model Services',
    type: 'Article',
    cover: geographicalModalCover,
    keywords: ['geographical integration', 'geoscience', 'modeling concepts'],
    summary: 'Discusses geographical modal as a conceptual basis for supporting integration across geographic knowledge, models, and processes.'
  },
  {
    year: '2026',
    title: 'MapMate: A framework bridging natural language interaction and map design through large language models',
    authors: 'Zihao Tang, Songshan Yue, Fangzhuo Mu, Yucheng Shu, Zhuo Sun, et al.',
    journal: 'International Journal of Applied Earth Observation and Geoinformation',
    doi: '10.1016/j.jag.2025.105073',
    url: 'https://www.sciencedirect.com/science/article/pii/S1569843225007204',
    status: 'Published',
    track: 'Map Intelligence',
    type: 'Article',
    cover: mapmateCover,
    keywords: ['map design', 'LLM', 'natural language interaction'],
    summary: 'Bridges natural-language interaction and cartographic design with an LLM-based workflow for map generation, style refinement, and cartographic reasoning.'
  },
  {
    year: '2026',
    title: 'Regional decision-making agent: enhancing geographic decision support through structured resource governance and multi-agent collaboration',
    authors: 'Zhuo Sun, Songshan Yue, Kaili Yu, Fangzhuo Mu, Zihao Tang, et al.',
    journal: 'International Journal of Geographical Information Science',
    doi: '10.1080/13658816.2026.2639623',
    url: 'https://www.tandfonline.com/doi/full/10.1080/13658816.2026.2639623',
    status: 'Published',
    track: 'Agentic Modeling',
    type: 'Article',
    cover: regionalDecisionAgentCover,
    keywords: ['resource governance', 'multi-agent collaboration', 'geographic decision support'],
    summary: 'Introduces RDMA, a multi-agent framework that combines structured georesource governance, RAG, self-assessment, and transparency mechanisms for complex regional decision-making.'
  },
  {
    year: '2026',
    title: 'Academic influence index evaluation report of geographic simulation models (2023)',
    authors: 'Dichen Liu, Fengyuan Zhang, Kai Xu, Daniel P. Ames, Albert J. Kettner, et al.',
    journal: 'Environmental Modelling & Software',
    doi: '10.1016/j.envsoft.2025.106737',
    url: 'https://www.sciencedirect.com/science/article/abs/pii/S1364815225004219',
    status: 'Published',
    track: 'Model Services',
    type: 'Article',
    cover: modelAcademicInfluenceCover,
    keywords: ['geographic simulation models', 'academic influence', 'model evaluation'],
    summary: 'Applies the Model Academic Influence Index to 207 models and 22 methods collected in 2023, producing a leaderboard and insights into open-source model ecosystems.'
  },
  {
    year: '2026',
    title: 'A wildfire exposure risk assessment framework combining LLM and spatial-temporal knowledge hypergraphs',
    authors: 'Jiaqi Huang, Teng Zhong, Songshan Yue, Anthony G.O. Yeh, Min Chen, et al.',
    journal: 'Computers, Environment and Urban Systems',
    doi: '10.1016/j.compenvurbsys.2026.102411',
    url: 'https://www.sciencedirect.com/science/article/abs/pii/S019897152600013X',
    status: 'Published',
    track: 'Knowledge Infrastructure',
    type: 'Article',
    cover: wildfireKnowledgeHypergraphsCover,
    keywords: ['wildfire risk', 'knowledge hypergraph', 'LLM'],
    summary: 'Combines LLM-based wildfire knowledge extraction with spatial-temporal knowledge hypergraphs to support exposure risk assessment and regional wildfire prevention planning.'
  },
  {
    year: '2025',
    title: 'Constructing a Resource Network for Data-Model Associative Retrieval and Recommendation in Geographic Modeling',
    authors: 'Xinyong Li, Yuanqing He, Zizhuo Zhang, Zhiyi Zhu, Songshan Yue, et al.',
    journal: 'Transactions in GIS',
    doi: '10.1111/tgis.70148',
    url: 'https://onlinelibrary.wiley.com/doi/full/10.1111/tgis.70148',
    status: 'Published',
    track: 'Knowledge Infrastructure',
    type: 'Article',
    cover: resourceNetworkCover,
    keywords: ['data-model retrieval', 'resource network', 'recommendation'],
    summary: 'Builds a data-model resource associative network to support joint retrieval and intelligent recommendation for geographic modeling resources.'
  },
  {
    year: '2025',
    title: 'Facilitating sensitivity analysis of hydrological models through knowledge-driven configuration and distributed online model services',
    authors: 'Peilong Ma, Min Chen, Shuo Zhang, Zhiyi Zhu, Zhen Qian, et al.',
    journal: 'Journal of Hydrology',
    doi: '10.1016/j.jhydrol.2025.133406',
    url: 'https://www.sciencedirect.com/science/article/abs/pii/S0022169425007449',
    status: 'Published',
    track: 'Model Services',
    type: 'Article',
    cover: hydrologySensitivityCover,
    keywords: ['hydrological models', 'sensitivity analysis', 'model services'],
    summary: 'Combines rule and case knowledge repositories with distributed hydrological model services to make sensitivity analysis more reliable and reusable.'
  },
  {
    year: '2025',
    title: 'Examining urban agglomeration heat island with explainable AI: An enhanced consideration of anthropogenic heat emissions',
    authors: 'Tianyu Sheng, Zhixin Zhang, Zhen Qian, Peilong Ma, Wei Xie, et al.',
    journal: 'Urban Climate',
    doi: '10.1016/j.uclim.2024.102251',
    url: 'https://www.sciencedirect.com/science/article/abs/pii/S2212095524004486',
    status: 'Published',
    track: 'Map Intelligence',
    type: 'Article',
    cover: urbanClimateHeatIslandCover,
    keywords: ['urban heat island', 'explainable AI', 'anthropogenic heat'],
    summary: 'Uses multisource geo-big data and explainable AI to evaluate regional heat island effects and anthropogenic heat mitigation strategies.'
  },
  {
    year: '2024',
    title: 'Construction of an open knowledge framework for geoscientific models',
    authors: 'Kai Xu, Songshan Yue, Qingbin Chen, Jin Wang, Fengyuan Zhang, et al.',
    journal: 'Transactions in GIS',
    doi: '10.1111/tgis.13134',
    url: 'https://onlinelibrary.wiley.com/doi/full/10.1111/tgis.13134',
    status: 'Published',
    track: 'Knowledge Infrastructure',
    type: 'Framework',
    cover: openKnowledgeFrameworkCover,
    keywords: ['model knowledge', 'OpenGMS', 'knowledge framework'],
    summary: 'Constructs an open knowledge framework for geoscientific models, supporting structured model description, discovery, and reuse.'
  }
]

const researchTracks = computed(() => [
  'All',
  ...Array.from(new Set(papers.map(paper => paper.track)))
])

const doiUrl = doi => `https://doi.org/${doi}`

const publicationSource = paper => {
  const source = paper.journal || paper.type
  return [source, paper.year].filter(Boolean).join(' · ')
}

const filteredPapers = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return papers.filter(paper => {
    const inTrack = activeTrack.value === 'All' || paper.track === activeTrack.value
    if (!inTrack) return false

    if (!query) return true
    const haystack = [
      paper.title,
      paper.authors,
      paper.journal,
      paper.doi,
      paper.status,
      paper.track,
      paper.type,
      paper.summary,
      paper.keywords.join(' ')
    ].join(' ').toLowerCase()
    return haystack.includes(query)
  })
})
</script>

<style scoped>
.research-page {
  min-height: 100vh;
  background: var(--bg-color);
  color: var(--primary-strong);
}

.research-shell {
  width: min(100% - 3rem, 1360px);
  margin: 0 auto;
}

.research-hero {
  position: relative;
  overflow: hidden;
  padding: 3rem 0 1.6rem;
  background: var(--bg-color);
  border-bottom: 1px solid var(--border-light);
}

.hero-grid {
  display: block;
}

.eyebrow {
  margin: 0;
  color: var(--accent-color);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.hero-copy h1,
.section-heading h2 {
  margin: 0.65rem 0 0;
  color: var(--primary-strong);
  letter-spacing: -0.03em;
}

.hero-copy h1 {
  max-width: 100%;
  font-size: clamp(2.45rem, 3vw, 3.15rem);
  line-height: 1.06;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hero-lede {
  max-width: 100%;
  margin: 0.9rem 0 0;
  color: var(--text-secondary);
  font-size: 1.02rem;
  line-height: 1.55;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.research-toolbar {
  display: grid;
  grid-template-columns: minmax(260px, 420px) minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
  padding: 1.2rem 0;
}

.search-field {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 0.65rem;
  min-height: 44px;
  padding: 0 0.85rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: #ffffff;
  box-shadow: none;
}

.search-field span {
  color: var(--text-muted);
}

.search-field input {
  width: 100%;
  border: none;
  background: transparent;
  color: var(--primary-strong);
  font: inherit;
  outline: none;
}

.track-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: flex-end;
}

.track-tab {
  min-height: 36px;
  padding: 0 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: #ffffff;
  color: var(--text-secondary);
  font-family: 'Manrope', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;
}

.track-tab.active {
  background: var(--primary-strong);
  color: #ffffff;
}

.publication-section {
  padding: 1rem 0 2.4rem;
}

.section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.section-heading h2 {
  max-width: 780px;
  font-size: clamp(1.55rem, 2.4vw, 2.2rem);
  line-height: 1.08;
}

.section-heading.compact {
  align-items: center;
}

.result-count {
  color: var(--text-muted);
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.publication-row,
.empty-state {
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: #ffffff;
  box-shadow: none;
}

.row-kicker {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-muted);
  font-family: 'Manrope', sans-serif;
  font-size: 0.75rem;
  font-weight: 800;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 0.55rem;
  border: 1px solid rgba(var(--accent-rgb), 0.26);
  border-radius: 3px;
  background: #f8fafc;
  color: var(--accent-color);
  font-family: 'Manrope', sans-serif;
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
}

.keyword-row span,
.row-action span {
  display: inline-flex;
  align-items: center;
  border-radius: 3px;
  font-size: 0.68rem;
  font-weight: 800;
}

.doi-inline {
  min-width: 0;
  color: var(--text-muted);
  font-family: 'Manrope', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  line-height: 1.3;
  text-decoration: none;
  overflow-wrap: anywhere;
}

.doi-inline:hover {
  color: var(--accent-color);
}

.row-action a {
  color: var(--accent-color);
  font-family: 'Manrope', sans-serif;
  font-size: 0.84rem;
  font-weight: 900;
  text-decoration: none;
  white-space: nowrap;
}

.publication-list {
  display: grid;
  gap: 0.65rem;
}

.publication-row {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr) 120px;
  gap: 1.1rem;
  align-items: start;
  padding: 1rem;
}

.paper-cover {
  position: relative;
  width: 82px;
  aspect-ratio: 0.72;
  overflow: hidden;
  border: 1px solid rgba(0, 30, 64, 0.14);
  border-radius: 4px;
  background: #f8fafc;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08);
}

.paper-cover img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
}

.paper-cover--empty {
  border-style: dashed;
  box-shadow: none;
}

.paper-cover-fallback {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  padding: 0.55rem;
  color: var(--text-muted);
  font-family: 'Manrope', sans-serif;
  font-size: 0.62rem;
  font-weight: 900;
  line-height: 1.25;
  text-align: center;
  text-transform: uppercase;
}

.row-main {
  min-width: 0;
}

.row-kicker {
  margin-bottom: 0.45rem;
}

.row-title-line {
  display: flex;
  align-items: start;
  gap: 0.7rem;
}

.row-title-line h3 {
  margin: 0;
  color: var(--primary-strong);
  font-size: 1.02rem;
  line-height: 1.3;
}

.authors,
.summary {
  color: var(--text-secondary);
}

.authors {
  margin: 0.35rem 0 0;
  font-size: 0.82rem;
  font-weight: 700;
}

.summary {
  margin: 0.45rem 0 0;
  font-size: 0.9rem;
  line-height: 1.5;
}

.keyword-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.55rem;
}

.keyword-row span {
  padding: 0.22rem 0.48rem;
  border: 1px solid var(--border-light);
  background: #f8fafc;
  color: #354a53;
}

.row-action {
  display: flex;
  align-self: end;
  justify-content: flex-end;
  padding-top: 0.2rem;
}

.row-action span {
  padding: 0.36rem 0.58rem;
  background: rgba(0, 30, 64, 0.06);
  color: var(--text-secondary);
}

.empty-state {
  padding: 1.6rem;
  text-align: center;
  color: var(--text-secondary);
}

@media (max-width: 980px) {
  .hero-copy h1 {
    max-width: 820px;
    white-space: normal;
  }

  .hero-lede {
    max-width: 720px;
    white-space: normal;
  }

  .research-toolbar {
    grid-template-columns: 1fr;
  }

  .track-tabs {
    justify-content: flex-start;
  }
}

@media (max-width: 720px) {
  .research-shell {
    width: min(100% - 1.8rem, 1360px);
  }

  .research-hero {
    padding-top: 2.2rem;
  }

  .publication-row {
    grid-template-columns: 1fr;
    gap: 0.65rem;
  }

  .paper-cover {
    width: 76px;
  }

  .row-title-line,
  .section-heading {
    flex-direction: column;
    align-items: flex-start;
  }

  .row-action {
    justify-content: flex-end;
  }
}
</style>
