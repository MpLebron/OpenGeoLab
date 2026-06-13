<template>
  <div :class="['jupyter-page', { 'login-mode': !isLoggedIn }]">
    <!-- 独立的顶部导航栏 -->
    <header class="jupyter-nav">
      <div class="nav-left">
        <a href="/" class="back-home-link">← Back to OpenGeoLab</a>
      </div>
      <div class="nav-right">
        <div v-if="isLoggedIn" class="workspace-avatar" :title="user?.displayName || user?.username">
          <img
            v-if="user?.avatarUrl && !avatarLoadFailed"
            :src="user.avatarUrl"
            alt=""
            class="workspace-avatar-image"
            referrerpolicy="no-referrer"
            @load="avatarLoadFailed = false"
            @error="avatarLoadFailed = true"
          >
          <span v-else class="avatar-fallback-text">{{ userInitials }}</span>
        </div>
      </div>
    </header>

    <!-- 未登录状态 -->
    <div v-if="!isLoggedIn" class="login-container immersive-login">
      <EarthLoginScene />

      <aside class="login-card" aria-label="Sign in">
        <div class="login-header">
          <h2>Research Access</h2>
          <p>Sign in to OpenGeoLab platform</p>
        </div>

        <div class="login-form">
          <div class="login-field-group">
            <label class="login-label" for="opengms-email">Email Address</label>
            <div class="login-field">
              <span class="login-input-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M4 6h16v12H4z" />
                  <path d="m4 7 8 6 8-6" />
                </svg>
              </span>
              <input
                id="opengms-email"
                v-model.trim="loginForm.email"
                class="login-input"
                type="email"
                autocomplete="username"
                placeholder="llonggis@163.com"
                @keyup.enter="loginWithOpenGMS"
              >
            </div>
          </div>

          <div class="login-field-group">
            <label class="login-label" for="opengms-password">Password</label>
            <div class="login-field">
              <span class="login-input-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M7 11h10v8H7z" />
                  <path d="M9 11V8a3 3 0 0 1 6 0v3" />
                </svg>
              </span>
              <input
                id="opengms-password"
                v-model="loginForm.password"
                class="login-input"
                type="password"
                autocomplete="current-password"
                placeholder="Enter password"
                @keyup.enter="loginWithOpenGMS"
              >
            </div>
          </div>

          <button class="opengms-login-btn" @click="loginWithOpenGMS" :disabled="isLoading">
            <span>{{ isLoading ? 'Signing in...' : 'Sign in with OpenGMS' }}</span>
            <svg class="login-button-arrow" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h13" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </button>
        </div>

        <div class="login-divider">
          <span>or continue with</span>
        </div>

        <div class="social-login-grid">
          <button
            class="social-login-btn github-btn"
            type="button"
            :disabled="isLoading || !!socialLoadingProvider"
            @click="startOAuthLogin('github')"
          >
            <span class="social-login-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img">
                <path
                  fill="currentColor"
                  d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.56 0-.28-.01-1.18-.02-2.14-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.74.4-1.25.73-1.54-2.55-.29-5.23-1.28-5.23-5.67 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.59.23 2.76.11 3.05.73.8 1.18 1.83 1.18 3.08 0 4.4-2.68 5.37-5.24 5.66.41.35.78 1.04.78 2.1 0 1.52-.01 2.74-.01 3.11 0 .31.2.67.79.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"
                />
              </svg>
            </span>
            <span>{{ socialLoadingProvider === 'github' ? 'Redirecting...' : 'GitHub' }}</span>
          </button>

          <button
            class="social-login-btn google-btn"
            type="button"
            :disabled="isLoading || !!socialLoadingProvider"
            @click="startOAuthLogin('google')"
          >
            <span class="social-login-icon" aria-hidden="true">
              <svg viewBox="0 0 18 18" role="img">
                <path fill="#4285F4" d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.482h4.844c-.209 1.125-.843 2.078-1.798 2.715v2.259h2.909c1.703-1.567 2.685-3.877 2.685-6.615Z" />
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.955-2.18l-2.909-2.26c-.806.541-1.836 1.228-3.046 1.228-2.344 0-4.328-1.584-5.037-3.712H.957A9 9 0 0 0 9 18Z" />
                <path fill="#FBBC05" d="M3.963 11.076A5.41 5.41 0 0 1 3.679 9c0-.586.103-1.164.284-1.705V4.962H.957A9 9 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.006-2.334Z" />
                <path fill="#EA4335" d="M9 3.58c1.322 0 2.508.454 3.44 1.345l2.582-2.582C13.464.892 11.427 0 9 0A9 9 0 0 0 .957 4.957l3.006 2.333C4.672 5.164 6.656 3.58 9 3.58Z" />
              </svg>
            </span>
            <span>{{ socialLoadingProvider === 'google' ? 'Redirecting...' : 'Google' }}</span>
          </button>
        </div>
      </aside>
    </div>

    <!-- 已登录状态 - 仿 MyDDE 布局 -->
    <div v-else class="dashboard-layout">
      <!-- 左侧边栏 -->
      <aside class="sidebar">
        <div class="sidebar-user">
          <div class="user-avatar" aria-hidden="true">
            <img
              v-if="user.avatarUrl && !avatarLoadFailed"
              :src="user.avatarUrl"
              alt=""
              class="user-avatar-image"
              referrerpolicy="no-referrer"
              @load="avatarLoadFailed = false"
              @error="avatarLoadFailed = true"
            >
            <span v-else class="avatar-fallback-text">{{ userInitials }}</span>
          </div>
          <div class="user-info">
            <span class="user-name">{{ user.displayName }}</span>
            <span class="user-username">@{{ user.username }}</span>
          </div>
        </div>

        <!-- 导航菜单 -->
        <nav class="sidebar-nav">
          <!-- 一、开发环境 -->
          <div class="nav-section">
            <div class="nav-section-title">Development</div>
            <a
              href="#"
              :class="['nav-item', { active: activeMenu === 'recent' }]"
              @click.prevent="activeMenu = 'recent'"
            >
              <span class="nav-icon icon-history"></span>
              <span>Recent</span>
            </a>
            <a
              href="#"
              :class="['nav-item', { active: activeMenu === 'myspace' }]"
              @click.prevent="activeMenu = 'myspace'"
            >
              <span class="nav-icon icon-folder-shared"></span>
              <span>My Space</span>
            </a>
            <a
              href="#"
              :class="['nav-item', { active: activeMenu === 'cases' }]"
              @click.prevent="activeMenu = 'cases'"
            >
              <span class="nav-icon icon-library"></span>
              <span>Case Library</span>
            </a>
          </div>

          <!-- 二、资源管理 -->
          <div class="nav-section">
            <div class="nav-section-title">Resources</div>
            <a
              href="#"
              :class="['nav-item', { active: activeMenu === 'mymodel' }]"
              @click.prevent="activeMenu = 'mymodel'"
            >
              <span class="nav-icon icon-model"></span>
              <span>My Model</span>
            </a>
            <a
              href="#"
              :class="['nav-item', { active: activeMenu === 'mydata' }]"
              @click.prevent="activeMenu = 'mydata'"
            >
              <span class="nav-icon icon-database"></span>
              <span>My Data</span>
            </a>
            <a
              href="#"
              :class="['nav-item', { active: activeMenu === 'mydatamethod' }]"
              @click.prevent="activeMenu = 'mydatamethod'"
            >
              <span class="nav-icon icon-method"></span>
              <span>My Data Method</span>
            </a>
          </div>

          <!-- 三、设置 -->
          <div class="nav-section">
            <div class="nav-section-title">Settings</div>
            <a
              href="#"
              :class="['nav-item', { active: activeMenu === 'environments' }]"
              @click.prevent="activeMenu = 'environments'"
            >
              <span class="nav-icon icon-settings"></span>
              <span>Environments</span>
            </a>
          </div>
        </nav>

        <!-- 底部退出按钮 -->
        <div class="sidebar-footer">
          <button class="logout-btn" @click="logout">
            <span class="nav-icon icon-signout"></span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <!-- 右侧主内容区 -->
      <main class="main-content">
        <!-- 顶部标题栏 -->
        <header v-if="activeMenu !== 'environments'" class="content-header">
          <div class="header-left">
            <h1 class="page-title">{{ dashboardPageTitle }}</h1>
            <p v-if="dashboardPageSubtitle" class="page-subtitle">
              {{ dashboardPageSubtitle }}
            </p>
          </div>
          <div
            v-if="showDashboardHeaderTools"
            class="header-right"
          >
            <div v-if="showDashboardSearch" class="search-box">
              <span class="search-icon"></span>
              <input type="text" :placeholder="searchPlaceholder" v-model="searchQuery">
            </div>
            <button
              v-if="activeMenu === 'myspace'"
              class="dashboard-action-btn primary"
              type="button"
              @click="openCreateProjectModal()"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              <span>Create Project</span>
            </button>
            <button
              v-else-if="activeMenu === 'mymodel'"
              class="dashboard-action-btn primary"
              type="button"
              @click="openModelSelector"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <path d="M12 4v16M4 12h16"/>
              </svg>
              <span>Add from Model Library</span>
            </button>
            <button
              v-else-if="activeMenu === 'mydatamethod'"
              class="dashboard-action-btn primary"
              type="button"
              @click="openDataMethodSelector"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <path d="M12 4v16M4 12h16"/>
              </svg>
              <span>Add from Data Method Library</span>
            </button>
          </div>
        </header>

        <!-- 内容区域 -->
        <div class="content-body">

          <!-- ========== Recent 面板 ========== -->
          <div v-if="activeMenu === 'recent'" class="recent-panel">
            <div class="recent-top-grid">
              <button class="action-tile tile-create" @click="openCreateProjectModal()">
                <span class="action-icon icon-create"></span>
                <strong>Create Project</strong>
                <span>Initialize new repo</span>
              </button>
              <button class="action-tile tile-import" @click="activeMenu = 'mydata'">
                <span class="action-icon icon-upload"></span>
                <strong>Import Data</strong>
                <span>GeoJSON, CSV, TIFF</span>
              </button>
              <button class="action-tile tile-open" @click="activeMenu = 'myspace'">
                <span class="action-icon icon-notebook"></span>
                <strong>Open Projects</strong>
                <span>Continue active notebooks</span>
              </button>
            </div>

            <section class="recent-projects-section">
              <div class="recent-section-head">
                <h3 class="section-title">Recent Projects</h3>
                <button class="section-link" @click="activeMenu = 'myspace'">View All Projects</button>
              </div>

              <div v-if="projects.length === 0" class="empty-recent">
                <div class="empty-icon-box"></div>
                <p>No Recent Projects</p>
              </div>
              <div v-else-if="filteredRecentProjects.length === 0" class="empty-recent">
                <div class="empty-icon-box"></div>
                <p>No matching projects found</p>
              </div>
              <div v-else class="project-activity-list">
                <article
                  v-for="(project, index) in filteredRecentProjects.slice(0, 4)"
                  :key="project.name"
                  class="project-activity-card"
                  @click="goToProject(project)"
                >
                  <div :class="['project-mark', `variant-${projectVisualVariant(project, index)}`]">
                    <span class="project-mark-kicker">{{ projectMarkKicker(project) }}</span>
                    <strong>{{ projectMarkLabel(project) }}</strong>
                  </div>
                  <div class="project-activity-body">
                    <div class="project-activity-header">
                      <h4 class="project-activity-title">{{ project.name }}</h4>
                      <div class="project-chip-row">
                        <span :class="['project-meaning-badge', projectVisibilityClass(project)]">{{ projectVisibilityLabel(project) }}</span>
                        <span v-if="project.isCase" class="project-meaning-badge case">Case</span>
                      </div>
                    </div>
                    <p class="project-activity-desc">{{ projectSummary(project) }}</p>
                    <div class="project-activity-meta">
                      <span>{{ project.fileCount }} Files</span>
                      <span>{{ formatSize(Number(project.sizeBytes || 0)) }}</span>
                      <span v-if="projectRuntimeImage(project)">Image {{ projectRuntimeImage(project) }}</span>
                      <span>{{ formatRelativeTime(project.modifiedAt) }}</span>
                    </div>
                  </div>
                  <button :class="['project-open-btn', index === 0 ? 'primary' : 'ghost']" @click.stop="goToProject(project)">Open in Jupyter</button>
                </article>
              </div>
            </section>

            <div class="recent-bottom-grid">
              <section class="recent-resources-card">
                <div class="recent-section-head">
                  <h3 class="section-title">Recent Resources</h3>
                  <button class="section-link" @click="activeMenu = 'mydata'">···</button>
                </div>

                <div v-if="workspaceResources.length" class="resource-snippet-list">
                  <div
                    v-for="resource in workspaceResources.slice(0, 3)"
                    :key="resource.key"
                    class="resource-snippet-item"
                  >
                    <span :class="['resource-snippet-icon', `type-${resource.type.toLowerCase().replace(/\\s+/g, '-')}`]"></span>
                    <div class="resource-snippet-main">
                      <strong>{{ resource.name }}</strong>
                      <span>{{ resource.type }}</span>
                    </div>
                    <span class="resource-snippet-side">{{ resource.meta }}</span>
                  </div>
                </div>
                <div v-else class="empty-recent compact">
                  <p>No Recent Resources</p>
                </div>
              </section>
            </div>
          </div>

          <!-- ========== My Space 面板 ========== -->
          <div v-else-if="activeMenu === 'myspace'" class="myspace-panel">
            <section class="myspace-directory-shell">
              <WorkspaceProjectList
                :items="filteredProjects"
                :actions="mySpaceProjectActions"
                :empty-title="projects.length === 0 ? 'No projects yet' : 'No matching projects found'"
                :empty-hint="projects.length === 0 ? 'Create a project to initialize notebooks, methods, and reproducible runs.' : 'Try a different keyword or clear the search field.'"
                @open="goToProject"
                @action="handleMySpaceProjectAction"
              />
            </section>
          </div>

          <!-- ========== Case Library 面板 ========== -->
          <div v-else-if="activeMenu === 'cases'" class="cases-panel">
            <CaseLibrary embedded />
          </div>

          <!-- ========== My Model 面板 ========== -->
          <div v-else-if="activeMenu === 'mymodel'" class="mymodel-panel">
            <div class="saved-model-list">
              <div v-if="myModels.length === 0" class="empty-state">
                <div class="empty-icon"></div>
                <p>No models added yet</p>
                <p class="empty-hint">Use the button above to add items from the model library</p>
              </div>

              <div v-else-if="filteredMyModels.length === 0" class="empty-state">
                <div class="empty-icon"></div>
                <p>No matching models found</p>
                <p class="empty-hint">Try a different search keyword</p>
              </div>

              <div v-else class="saved-model-rows">
                <article
                  v-for="model in filteredMyModels"
                  :key="model.id"
                  class="saved-model-row"
                  :class="{ disabled: !getSavedModelExternalUrl(model) }"
                  @click="openSavedModelExternalLink(model)"
                >
                  <div class="saved-model-mark" aria-hidden="true">
                    <span>MS</span>
                  </div>

                  <button class="saved-model-main" type="button" @click.stop="openSavedModelExternalLink(model)">
                    <div class="saved-model-name-line">
                      <h3 :title="model.name">{{ model.name }}</h3>
                      <div class="saved-model-statuses">
                        <span
                          v-for="chip in getSavedModelStatusChips(model)"
                          :key="`${model.id}-${chip.label}`"
                          class="saved-model-chip"
                          :class="chip.className"
                        >
                          {{ chip.label }}
                        </span>
                      </div>
                    </div>
                    <p class="saved-model-description">{{ getSavedModelSummary(model) }}</p>
                    <div v-if="getSavedModelTags(model).length" class="saved-model-tags">
                      <span
                        v-for="tag in getSavedModelTags(model)"
                        :key="`${model.id}-${tag}`"
                      >
                        {{ tag }}
                      </span>
                    </div>
                  </button>

                  <div class="saved-model-metrics">
                    <div class="saved-model-metric">
                      <span>Author</span>
                      <strong>{{ model.author || 'OpenGeoLab' }}</strong>
                    </div>
                    <div class="saved-model-metric">
                      <span>Views</span>
                      <strong>{{ getSavedModelMetrics(model).views }}</strong>
                    </div>
                    <div class="saved-model-metric">
                      <span>Runs</span>
                      <strong>{{ getSavedModelMetrics(model).runs }}</strong>
                    </div>
                    <div class="saved-model-metric">
                      <span>Updated</span>
                      <strong>{{ getSavedModelMetrics(model).updated.replace('Updated ', '') }}</strong>
                    </div>
                  </div>

                  <div class="saved-model-actions">
                    <button
                      class="saved-model-open-btn"
                      :disabled="!getSavedModelExternalUrl(model)"
                      title="Open in OpenGMS"
                      aria-label="Open in OpenGMS"
                      @click.stop="openSavedModelExternalLink(model)"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
                        <path d="M14 4h6v6"/>
                        <path d="M10 14L20 4"/>
                        <path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5"/>
                      </svg>
                    </button>
                    <button
                      class="saved-model-remove-btn"
                      @click.stop="removeFromMyModels(model)"
                      title="Remove"
                      aria-label="Remove saved model"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
                        <path d="M4 7h16"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M6 7l1 13h10l1-13"/>
                        <path d="M9 7V4h6v3"/>
                      </svg>
                    </button>
                  </div>
                </article>
              </div>
            </div>
          </div>

          <!-- ========== My Data Method 面板 ========== -->
          <div v-else-if="activeMenu === 'mydatamethod'" class="mydatamethod-panel">
            <div class="resource-list">
              <div v-if="myDataMethods.length === 0" class="empty-state">
                <div class="empty-icon"></div>
                <p>No data methods added yet</p>
                <p class="empty-hint">Use the button above to add items from the data method library</p>
              </div>

              <div v-else-if="filteredMyDataMethods.length === 0" class="empty-state">
                <div class="empty-icon"></div>
                <p>No matching data methods found</p>
                <p class="empty-hint">Try a different search keyword</p>
              </div>

              <div v-else class="data-method-rows">
                <article
                  v-for="method in filteredMyDataMethods"
                  :key="method.id"
                  class="data-method-row"
                >
                  <div class="data-method-mark" aria-hidden="true">
                    <span>DM</span>
                  </div>

                  <div class="data-method-main">
                    <div class="data-method-name-line">
                      <h3 :title="method.name">{{ method.name }}</h3>
                    </div>
                    <p class="data-method-description">{{ method.description || 'No description available' }}</p>
                  </div>

                  <div class="data-method-metrics">
                    <div class="data-method-metric">
                      <span>Author</span>
                      <strong>{{ method.author || 'OpenGeoLab' }}</strong>
                    </div>
                  </div>

                  <div class="data-method-actions">
                    <button class="data-method-action-btn primary" type="button" @click="runDataMethod(method)">
                      Run
                    </button>
                    <button class="data-method-icon-btn danger" type="button" @click="removeFromMyDataMethods(method)" title="Remove" aria-label="Remove data method">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
                        <path d="M4 7h16"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M6 7l1 13h10l1-13"/>
                        <path d="M9 7V4h6v3"/>
                      </svg>
                    </button>
                  </div>
                </article>
              </div>
            </div>
          </div>

          <!-- ========== My Data 面板 (网盘风格) ========== -->
          <div v-else-if="activeMenu === 'mydata'" class="mydata-panel netdisk-style">
            <!-- 工具栏 -->
            <div class="netdisk-toolbar">
              <button class="toolbar-btn" @click="navigateBack" :disabled="currentDataPath === '/'">
                <span class="btn-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M15 18l-6-6 6-6"/>
                  </svg>
                </span>
                <span>Back</span>
              </button>
              <button class="toolbar-btn" @click="loadMyData">
                <span class="btn-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M20 11a8 8 0 0 0-14.7-4.4L4 8"/>
                    <path d="M4 4v4h4"/>
                    <path d="M4 13a8 8 0 0 0 14.7 4.4L20 16"/>
                    <path d="M16 16h4v4"/>
                  </svg>
                </span>
                <span>Refresh</span>
              </button>
              <button class="toolbar-btn upload" @click="openDataUploader">
                <span class="btn-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M12 16V4"/>
                    <path d="M7 9l5-5 5 5"/>
                    <path d="M5 20h14"/>
                  </svg>
                </span>
                <span>Upload Data</span>
              </button>
              <button class="toolbar-btn" @click="createNewFolder">
                <span class="btn-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>
                    <path d="M12 11v5M9.5 13.5h5"/>
                  </svg>
                </span>
                <span>New Folder</span>
              </button>
              <span class="current-path">{{ currentDataPath }}</span>
            </div>

            <!-- 文件网格 -->
            <div class="netdisk-content">
              <div v-if="loadingMyData" class="loading-state">
                <div class="spinner"></div>
                <p>Loading...</p>
              </div>

              <div v-else-if="currentDataItems.length === 0" class="empty-state">
                <p>This folder is empty</p>
                <p class="empty-hint">Use the buttons above to upload data or create a folder</p>
              </div>

              <div v-else class="netdisk-grid" role="list" aria-label="My data assets">
                <article
                  v-for="item in currentDataItems"
                  :key="item.id"
                  :class="[
                    'netdisk-card',
                    `netdisk-card--${getDataCardKind(item)}`,
                    { selected: selectedDataItems.includes(item.id) }
                  ]"
                  role="listitem"
                  tabindex="0"
                  @click="handleItemClick(item)"
                  @dblclick="handleItemDoubleClick(item)"
                  @keydown.enter.prevent="handleItemDoubleClick(item)"
                  @contextmenu.prevent="openItemContextMenu($event, item)"
                >
                  <div class="netdisk-card-preview">
                    <span class="netdisk-card-badge">{{ getDataCardBadge(item) }}</span>
                    <button
                      class="netdisk-card-menu"
                      type="button"
                      title="More actions"
                      @click.stop="openItemContextMenu($event, item)"
                      @dblclick.stop
                    >
                      <span></span>
                      <span></span>
                      <span></span>
                    </button>

                    <div class="netdisk-card-visual" aria-hidden="true">
                      <span v-if="getDataCardKind(item) === 'folder'" class="folder-glyph"></span>
                      <span v-else-if="getDataCardKind(item) === 'code'" class="code-glyph">
                        <i></i>
                        <i></i>
                        <i></i>
                      </span>
                      <span v-else-if="getDataCardKind(item) === 'table'" class="table-glyph">
                        <i></i>
                        <i></i>
                        <i></i>
                      </span>
                      <span v-else-if="getDataCardKind(item) === 'raster'" class="raster-glyph">
                        <i></i>
                      </span>
                      <span v-else-if="getDataCardKind(item) === 'vector'" class="vector-glyph">
                        <i></i>
                        <i></i>
                        <i></i>
                      </span>
                      <span v-else class="dataset-glyph">
                        <i></i>
                        <i></i>
                        <i></i>
                      </span>
                    </div>
                  </div>

                  <div class="netdisk-card-body">
                    <h3 :title="getDataItemTitle(item)">{{ getDataItemTitle(item) }}</h3>
                    <p :title="getDataCardSubtitle(item)">{{ getDataCardSubtitle(item) }}</p>
                  </div>
                </article>
              </div>
            </div>

            <!-- 底部状态栏 -->
            <div class="netdisk-statusbar">
              <span>{{ currentDataItems.length }} items</span>
              <span v-if="selectedDataItems.length > 0">{{ selectedDataItems.length }} selected</span>
              <span class="storage-info">Storage used: {{ calculateTotalDataSize() }}</span>
            </div>
          </div>

          <!-- 右键菜单 -->
          <div
            v-if="showDataContextMenu"
            class="context-menu"
            :style="{ top: contextMenuY + 'px', left: contextMenuX + 'px' }"
            @click.stop
          >
            <div class="context-item" @click="downloadContextItem">
              Download
            </div>
            <div class="context-item" @click="renameContextItem">
              Rename
            </div>
            <div class="context-item danger" @click="deleteContextItem">
              Delete
            </div>
          </div>

          <!-- ========== Environments 面板 ========== -->
          <div v-else-if="activeMenu === 'environments'" class="environments-panel environment-registry-panel">
            <section class="environment-registry-hero">
              <div class="environment-registry-copy">
                <h2 class="env-registry-title">Execution Environments</h2>
                <p class="env-registry-desc">
                  Reusable runtime images for geospatial modeling, notebook execution, and reproducible project setup.
                </p>
              </div>
              <button
                class="env-create-project-btn"
                type="button"
                :disabled="!canCreateProjectFromEnvironment(selectedEnvironmentCatalog)"
                @click="createProjectFromEnvironment"
              >
                <span class="env-create-plus">+</span>
                <span>Create Project from Environment</span>
              </button>
            </section>

            <section class="env-registry-toolbar">
              <div class="env-filter-tabs" role="tablist" aria-label="Environment filters">
                <button
                  v-for="filter in environmentFilters"
                  :key="filter.value"
                  type="button"
                  :class="['env-filter-tab', { active: environmentFilter === filter.value }]"
                  @click="environmentFilter = filter.value"
                >
                  {{ filter.label }}
                </button>
              </div>
              <label class="env-registry-search">
                <span class="search-icon"></span>
                <input
                  v-model="environmentSearchQuery"
                  type="text"
                  placeholder="Search environments..."
                >
              </label>
            </section>

            <div v-if="loadingEnvironments" class="loading-state">
              <div class="spinner"></div>
              <p>Loading environments...</p>
            </div>

            <div v-else-if="filteredEnvironmentCatalog.length === 0" class="empty-state env-empty-state">
              <p>No environments match this filter</p>
              <span class="empty-hint">Try another runtime family, hardware type, or package name.</span>
            </div>

            <section v-else class="env-registry-grid">
              <article
                v-for="env in filteredEnvironmentCatalog"
                :key="env.id"
                :class="['env-registry-card', { selected: selectedEnvId === env.id }]"
                @click="openEnvironmentDrawer(env.id)"
              >
                <div class="env-registry-card-header">
                  <h3>{{ env.name }}</h3>
                  <button
                    class="env-info-btn"
                    type="button"
                    :title="`Open details for ${env.name}`"
                    @click.stop="openEnvironmentDrawer(env.id)"
                  >
                    i
                  </button>
                </div>

                <div class="env-tag-row">
                  <span
                    v-for="tag in env.tags"
                    :key="`${env.id}-${tag}`"
                    :class="['env-tag', normalizeEnvTagClass(tag)]"
                  >
                    {{ tag }}
                  </span>
                </div>

                <div class="env-stack-box">{{ env.stack }}</div>

                <div class="env-registry-footer">
                  <span :class="['env-runtime-type', environmentAcceleratorClass(env)]">
                    {{ env.accelerator }}
                  </span>
                  <span class="env-size">{{ env.size }}</span>
                  <span class="env-projects">{{ env.projects }}</span>
                </div>
              </article>
            </section>

            <Transition name="env-drawer">
              <div
                v-if="environmentDrawerOpen && drawerEnvironment"
                class="environment-drawer-layer"
                @click.self="closeEnvironmentDrawer"
              >
                <aside class="environment-detail-drawer" role="dialog" aria-modal="true" :aria-label="`${drawerEnvironment.name} details`">
                  <header class="environment-drawer-header">
                    <div class="environment-drawer-title-block">
                      <div class="environment-drawer-title-row">
                        <h3>{{ drawerEnvironment.name }}</h3>
                        <span class="environment-verified-badge">Verified</span>
                      </div>
                      <p class="environment-version-line">
                        <span>{{ drawerEnvironment.detail.version }}</span>
                        <span class="environment-dot"></span>
                        <span>{{ drawerEnvironment.detail.updated }}</span>
                      </p>
                    </div>
                    <button class="environment-drawer-close" type="button" title="Close" @click="closeEnvironmentDrawer">
                      ×
                    </button>
                  </header>

                  <div class="environment-drawer-body">
                    <section class="environment-detail-section">
                      <h4>Overview</h4>
                      <p class="environment-overview-text">{{ drawerEnvironment.detail.overview }}</p>
                    </section>

                    <section class="environment-detail-section">
                      <h4>Runtime Stack</h4>
                      <div class="runtime-stack-grid">
                        <div
                          v-for="item in drawerEnvironment.detail.runtimeStack"
                          :key="`${drawerEnvironment.id}-${item.label}`"
                          class="runtime-stack-item"
                        >
                          <span>{{ item.label }}</span>
                          <strong>{{ item.value }}</strong>
                        </div>
                      </div>
                    </section>

                    <section class="environment-detail-section">
                      <div class="environment-section-head">
                        <h4>Included Libraries</h4>
                        <label class="library-filter-box">
                          <span class="search-icon"></span>
                          <input
                            v-model="environmentLibraryQuery"
                            type="text"
                            placeholder="Filter libraries..."
                          >
                        </label>
                      </div>
                      <div class="library-chip-list">
                        <span
                          v-for="library in visibleDrawerLibraries"
                          :key="`${drawerEnvironment.id}-${library.name}-${library.version}`"
                          class="library-chip"
                        >
                          <strong>{{ library.name }}</strong>
                          <span>{{ library.version }}</span>
                        </span>
                        <button
                          v-if="remainingDrawerLibraryCount > 0"
                          class="library-more-chip"
                          type="button"
                          @click="environmentLibraryQuery = ''"
                        >
                          + {{ remainingDrawerLibraryCount }} more
                        </button>
                      </div>
                    </section>

                    <section class="environment-detail-section">
                      <h4>System Requirements</h4>
                      <div class="requirement-list">
                        <div
                          v-for="requirement in drawerEnvironment.detail.requirements"
                          :key="`${drawerEnvironment.id}-${requirement.label}`"
                          class="requirement-row"
                        >
                          <span>{{ requirement.label }}</span>
                          <strong>{{ requirement.value }}</strong>
                        </div>
                      </div>
                    </section>

                    <section class="environment-detail-section">
                      <h4>Reproducibility & Governance</h4>
                      <div class="governance-panel">
                        <label>Image Digest</label>
                        <div class="digest-box">
                          <span>{{ drawerEnvironment.detail.digest }}</span>
                          <button type="button" title="Copy digest" @click="copyEnvironmentDigest">Copy</button>
                        </div>
                        <div class="governance-meta-grid">
                          <div>
                            <label>Build Date</label>
                            <strong>{{ drawerEnvironment.detail.buildDate }}</strong>
                          </div>
                          <div>
                            <label>Maintainer</label>
                            <strong>{{ drawerEnvironment.detail.maintainer }}</strong>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>

                  <footer class="environment-drawer-footer">
                    <button
                      class="environment-use-btn"
                      type="button"
                      :disabled="!canCreateProjectFromEnvironment(drawerEnvironment)"
                      @click="useDrawerEnvironmentForProject"
                    >
                      {{ getEnvironmentActionLabel(drawerEnvironment) }}
                    </button>
                  </footer>
                </aside>
              </div>
            </Transition>
          </div>

        </div>
      </main>
    </div>

    <LibrarySelectorDialog
      v-model:search-query="librarySearchQuery"
      :visible="showModelSelector"
      kind="model"
      :items="modelLibrary"
      :loading="libraryLoading"
      :page="libraryPage"
      :total="libraryTotal"
      :page-size="LIBRARY_SELECTOR_PAGE_SIZE"
      :is-added="isModelAdded"
      @close="showModelSelector = false"
      @search="searchModelLibrary"
      @page-change="loadModelLibrary"
      @add="addToMyModels"
      @open-detail="openModelLibraryDetail"
    />

    <LibrarySelectorDialog
      v-model:search-query="librarySearchQuery"
      :visible="showDataMethodSelector"
      kind="dataMethod"
      :items="dataMethodLibrary"
      :loading="libraryLoading"
      :page="libraryPage"
      :total="libraryTotal"
      :page-size="LIBRARY_SELECTOR_PAGE_SIZE"
      :is-added="isDataMethodAdded"
      @close="showDataMethodSelector = false"
      @search="searchDataMethodLibrary"
      @page-change="loadDataMethodLibrary"
      @add="addToMyDataMethods"
    />

    <CreateProjectDialog
      :visible="showCreateProjectModal"
      :creating="isCreating"
      :runtime-options="createProjectRuntimeOptions"
      :selected-runtime-id="selectedEnvId"
      :starter-templates="PROJECT_STARTER_TEMPLATES"
      :initial-purpose="newProjectDescription"
      @close="closeCreateProjectModal"
      @submit="createProject"
    />

    <!-- Case 发布面板模态框 -->
    <div v-if="showCasePublishModal" class="modal-overlay" @click.self="showCasePublishModal = false">
      <div class="modal-content case-publish-modal">
        <div class="modal-header">
          <h2>Publish as Case</h2>
          <button class="close-btn" @click="showCasePublishModal = false">×</button>
        </div>
        <div class="modal-body case-publish-body">
          <p class="case-publish-hint">Fill in the case metadata. Once published, the project will be public and appear in the Case Library.</p>

          <div class="case-form-grid">
            <!-- 左列 -->
            <div class="case-form-col">
              <div class="form-group">
                <label>Case Title <span class="required">*</span></label>
                <input type="text" v-model="caseForm.title" placeholder="Enter case title">
              </div>
              <div class="form-group">
                <label>Summary</label>
                <textarea v-model="caseForm.summary" placeholder="Describe what this case demonstrates" rows="3"></textarea>
              </div>
              <div class="form-group">
                <label>Scenario</label>
                <input type="text" v-model="caseForm.scenario" placeholder="e.g. Urban planning, Hazard analysis">
              </div>
              <div class="form-group">
                <label>Core Notebook</label>
                <input type="text" v-model="caseForm.coreNotebook" placeholder="e.g. main.ipynb">
              </div>
              <div class="form-group">
                <label>Environment</label>
                <input type="text" v-model="caseForm.environment" placeholder="e.g. Python 3.10 + GDAL">
              </div>
            </div>
            <!-- 右列 -->
            <div class="case-form-col">
              <div class="form-group">
                <label>Tags <span class="field-hint">comma-separated</span></label>
                <input type="text" v-model="caseForm.tags" placeholder="e.g. Raster, GeoTIFF, Validation">
              </div>
              <div class="form-group">
                <label>Datasets <span class="field-hint">semicolon-separated</span></label>
                <textarea v-model="caseForm.datasets" placeholder="e.g. DEM_30m.tif; landuse_2020.shp" rows="2"></textarea>
              </div>
              <div class="form-group">
                <label>Reproduction Steps <span class="field-hint">semicolon-separated</span></label>
                <textarea v-model="caseForm.steps" placeholder="e.g. Open notebook; Run all cells; Check output" rows="3"></textarea>
              </div>
              <div class="form-group">
                <label>Expected Results <span class="field-hint">semicolon-separated</span></label>
                <textarea v-model="caseForm.results" placeholder="e.g. Output raster generated; Validation passed" rows="3"></textarea>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="showCasePublishModal = false">Cancel</button>
          <button class="btn-create" @click="submitCasePublish" :disabled="!caseForm.title.trim() || casePublishSubmitting">
            {{ casePublishSubmitting ? 'Publishing...' : 'Publish Case' }}
          </button>
        </div>
      </div>
    </div>

    <DataUploadDialog
      :visible="showDataUploader"
      :current-path="currentDataPath"
      :folders="myDataFolders"
      :uploading="isUploading"
      :progress="uploadProgress"
      @close="closeDataUploader"
      @submit="uploadData"
    />

    <RunModal
      :visible="showDataMethodRunModal"
      :model="selectedDataMethod"
      :loading="dataMethodExecuting"
      @close="closeDataMethodRunModal"
      @execute="executeDataMethod"
    />

    <ResultModal
      :visible="showDataMethodResultModal"
      :result="dataMethodExecutionResult || {}"
      :title="`${selectedDataMethod?.name || 'Data Method'} - Execution Result`"
      @close="closeDataMethodResultModal"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import CaseLibrary from './CaseLibrary.vue'
import CreateProjectDialog from '../components/CreateProjectDialog.vue'
import DataUploadDialog from '../components/DataUploadDialog.vue'
import EarthLoginScene from '../components/EarthLoginScene.vue'
import LibrarySelectorDialog from '../components/LibrarySelectorDialog.vue'
import ResultModal from '../components/ResultModal.vue'
import RunModal from '../components/RunModal.vue'
import WorkspaceProjectList from '../components/WorkspaceProjectList.vue'
import { getJupyterLaunchErrorMessage } from '../utils/jupyterLaunchErrors.js'
import {
  CREATE_PROJECT_TARGETS,
  PROJECT_STARTER_TEMPLATES,
  getCreateProjectVisibilityPayload,
  normalizeStarterTemplateId,
  shouldLaunchJupyterAfterCreate
} from '../utils/projectCreateFlow.js'
import {
  canCreateProjectFromEnvironment,
  getEnvironmentActionLabel,
  normalizeEnvironmentCatalog
} from '../utils/environmentCatalog.js'
import {
  getSavedModelExternalUrl,
  getSavedModelMetrics,
  getSavedModelSearchText,
  getSavedModelStatusChips,
  getSavedModelSummary,
  getSavedModelTags
} from '../utils/savedModelDisplay.js'
import { getLibraryItemDetailUrl } from '../utils/librarySelectorDisplay.js'
import { buildDataMethodRunRequest } from '../utils/dataMethodExecution.js'
import {
  formatDataSize,
  getDataItemBadge,
  getDataItemTitle,
  getDataKind
} from '../utils/dataLibraryDisplay.js'
import { buildWorkspaceProjectRoutePath } from '../utils/workspaceProjectDisplay.js'
import { confirmDialog, notify, promptDialog } from '../utils/systemFeedback.js'

const route = useRoute()
const router = useRouter()

// 状态
const isLoading = ref(false)
const socialLoadingProvider = ref('')
const loginForm = ref({
  email: '',
  password: ''
})
const isCreating = ref(false)
const user = ref(null)
const avatarLoadFailed = ref(false)
const projects = ref([])
const JUPYTER_ACTIVE_MENU_KEY = 'jupyter_active_menu'
const VALID_JUPYTER_MENUS = new Set([
  'recent',
  'myspace',
  'cases',
  'mymodel',
  'mydata',
  'mydatamethod',
  'environments'
])
const normalizeActiveMenu = (menu) => {
  if (menu === 'sharedspace') return 'cases'
  return VALID_JUPYTER_MENUS.has(menu) ? menu : 'recent'
}

const activeMenu = ref(
  normalizeActiveMenu(localStorage.getItem(JUPYTER_ACTIVE_MENU_KEY))
) // recent, myspace, cases, mymodel, mydata, mydatamethod, environments
const LIBRARY_SELECTOR_PAGE_SIZE = 12
const myspaceTab = ref('projects') // projects, data
const searchQuery = ref('')
const showCreateProjectModal = ref(false)
const createProjectTarget = ref(CREATE_PROJECT_TARGETS.project)
const openMenuProject = ref(null)
const newProjectDescription = ref('')
const resourceTimeFilter = ref('7')

const mySpaceProjectActions = [
  { key: 'edit', title: 'Edit project', icon: 'edit' },
  {
    key: 'visibility',
    title: (project) => project?.isPublic ? 'Make private' : 'Make public',
    icon: 'visibility'
  },
  {
    key: 'case',
    title: (project) => project?.isCase ? 'Unpublish case' : 'Publish as case',
    icon: 'case'
  },
  { key: 'delete', title: 'Delete project', icon: 'delete', danger: true }
]

// My Data 相关状态
const myDataList = ref([])
const myDataPage = ref(1)
const myDataPageSize = ref(10)
const showDataUploader = ref(false)
const uploadProgress = ref(0)
const isUploading = ref(false)
const loadingMyData = ref(false)

// 网盘风格相关状态
const currentDataPath = ref('/')
const selectedDataItems = ref([])
const showDataContextMenu = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuItem = ref(null)

// Case 发布面板状态
const showCasePublishModal = ref(false)
const casePublishProject = ref(null)
const casePublishSubmitting = ref(false)
const caseForm = ref({
  title: '',
  summary: '',
  scenario: '',
  coreNotebook: '',
  environment: '',
  tags: '',
  datasets: '',
  steps: '',
  results: ''
})

const oauthErrorMessages = {
  github_not_configured: 'GitHub sign-in is not configured.',
  github_no_code: 'GitHub did not return an authorization code. Please try again.',
  github_token_failed: 'Failed to retrieve a GitHub access token.',
  github_oauth_failed: 'GitHub sign-in failed. Please try again later.',
  google_not_configured: 'Google sign-in is not configured.',
  google_access_denied: 'Google sign-in was canceled.',
  google_no_code: 'Google did not return an authorization code. Please try again.',
  google_token_failed: 'Failed to retrieve a Google access token.',
  google_profile_failed: 'Failed to retrieve Google account information.',
  google_oauth_failed: 'Google sign-in failed. Please try again later.'
}

const containsChinese = (text = '') => /[\u4e00-\u9fff]/.test(String(text))

const getUiErrorMessage = (error, fallback = 'Something went wrong') => {
  const raw = error?.response?.data?.error || error?.message
  if (!raw || containsChinese(raw)) {
    return fallback
  }
  return String(raw)
}

// 显示提示框
const showToastMessage = (message, type = 'success', duration = 3000) => {
  notify(message, type, { duration })
}

// My Model 和 My Data Method 相关状态
const myModels = ref([])
const myDataMethods = ref([])
const showModelSelector = ref(false)
const showDataMethodSelector = ref(false)
const showDataMethodRunModal = ref(false)
const selectedDataMethod = ref(null)
const dataMethodExecuting = ref(false)
const showDataMethodResultModal = ref(false)
const dataMethodExecutionResult = ref(null)
const modelLibrary = ref([])
const dataMethodLibrary = ref([])
const libraryLoading = ref(false)
const librarySearchQuery = ref('')
const libraryPage = ref(1)
const libraryTotal = ref(0)

// Environments 相关状态
const availableEnvironments = ref([])
const loadingEnvironments = ref(false)
const hoverEnvId = ref(null)
const userDefaultEnvId = ref(localStorage.getItem('default_jupyter_env') || null)
const selectedEnvId = ref(localStorage.getItem('default_jupyter_env') || 'geomodel-jupyter')
const environmentSearchQuery = ref('')
const environmentFilter = ref('all')
const environmentLibraryQuery = ref('')
const environmentDrawerOpen = ref(false)
const drawerEnvironmentId = ref(selectedEnvId.value)

const environmentFilters = [
  { label: 'All', value: 'all' },
  { label: 'Official', value: 'official' },
  { label: 'Community', value: 'community' },
  { label: 'GPU', value: 'gpu' },
  { label: 'CPU', value: 'cpu' },
  { label: 'Pangeo', value: 'pangeo' },
  { label: 'STAC', value: 'stac' },
  { label: 'GeoAI', value: 'geoai' },
  { label: 'Viz', value: 'visualization' },
  { label: 'R', value: 'r' }
]

const environmentFallbackLibraries = [
  ['python', '3.11'],
  ['jupyterlab', '4.2'],
  ['xarray', '2024.2'],
  ['geopandas', '0.14'],
  ['rasterio', '1.3'],
  ['shapely', '2.0'],
  ['dask', '2026.1'],
  ['pyproj', '3.6']
]

const environmentFallbackRuntimeStack = (env) => {
  const stackParts = String(env.stack || '').split(' · ')
  const runtimePart = stackParts.find(part => /Python|R\s/i.test(part)) || stackParts[0] || 'JupyterLab 4.2'
  const accelerator = environmentAcceleratorClass(env) === 'gpu' ? 'CUDA 12.4' : 'CPU optimized'
  return [
    { label: 'OS', value: 'Ubuntu 22.04 LTS' },
    { label: runtimePart.startsWith('R ') ? 'R' : 'Python', value: runtimePart.replace(/^Python\s*/i, '').replace(/^R\s*/i, '') },
    { label: environmentAcceleratorClass(env) === 'gpu' ? 'CUDA' : 'Compute', value: accelerator },
    { label: 'Kernel', value: 'JupyterLab 4.2' }
  ]
}

const buildEnvironmentDetail = (env) => {
  const profile = env.detail || {}
  const libraries = (profile.libraries || environmentFallbackLibraries).map(item => (
    Array.isArray(item)
      ? { name: item[0], version: item[1] || '' }
      : item
  ))
  return {
    version: profile.version || env.imageName || env.runtimeName || env.id,
    updated: env.available ? 'Installed on this host' : 'Provided by OpenGeoLab',
    overview: profile.overview || env.description || `${env.name} is a predefined OpenGMS Jupyter runtime image.`,
    runtimeStack: profile.runtimeStack || environmentFallbackRuntimeStack(env),
    libraries,
    additionalLibraryCount: profile.additionalLibraryCount ?? Math.max(0, (env.features || []).length - libraries.length),
    requirements: profile.requirements || [
      { label: 'Compute', value: environmentAcceleratorClass(env) === 'gpu' ? '12 - 48 vCPU' : '4 - 24 vCPU' },
      { label: 'Memory', value: environmentAcceleratorClass(env) === 'gpu' ? '32 - 192 GB RAM' : '8 - 96 GB RAM' },
      { label: 'Accelerator', value: environmentAcceleratorClass(env) === 'gpu' ? 'NVIDIA A100 / L40S' : 'Not required' }
    ],
    digest: env.imageName || env.runtimeName || env.id,
    buildDate: profile.buildDate || 'Runtime catalog',
    maintainer: profile.maintainer || 'OpenGeoLab Runtime Registry'
  }
}

const normalizeEnvTagClass = (tag) => String(tag).toLowerCase().replace(/[^a-z0-9]+/g, '-')

const environmentAcceleratorClass = (env) => (
  String(env?.accelerator || '').toLowerCase().includes('gpu') ? 'gpu' : 'cpu'
)

const environmentCatalog = computed(() => (
  normalizeEnvironmentCatalog(availableEnvironments.value, {
    userDefaultEnvId: userDefaultEnvId.value
  }).map(env => ({
    ...env,
    detail: buildEnvironmentDetail(env)
  }))
))

const createProjectRuntimeOptions = computed(() => (
  environmentCatalog.value.length
    ? environmentCatalog.value
    : [{
        id: selectedEnvId.value || 'geomodel-jupyter',
        name: 'GeoModel Core',
        runtimeName: 'opengms/geomodel-core:2026.05',
        stack: 'Default OpenGMS Jupyter runtime'
      }]
))

const filteredEnvironmentCatalog = computed(() => {
  const query = environmentSearchQuery.value.trim().toLowerCase()
  return environmentCatalog.value.filter(env => {
    const matchesFilter = environmentFilter.value === 'all'
      || env.source === environmentFilter.value
      || env.tags.some(tag => normalizeEnvTagClass(tag) === environmentFilter.value)
      || normalizeEnvTagClass(env.category || '') === environmentFilter.value
      || environmentAcceleratorClass(env) === environmentFilter.value

    if (!matchesFilter) return false
    if (!query) return true

    const searchable = [
      env.name,
      env.description,
      env.stack,
      env.accelerator,
      env.runtimeName,
      env.imageName,
      env.category,
      ...(env.features || []),
      ...env.tags
    ].join(' ').toLowerCase()

    return searchable.includes(query)
  })
})

const selectedEnvironmentCatalog = computed(() => (
  environmentCatalog.value.find(env => env.id === selectedEnvId.value) || environmentCatalog.value[0]
))

const drawerEnvironment = computed(() => (
  environmentCatalog.value.find(env => env.id === drawerEnvironmentId.value) || selectedEnvironmentCatalog.value
))

const drawerLibraries = computed(() => drawerEnvironment.value?.detail?.libraries || [])

const filteredDrawerLibraries = computed(() => {
  const query = environmentLibraryQuery.value.trim().toLowerCase()
  if (!query) return drawerLibraries.value
  return drawerLibraries.value.filter(library => (
    `${library.name} ${library.version}`.toLowerCase().includes(query)
  ))
})

const visibleDrawerLibraries = computed(() => (
  environmentLibraryQuery.value.trim()
    ? filteredDrawerLibraries.value
    : filteredDrawerLibraries.value.slice(0, 7)
))

const remainingDrawerLibraryCount = computed(() => {
  if (environmentLibraryQuery.value.trim() || !drawerEnvironment.value) return 0
  const hiddenVisibleLibraries = Math.max(0, filteredDrawerLibraries.value.length - visibleDrawerLibraries.value.length)
  return hiddenVisibleLibraries + Number(drawerEnvironment.value.detail.additionalLibraryCount || 0)
})

// 选择环境
const selectEnvironment = (envId) => {
  selectedEnvId.value = envId
  userDefaultEnvId.value = envId
  localStorage.setItem('default_jupyter_env', envId)
  updateEnvironmentDefaults()
}

const openEnvironmentDrawer = (envId) => {
  selectEnvironment(envId)
  drawerEnvironmentId.value = envId
  environmentLibraryQuery.value = ''
  environmentDrawerOpen.value = true
}

const closeEnvironmentDrawer = () => {
  environmentDrawerOpen.value = false
}

const openCreateProjectModal = async (target = CREATE_PROJECT_TARGETS.project) => {
  createProjectTarget.value = target
  if (target === CREATE_PROJECT_TARGETS.project) {
    newProjectDescription.value = ''
  }
  if (availableEnvironments.value.length === 0) {
    await loadEnvironments()
  }
  showCreateProjectModal.value = true
}

const closeCreateProjectModal = () => {
  if (isCreating.value) return
  showCreateProjectModal.value = false
  createProjectTarget.value = CREATE_PROJECT_TARGETS.project
  newProjectDescription.value = ''
}

const createProjectFromEnvironment = async () => {
  if (!selectedEnvironmentCatalog.value) return
  if (!canCreateProjectFromEnvironment(selectedEnvironmentCatalog.value)) {
    showToastMessage('This environment is not available for project creation.', 'warning')
    return
  }
  selectEnvironment(selectedEnvironmentCatalog.value.id)
  if (!newProjectDescription.value.trim()) {
    newProjectDescription.value = `Project initialized with ${selectedEnvironmentCatalog.value.name}.`
  }
  await openCreateProjectModal(CREATE_PROJECT_TARGETS.jupyter)
}

const useDrawerEnvironmentForProject = async () => {
  if (!drawerEnvironment.value) return
  selectEnvironment(drawerEnvironment.value.id)
  closeEnvironmentDrawer()
  await createProjectFromEnvironment()
}

const copyEnvironmentDigest = async () => {
  const digest = drawerEnvironment.value?.detail?.digest
  if (!digest) return
  try {
    await navigator.clipboard?.writeText(digest)
    showToastMessage('Image digest copied.', 'success')
  } catch (e) {
    showToastMessage('Digest is ready to copy from the drawer.', 'info')
  }
}

const loadMenuData = async (menu, { force = false } = {}) => {
  const normalizedMenu = normalizeActiveMenu(menu)

  if (normalizedMenu === 'environments') {
    if (!getToken()) return
    if (force || availableEnvironments.value.length === 0) {
      await loadEnvironments()
    }
    return
  }

  if (normalizedMenu === 'mydata') {
    if (!getToken()) return
    if (force || myDataList.value.length === 0) {
      await loadMyDataList()
    }
  }
}

const resetDashboardScroll = () => {
  requestAnimationFrame(() => {
    const mainContent = document.querySelector('.main-content')
    if (mainContent) {
      mainContent.scrollTop = 0
    }
    if (typeof mainContent?.scrollTo === 'function') {
      mainContent.scrollTo(0, 0)
    }
    if (typeof window.scrollTo === 'function') {
      window.scrollTo(0, 0)
    }
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  })
}

// 切换菜单时清空搜索
watch(activeMenu, (newMenu) => {
  localStorage.setItem(JUPYTER_ACTIVE_MENU_KEY, normalizeActiveMenu(newMenu))
  searchQuery.value = ''
  resetDashboardScroll()
  loadMenuData(newMenu, { force: true })
})

// 搜索时重置分页
watch(searchQuery, () => {
  if (activeMenu.value === 'mydata') {
    myDataPage.value = 1
  }
})

// 页面标题映射
const pageTitles = {
  recent: 'Recent',
  myspace: 'My Space',
  cases: 'Case Library',
  mymodel: 'My Model',
  mydata: 'My Data',
  mydatamethod: 'My Data Method',
  environments: 'Environments'
}

const dashboardPageTitle = computed(() => {
  if (activeMenu.value === 'recent') return 'Workspace Activity'
  return pageTitles[activeMenu.value] || 'OpenGeoLab'
})

const dashboardPageSubtitle = computed(() => {
  switch (activeMenu.value) {
    case 'recent':
      return 'Continue your spatial analysis or launch new collaborative modeling environments.'
    case 'myspace':
      return `Workspace Directory · ${projects.value.length} project${projects.value.length === 1 ? '' : 's'}`
    case 'cases':
      return 'Browse public runnable projects, curated cases, datasets, and notebooks shared by the community.'
    case 'mymodel':
      return 'Saved OpenGMS model services. Open an item to view its original OpenGMS page.'
    case 'mydata':
      return 'Manage datasets and files available to your notebooks and modeling workflows.'
    case 'mydatamethod':
      return 'Saved data processing methods for reproducible geospatial workflows.'
    default:
      return ''
  }
})

const showDashboardSearch = computed(() => (
  ['myspace', 'mymodel', 'mydata', 'mydatamethod'].includes(activeMenu.value)
))

const showDashboardHeaderTools = computed(() => (
  showDashboardSearch.value || activeMenu.value === 'myspace' || activeMenu.value === 'mymodel'
))

// 计算属性
const isLoggedIn = computed(() => !!user.value)
const userInitials = computed(() => {
  const source = user.value?.displayName || user.value?.username || user.value?.email || 'U'
  const cleaned = String(source).trim()
  if (!cleaned) return 'U'

  if (cleaned.includes('@')) {
    return cleaned.split('@')[0].slice(0, 2).toUpperCase()
  }

  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }

  return cleaned.slice(0, 2).toUpperCase()
})

watch(() => user.value?.avatarUrl, () => {
  avatarLoadFailed.value = false
})

// 最近项目（最多5个）
const recentProjects = computed(() => {
  return [...projects.value]
    .sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt))
    .slice(0, 5)
})

// TODO: 最近使用的资源（最多5个）
// TODO: 最近使用的数据（最多5个）

// 过滤后的项目列表
const filteredProjects = computed(() => {
  if (!searchQuery.value) return projects.value
  const query = searchQuery.value.toLowerCase()
  return projects.value.filter(p => p.name.toLowerCase().includes(query))
})

// 过滤后的最近项目
const filteredRecentProjects = computed(() => {
  const sorted = [...projects.value]
    .sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt))
    .slice(0, 10)
  if (!searchQuery.value) return sorted
  const query = searchQuery.value.toLowerCase()
  return sorted.filter(p => p.name.toLowerCase().includes(query))
})

const workspaceResources = computed(() => {
  const items = []

  myDataList.value.slice(0, 2).forEach(item => {
    items.push({
      key: `data-${item.id || item.name}`,
      icon: '◫',
      name: item.name,
      type: item.type === 'folder' ? 'Folder' : 'Dataset',
      meta: item.size ? formatSize(item.size) : '--'
    })
  })

  myModels.value.slice(0, 1).forEach(item => {
    items.push({
      key: `model-${item.id || item.name}`,
      icon: '◧',
      name: item.name,
      type: 'Model',
      meta: item.author || 'OpenGeoLab'
    })
  })

  myDataMethods.value.slice(0, 1).forEach(item => {
    items.push({
      key: `method-${item.id || item.name}`,
      icon: '◨',
      name: item.name,
      type: 'Method',
      meta: item.author || 'OpenGeoLab'
    })
  })

  return items
})

// 过滤后的模型列表
const filteredMyModels = computed(() => {
  if (!searchQuery.value) return myModels.value
  const query = searchQuery.value.toLowerCase()
  return myModels.value.filter(m => getSavedModelSearchText(m).includes(query))
})

// 过滤后的数据方法列表
const filteredMyDataMethods = computed(() => {
  if (!searchQuery.value) return myDataMethods.value
  const query = searchQuery.value.toLowerCase()
  return myDataMethods.value.filter(m =>
    m.name.toLowerCase().includes(query) ||
    (m.description && m.description.toLowerCase().includes(query))
  )
})

// 当前路径下的数据项
const currentDataItems = computed(() => {
  const path = currentDataPath.value
  if (path === '/') {
    // 根目录显示所有顶层项目
    return myDataList.value.filter(d => !d.parentId)
  }
  // 子文件夹内容
  const parentFolder = myDataList.value.find(d => getDataKind(d) === 'folder' && d.path === path)
  if (parentFolder) {
    return myDataList.value.filter(d => d.parentId === parentFolder.id)
  }
  return []
})

const myDataFolders = computed(() => (
  myDataList.value
    .filter(item => getDataKind(item) === 'folder')
    .sort((a, b) => String(a.path || '').localeCompare(String(b.path || '')))
))

// 过滤后的我的数据列表
const filteredMyDataList = computed(() => {
  if (!searchQuery.value) return myDataList.value
  const query = searchQuery.value.toLowerCase()
  return myDataList.value.filter(d =>
    d.name.toLowerCase().includes(query) ||
    (d.description && d.description.toLowerCase().includes(query))
  )
})

// 分页后的数据列表
const paginatedMyDataList = computed(() => {
  const start = (myDataPage.value - 1) * myDataPageSize.value
  const end = start + myDataPageSize.value
  return filteredMyDataList.value.slice(start, end)
})

// 总页数
const myDataTotalPages = computed(() => {
  return Math.ceil(filteredMyDataList.value.length / myDataPageSize.value) || 1
})

// 可见的页码列表
const visiblePageNumbers = computed(() => {
  const total = myDataTotalPages.value
  const current = myDataPage.value
  const pages = []

  if (total <= 5) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    if (current <= 3) {
      pages.push(1, 2, 3, 4, 5)
    } else if (current >= total - 2) {
      pages.push(total - 4, total - 3, total - 2, total - 1, total)
    } else {
      pages.push(current - 2, current - 1, current, current + 1, current + 2)
    }
  }

  return pages.filter(p => p >= 1 && p <= total)
})

// 搜索框 placeholder
const searchPlaceholder = computed(() => {
  switch (activeMenu.value) {
    case 'recent': return 'Search recent projects...'
    case 'myspace': return 'Search my projects...'
    case 'mymodel': return 'Search my models...'
    case 'mydata': return 'Search my data...'
    case 'mydatamethod': return 'Search my data methods...'
    default: return 'Search...'
  }
})

// 计算总存储空间
const totalSize = computed(() => {
  const total = projects.value.reduce((sum, p) => sum + (p.size || 0), 0)
  return formatSize(total)
})

// 计算最近活动时间
const lastModified = computed(() => {
  if (projects.value.length === 0) return 'None'
  const latest = projects.value.reduce((latest, p) => {
    const pTime = new Date(p.modifiedAt).getTime()
    return pTime > latest ? pTime : latest
  }, 0)
  if (latest === 0) return 'None'
  const date = new Date(latest)
  const now = new Date()
  const diff = now - date
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hr ago`
  return `${Math.floor(diff / 86400000)} day${Math.floor(diff / 86400000) > 1 ? 's' : ''} ago`
})

// 跳转到项目详情页
const goToProject = (project) => {
  openMenuProject.value = null
  router.push(buildWorkspaceProjectRoutePath(project))
}

const launchProjectInJupyterLab = async (projectName) => {
  const res = await authAxios().post('/api/jupyter/start', { projectName })
  if (res.data?.url) {
    window.location.assign(res.data.url)
    return true
  }

  throw new Error('JupyterLab did not return a launch URL.')
}

// 创建新项目
const createProject = async (projectInput = {}) => {
  const projectName = projectInput.name?.trim()
  if (!projectName) return

  isCreating.value = true
  const launchAfterCreate = shouldLaunchJupyterAfterCreate(createProjectTarget.value)
  const runtimeImageId = projectInput.runtimeImageId || selectedEnvId.value || 'geomodel-jupyter'
  try {
    const res = await authAxios().post('/api/jupyter/projects', {
      name: projectName,
      description: projectInput.description?.trim() || '',
      ...getCreateProjectVisibilityPayload(),
      runtimeImageId,
      starterTemplate: normalizeStarterTemplateId(projectInput.starterTemplate)
    })

    if (res.data.status === 'created') {
      // 添加到列表并跳转
      projects.value.unshift(res.data.project)
      showCreateProjectModal.value = false
      newProjectDescription.value = ''
      createProjectTarget.value = CREATE_PROJECT_TARGETS.project

      if (launchAfterCreate) {
        showToastMessage('Project created. Launching JupyterLab...', 'info', 5000)
        try {
          await launchProjectInJupyterLab(res.data.project.name)
        } catch (launchError) {
          showToastMessage(getJupyterLaunchErrorMessage(launchError), 'error', 6000)
          router.push(buildWorkspaceProjectRoutePath(res.data.project))
        }
        return
      }

      router.push(buildWorkspaceProjectRoutePath(res.data.project))
    }
  } catch (e) {
    showToastMessage(getUiErrorMessage(e, 'Failed to create project.'), 'error', 6000)
  } finally {
    isCreating.value = false
  }
}

// 切换项目菜单
const toggleProjectMenu = (project) => {
  if (openMenuProject.value === project.name) {
    openMenuProject.value = null
  } else {
    openMenuProject.value = project.name
  }
}

// 编辑项目（名称和描述）
const editProject = async (project) => {
  const newName = await promptDialog({
    title: 'Edit project',
    message: 'Update the project name shown in your workspace.',
    inputLabel: 'Project name',
    defaultValue: project.name,
    confirmText: 'Continue'
  })
  if (newName === null) return

  const newDesc = await promptDialog({
    title: 'Edit description',
    message: 'Describe what this workspace contains.',
    inputLabel: 'Description',
    defaultValue: project.description || '',
    confirmText: 'Save changes'
  })
  if (newDesc === null) return

  const hasNameChange = newName.trim() && newName.trim() !== project.name
  const hasDescChange = newDesc !== (project.description || '')

  if (!hasNameChange && !hasDescChange) {
    return // 没有变化
  }

  try {
    await authAxios().put(`/api/jupyter/projects/${encodeURIComponent(project.name)}`, {
      newName: hasNameChange ? newName.trim() : undefined,
      description: newDesc
    })
    // 更新本地列表
    const idx = projects.value.findIndex(p => p.name === project.name)
    if (idx !== -1) {
      if (hasNameChange) {
        projects.value[idx].name = newName.trim()
      }
      projects.value[idx].description = newDesc
    }
  } catch (e) {
    showToastMessage(getUiErrorMessage(e, 'Failed to update project.'), 'error')
  }
  openMenuProject.value = null
}

// 保留 renameProject 以兼容其他地方的调用
const renameProject = editProject

// 删除项目
const deleteProject = async (project) => {
  const confirmed = await confirmDialog({
    title: 'Delete project',
    message: `Delete "${project.name}"? This removes all files in the project and cannot be undone.`,
    confirmText: 'Delete project',
    dangerous: true
  })

  if (confirmed) {
    try {
      await authAxios().delete(`/api/jupyter/projects/${encodeURIComponent(project.name)}`)
      // 从列表移除
      projects.value = projects.value.filter(p => p.name !== project.name)
      showToastMessage('Project deleted.', 'success')
    } catch (e) {
      showToastMessage(getUiErrorMessage(e, 'Failed to delete project.'), 'error')
    }
  }
  openMenuProject.value = null
}

const handleMySpaceProjectAction = ({ action, project }) => {
  if (action === 'open') return goToProject(project)
  if (action === 'edit') return editProject(project)
  if (action === 'visibility') return toggleProjectVisibility(project)
  if (action === 'case') return toggleCasePublish(project)
  if (action === 'delete') return deleteProject(project)
}

// 切换项目公开/私有状态
const toggleProjectVisibility = async (project) => {
  const newVisibility = !project.isPublic
  const action = newVisibility ? 'make public' : 'make private'

  const confirmed = await confirmDialog({
    title: newVisibility ? 'Make project public' : 'Make project private',
    message: newVisibility
      ? `"${project.name}" will appear in Case Library and other users can view and fork it.`
      : `"${project.name}" will no longer appear in Case Library.`,
    confirmText: action,
    dangerous: false
  })

  if (!confirmed) {
    openMenuProject.value = null
    return
  }

  try {
    await authAxios().put(`/api/jupyter/projects/${encodeURIComponent(project.name)}/visibility`, {
      isPublic: newVisibility
    })
    // 更新本地状态
    const idx = projects.value.findIndex(p => p.name === project.name)
    if (idx !== -1) {
      projects.value[idx].isPublic = newVisibility
    }
    showToastMessage(newVisibility ? 'Project is now public.' : 'Project is now private.', 'success')
  } catch (e) {
    showToastMessage(getUiErrorMessage(e, 'Failed to update project visibility.'), 'error')
  }
  openMenuProject.value = null
}

const toggleCasePublish = async (project) => {
  if (project.isCase) {
    const confirmed = await confirmDialog({
      title: 'Unpublish case',
      message: `"${project.name}" will be removed from the public Case Library.`,
      confirmText: 'Unpublish case',
      dangerous: true
    })
    if (!confirmed) {
      openMenuProject.value = null
      return
    }
    try {
      await authAxios().put(`/api/jupyter/projects/${encodeURIComponent(project.name)}/case`, {
        isCase: false
      })
      const idx = projects.value.findIndex(p => p.name === project.name)
      if (idx !== -1) {
        projects.value[idx].isCase = false
        projects.value[idx].case = null
        projects.value[idx].caseTitle = ''
      }
      showToastMessage('Case unpublished', 'success')
    } catch (e) {
      showToastMessage('Failed to unpublish case: ' + (e.response?.data?.error || e.message), 'error')
    }
    openMenuProject.value = null
    return
  }

  // 打开 Case 发布面板，预填已有数据
  casePublishProject.value = project
  caseForm.value = {
    title: project.caseTitle || project.case?.title || project.name,
    summary: project.case?.summary || project.description || '',
    scenario: project.case?.scenario || '',
    coreNotebook: project.case?.coreNotebook || '',
    environment: project.case?.environment || '',
    tags: (project.case?.tags || []).join(', '),
    datasets: (project.case?.datasets || []).join('; '),
    steps: (project.case?.steps || []).join('; '),
    results: (project.case?.results || []).join('; ')
  }
  showCasePublishModal.value = true
}

const submitCasePublish = async () => {
  const project = casePublishProject.value
  if (!project) return
  casePublishSubmitting.value = true
  try {
    const res = await authAxios().put(`/api/jupyter/projects/${encodeURIComponent(project.name)}/case`, {
      isCase: true,
      caseMeta: {
        title: caseForm.value.title,
        summary: caseForm.value.summary,
        scenario: caseForm.value.scenario,
        coreNotebook: caseForm.value.coreNotebook,
        environment: caseForm.value.environment,
        tags: caseForm.value.tags,
        datasets: caseForm.value.datasets,
        steps: caseForm.value.steps,
        results: caseForm.value.results
      }
    })
    const idx = projects.value.findIndex(p => p.name === project.name)
    if (idx !== -1) {
      projects.value[idx].isCase = true
      projects.value[idx].isPublic = true
      projects.value[idx].case = res.data.case || null
      projects.value[idx].caseTitle = res.data.case?.title || caseForm.value.title.trim()
    }
    showCasePublishModal.value = false
    showToastMessage('Case published successfully (project is now public)', 'success')
  } catch (e) {
    showToastMessage('Failed to publish case: ' + (e.response?.data?.error || e.message), 'error')
  } finally {
    casePublishSubmitting.value = false
  }
}

// 格式化日期时间
const formatDateTime = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  return `${year}/${month}/${day} ${hour}:${minute}`
}

// 格式化相对时间
const formatRelativeTime = (date) => {
  if (!date) return 'Unknown'
  const now = new Date()
  const d = new Date(date)
  const diffMs = now - d
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffDay > 30) {
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}/${month}/${day}`
  } else if (diffDay > 0) {
    return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`
  } else if (diffHour > 0) {
    return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`
  } else if (diffMin > 0) {
    return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`
  } else {
    return 'Just now'
  }
}

const projectVisibilityLabel = (project) => (project?.isPublic ? 'Public' : 'Private')

const projectVisibilityClass = (project) => (project?.isPublic ? 'public' : 'private')

const projectSummary = (project) => {
  const summary = String(project?.description || project?.case?.summary || '').trim()
  if (summary) {
    return summary
  }

  const fileCount = Number(project?.fileCount || 0)
  return `Project workspace with ${fileCount} file${fileCount === 1 ? '' : 's'} and ${formatSize(Number(project?.sizeBytes || 0))}.`
}

const projectRuntimeImage = (project) => {
  return String(
    project?.runtime?.imageName ||
    project?.runtime?.imageId ||
    project?.runtimeImageId ||
    project?.imageId ||
    project?.environmentId ||
    ''
  ).trim()
}

const projectArtifactSummary = (project) => {
  const fileCount = Number(project?.fileCount || 0)
  const parts = [
    `${fileCount} file${fileCount === 1 ? '' : 's'}`,
    formatSize(Number(project?.sizeBytes || 0))
  ]
  const runtimeImage = projectRuntimeImage(project)
  if (runtimeImage) parts.push(`Based on ${runtimeImage}`)
  return parts.join(' · ')
}

const projectMarkLabel = (project) => {
  if (project?.markLabel) return project.markLabel
  if (project?.isCase) return 'CASE'
  return 'WS'
}

const projectMarkKicker = (project) => {
  if (project?.isCase) return 'Published'
  return project?.isPublic ? 'Shared' : 'Private'
}

const projectVisualVariant = (project, index = 0) => {
  if (project?.isCase) return 'case'
  if (project?.isPublic) return 'shared'
  return ['private', 'analysis', 'private'][index % 3]
}

// 获取存储的 token
const getToken = () => localStorage.getItem('jupyter_token')
const setToken = (token) => localStorage.setItem('jupyter_token', token)
const clearToken = () => localStorage.removeItem('jupyter_token')

// 创建带认证的 axios 实例
const authAxios = () => {
  const token = getToken()
  return axios.create({
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  })
}

const getAuthBaseUrl = () => {
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL
  if (envBaseUrl) {
    return envBaseUrl.replace(/\/+$/, '')
  }

  return window.location.origin.replace(/\/+$/, '')
}

const startOAuthLogin = (provider) => {
  socialLoadingProvider.value = provider
  window.location.assign(`${getAuthBaseUrl()}/api/auth/${provider}`)
}

// OpenGMS 登录
const loginWithOpenGMS = async () => {
  if (!loginForm.value.email || !loginForm.value.password) {
    showToastMessage('Please enter your OpenGMS email and password.', 'warning')
    return
  }

  isLoading.value = true
  try {
    const res = await axios.post('/api/auth/opengms/login', {
      email: loginForm.value.email,
      password: loginForm.value.password
    })

    if (!res.data?.token) {
      throw new Error(res.data?.error || 'Sign-in failed.')
    }

    setToken(res.data.token)
    loginForm.value.password = ''

    const loggedIn = await fetchUser()
    if (!loggedIn) {
      throw new Error('Failed to verify sign-in status.')
    }

    await Promise.all([
      loadProjects(),
      loadMyModels(),
      loadMyDataMethods()
    ])

    showToastMessage('Signed in successfully.', 'success')
  } catch (e) {
    clearToken()
    showToastMessage(getUiErrorMessage(e, 'Sign-in failed.'), 'error')
  } finally {
    isLoading.value = false
  }
}

// 登出
const logout = async () => {
  try {
    await authAxios().post('/api/auth/logout')
  } catch (e) {
    // ignore
  }
  clearToken()
  user.value = null
  jupyterStatus.value = 'stopped'
}

// 加载环境列表
const loadEnvironments = async () => {
  loadingEnvironments.value = true
  try {
    const res = await authAxios().get('/api/jupyter/images')
    availableEnvironments.value = res.data.images || []
    if (
      availableEnvironments.value.length > 0 &&
      !availableEnvironments.value.some(env => env.id === selectedEnvId.value)
    ) {
      selectedEnvId.value = availableEnvironments.value.find(env => env.default)?.id || availableEnvironments.value[0].id
      userDefaultEnvId.value = selectedEnvId.value
      localStorage.setItem('default_jupyter_env', selectedEnvId.value)
    }
    // 更新 default 标记
    updateEnvironmentDefaults()
  } catch (e) {
    console.error('Failed to load environments:', e)
    availableEnvironments.value = []
  } finally {
    loadingEnvironments.value = false
  }
}

// 更新环境的默认标记
const updateEnvironmentDefaults = () => {
  availableEnvironments.value = availableEnvironments.value.map(env => ({
    ...env,
    default: userDefaultEnvId.value ? env.id === userDefaultEnvId.value : env.default
  }))
}

// 设置默认环境
const setDefaultEnvironment = (envId) => {
  userDefaultEnvId.value = envId
  localStorage.setItem('default_jupyter_env', envId)
  updateEnvironmentDefaults()
}

// ========== My Data 相关方法 ==========

// 加载用户的数据列表
const loadMyDataList = async () => {
  loadingMyData.value = true
  try {
    const res = await authAxios().get('/api/jupyter/my-data')
    myDataList.value = res.data.dataList || []
  } catch (e) {
    console.error('Failed to load my data:', e)
    myDataList.value = []
  } finally {
    loadingMyData.value = false
  }
}

// 网盘风格方法的别名
const loadMyData = loadMyDataList

// 导航返回上级目录
const navigateBack = () => {
  if (currentDataPath.value === '/') return
  const parts = currentDataPath.value.split('/').filter(p => p)
  parts.pop()
  currentDataPath.value = parts.length === 0 ? '/' : '/' + parts.join('/')
  selectedDataItems.value = []
}

// 创建新文件夹
const createNewFolder = async () => {
  const folderName = await promptDialog({
    title: 'Create folder',
    message: 'Add a new folder to the current data directory.',
    inputLabel: 'Folder name',
    placeholder: 'e.g. processed-raster',
    confirmText: 'Create folder'
  })
  if (!folderName || !folderName.trim()) return

  try {
    const res = await authAxios().post('/api/jupyter/my-data/folder', {
      name: folderName.trim(),
      path: currentDataPath.value,
      parentId: getCurrentParentId()
    })

    if (res.data.status === 'created') {
      // 添加到列表
      myDataList.value.push({
        id: res.data.id || Date.now().toString(),
        name: folderName.trim(),
        type: 'folder',
        path: currentDataPath.value === '/'
          ? '/' + folderName.trim()
          : currentDataPath.value + '/' + folderName.trim(),
        parentId: getCurrentParentId(),
        createdAt: new Date().toISOString()
      })
      showToastMessage('Folder created successfully.', 'success')
    }
  } catch (e) {
    console.error('Failed to create folder:', e)
    showToastMessage(getUiErrorMessage(e, 'Failed to create folder.'), 'error')
  }
}

// 获取当前父文件夹ID
const getCurrentParentId = () => {
  if (currentDataPath.value === '/') return null
  const folder = myDataList.value.find(d => getDataKind(d) === 'folder' && d.path === currentDataPath.value)
  return folder?.id || null
}

const getFolderByPath = (targetPath) => {
  return myDataList.value.find(item => (
    getDataKind(item) === 'folder' &&
    item.path === targetPath
  ))
}

// 单击选择项目
const handleItemClick = (item) => {
  const index = selectedDataItems.value.indexOf(item.id)
  if (index > -1) {
    selectedDataItems.value.splice(index, 1)
  } else {
    selectedDataItems.value = [item.id]
  }
}

// 双击打开文件夹或下载文件
const handleItemDoubleClick = (item) => {
  if (getDataKind(item) === 'folder') {
    currentDataPath.value = item.path
    selectedDataItems.value = []
  } else {
    downloadData(item)
  }
}

// 打开右键菜单
const openItemContextMenu = (event, item) => {
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
  contextMenuItem.value = item
  showDataContextMenu.value = true

  // 点击其他地方关闭菜单
  setTimeout(() => {
    document.addEventListener('click', closeContextMenu, { once: true })
  }, 0)
}

const closeContextMenu = () => {
  showDataContextMenu.value = false
}

// 右键菜单操作
const downloadContextItem = () => {
  if (contextMenuItem.value) {
    downloadData(contextMenuItem.value)
  }
  showDataContextMenu.value = false
}

const renameContextItem = async () => {
  if (!contextMenuItem.value) return
  const newName = await promptDialog({
    title: 'Rename item',
    message: 'Update the file or folder name.',
    inputLabel: 'New name',
    defaultValue: contextMenuItem.value.name,
    confirmText: 'Rename'
  })
  if (!newName || newName === contextMenuItem.value.name) {
    showDataContextMenu.value = false
    return
  }

  try {
    await authAxios().put(`/api/jupyter/my-data/${contextMenuItem.value.id}`, {
      name: newName.trim()
    })
    contextMenuItem.value.name = newName.trim()
    showToastMessage('Renamed successfully.', 'success')
  } catch (e) {
    showToastMessage(getUiErrorMessage(e, 'Failed to rename item.'), 'error')
  }
  showDataContextMenu.value = false
}

const deleteContextItem = async () => {
  if (!contextMenuItem.value) return
  const confirmed = await confirmDialog({
    title: 'Delete item',
    message: `Delete "${contextMenuItem.value.name}"? This cannot be undone.`,
    confirmText: 'Delete item',
    dangerous: true
  })
  if (!confirmed) {
    showDataContextMenu.value = false
    return
  }

  try {
    await authAxios().delete(`/api/jupyter/my-data/${contextMenuItem.value.id}`)
    const deletedItem = contextMenuItem.value
    if (getDataKind(deletedItem) === 'folder') {
      myDataList.value = myDataList.value.filter(d => (
        d.id !== deletedItem.id &&
        !(deletedItem.path && d.path && d.path.startsWith(`${deletedItem.path}/`))
      ))
    } else {
      myDataList.value = myDataList.value.filter(d => d.id !== deletedItem.id)
    }
    showToastMessage('Deleted successfully.', 'success')
  } catch (e) {
    showToastMessage(getUiErrorMessage(e, 'Failed to delete item.'), 'error')
  }
  showDataContextMenu.value = false
}

// 获取文件扩展名
const getFileExtension = (filename) => {
  if (!filename) return ''
  const parts = filename.split('.')
  return parts.length > 1 ? parts.pop().toUpperCase() : ''
}

const getDataCardBadge = (item) => {
  return getDataKind(item) === 'folder' ? 'FOLDER' : getDataItemBadge(item)
}

const getDataCardKind = (item) => {
  if (getDataKind(item) === 'folder') return 'folder'

  const extension = String(item.extension || item.type || getFileExtension(item.name)).replace('.', '').toLowerCase()
  const format = String(item.metadata?.formatLabel || '').toLowerCase()

  if (['tif', 'tiff', 'geotiff', 'png', 'jpg', 'jpeg', 'webp'].includes(extension) || format.includes('geotiff')) return 'raster'
  if (['py', 'js', 'ts', 'r', 'sh', 'sql', 'yaml', 'yml'].includes(extension)) return 'code'
  if (['csv', 'tsv', 'xlsx', 'xls', 'parquet'].includes(extension) || format.includes('table')) return 'table'
  if (['geojson', 'json', 'shp', 'kml', 'gpkg'].includes(extension) || format.includes('vector')) return 'vector'
  return 'dataset'
}

const getDataCardSubtitle = (item) => {
  if (getDataKind(item) === 'folder') {
    const childCount = myDataList.value.filter(d => d.parentId === item.id).length
    return childCount > 0 ? `Folder · ${childCount} items` : 'Folder · --'
  }

  const format = item.metadata?.formatLabel || getDataItemBadge(item)
  return `${format} · ${formatDataSize(item.size)}`
}

// 计算总数据大小
const calculateTotalDataSize = () => {
  const total = myDataList.value.reduce((sum, d) => sum + (Number(d.size) || 0), 0)
  return formatSize(total)
}

// 打开数据上传器
const openDataUploader = () => {
  uploadProgress.value = 0
  isUploading.value = false
  showDataUploader.value = true
}

// 关闭数据上传器
const closeDataUploader = () => {
  if (isUploading.value) return
  showDataUploader.value = false
  uploadProgress.value = 0
}

// 上传数据
const uploadData = async (payload = {}) => {
  const uploadFile = payload.file
  if (!uploadFile) {
    showToastMessage('Please choose a file to upload.', 'warning')
    return
  }

  const uploadPath = payload.path || currentDataPath.value || '/'
  const destinationFolder = uploadPath === '/' ? null : getFolderByPath(uploadPath)
  const parentId = uploadPath === '/' ? '' : (payload.parentId || destinationFolder?.id || '')

  if (uploadPath !== '/' && !parentId) {
    showToastMessage('Upload destination is unavailable.', 'error')
    return
  }

  isUploading.value = true
  uploadProgress.value = 0

  try {
    const formData = new FormData()
    formData.append('file', uploadFile)
    formData.append('dataName', payload.dataName || uploadFile.name)
    formData.append('description', '')
    formData.append('parentId', parentId)
    formData.append('path', uploadPath)

    const res = await authAxios().post('/api/jupyter/upload-data', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          uploadProgress.value = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        }
      }
    })

    if (res.data.success) {
      // 添加到我的数据列表
      const newData = {
        id: res.data.dataId || Date.now().toString(),
        name: payload.dataName || uploadFile.name,
        filename: uploadFile.name,
        kind: 'file',
        description: '',
        type: getFileExtension(uploadFile.name),
        size: uploadFile.size,
        url: res.data.url,
        parentId,
        path: uploadPath,
        source: 'upload',
        downloadable: Boolean(res.data.url),
        uploadedAt: new Date().toISOString()
      }
      myDataList.value.unshift(res.data.data || newData)

      showToastMessage(`Uploaded to ${uploadPath}.`, 'success')
      showDataUploader.value = false
      uploadProgress.value = 0
    } else {
      throw new Error(res.data.error || 'Upload failed.')
    }
  } catch (e) {
    console.error('Upload failed:', e)
    showToastMessage(getUiErrorMessage(e, 'Upload failed.'), 'error')
  } finally {
    isUploading.value = false
    uploadProgress.value = 0
  }
}

// 下载数据
const downloadData = async (data) => {
  if (!data.url) {
    showToastMessage(data.source === 'mock' ? 'This demo asset has metadata only.' : 'Download link is unavailable.', 'warning')
    return
  }

  try {
    const response = await authAxios().get(
      `/api/jupyter/my-data/${encodeURIComponent(data.id)}/download`,
      { responseType: 'blob' }
    )
    const blobUrl = window.URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = data.name || data.filename || 'download'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(blobUrl)
  } catch (e) {
    showToastMessage(getUiErrorMessage(e, 'Download failed.'), 'error')
  }
}

// 从我的数据中移除
const removeFromMyData = async (data) => {
  const confirmed = await confirmDialog({
    title: 'Delete data item',
    message: `Delete "${data.name}" from My Data? This cannot be undone.`,
    confirmText: 'Delete data',
    dangerous: true
  })
  if (!confirmed) return
  try {
    await authAxios().delete(`/api/jupyter/my-data/${data.id}`)
    if (getDataKind(data) === 'folder') {
      myDataList.value = myDataList.value.filter(d => (
        d.id !== data.id &&
        !(data.path && d.path && d.path.startsWith(`${data.path}/`))
      ))
    } else {
      myDataList.value = myDataList.value.filter(d => d.id !== data.id)
    }
    showToastMessage('Data item deleted.', 'success')
  } catch (e) {
    showToastMessage(getUiErrorMessage(e, 'Failed to delete data item.'), 'error')
  }
}

// 获取用户信息
const fetchUser = async () => {
  try {
    const res = await authAxios().get('/api/auth/me')
    user.value = res.data
    return true
  } catch (e) {
    clearToken()
    return false
  }
}

// 加载项目列表
const loadProjects = async () => {
  try {
    const res = await authAxios().get('/api/jupyter/projects')
    projects.value = res.data.projects || []
  } catch (e) {
    console.error('Failed to load projects:', e)
  }
}

// ========== My Model 相关方法 ==========

// 加载用户的模型列表
const loadMyModels = async () => {
  try {
    const res = await authAxios().get('/api/jupyter/my-models')
    myModels.value = res.data.models || []
  } catch (e) {
    console.error('Failed to load my models:', e)
  }
}

// 打开模型选择器
const openModelSelector = async () => {
  showModelSelector.value = true
  librarySearchQuery.value = ''
  libraryPage.value = 1
  await loadModelLibrary(1)
}

// 加载模型库
const loadModelLibrary = async (page = 1) => {
  libraryLoading.value = true
  try {
    const res = await axios.get('/api/ogms/models', {
      params: {
        page,
        limit: LIBRARY_SELECTOR_PAGE_SIZE,
        q: librarySearchQuery.value
      }
    })
    modelLibrary.value = res.data.data || []
    libraryTotal.value = res.data.total || 0
    libraryPage.value = page
  } catch (e) {
    console.error('Failed to load model library:', e)
    modelLibrary.value = []
  } finally {
    libraryLoading.value = false
  }
}

// 搜索模型库
const searchModelLibrary = () => {
  loadModelLibrary(1)
}

// 检查模型是否已添加
const isModelAdded = (model) => {
  return myModels.value.some(m => m.id === model.id)
}

// 添加到我的模型
const addToMyModels = async (model) => {
  try {
    const res = await authAxios().post('/api/jupyter/my-models', { model })
    myModels.value.push(res.data.model || model)
  } catch (e) {
    showToastMessage(getUiErrorMessage(e, 'Failed to add model.'), 'error')
  }
}

const openLibraryItemDetail = (item, kind) => {
  const detailUrl = getLibraryItemDetailUrl(item, kind)
  if (!detailUrl) {
    showToastMessage('Detail link is unavailable for this resource.', 'warning')
    return
  }
  window.open(detailUrl, '_blank', 'noopener,noreferrer')
}

const openModelLibraryDetail = (model) => {
  openLibraryItemDetail(model, 'model')
}

// 从我的模型移除
const removeFromMyModels = async (model) => {
  const confirmed = await confirmDialog({
    title: 'Remove model',
    message: `Remove "${model.name}" from My Model? The original model resource will not be deleted.`,
    confirmText: 'Remove model'
  })
  if (!confirmed) return
  try {
    await authAxios().delete(`/api/jupyter/my-models/${model.id}`)
    myModels.value = myModels.value.filter(m => m.id !== model.id)
    showToastMessage('Model removed.', 'success')
  } catch (e) {
    showToastMessage(getUiErrorMessage(e, 'Failed to remove model.'), 'error')
  }
}

const openSavedModelExternalLink = (model) => {
  const externalUrl = getSavedModelExternalUrl(model)
  if (!externalUrl) {
    showToastMessage('OpenGMS link is unavailable for this saved model.', 'warning')
    return
  }
  window.open(externalUrl, '_blank', 'noopener,noreferrer')
}

// ========== My Data Method 相关方法 ==========

// 加载用户的数据方法列表
const loadMyDataMethods = async () => {
  try {
    const res = await authAxios().get('/api/jupyter/my-datamethods')
    myDataMethods.value = res.data.dataMethods || []
  } catch (e) {
    console.error('Failed to load my data methods:', e)
  }
}

// 打开数据方法选择器
const openDataMethodSelector = async () => {
  showDataMethodSelector.value = true
  librarySearchQuery.value = ''
  libraryPage.value = 1
  await loadDataMethodLibrary(1)
}

// 加载数据方法库
const loadDataMethodLibrary = async (page = 1) => {
  libraryLoading.value = true
  try {
    const res = await axios.get('/api/datamethods', {
      params: {
        page,
        limit: LIBRARY_SELECTOR_PAGE_SIZE,
        q: librarySearchQuery.value
      }
    })
    dataMethodLibrary.value = res.data.data || []
    libraryTotal.value = res.data.total || 0
    libraryPage.value = page
  } catch (e) {
    console.error('Failed to load data method library:', e)
    dataMethodLibrary.value = []
  } finally {
    libraryLoading.value = false
  }
}

// 搜索数据方法库
const searchDataMethodLibrary = () => {
  loadDataMethodLibrary(1)
}

// 检查数据方法是否已添加
const isDataMethodAdded = (method) => {
  return myDataMethods.value.some(m => m.id === method.id)
}

// 添加到我的数据方法
const addToMyDataMethods = async (method) => {
  try {
    await authAxios().post('/api/jupyter/my-datamethods', { dataMethod: method })
    myDataMethods.value.push(method)
  } catch (e) {
    showToastMessage(getUiErrorMessage(e, 'Failed to add data method.'), 'error')
  }
}

// 从我的数据方法移除
const removeFromMyDataMethods = async (method) => {
  const confirmed = await confirmDialog({
    title: 'Remove data method',
    message: `Remove "${method.name}" from My Data Method? The source method remains available in the repository.`,
    confirmText: 'Remove method'
  })
  if (!confirmed) return
  try {
    await authAxios().delete(`/api/jupyter/my-datamethods/${method.id}`)
    myDataMethods.value = myDataMethods.value.filter(m => m.id !== method.id)
    showToastMessage('Data method removed.', 'success')
  } catch (e) {
    showToastMessage(getUiErrorMessage(e, 'Failed to remove data method.'), 'error')
  }
}

// 运行数据方法
const runDataMethod = (method) => {
  selectedDataMethod.value = method
  dataMethodExecutionResult.value = null
  showDataMethodResultModal.value = false
  showDataMethodRunModal.value = true
}

const closeDataMethodRunModal = () => {
  showDataMethodRunModal.value = false
  if (!showDataMethodResultModal.value) {
    selectedDataMethod.value = null
  }
}

const closeDataMethodResultModal = () => {
  showDataMethodResultModal.value = false
  dataMethodExecutionResult.value = null
  selectedDataMethod.value = null
}

const executeDataMethod = async (inputs) => {
  if (!selectedDataMethod.value) return
  dataMethodExecuting.value = true

  try {
    const response = await authAxios().post(
      '/api/datamethods/run',
      buildDataMethodRunRequest(selectedDataMethod.value, inputs)
    )
    dataMethodExecutionResult.value = response.data
    showDataMethodRunModal.value = false
    showDataMethodResultModal.value = true
  } catch (e) {
    dataMethodExecutionResult.value = {
      status: 'error',
      message: getUiErrorMessage(e, 'Execution failed. Please try again.')
    }
    showDataMethodResultModal.value = true
  } finally {
    dataMethodExecuting.value = false
  }
}

// 复制 token
const copyToken = () => {
  navigator.clipboard.writeText(jupyterToken.value)
  showToastMessage('Token copied to clipboard.', 'success')
}

// 格式化函数
const formatSize = (bytes) => {
  const value = Number(bytes || 0)
  if (value < 1024) return value + ' B'
  if (value < 1024 * 1024) return (value / 1024).toFixed(1) + ' KB'
  if (value < 1024 * 1024 * 1024) return (value / 1024 / 1024).toFixed(1) + ' MB'
  if (value < 1024 * 1024 * 1024 * 1024) return (value / 1024 / 1024 / 1024).toFixed(1) + ' GB'
  return (value / 1024 / 1024 / 1024 / 1024).toFixed(1) + ' TB'
}

const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US') + ' ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

const formatWorkspaceDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US')
}

// 初始化
onMounted(async () => {
  if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual'
  }

  const oauthError = route.query.error
  // 检查 URL 中是否有 token (OAuth 回调)
  const urlToken = route.query.token
  if (urlToken) {
    setToken(urlToken)
    router.replace('/jupyter') // 清除 URL 中的 token
    return
  }

  if (typeof oauthError === 'string' && oauthError) {
    showToastMessage(oauthErrorMessages[oauthError] || 'Third-party sign-in failed. Please try again.', 'error', 5000)
    router.replace('/jupyter')
    return
  }

  // 检查本地 token
  if (getToken()) {
    const loggedIn = await fetchUser()
    if (loggedIn) {
      await Promise.all([
        loadProjects(),
        loadMyModels(),
        loadMyDataMethods()
      ])
    }
  }

  await loadMenuData(activeMenu.value)
  resetDashboardScroll()
  setTimeout(resetDashboardScroll, 120)
})
</script>

<style scoped>
.jupyter-page {
  min-height: 100vh;
  background: #f5f7fa;
}

/* 独立导航栏 */
.jupyter-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 2rem;
  height: 70px;
  background: #000000;
  border-bottom: none;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 2rem;
  flex: 1;
}

.logo-link {
  display: flex;
  align-items: center;
}

.logo {
  height: 42px;
  width: auto;
  transition: transform 0.2s;
}

.logo:hover {
  transform: scale(1.05);
}

.back-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s;
  white-space: nowrap;
}

.back-link:hover {
  color: #ffffff;
}

.back-icon {
  font-size: 1.1rem;
}

.nav-center {
  flex: 1;
  display: flex;
  justify-content: center;
}

.page-title {
  color: #fff;
  font-size: 1.3rem;
  font-weight: 600;
  margin: 0;
  white-space: nowrap;
}

.nav-right {
  flex: 1;
  display: flex;
  justify-content: flex-end;
}

/* 登录页面样式 */
.login-container {
  min-height: 100vh;
  background: #020510;
}

.immersive-login {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  overflow: hidden;
  max-width: 100vw;
  padding: 6rem clamp(2rem, 7vw, 7.5rem) 4rem;
  color: #eaf3ff;
}

.login-mode .jupyter-nav {
  position: fixed;
  inset: 0 0 auto;
  z-index: 20;
  height: 72px;
  background: linear-gradient(180deg, rgba(2, 5, 16, 0.78), rgba(2, 5, 16, 0));
  border: none;
  box-shadow: none;
}

.login-mode .back-home-link {
  color: rgba(234, 243, 255, 0.92);
  background: rgba(7, 16, 34, 0.42);
  border: 1px solid rgba(155, 190, 226, 0.28);
  border-radius: 8px;
  padding: 0.62rem 0.9rem;
  box-shadow: none;
  backdrop-filter: blur(12px);
}

.login-mode .back-home-link:hover {
  color: #ffffff;
  border-color: rgba(129, 196, 255, 0.58);
  background: rgba(20, 46, 82, 0.56);
}

.login-card {
  --login-glass-radius: 14px;
  position: relative;
  z-index: 3;
  min-width: 0;
  margin: 0;
  overflow: hidden;
  isolation: isolate;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.17), rgba(255, 255, 255, 0.07) 34%, rgba(15, 28, 50, 0.46) 100%),
    rgba(20, 32, 54, 0.6);
  border: 1px solid rgba(220, 235, 255, 0.26);
  border-top-color: rgba(255, 255, 255, 0.42);
  border-left-color: rgba(255, 255, 255, 0.28);
  border-radius: var(--login-glass-radius);
  padding: 3.05rem 3.35rem 3rem;
  text-align: left;
  max-width: 610px;
  width: 100%;
  box-shadow:
    0 30px 90px rgba(0, 0, 0, 0.38),
    0 12px 34px rgba(39, 107, 184, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.34),
    inset 0 -1px 0 rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(34px) saturate(180%) brightness(1.06);
  -webkit-backdrop-filter: blur(34px) saturate(180%) brightness(1.06);
}

.login-card::before,
.login-card::after {
  content: '';
  position: absolute;
  pointer-events: none;
  border-radius: inherit;
}

.login-card::before {
  inset: 0;
  z-index: 0;
  background:
    radial-gradient(circle at 16% 0%, rgba(255, 255, 255, 0.3), transparent 29%),
    radial-gradient(circle at 92% 18%, rgba(126, 211, 255, 0.18), transparent 34%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.12), transparent 43%, rgba(255, 255, 255, 0.055));
  opacity: 0.86;
}

.login-card::after {
  inset: 1px;
  z-index: 0;
  border: 1px solid rgba(255, 255, 255, 0.085);
  box-shadow:
    inset 0 0 34px rgba(152, 202, 255, 0.09),
    inset 0 0 1px rgba(255, 255, 255, 0.24);
}

.login-card > * {
  position: relative;
  z-index: 1;
}

.login-header h2 {
  color: #edf4ff;
  margin: 0;
  font-size: clamp(2.1rem, 3vw, 3rem);
  line-height: 1.08;
  font-weight: 850;
  letter-spacing: 0.015em;
  overflow-wrap: break-word;
}

.login-header p {
  color: rgba(219, 229, 244, 0.72);
  margin: 1rem 0 0;
  font-size: 1.18rem;
  line-height: 1.62;
}

.login-form {
  display: flex;
  flex-direction: column;
  margin-top: 2.6rem;
  gap: 1.25rem;
}

.login-field-group {
  display: grid;
  gap: 0.48rem;
}

.login-label {
  color: rgba(226, 234, 246, 0.78);
  font-family: var(--font-mono);
  font-size: 0.94rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-align: left;
}

.login-field {
  display: grid;
  grid-template-columns: 3rem minmax(0, 1fr);
  align-items: center;
  min-height: 58px;
  border: 1px solid rgba(220, 235, 255, 0.18);
  background: rgba(255, 255, 255, 0.075);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    inset 0 -1px 0 rgba(0, 0, 0, 0.16);
  backdrop-filter: blur(12px) saturate(140%);
  -webkit-backdrop-filter: blur(12px) saturate(140%);
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}

.login-field:focus-within {
  border-color: rgba(135, 211, 255, 0.78);
  background: rgba(255, 255, 255, 0.11);
  box-shadow:
    0 0 0 3px rgba(135, 211, 255, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.login-input-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgba(218, 229, 242, 0.7);
}

.login-input-icon svg {
  width: 20px;
  height: 20px;
}

.login-input-icon path {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.login-input {
  width: 100%;
  min-height: 56px;
  padding: 0 1rem 0 0;
  border: none;
  border-radius: 0;
  background: transparent;
  color: #eef5ff;
  font-family: var(--font-mono);
  font-size: 1.02rem;
  font-weight: 700;
  letter-spacing: 0.055em;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}

.login-input::placeholder {
  color: rgba(220, 228, 241, 0.68);
}

.login-input:focus {
  outline: none;
}

.opengms-login-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.7rem;
  width: 100%;
  min-height: 60px;
  padding: 0 1.35rem;
  margin-top: 0.25rem;
  background: #8bd7ff;
  color: #102033;
  border: none;
  border-radius: 0;
  font-size: 1.14rem;
  font-weight: 850;
  cursor: pointer;
  box-shadow:
    0 14px 34px rgba(84, 190, 246, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.36);
  transition: background 0.2s, box-shadow 0.2s, transform 0.2s;
}

.opengms-login-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  background: #a6e2ff;
  box-shadow: 0 18px 34px rgba(82, 186, 244, 0.2);
}

.opengms-login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.login-button-arrow {
  width: 22px;
  height: 22px;
}

.login-button-arrow path {
  fill: none;
  stroke: currentColor;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.login-divider {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-top: 2.5rem;
  color: rgba(211, 222, 238, 0.56);
  font-family: var(--font-mono);
  font-size: 0.92rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.login-divider::before,
.login-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(139, 157, 190, 0.24);
}

.login-divider::after {
  background: rgba(139, 157, 190, 0.24);
}

.social-login-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 2rem;
}

.social-login-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  width: 100%;
  min-height: 54px;
  padding: 0 1rem;
  border-radius: 0;
  border: 1px solid rgba(220, 235, 255, 0.17);
  background: rgba(255, 255, 255, 0.035);
  color: rgba(232, 240, 252, 0.86);
  font-size: 1.02rem;
  font-weight: 750;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.055);
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s, background 0.2s;
}

.social-login-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(135, 211, 255, 0.62);
  background: rgba(135, 211, 255, 0.08);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.16);
}

.social-login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.social-login-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}

.social-login-icon svg {
  width: 100%;
  height: 100%;
  display: block;
}

.github-btn .social-login-icon {
  color: rgba(232, 240, 252, 0.92);
}

@media (max-width: 1080px) {
  .immersive-login {
    justify-content: center;
    padding: 6.25rem 1.5rem 3rem;
  }

  .login-card {
    max-width: 560px;
    margin: 0;
  }
}

@media (max-width: 640px) {
  .login-mode .jupyter-nav {
    height: 62px;
  }

  .login-mode .back-home-link {
    padding: 0.55rem 0.72rem;
    font-size: 0.9rem;
  }

  .login-header h2 {
    font-size: 1.65rem;
  }

  .login-card {
    width: calc(100% - 2rem);
    padding: 1.6rem;
  }

  .social-login-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .social-login-grid {
    grid-template-columns: 1fr;
  }
}

/* ========== Dashboard 布局 - 仿 MyDDE 风格 ========== */
.dashboard-layout {
  display: flex;
  min-height: calc(100vh - 70px);
}

/* 左侧边栏 */
.sidebar {
  width: 240px;
  background: #ffffff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.03);
}

.sidebar-user {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 16px;
  border-bottom: 1px solid #e4e7ed;
  background: #f5f7fa;
}

.sidebar-user .user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  flex: 0 0 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f766e, #2563eb);
  color: #fff;
  font-size: 0.78rem;
  font-weight: 800;
  line-height: 1;
}

.sidebar-user .user-avatar-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.sidebar-user .user-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.sidebar-user .user-name {
  color: #303133;
  font-weight: 600;
  font-size: 14px;
}

.sidebar-user .user-username {
  color: #909399;
  font-size: 12px;
}

/* 导航菜单 */
.sidebar-nav {
  flex: 1;
  padding: 16px 0;
  overflow-y: auto;
}

.nav-section {
  margin-bottom: 24px;
}

.nav-section-title {
  padding: 0 16px;
  margin-bottom: 8px;
  color: #909399;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  color: #606266;
  text-decoration: none;
  font-size: 14px;
  transition: all 0.2s;
  position: relative;
}

.nav-item:hover:not(.disabled) {
  color: #303133;
  background: rgba(64, 158, 255, 0.08);
}

.nav-item.active {
  color: #409eff;
  background: rgba(64, 158, 255, 0.1);
  border-left: 3px solid #409eff;
  font-weight: 500;
}

.nav-item.disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.nav-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.nav-badge {
  margin-left: auto;
  background: #409eff;
  color: #fff;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-left: auto;
}

.status-dot.running {
  background: #4CAF50;
  box-shadow: 0 0 6px rgba(76, 175, 80, 0.6);
}

.coming-soon {
  margin-left: auto;
  font-size: 10px;
  color: #666;
  background: #2a2a2a;
  padding: 2px 6px;
  border-radius: 4px;
}

/* 底部退出按钮 */
.sidebar-footer {
  padding: 16px;
  border-top: 1px solid #e4e7ed;
}

.sidebar-footer .logout-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px;
  background: transparent;
  color: #f56c6c;
  border: 1px solid rgba(245, 108, 108, 0.3);
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.sidebar-footer .logout-btn:hover {
  background: rgba(245, 108, 108, 0.08);
  border-color: #f56c6c;
}

/* 主内容区 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  overflow: hidden;
}

/* 顶部标题栏 */
.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #e4e7ed;
  background: #ffffff;
}

.header-left .page-title {
  color: #303133;
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  padding: 8px 12px;
}

.search-box .search-icon {
  font-size: 14px;
  color: #909399;
}

.search-box input {
  background: transparent;
  border: none;
  color: #303133;
  font-size: 14px;
  outline: none;
  width: 180px;
}

.search-box input::placeholder {
  color: #c0c4cc;
}

.header-btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.create-btn {
  background: #409eff;
  color: #fff;
  border: none;
}

.create-btn:hover {
  background: #66b1ff;
}

/* 内容区域 */
.content-body {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

/* Jupyter 面板 */
.jupyter-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 状态卡片 */
.status-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px;
  background: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.status-card.running {
  border-color: rgba(103, 194, 58, 0.3);
  background: linear-gradient(135deg, #ffffff 0%, rgba(103, 194, 58, 0.05) 100%);
}

.status-card.stopped {
  border-color: #e4e7ed;
}

.status-icon {
  font-size: 40px;
}

.status-info {
  flex: 1;
}

.status-info h3 {
  color: #303133;
  font-size: 16px;
  margin: 0 0 4px 0;
}

.status-info .status-text {
  color: #909399;
  font-size: 14px;
  margin: 0;
}

.status-card.running .status-text {
  color: #67c23a;
}

.status-action .action-btn {
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn.primary {
  background: linear-gradient(135deg, #67c23a, #5daf34);
  color: #fff;
  border: none;
}

.action-btn.primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(103, 194, 58, 0.4);
}

.action-btn.danger {
  background: transparent;
  color: #f56c6c;
  border: 1px solid #f56c6c;
}

.action-btn.danger:hover:not(:disabled) {
  background: rgba(245, 108, 108, 0.08);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 访问信息卡片 */
.access-card {
  padding: 24px;
  background: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.access-card h3 {
  color: #303133;
  font-size: 16px;
  margin: 0 0 16px 0;
}

.access-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.info-label {
  color: #909399;
  font-size: 14px;
  width: 80px;
  flex-shrink: 0;
}

.info-value {
  color: #303133;
  font-size: 14px;
}

.info-value.link {
  color: #409eff;
  text-decoration: none;
}

.info-value.link:hover {
  text-decoration: underline;
}

.info-value.token {
  background: #f5f7fa;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: #606266;
  border: 1px solid #e4e7ed;
}

.copy-btn {
  padding: 4px 12px;
  background: transparent;
  color: #409eff;
  border: 1px solid #409eff;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-btn:hover {
  background: rgba(64, 158, 255, 0.1);
}

.open-jupyter-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #FF9800, #F57C00);
  color: #fff;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.2s;
}

.open-jupyter-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(255, 152, 0, 0.4);
}

/* 统计卡片 */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.stat-icon {
  font-size: 32px;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  color: #303133;
  font-size: 24px;
  font-weight: 700;
}

.stat-label {
  color: #909399;
  font-size: 13px;
}

/* 项目列表面板 */
.projects-panel {
  background: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.table-header {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1.5fr 80px;
  padding: 12px 20px;
  background: #fafafa;
  border-bottom: 1px solid #e4e7ed;
  font-size: 13px;
  font-weight: 600;
  color: #606266;
}

.table-body {
  min-height: 300px;
}

.table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1.5fr 80px;
  padding: 16px 20px;
  border-bottom: 1px solid #ebeef5;
  align-items: center;
  transition: background 0.2s;
}

.table-row:hover {
  background: rgba(64, 158, 255, 0.04);
}

.table-row:last-child {
  border-bottom: none;
}

.col-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-name {
  color: #303133;
  font-weight: 500;
}

.col-type, .col-size, .col-time {
  color: #909399;
  font-size: 14px;
}

.type-badge {
  display: inline-block;
  padding: 4px 10px;
  background: rgba(64, 158, 255, 0.15);
  color: #409eff;
  border-radius: 4px;
  font-size: 12px;
}

.col-action {
  text-align: center;
}

.action-menu-btn {
  background: transparent;
  border: none;
  color: #909399;
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.action-menu-btn:hover {
  background: #f5f7fa;
  color: #303133;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 60px;
  margin-bottom: 16px;
}

.empty-state p {
  color: #909399;
  font-size: 16px;
  margin: 0 0 8px 0;
}

.empty-hint {
  color: #c0c4cc;
  font-size: 14px;
}

.empty-state .action-btn {
  margin-top: 20px;
}

/* 加载动画 */
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ========== Header Tabs ========== */
.header-tabs {
  display: flex;
  gap: 8px;
  margin-left: 24px;
}

.tab-btn {
  padding: 8px 16px;
  background: transparent;
  color: #909399;
  border: none;
  border-bottom: 2px solid transparent;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: #303133;
}

.tab-btn.active {
  color: #409eff;
  border-bottom-color: #409eff;
}

.dropdown-arrow {
  font-size: 10px;
  margin-left: 4px;
}

/* ========== Recent 面板 ========== */
.recent-panel {
  height: 100%;
}

.recent-layout {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 24px;
  height: 100%;
}

.recent-main {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.recent-sidebar {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.recent-section {
  background: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  color: #303133;
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 16px 0;
}

.section-header .section-title {
  margin: 0;
}

.time-filter {
  background: #f5f7fa;
  color: #606266;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
}

/* 快速创建 */
.quick-create-grid {
  display: flex;
  gap: 12px;
}

.quick-create-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  color: #303133;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-create-btn:hover:not(:disabled) {
  background: #ecf5ff;
  border-color: #409eff;
  color: #409eff;
}

.quick-create-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.qc-icon {
  font-size: 18px;
}

/* 最近项目 */
.recent-projects-card {
  min-height: 120px;
}

.empty-recent {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px;
  color: #909399;
}

.empty-icon-box {
  font-size: 40px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-recent p {
  margin: 0;
  font-size: 14px;
}

.recent-projects-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recent-project-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: #fafafa;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.recent-project-item:hover {
  background: #ecf5ff;
  border-color: #409eff;
}

.recent-project-item .project-icon {
  font-size: 20px;
}

.recent-project-item .project-details {
  display: flex;
  flex-direction: column;
}

.recent-project-item .project-name {
  color: #303133;
  font-size: 14px;
}

.recent-project-item .project-time {
  color: #909399;
  font-size: 12px;
}

/* 资源卡片 */
.resources-card {
  min-height: 100px;
}

.empty-resources {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px;
  color: #909399;
}

/* 最近数据 */
.recent-data-card {
  min-height: 120px;
}

/* ========== My Space 面板 ========== */
.myspace-panel {
  height: 100%;
}

/* 新版项目表格样式 */
.projects-table-wrapper {
  background: #ffffff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.projects-table-new {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.projects-table-new thead {
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.projects-table-new th {
  padding: 14px 16px;
  text-align: left;
  font-weight: 600;
  color: #495057;
  font-size: 13px;
  white-space: nowrap;
}

.projects-table-new th.col-name { width: 22%; }
.projects-table-new th.col-desc { width: 30%; }
.projects-table-new th.col-date { width: 15%; }
.projects-table-new th.col-status { width: 12%; }
.projects-table-new th.col-actions { width: 21%; text-align: center; }

.projects-table-new tbody tr {
  border-bottom: 1px solid #f1f3f4;
  transition: background 0.15s ease;
}

.projects-table-new tbody tr:hover {
  background: #f8f9fa;
}

.projects-table-new tbody tr:last-child {
  border-bottom: none;
}

.projects-table-new td {
  padding: 14px 16px;
  vertical-align: middle;
}

.project-name-text {
  color: #202124;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s;
}

.project-name-text:hover {
  color: #1a73e8;
}

.fork-tag {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 6px;
  background: #e8f0fe;
  color: #1a73e8;
  font-size: 11px;
  border-radius: 4px;
}

.case-tag {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 6px;
  background: rgba(47, 108, 246, 0.12);
  color: #2f6cf6;
  font-size: 11px;
  border-radius: 4px;
}

.desc-text {
  color: #5f6368;
  font-size: 13px;
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
}

.col-date {
  color: #5f6368;
  font-size: 13px;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.active {
  background: #e6f4ea;
  color: #1e8e3e;
}

.status-badge.public {
  background: #e8f0fe;
  color: #1a73e8;
}

.status-badge.archived {
  background: #f1f3f4;
  color: #80868b;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.action-icon-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  color: #5f6368;
}

.action-icon-btn svg {
  width: 18px;
  height: 18px;
}

.action-icon-btn:hover {
  background: #f1f3f4;
  color: #202124;
}

.action-icon-btn.danger:hover {
  background: #fce8e6;
  color: #d93025;
}

.empty-row {
  text-align: center;
  padding: 60px 20px !important;
}

.empty-row .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.empty-row .empty-icon {
  font-size: 48px;
  opacity: 0.5;
}

.empty-row .empty-icon-word {
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.65;
}

.empty-row .empty-state p {
  margin: 0;
  color: #5f6368;
}

.empty-row .empty-hint {
  font-size: 13px;
  color: #80868b;
}

.jupyter-page .myspace-directory-shell {
  display: grid;
  gap: 1.05rem;
  padding: 0.25rem 0 0;
}

.jupyter-page .myspace-directory-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
}

.jupyter-page .myspace-directory-intro h2 {
  margin: 0;
  color: #0f1f3d;
  font-family: var(--font-display);
  font-size: clamp(2rem, 2.5vw, 2.7rem);
  font-weight: 900;
  letter-spacing: -0.03em;
}

.jupyter-page .myspace-directory-intro p {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0.5rem 0 0;
  color: #60708a;
  font-size: 0.98rem;
  line-height: 1.5;
}

.jupyter-page .myspace-directory-intro strong {
  color: #172033;
  font-weight: 800;
}

.jupyter-page .myspace-directory-dot {
  color: #91a0b6;
}

.jupyter-page .myspace-directory-utility {
  display: grid;
  justify-items: end;
  gap: 0.9rem;
  max-width: 480px;
}

.jupyter-page .myspace-directory-note {
  margin: 0;
  color: #8a97ab;
  font-size: 0.98rem;
  line-height: 1.45;
  text-align: right;
}

.jupyter-page .myspace-create-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  min-width: 232px;
  height: 58px;
  padding: 0 1.5rem;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #2f6cf6 0%, #245ef0 100%);
  box-shadow: 0 12px 30px rgba(47, 108, 246, 0.2);
  color: #ffffff;
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
}

.jupyter-page .myspace-create-btn svg {
  width: 20px;
  height: 20px;
}

.jupyter-page .myspace-create-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 16px 34px rgba(47, 108, 246, 0.24);
  filter: saturate(1.04);
}

.jupyter-page .myspace-directory-toolbar {
  display: flex;
  justify-content: flex-end;
}

.jupyter-page .myspace-search-box {
  position: relative;
  width: min(100%, 360px);
}

.jupyter-page .myspace-search-box .search-icon {
  position: absolute;
  top: 50%;
  left: 1rem;
  transform: translateY(-50%);
}

.jupyter-page .myspace-search-box input {
  width: 100%;
  min-height: 48px;
  padding: 0 1rem 0 2.8rem;
  border: 1px solid rgba(205, 214, 228, 0.96);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.94);
  color: #14213d;
  font-size: 0.94rem;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.jupyter-page .myspace-search-box input:focus {
  outline: none;
  border-color: rgba(47, 108, 246, 0.4);
  box-shadow: 0 0 0 4px rgba(47, 108, 246, 0.08);
}

.jupyter-page .workspace-project-list {
  display: grid;
  gap: 1rem;
}

.jupyter-page .workspace-project-row {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(300px, 0.92fr) auto;
  align-items: center;
  gap: 1.15rem;
  padding: 1.15rem 1.25rem;
  border: 1px solid rgba(217, 226, 238, 0.95);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 3px 14px rgba(15, 23, 42, 0.04);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.jupyter-page .workspace-project-row:hover {
  border-color: rgba(47, 108, 246, 0.22);
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}

.jupyter-page .workspace-project-main {
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr);
  align-items: center;
  gap: 1rem;
  min-width: 0;
  border: none;
  background: transparent;
  padding: 0;
  text-align: left;
  cursor: pointer;
}

.jupyter-page .myspace-project-mark {
  min-height: 72px;
  padding: 0.7rem 0.5rem;
  border-radius: 14px;
  border: 1px solid rgba(210, 220, 236, 0.95);
  text-align: center;
  justify-items: center;
  align-content: center;
  gap: 0.35rem;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.jupyter-page .myspace-project-mark .project-mark-kicker {
  color: #7b8da8;
  font-size: 0.66rem;
  letter-spacing: 0.08em;
}

.jupyter-page .myspace-project-mark strong {
  color: #2f6cf6;
  font-size: 0.9rem;
  letter-spacing: 0.02em;
}

.jupyter-page .workspace-project-copy {
  min-width: 0;
}

.jupyter-page .workspace-project-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.9rem;
}

.jupyter-page .workspace-project-title-row h3 {
  margin: 0;
  color: #172033;
  font-family: var(--font-display);
  font-size: 0.98rem;
  font-weight: 900;
  line-height: 1.3;
}

.jupyter-page .myspace-panel .project-chip-row {
  gap: 0.4rem;
}

.jupyter-page .myspace-panel .project-meaning-badge {
  min-height: 28px;
  padding: 0 0.7rem;
  border-radius: 8px;
  border: 1px solid rgba(174, 190, 214, 0.78);
  background: #f8fbff;
  color: #5f738f;
  font-size: 0.71rem;
  letter-spacing: 0.05em;
}

.jupyter-page .myspace-panel .project-meaning-badge.public {
  border-color: rgba(31, 170, 114, 0.24);
  background: rgba(31, 170, 114, 0.08);
  color: #0f8a5b;
}

.jupyter-page .myspace-panel .project-meaning-badge.private {
  border-color: rgba(47, 108, 246, 0.36);
  background: rgba(47, 108, 246, 0.06);
  color: #2f5dbf;
}

.jupyter-page .myspace-panel .project-meaning-badge.case {
  border-color: rgba(245, 158, 11, 0.32);
  background: rgba(245, 158, 11, 0.07);
  color: #a16207;
}

.jupyter-page .myspace-panel .project-meaning-badge.fork {
  border-color: rgba(47, 108, 246, 0.42);
  background: rgba(47, 108, 246, 0.04);
  color: #245ef0;
}

.jupyter-page .workspace-project-summary {
  display: -webkit-box;
  margin: 0.42rem 0 0;
  overflow: hidden;
  color: #5e6e86;
  font-size: 0.84rem;
  line-height: 1.45;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

.jupyter-page .workspace-project-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(88px, 1fr));
  align-items: stretch;
  gap: 0;
  min-width: 0;
  padding-left: 1rem;
  border-left: 1px solid rgba(222, 229, 239, 0.9);
}

.jupyter-page .workspace-metric {
  display: grid;
  gap: 0.3rem;
  min-width: 0;
  padding: 0 0.75rem;
}

.jupyter-page .workspace-metric span {
  color: #8a99ad;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.jupyter-page .workspace-metric strong {
  color: #172033;
  font-size: 0.92rem;
  font-weight: 800;
  line-height: 1.35;
}

.jupyter-page .workspace-actions {
  justify-content: flex-start;
  gap: 0.42rem;
  padding-left: 1rem;
  border-left: 1px solid rgba(222, 229, 239, 0.9);
}

.jupyter-page .workspace-actions .action-icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
}

.jupyter-page .workspace-empty {
  padding: 1rem 0 0;
  border: 1px dashed rgba(205, 214, 228, 0.96);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.72);
}

/* 保留旧样式用于其他表格 */
.projects-table, .data-table {
  background: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.table-header {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1.5fr 80px;
  padding: 12px 20px;
  background: #fafafa;
  border-bottom: 1px solid #e4e7ed;
  font-size: 13px;
  font-weight: 600;
  color: #606266;
}

.table-body {
  min-height: 300px;
}

.table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1.5fr 80px;
  padding: 14px 20px;
  border-bottom: 1px solid #ebeef5;
  align-items: center;
  transition: background 0.2s;
}

.table-row:hover {
  background: rgba(64, 158, 255, 0.04);
}

.table-row:last-child {
  border-bottom: none;
}

.col-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-name {
  color: #409eff;
  font-weight: 500;
  text-decoration: none;
}

.file-name:hover {
  text-decoration: underline;
}

.col-type, .col-size, .col-time, .col-partition {
  color: #909399;
  font-size: 14px;
}

.type-badge {
  display: inline-block;
  padding: 4px 10px;
  background: rgba(64, 158, 255, 0.15);
  color: #409eff;
  border-radius: 4px;
  font-size: 12px;
}

.partition-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
}

.partition-badge.running {
  background: rgba(103, 194, 58, 0.15);
  color: #67c23a;
}

.partition-text {
  color: #909399;
}

.col-action {
  text-align: center;
  position: relative;
}

/* 操作下拉菜单 */
.action-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 8px 0;
  min-width: 140px;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.action-dropdown button {
  display: block;
  width: 100%;
  padding: 10px 16px;
  background: transparent;
  border: none;
  color: #606266;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s;
}

.action-dropdown button:hover {
  background: #f5f7fa;
}

.action-dropdown button.danger {
  color: #f56c6c;
}

/* ========== Jupyter 浮动状态栏 ========== */
.jupyter-floating-bar {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  background: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.floating-info {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #303133;
  font-size: 14px;
}

.floating-info .status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #67c23a;
  box-shadow: 0 0 6px rgba(103, 194, 58, 0.6);
}

.project-tag {
  padding: 2px 8px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 12px;
  color: #606266;
  border: 1px solid #e4e7ed;
}

.floating-actions {
  display: flex;
  gap: 8px;
}

.floating-btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}

.floating-btn.open {
  background: #409eff;
  color: #fff;
  border: none;
}

.floating-btn.open:hover {
  background: #66b1ff;
}

.floating-btn.stop {
  background: transparent;
  color: #f56c6c;
  border: 1px solid #f56c6c;
}

.floating-btn.stop:hover:not(:disabled) {
  background: rgba(245, 108, 108, 0.08);
}

.floating-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: #ffffff;
  border-radius: 12px;
  width: 90%;
  max-width: 480px;
  border: none;
  box-shadow: 0 8px 32px rgba(0,0,0,0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e4e7ed;
  background: linear-gradient(135deg, #000000, #1a1a1a);
  border-radius: 12px 12px 0 0;
}

.modal-header h2 {
  font-size: 1.2rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 1.5rem;
  cursor: pointer;
  line-height: 1;
  padding: 0;
}

.close-btn:hover {
  color: #ffffff;
}

.modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #606266;
  font-size: 0.9rem;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 12px 16px;
  background: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  color: #303133;
  font-size: 0.95rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #409eff;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1);
}

.form-group input::placeholder,
.form-group textarea::placeholder {
  color: #c0c4cc;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e4e7ed;
}

.btn-cancel {
  padding: 10px 20px;
  background: transparent;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  color: #606266;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.btn-cancel:hover {
  border-color: #909399;
  color: #303133;
}

.btn-create {
  padding: 10px 24px;
  background: linear-gradient(135deg, #409eff, #2d8cf0);
  border: none;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-create:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.btn-create:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Case 发布面板样式 */
.case-publish-modal {
  max-width: 780px !important;
}

.case-publish-body {
  max-height: 65vh;
  overflow-y: auto;
}

.case-publish-hint {
  margin: 0 0 18px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.5;
  padding: 10px 14px;
  background: #f0f6ff;
  border-radius: 8px;
  border-left: 3px solid #3b82f6;
}

.case-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 24px;
}

.case-form-col .form-group {
  margin-bottom: 16px;
}

.case-form-col .form-group label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.case-form-col .form-group label .required {
  color: #ef4444;
  font-weight: 600;
}

.case-form-col .form-group label .field-hint {
  font-weight: 400;
  color: #94a3b8;
  font-size: 11px;
}

.case-form-col .form-group input,
.case-form-col .form-group textarea {
  width: 100%;
  padding: 9px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 7px;
  color: #1e293b;
  font-size: 13px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.case-form-col .form-group input:focus,
.case-form-col .form-group textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  background: #fff;
}

.case-form-col .form-group textarea {
  resize: vertical;
  min-height: 60px;
}

@media (max-width: 640px) {
  .case-form-grid {
    grid-template-columns: 1fr;
  }
  .case-publish-modal {
    max-width: 95% !important;
  }
}

/* 表格列宽调整 */
.col-notebooks,
.col-files {
  width: 100px;
  text-align: center;
}

.notebook-count {
  color: #f59e0b;
}

.file-count {
  color: #888;
}

/* ========== My Model / My Data Method 面板样式 ========== */
.mymodel-panel,
.mydatamethod-panel {
  padding: 0;
}

.panel-toolbar {
  display: flex;
  justify-content: flex-start;
  padding: 16px 0;
  margin-bottom: 16px;
  border-bottom: 1px solid #e4e7ed;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #409eff, #2d8cf0);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.add-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.saved-model-header {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-bottom: 1.25rem;
}

.saved-model-header .add-btn {
  min-height: 46px;
  padding: 0 1rem;
  border: 1px solid #c8d2ea;
  border-radius: 5px;
  background: #e6ebfb;
  box-shadow: none;
  color: #171d31;
  font-size: 0.86rem;
  font-weight: 900;
  letter-spacing: 0;
}

.saved-model-header .add-btn:hover {
  transform: none;
  box-shadow: none;
  filter: brightness(0.98);
}

.saved-model-list {
  min-height: 300px;
}

.saved-model-rows {
  display: grid;
  gap: 0.85rem;
}

.saved-model-row {
  display: grid;
  grid-template-columns: 72px minmax(0, 1.18fr) minmax(360px, 0.72fr) 78px;
  align-items: center;
  gap: 1.25rem;
  min-height: 116px;
  padding: 1.05rem 1.3rem;
  border: 1px solid #cfd4e5;
  border-radius: 5px;
  background: transparent;
  box-shadow: none;
  cursor: pointer;
  transition: border-color 0.16s ease, background-color 0.16s ease;
}

.saved-model-row:hover {
  border-color: #aab5d8;
  background: rgba(255, 255, 255, 0.35);
  box-shadow: none;
  transform: none;
}

.saved-model-row.disabled {
  cursor: default;
  opacity: 0.72;
}

.saved-model-row.disabled:hover {
  border-color: #cfd4e5;
  background: transparent;
}

.saved-model-mark {
  width: 72px;
  height: 72px;
  min-height: 72px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #cfd7ea;
  border-radius: 5px;
  background: transparent;
  color: #171d31;
}

.saved-model-mark span {
  font-size: 1rem;
  font-weight: 900;
  letter-spacing: 0;
}

.saved-model-main {
  min-width: 0;
  border: none;
  padding: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.saved-model-name-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem;
}

.saved-model-name-line h3 {
  margin: 0;
  color: #171d31;
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 900;
  line-height: 1.25;
  letter-spacing: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.saved-model-statuses,
.saved-model-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.saved-model-chip {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 0.68rem;
  border: 1px solid #cbd2e5;
  border-radius: 3px;
  background: transparent;
  color: #2f6cf6;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.saved-model-chip.public,
.saved-model-chip.deployed,
.saved-model-chip.online {
  background: transparent;
  color: #2f6cf6;
}

.saved-model-description {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  margin: 0.45rem 0 0;
  overflow: hidden;
  color: #4f5668;
  font-size: 0.92rem;
  line-height: 1.35;
}

.saved-model-tags {
  gap: 0.45rem;
  margin-top: 0.72rem;
}

.saved-model-tags span {
  border: 1px solid #d9dce8;
  border-radius: 3px;
  padding: 0.16rem 0.48rem;
  color: #646978;
  font-size: 0.72rem;
  font-weight: 800;
}

.saved-model-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(68px, 1fr));
  align-items: stretch;
  gap: 0;
  min-width: 0;
  padding-left: 1.1rem;
  border-left: 1px solid #d9dce8;
}

.saved-model-metric {
  display: grid;
  gap: 0.3rem;
  min-width: 0;
  padding: 0 0.75rem;
}

.saved-model-metric span {
  color: #8b95a8;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0;
  text-transform: none;
}

.saved-model-metric strong {
  overflow: hidden;
  color: #171d31;
  font-family: var(--font-display);
  font-size: 0.86rem;
  font-weight: 900;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.saved-model-actions {
  display: flex;
  align-items: center;
  gap: 0.34rem;
  padding-left: 1rem;
  border-left: 1px solid #d9dce8;
}

.saved-model-open-btn,
.saved-model-remove-btn {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: #4f5668;
  font-family: var(--font-display);
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;
}

.saved-model-open-btn svg,
.saved-model-remove-btn svg {
  width: 17px;
  height: 17px;
}

.saved-model-open-btn:hover,
.saved-model-remove-btn:hover {
  border-color: #c8d2ea;
  background: #e6ebfb;
  color: #171d31;
}

.saved-model-open-btn:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.resource-list {
  min-height: 300px;
}

.resource-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.resource-card {
  background: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.resource-card:hover {
  border-color: #409eff;
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.1);
}

.resource-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.resource-icon {
  font-size: 1.5rem;
}

.resource-name {
  font-size: 1rem;
  font-weight: 600;
  color: #303133;
  margin: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resource-desc {
  font-size: 0.85rem;
  color: #909399;
  margin: 0 0 16px 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.5em;
}

.resource-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #e4e7ed;
}

.resource-meta {
  font-size: 0.8rem;
  color: #909399;
}

.resource-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.action-btn.run {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

.action-btn.run:hover {
  background: rgba(16, 185, 129, 0.3);
}

.action-btn.remove {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.action-btn.remove:hover {
  background: rgba(239, 68, 68, 0.3);
}

/* ========== 选择器模态框样式 ========== */
.selector-modal {
  max-width: 700px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.selector-modal .modal-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 16px 24px;
}

.selector-search {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.selector-search input {
  flex: 1;
  padding: 10px 14px;
  background: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  color: #303133;
  font-size: 0.95rem;
}

.selector-search input:focus {
  outline: none;
  border-color: #409eff;
}

.selector-search button {
  padding: 10px 16px;
  background: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  color: #606266;
  cursor: pointer;
  transition: all 0.2s;
}

.selector-search button:hover {
  background: #ecf5ff;
  border-color: #409eff;
  color: #409eff;
}

.selector-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #909399;
}

.selector-loading .spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e4e7ed;
  border-top-color: #409eff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.selector-list {
  flex: 1;
  overflow-y: auto;
  max-height: 400px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
}

.selector-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #ebeef5;
  transition: background 0.2s;
}

.selector-item:last-child {
  border-bottom: none;
}

.selector-item:hover {
  background: rgba(64, 158, 255, 0.04);
}

.selector-item.added {
  opacity: 0.7;
}

.item-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.item-icon {
  font-size: 1.3rem;
  flex-shrink: 0;
}

.item-details {
  flex: 1;
  min-width: 0;
}

.item-details h4 {
  font-size: 0.95rem;
  font-weight: 500;
  color: #303133;
  margin: 0 0 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-details p {
  font-size: 0.8rem;
  color: #909399;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.add-item-btn {
  padding: 6px 14px;
  background: linear-gradient(135deg, #409eff, #2d8cf0);
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}

.add-item-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

.add-item-btn:disabled {
  background: #f5f7fa;
  color: #c0c4cc;
  cursor: not-allowed;
}

.empty-selector {
  padding: 40px;
  text-align: center;
  color: #909399;
}

.selector-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding-top: 16px;
  margin-top: 16px;
  border-top: 1px solid #e4e7ed;
}

.selector-pagination button {
  padding: 8px 16px;
  background: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  color: #606266;
  cursor: pointer;
  transition: all 0.2s;
}

.selector-pagination button:hover:not(:disabled) {
  background: #ecf5ff;
  border-color: #409eff;
  color: #409eff;
}

.selector-pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.selector-pagination span {
  color: #909399;
  font-size: 0.9rem;
}

/* ========== 创建项目复选框样式 ========== */
.checkbox-group {
  margin-top: 16px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.checkbox-label input[type="checkbox"] {
  display: none;
}

.checkbox-custom {
  width: 18px;
  height: 18px;
  border: 2px solid #dcdfe6;
  border-radius: 4px;
  margin-right: 10px;
  position: relative;
  transition: all 0.2s;
}

.checkbox-label input[type="checkbox"]:checked + .checkbox-custom {
  background: #409eff;
  border-color: #409eff;
}

.checkbox-label input[type="checkbox"]:checked + .checkbox-custom::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #ffffff;
  font-size: 12px;
  font-weight: bold;
}

.checkbox-text {
  color: #303133;
  font-size: 0.95rem;
}

.checkbox-hint {
  margin-top: 8px;
  margin-left: 28px;
  color: #909399;
  font-size: 0.85rem;
}

/* ========== Environments 面板样式 ========== */
.environments-panel {
  padding: 0;
}

.env-panel-header {
  margin-bottom: 32px;
}

.env-panel-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
}

.env-panel-desc {
  color: #909399;
  font-size: 0.9rem;
  margin: 0;
}

/* 新版环境卡片网格 */
.env-cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 32px;
}

@media (max-width: 900px) {
  .env-cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .env-cards-grid {
    grid-template-columns: 1fr;
  }
}

.env-card-new {
  position: relative;
  background: #ffffff;
  border: 2px solid #e4e7ed;
  border-radius: 12px;
  padding: 24px 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.env-card-new:hover {
  border-color: #c0c4cc;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.env-card-new.selected {
  border-color: #2e7d32;
  background: linear-gradient(to bottom, rgba(46, 125, 50, 0.03), #ffffff);
}

.env-card-check {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 24px;
  height: 24px;
  background: #2e7d32;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.env-card-check svg {
  width: 16px;
  height: 16px;
}

.env-card-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.env-card-icon svg {
  width: 32px;
  height: 32px;
}

.env-card-icon.geo-standard {
  background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
  color: #2e7d32;
}

.env-card-icon.deep-learning {
  background: linear-gradient(135deg, #fff3e0, #ffe0b2);
  color: #e65100;
}

.env-card-icon.hydrology {
  background: linear-gradient(135deg, #e3f2fd, #bbdefb);
  color: #1565c0;
}

.env-card-title {
  font-size: 1rem;
  font-weight: 600;
  color: #303133;
  margin: 0 0 6px 0;
}

.env-card-desc {
  font-size: 0.8rem;
  color: #909399;
  margin: 0;
  line-height: 1.4;
}

.env-launch-section {
  text-align: left;
}

.launch-jupyter-btn {
  padding: 12px 28px;
  background: #2e7d32;
  border: none;
  border-radius: 6px;
  color: #ffffff;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.launch-jupyter-btn:hover:not(:disabled) {
  background: #1b5e20;
  box-shadow: 0 4px 12px rgba(46, 125, 50, 0.3);
}

.launch-jupyter-btn:disabled {
  background: #c8e6c9;
  cursor: not-allowed;
}

/* 保留旧样式用于兼容 */
.panel-intro {
  padding: 16px 0;
  margin-bottom: 24px;
  border-bottom: 1px solid #e4e7ed;
}

.panel-intro p {
  color: #909399;
  font-size: 0.95rem;
  margin: 0;
}

/* 区域标题 */
.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.1rem;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
}

.title-icon {
  font-size: 1.2rem;
}

.section-desc {
  color: #909399;
  font-size: 0.85rem;
  margin: 0 0 20px 0;
}

/* 默认环境区域 */
.default-env-section {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e4e7ed;
}

.default-env-wrapper {
  max-width: 360px;
}

.no-default {
  padding: 24px;
  background: #fafafa;
  border: 1px dashed #dcdfe6;
  border-radius: 12px;
  text-align: center;
  color: #909399;
  max-width: 360px;
}

.no-default p {
  margin: 0;
}

/* 所有环境区域 */
.all-env-section {
  margin-bottom: 32px;
}

.environments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.environment-card {
  background: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s;
  position: relative;
  cursor: default;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.environment-card:hover {
  border-color: #409eff;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(64, 158, 255, 0.1);
}

.environment-card.is-default {
  border-color: #67c23a;
  background: linear-gradient(145deg, rgba(103, 194, 58, 0.05), #ffffff);
}

.environment-card.unavailable {
  opacity: 0.6;
}

.environment-card.unavailable:hover {
  transform: none;
  box-shadow: none;
}

.env-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.env-icon {
  font-size: 2rem;
}

.env-badges {
  display: flex;
  gap: 8px;
}

.badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 500;
}

.badge.default {
  background: rgba(103, 194, 58, 0.2);
  color: #67c23a;
}

.badge.unavailable {
  background: rgba(245, 108, 108, 0.2);
  color: #f56c6c;
}

.environment-card .env-name {
  font-size: 1rem;
  font-weight: 600;
  color: #303133;
  margin: 0 0 6px 0;
}

.environment-card .env-description {
  font-size: 0.8rem;
  color: #909399;
  margin: 0 0 12px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.env-details {
  margin-bottom: 12px;
  padding: 10px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-label {
  font-size: 0.8rem;
  color: #909399;
}

.detail-value {
  font-size: 0.85rem;
  color: #606266;
  font-weight: 500;
}

.env-features {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
  min-height: 28px;
}

.feature-tag {
  padding: 4px 10px;
  background: rgba(64, 158, 255, 0.1);
  border: 1px solid rgba(64, 158, 255, 0.2);
  border-radius: 12px;
  font-size: 0.75rem;
  color: #409eff;
}

.env-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #e4e7ed;
  min-height: 36px;
}

.env-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: #909399;
}

.status-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-indicator.available {
  background: #67c23a;
  box-shadow: 0 0 6px rgba(103, 194, 58, 0.5);
}

.status-indicator.unavailable {
  background: #909399;
}

.set-default-btn {
  padding: 6px 14px;
  background: linear-gradient(135deg, #f39c12, #e67e22);
  border: none;
  border-radius: 16px;
  color: #fff;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  animation: fadeIn 0.2s ease;
}

.set-default-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(243, 156, 18, 0.4);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateX(10px); }
  to { opacity: 1; transform: translateX(0); }
}

.environments-footer {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #e4e7ed;
}

.environments-footer .hint {
  color: #909399;
  font-size: 0.85rem;
  margin: 0;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #909399;
}

.loading-state .spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e4e7ed;
  border-top-color: #409eff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ========== My Data 网盘风格样式 ========== */
.mydata-panel.netdisk-style {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0;
}

.netdisk-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid #e4e7ed;
  flex-wrap: wrap;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 14px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  color: #334155;
  font-size: 0.84rem;
  font-weight: 850;
  cursor: pointer;
  transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
}

.toolbar-btn:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #94a3b8;
  color: #0f172a;
}

.toolbar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toolbar-btn.primary {
  background: #0f172a;
  border-color: #0f172a;
  color: #ffffff;
}

.toolbar-btn.primary:hover {
  background: #111827;
  border-color: #111827;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.14);
}

.toolbar-btn.upload {
  background: #0f172a;
  border-color: #0f172a;
  color: #ffffff;
}

.toolbar-btn.upload:hover {
  background: #111827;
  border-color: #111827;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.14);
}

.toolbar-btn .btn-icon {
  font-size: 1rem;
}

.current-path {
  margin-left: auto;
  padding: 8px 16px;
  background: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  color: #606266;
  font-family: var(--font-mono);
  font-size: 0.85rem;
}

.netdisk-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  margin: 16px 0;
  min-height: 400px;
  border: 1px solid #d8dee9;
  box-shadow: none;
}

.netdisk-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
  align-content: start;
  padding: 4px;
}

.netdisk-card {
  min-width: 0;
  min-height: 168px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  border: 1px solid #d8dee9;
  border-radius: 8px;
  background: #ffffff;
  cursor: pointer;
  position: relative;
  user-select: none;
  transition: border-color 0.16s ease, background-color 0.16s ease, box-shadow 0.16s ease;
}

.netdisk-card:hover {
  border-color: #b7c2d6;
  background: #fdfefe;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06);
}

.netdisk-card.selected {
  border-color: #94a3b8;
  background: #f8fafc;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06);
}

.netdisk-card:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.netdisk-card-preview {
  position: relative;
  height: 78px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid #d8dee9;
  border-radius: 6px;
  background: #eef2ff;
}

.netdisk-card--raster .netdisk-card-preview {
  background-color: #f8fafc;
  background-image:
    linear-gradient(45deg, #dbe4f3 25%, transparent 25%),
    linear-gradient(-45deg, #dbe4f3 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #dbe4f3 75%),
    linear-gradient(-45deg, transparent 75%, #dbe4f3 75%);
  background-position: 0 0, 0 8px, 8px -8px, -8px 0;
  background-size: 16px 16px;
}

.netdisk-card--code .netdisk-card-preview {
  border-color: #27374a;
  background: #1d2a3a;
}

.netdisk-card--table .netdisk-card-preview,
.netdisk-card--vector .netdisk-card-preview,
.netdisk-card--dataset .netdisk-card-preview {
  background: #f3f6fb;
}

.netdisk-card-badge {
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 2;
  min-height: 17px;
  padding: 0 5px;
  border: 1px solid #cbd5e1;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.86);
  color: #475569;
  font-size: 0.55rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  line-height: 17px;
  text-transform: uppercase;
}

.netdisk-card--code .netdisk-card-badge {
  border-color: rgba(203, 213, 225, 0.28);
  background: rgba(15, 23, 42, 0.28);
  color: #dbe4f0;
}

.netdisk-card-menu {
  position: absolute;
  top: 5px;
  right: 5px;
  z-index: 3;
  width: 24px;
  height: 24px;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border: 1px solid transparent;
  border-radius: 5px;
  background: transparent;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.16s ease, background-color 0.16s ease, border-color 0.16s ease;
}

.netdisk-card:hover .netdisk-card-menu,
.netdisk-card-menu:focus-visible {
  opacity: 1;
}

.netdisk-card-menu:hover {
  border-color: #cbd5e1;
  background: rgba(255, 255, 255, 0.8);
}

.netdisk-card-menu span {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #475569;
}

.netdisk-card--code .netdisk-card-menu span {
  background: #dbe4f0;
}

.netdisk-card-visual {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
}

.folder-glyph {
  position: relative;
  width: 34px;
  height: 24px;
  border-radius: 4px;
  background: #1456d9;
}

.folder-glyph::before {
  content: '';
  position: absolute;
  top: -7px;
  left: 3px;
  width: 16px;
  height: 8px;
  border-radius: 4px 4px 0 0;
  background: #1456d9;
}

.code-glyph {
  width: 76px;
  display: grid;
  gap: 7px;
}

.code-glyph i {
  display: block;
  height: 4px;
  border-radius: 999px;
  background: #96a5b8;
}

.code-glyph i:nth-child(1) {
  width: 46px;
}

.code-glyph i:nth-child(2) {
  width: 64px;
}

.code-glyph i:nth-child(3) {
  width: 74px;
  background: #b9c9ff;
}

.table-glyph,
.dataset-glyph,
.vector-glyph,
.raster-glyph {
  position: relative;
  width: 48px;
  height: 34px;
  border: 1px solid #aeb9ca;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.66);
}

.table-glyph {
  background-image:
    linear-gradient(#cbd5e1 1px, transparent 1px),
    linear-gradient(90deg, #cbd5e1 1px, transparent 1px);
  background-size: 100% 11px, 16px 100%;
}

.raster-glyph::before {
  content: '';
  position: absolute;
  left: 11px;
  right: 11px;
  bottom: 8px;
  height: 10px;
  border-radius: 12px 12px 3px 3px;
  background: #94a3b8;
  clip-path: polygon(0 100%, 35% 35%, 55% 70%, 72% 45%, 100% 100%);
}

.raster-glyph i {
  position: absolute;
  width: 5px;
  height: 5px;
  top: 9px;
  right: 12px;
  border-radius: 50%;
  background: #94a3b8;
}

.vector-glyph i,
.dataset-glyph i {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #64748b;
}

.vector-glyph i:nth-child(1),
.dataset-glyph i:nth-child(1) {
  left: 10px;
  top: 9px;
}

.vector-glyph i:nth-child(2),
.dataset-glyph i:nth-child(2) {
  right: 11px;
  top: 12px;
}

.vector-glyph i:nth-child(3),
.dataset-glyph i:nth-child(3) {
  left: 22px;
  bottom: 8px;
}

.vector-glyph::before {
  content: '';
  position: absolute;
  left: 15px;
  top: 13px;
  width: 22px;
  height: 11px;
  border-top: 1px solid #64748b;
  border-bottom: 1px solid #64748b;
  transform: rotate(9deg);
}

.dataset-glyph::before,
.dataset-glyph::after {
  content: '';
  position: absolute;
  left: 9px;
  right: 9px;
  height: 1px;
  background: #cbd5e1;
}

.dataset-glyph::before {
  top: 15px;
}

.dataset-glyph::after {
  top: 22px;
}

.netdisk-card-body {
  min-width: 0;
}

.netdisk-card-body h3 {
  margin: 0;
  color: #0f172a;
  font-size: 0.78rem;
  font-weight: 850;
  line-height: 1.35;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.netdisk-card-body p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.netdisk-statusbar {
  display: flex;
  gap: 24px;
  padding: 12px 0;
  border-top: 1px solid #e4e7ed;
  font-size: 0.85rem;
  color: #909399;
}

.netdisk-statusbar .storage-info {
  margin-left: auto;
}

/* 右键菜单 */
.context-menu {
  position: fixed;
  background: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
  z-index: 1000;
  min-width: 150px;
  overflow: hidden;
}

.context-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  color: #606266;
  cursor: pointer;
  transition: background 0.2s;
}

.context-item:hover {
  background: rgba(64, 158, 255, 0.08);
}

.context-item.danger {
  color: #f56c6c;
}

.context-item.danger:hover {
  background: rgba(245, 108, 108, 0.08);
}

/* 加载状态样式调整 */
.loading-state.compact {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: center;
}

.empty-state.compact {
  padding: 20px;
  text-align: center;
}

/* ========== My Data 面板样式 ========== */
.mydata-panel {
  padding: 0;
}

.data-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.data-card {
  background: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.data-card:hover {
  border-color: #409eff;
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.1);
}

.data-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.data-icon {
  font-size: 1.8rem;
}

.data-name {
  font-size: 1rem;
  font-weight: 600;
  color: #303133;
  margin: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.data-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.data-size, .data-type {
  font-size: 0.8rem;
  color: #909399;
  padding: 2px 8px;
  background: #f5f7fa;
  border-radius: 4px;
}

.data-desc {
  font-size: 0.85rem;
  color: #909399;
  margin: 0 0 16px 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.5em;
}

.data-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #e4e7ed;
}

.data-time {
  font-size: 0.8rem;
  color: #c0c4cc;
}

.data-actions {
  display: flex;
  gap: 8px;
}

.action-btn.download {
  background: rgba(64, 158, 255, 0.2);
  color: #409eff;
}

.action-btn.download:hover {
  background: rgba(64, 158, 255, 0.3);
}

/* ========== My Data 列表样式 ========== */
.mydata-panel .panel-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.mydata-panel .data-stats {
  color: #909399;
  font-size: 0.9rem;
}

.data-list-container {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e4e7ed;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.data-list-header {
  display: grid;
  grid-template-columns: 2fr 100px 100px 140px 100px;
  gap: 12px;
  padding: 12px 20px;
  background: #fafafa;
  border-bottom: 1px solid #e4e7ed;
  font-size: 0.85rem;
  font-weight: 500;
  color: #606266;
}

.data-list {
  max-height: calc(100vh - 380px);
  overflow-y: auto;
}

.data-list-item {
  display: grid;
  grid-template-columns: 2fr 100px 100px 140px 100px;
  gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid #ebeef5;
  align-items: center;
  transition: background 0.2s;
}

.data-list-item:hover {
  background: rgba(64, 158, 255, 0.04);
}

.data-list-item:last-child {
  border-bottom: none;
}

.data-list-item .col-name {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.data-list-item .data-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.data-list-item .data-name-wrapper {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.data-list-item .data-name {
  font-size: 0.95rem;
  color: #303133;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.data-list-item .data-desc {
  font-size: 0.8rem;
  color: #909399;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.data-list-item .col-type {
  text-align: center;
}

.data-list-item .type-tag {
  display: inline-block;
  padding: 3px 10px;
  background: rgba(64, 158, 255, 0.1);
  border: 1px solid rgba(64, 158, 255, 0.2);
  border-radius: 12px;
  font-size: 0.75rem;
  color: #64b5f6;
  text-transform: uppercase;
}

.data-list-item .col-size {
  color: #909399;
  font-size: 0.85rem;
  text-align: center;
}

.data-list-item .col-time {
  color: #c0c4cc;
  font-size: 0.85rem;
  text-align: center;
}

.data-list-item .col-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.data-list-item .action-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  font-size: 1rem;
}

.data-list-item .action-btn.download {
  background: rgba(103, 194, 58, 0.1);
  color: #67c23a;
}

.data-list-item .action-btn.download:hover {
  background: rgba(103, 194, 58, 0.2);
}

.data-list-item .action-btn.remove {
  background: rgba(245, 108, 108, 0.1);
  color: #f56c6c;
}

.data-list-item .action-btn.remove:hover {
  background: rgba(245, 108, 108, 0.2);
}

/* 分页样式 */
.data-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid #e4e7ed;
  background: #fafafa;
}

.data-pagination .page-btn {
  padding: 6px 12px;
  background: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  color: #606266;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.data-pagination .page-btn:hover:not(:disabled) {
  background: #ecf5ff;
  border-color: #409eff;
  color: #409eff;
}

.data-pagination .page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.data-pagination .page-numbers {
  display: flex;
  gap: 4px;
}

.data-pagination .page-num {
  width: 32px;
  height: 32px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: transparent;
  color: #909399;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.data-pagination .page-num:hover {
  background: #f5f7fa;
  color: #303133;
}

.data-pagination .page-num.active {
  background: #409eff;
  border-color: #409eff;
  color: #fff;
}

.data-pagination .page-info {
  margin-left: 12px;
  color: #909399;
  font-size: 0.85rem;
}

/* ========== OpenGeoLab-Jupyter Visual Refresh ========== */
.jupyter-page {
  min-height: 100vh;
  font-family: var(--font-sans);
  background:
    radial-gradient(circle at top left, rgba(213, 227, 255, 0.5), transparent 32%),
    linear-gradient(180deg, #f8f9fa 0%, #eef1f4 100%);
  color: var(--primary-strong);
}

.jupyter-page .jupyter-nav {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  min-height: 58px;
  padding: 0.55rem 1.1rem;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  box-shadow: 0 18px 34px rgba(var(--primary-rgb), 0.06);
}

.jupyter-page .nav-left,
.jupyter-page .nav-right {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.jupyter-page .brand-wordmark {
  color: var(--primary-strong);
  text-decoration: none;
  font-size: 1.55rem;
  font-weight: 800;
  letter-spacing: -0.04em;
}

.jupyter-page .back-home-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 0.95rem;
  border-radius: 999px;
  background: rgba(243, 244, 245, 0.95);
  color: var(--primary-strong);
  text-decoration: none;
  font-family: var(--font-display);
  font-weight: 700;
}

.jupyter-page .workspace-avatar {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f766e, #2563eb);
  color: #fff;
  font-family: var(--font-display);
  font-size: 0.78rem;
  font-weight: 800;
  line-height: 1;
  box-shadow: 0 12px 20px rgba(var(--primary-rgb), 0.12);
}

.jupyter-page .workspace-avatar-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.jupyter-page .icon-history { --icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 12a9 9 0 1 0 3-6.708'/%3E%3Cpath d='M3 4v5h5'/%3E%3Cpath d='M12 7v5l3 2'/%3E%3C/svg%3E"); }
.jupyter-page .icon-folder-shared { --icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z'/%3E%3Cpath d='M16 19v-1a3 3 0 0 0-6 0v1'/%3E%3Ccircle cx='13' cy='12' r='2'/%3E%3C/svg%3E"); }
.jupyter-page .icon-group { --icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='9.5' cy='7' r='3'/%3E%3Cpath d='M22 21v-2a4 4 0 0 0-3-3.87'/%3E%3Cpath d='M16 4.13a4 4 0 0 1 0 7.75'/%3E%3C/svg%3E"); }
.jupyter-page .icon-library { --icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/%3E%3Cpath d='M14 2v6h6'/%3E%3Cpath d='M8 13h8'/%3E%3Cpath d='M8 17h5'/%3E%3C/svg%3E"); }
.jupyter-page .icon-model { --icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 3l8 4.5v9L12 21 4 16.5v-9L12 3z'/%3E%3Cpath d='M12 12l8-4.5'/%3E%3Cpath d='M12 12v9'/%3E%3Cpath d='M12 12L4 7.5'/%3E%3C/svg%3E"); }
.jupyter-page .icon-database { --icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cellipse cx='12' cy='5' rx='7' ry='3'/%3E%3Cpath d='M5 5v14c0 1.66 3.13 3 7 3s7-1.34 7-3V5'/%3E%3Cpath d='M5 12c0 1.66 3.13 3 7 3s7-1.34 7-3'/%3E%3C/svg%3E"); }
.jupyter-page .icon-method { --icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 7h16'/%3E%3Cpath d='M4 12h10'/%3E%3Cpath d='M4 17h13'/%3E%3C/svg%3E"); }
.jupyter-page .icon-settings { --icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='3'/%3E%3Cpath d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 1 1 4.39 16.96l.06-.06A1.65 1.65 0 0 0 4.78 15a1.65 1.65 0 0 0-1.51-1H3.18a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 1 1 7.22 4.3l.06.06A1.65 1.65 0 0 0 9.1 4.03 1.65 1.65 0 0 0 10.1 2.52V2.4a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06A2 2 0 1 1 19.8 7.1l-.06.06A1.65 1.65 0 0 0 19.41 9c.2.63.8 1.05 1.46 1.05H21a2 2 0 1 1 0 4h-.09c-.66 0-1.25.42-1.51 1.05z'/%3E%3C/svg%3E"); }
.jupyter-page .icon-signout { --icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'/%3E%3Cpath d='M16 17l5-5-5-5'/%3E%3Cpath d='M21 12H9'/%3E%3C/svg%3E"); }
.jupyter-page .icon-create { --icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z'/%3E%3Cpath d='M12 10v6'/%3E%3Cpath d='M9 13h6'/%3E%3C/svg%3E"); }
.jupyter-page .icon-upload { --icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/%3E%3Cpath d='M14 2v6h6'/%3E%3Cpath d='M12 18v-6'/%3E%3Cpath d='M9.5 14.5 12 12l2.5 2.5'/%3E%3C/svg%3E"); }
.jupyter-page .icon-notebook { --icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M8 6h12'/%3E%3Cpath d='M8 12h12'/%3E%3Cpath d='M8 18h12'/%3E%3Cpath d='M4 6h.01'/%3E%3Cpath d='M4 12h.01'/%3E%3Cpath d='M4 18h.01'/%3E%3C/svg%3E"); }

.jupyter-page .nav-icon,
.jupyter-page .logout-btn .nav-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  background: currentColor;
  mask: var(--icon) center / contain no-repeat;
  -webkit-mask: var(--icon) center / contain no-repeat;
}

.jupyter-page .action-icon,
.jupyter-page .resource-snippet-icon {
  position: relative;
}

.jupyter-page .action-icon::before,
.jupyter-page .resource-snippet-icon::before,
.jupyter-page .project-open-btn::before {
  content: '';
  display: block;
  background: currentColor;
  mask: var(--icon) center / contain no-repeat;
  -webkit-mask: var(--icon) center / contain no-repeat;
}

.jupyter-page .project-open-btn {
  --icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='5' width='18' height='14' rx='2'/%3E%3Cpath d='M8 9l2 3-2 3'/%3E%3Cpath d='M12 15h4'/%3E%3C/svg%3E");
}

.jupyter-page .resource-snippet-icon.type-folder { --icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z'/%3E%3C/svg%3E"); }
.jupyter-page .resource-snippet-icon.type-dataset { --icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cellipse cx='12' cy='5' rx='7' ry='3'/%3E%3Cpath d='M5 5v14c0 1.66 3.13 3 7 3s7-1.34 7-3V5'/%3E%3Cpath d='M5 12c0 1.66 3.13 3 7 3s7-1.34 7-3'/%3E%3C/svg%3E"); }
.jupyter-page .resource-snippet-icon.type-model { --icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 3l8 4.5v9L12 21 4 16.5v-9L12 3z'/%3E%3Cpath d='M12 12l8-4.5'/%3E%3Cpath d='M12 12v9'/%3E%3Cpath d='M12 12L4 7.5'/%3E%3C/svg%3E"); }
.jupyter-page .resource-snippet-icon.type-method { --icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 7h16'/%3E%3Cpath d='M4 12h10'/%3E%3Cpath d='M4 17h13'/%3E%3C/svg%3E"); }

.jupyter-page .dashboard-layout {
  display: grid;
  grid-template-columns: 232px minmax(0, 1fr);
  min-height: calc(100vh - 58px);
}

.jupyter-page .sidebar {
  position: sticky;
  top: 58px;
  height: calc(100vh - 58px);
  padding: 1rem 0 0.85rem;
  background: #e1e3e4;
  border-right: none;
  box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.45);
}

.jupyter-page .sidebar-user {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0 1rem;
  background: transparent;
  margin-bottom: 0.9rem;
}

.jupyter-page .user-avatar {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  overflow: hidden;
  flex: 0 0 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f766e, #2563eb);
  color: #fff;
  font-family: var(--font-display);
  font-size: 0.78rem;
  font-weight: 800;
  line-height: 1;
  box-shadow: none;
}

.jupyter-page .user-avatar-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.jupyter-page .user-name {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.86rem;
  color: var(--primary-strong);
}

.jupyter-page .user-username {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.jupyter-page .sidebar-nav {
  display: block;
  overflow-y: auto;
}

.jupyter-page .nav-section {
  margin-bottom: 1rem;
}

.jupyter-page .nav-section-title {
  padding: 0 1rem;
  margin: 0 0 0.25rem;
  font-size: 0.66rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--text-muted);
}

.jupyter-page .nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  min-height: 44px;
  padding: 0 1rem;
  border-radius: 0;
  color: var(--text-secondary);
  text-decoration: none;
  transition: background-color 0.2s ease, color 0.2s ease;
  font-family: var(--font-sans);
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.jupyter-page .nav-item:hover {
  background: rgba(255, 255, 255, 0.52);
  color: var(--primary-strong);
}

.jupyter-page .nav-item.active {
  background: rgba(255, 255, 255, 0.98);
  color: #006876;
  font-weight: 700;
}

.jupyter-page .nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  border-radius: 0 999px 999px 0;
  background: #006876;
}

.jupyter-page .sidebar-footer {
  margin-top: auto;
  padding: 0 1rem;
}

.jupyter-page .logout-btn {
  width: 100%;
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(0, 30, 64, 0.96), rgba(0, 51, 102, 0.92));
  color: white;
  font-family: var(--font-display);
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 10px 22px rgba(var(--primary-rgb), 0.14);
}

.jupyter-page .main-content {
  padding: 1.35rem 1.35rem 1.8rem;
  background: #f3f4f5;
}

.jupyter-page .content-header {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 1rem;
  margin-bottom: 1.1rem;
  padding: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.jupyter-page .content-header.recent-mode {
  background: transparent;
  box-shadow: none;
  padding: 0;
}

.jupyter-page .content-header .page-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(1.8rem, 2.6vw, 2.45rem);
  font-weight: 650;
  line-height: 1.04;
  letter-spacing: 0;
  color: var(--primary-strong);
}

.jupyter-page .page-subtitle {
  margin: 0.45rem 0 0;
  max-width: 680px;
  font-size: 0.9rem;
  line-height: 1.45;
  color: var(--text-secondary);
}

.jupyter-page .header-right {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.jupyter-page .search-box {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: min(100%, 240px);
  min-height: 42px;
  padding: 0 0.8rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 10px 18px rgba(var(--primary-rgb), 0.05);
}

.jupyter-page .search-box input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--primary-strong);
}

.jupyter-page .header-btn,
.jupyter-page .add-btn,
.jupyter-page .launch-jupyter-btn,
.jupyter-page .confirm-btn,
.jupyter-page .btn-create {
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--primary-strong), var(--primary-soft));
  color: white;
  font-family: var(--font-display);
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 16px 24px rgba(var(--primary-rgb), 0.14);
}

.jupyter-page .header-btn {
  min-height: 42px;
  padding: 0 0.9rem;
}

.jupyter-page .content-body,
.jupyter-page .recent-section,
.jupyter-page .projects-table-wrapper,
.jupyter-page .cases-panel,
.jupyter-page .environments-panel,
.jupyter-page .mymodel-panel,
.jupyter-page .mydatamethod-panel,
.jupyter-page .mydata-panel {
  border-radius: 18px;
}

.jupyter-page .recent-top-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(220px, 1fr));
  gap: 1rem;
  margin-top: 0;
  align-items: stretch;
}

.jupyter-page .recent-section,
.jupyter-page .projects-table-wrapper,
.jupyter-page .resource-list,
.jupyter-page .environments-panel,
.jupyter-page .selector-modal,
.jupyter-page .modal-content {
  padding: 1rem;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 18px 30px rgba(var(--primary-rgb), 0.06);
}

.jupyter-page .section-title,
.jupyter-page .env-panel-title {
  margin: 0 0 0.75rem;
  font-family: var(--font-display);
  font-size: 1.02rem;
  font-weight: 800;
  color: var(--primary-strong);
  letter-spacing: -0.03em;
}

.jupyter-page .action-tile {
  display: grid;
  gap: 0.7rem;
  align-content: start;
  min-height: 128px;
  padding: 1.1rem;
  border: none;
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.98);
  color: var(--primary-strong);
  text-align: left;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(var(--primary-rgb), 0.06);
}

.jupyter-page .action-tile:hover {
  transform: translateY(-2px);
  background: rgba(213, 227, 255, 0.34);
  box-shadow: 0 10px 22px rgba(var(--primary-rgb), 0.08);
}

.jupyter-page .action-icon {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #d9eef8;
  color: var(--primary-strong);
}

.jupyter-page .action-icon::before {
  width: 22px;
  height: 22px;
}

.jupyter-page .action-tile strong {
  font-family: var(--font-display);
  font-size: 0.92rem;
  font-weight: 800;
}

.jupyter-page .action-tile span:last-child {
  color: #6b778b;
  font-size: 0.8rem;
}

.jupyter-page .recent-projects-section,
.jupyter-page .recent-resources-card,
.jupyter-page .env-card-new,
.jupyter-page .resource-card {
  border: none;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 10px 20px rgba(var(--primary-rgb), 0.045);
}

.jupyter-page .recent-projects-section,
.jupyter-page .recent-resources-card {
  padding: 1.05rem;
  margin-top: 1rem;
}

.jupyter-page .recent-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.jupyter-page .section-link {
  border: none;
  background: transparent;
  color: #006876;
  font-family: var(--font-sans);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 800;
  cursor: pointer;
}

.jupyter-page .project-activity-list {
  display: grid;
  gap: 0.7rem;
}

.jupyter-page .project-activity-card {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr) auto;
  align-items: stretch;
  gap: 1rem;
  padding: 0.9rem 1rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 4px 14px rgba(var(--primary-rgb), 0.05);
}

.jupyter-page .project-mark {
  display: grid;
  align-content: space-between;
  min-height: 78px;
  padding: 0.8rem 0.85rem;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  text-align: left;
}

.jupyter-page .project-mark.large {
  min-height: 96px;
  padding: 0.95rem 1rem;
}

.jupyter-page .project-mark strong {
  color: #0f172a;
  font-family: var(--font-display);
  font-size: 1.08rem;
  font-weight: 900;
}

.jupyter-page .project-mark-kicker {
  color: #475569;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.jupyter-page .project-mark.variant-private {
  background: linear-gradient(180deg, #f8fbff 0%, #eef5ff 100%);
}

.jupyter-page .project-mark.variant-shared {
  background: linear-gradient(180deg, #eefcf8 0%, #e2f7ef 100%);
}

.jupyter-page .project-mark.variant-case {
  background: linear-gradient(180deg, #fff8ef 0%, #ffeed9 100%);
}

.jupyter-page .project-mark.variant-analysis {
  background: linear-gradient(180deg, #f6f8fc 0%, #edf2f8 100%);
}

.jupyter-page .project-activity-body {
  min-width: 0;
}

.jupyter-page .project-activity-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.9rem;
}

.jupyter-page .project-activity-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 0.96rem;
  font-weight: 800;
  color: var(--primary-strong);
}

.jupyter-page .project-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.jupyter-page .project-meaning-badge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 0.65rem;
  border-radius: 999px;
  background: #eef2f7;
  color: #475569;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.jupyter-page .project-meaning-badge.public {
  background: rgba(16, 185, 129, 0.14);
  color: #047857;
}

.jupyter-page .project-meaning-badge.private {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
}

.jupyter-page .project-meaning-badge.case {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.jupyter-page .project-meaning-badge.fork {
  background: rgba(99, 102, 241, 0.12);
  color: #4338ca;
}

.jupyter-page .project-activity-desc {
  display: -webkit-box;
  margin: 0.42rem 0 0;
  overflow: hidden;
  color: #5b6778;
  font-size: 0.84rem;
  line-height: 1.55;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.jupyter-page .project-activity-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: 0.35rem;
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.jupyter-page .project-activity-meta span {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.jupyter-page .project-open-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 38px;
  padding: 0 0.9rem;
  border: none;
  border-radius: 8px;
  font-family: var(--font-display);
  font-size: 0.82rem;
  font-weight: 800;
  cursor: pointer;
  transition: background-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.jupyter-page .project-open-btn::before {
  width: 17px;
  height: 17px;
}

.jupyter-page .project-open-btn.primary {
  background: linear-gradient(135deg, var(--primary-strong), var(--primary-soft));
  color: white;
  box-shadow: 0 8px 20px rgba(var(--primary-rgb), 0.14);
}

.jupyter-page .project-open-btn.ghost {
  background: #eceef1;
  color: var(--primary-strong);
  box-shadow: none;
}

.jupyter-page .recent-bottom-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1rem;
}

.jupyter-page .resource-snippet-list {
  display: grid;
  gap: 0.65rem;
}

.jupyter-page .resource-snippet-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.65rem;
  align-items: center;
  padding: 0.2rem 0;
}

.jupyter-page .resource-snippet-item + .resource-snippet-item {
  border-top: none;
}

.jupyter-page .resource-snippet-icon {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.12);
  color: #006876;
}

.jupyter-page .resource-snippet-icon::before {
  width: 15px;
  height: 15px;
}

.jupyter-page .resource-snippet-main strong {
  display: block;
  color: var(--primary-strong);
  font-family: var(--font-sans);
  font-size: 0.88rem;
  font-weight: 600;
}

.jupyter-page .resource-snippet-main span,
.jupyter-page .resource-snippet-side {
  color: var(--text-secondary);
}

.jupyter-page .resource-snippet-side {
  font-size: 0.76rem;
  color: var(--text-muted);
}

.jupyter-page .recent-resources-card {
  min-height: 240px;
}

.jupyter-page .env-card-new:hover,
.jupyter-page .resource-card:hover {
  background: rgba(213, 227, 255, 0.56);
  transform: translateY(-2px);
}

.jupyter-page .project-name,
.jupyter-page .project-name-text,
.jupyter-page .resource-name,
.jupyter-page .env-card-title {
  font-family: var(--font-display);
  font-weight: 800;
  color: var(--primary-strong);
}

.jupyter-page .project-meta,
.jupyter-page .resource-meta,
.jupyter-page .env-card-desc,
.jupyter-page .panel-intro p,
.jupyter-page .empty-hint {
  color: var(--text-secondary);
}

.jupyter-page .projects-table-wrapper,
.jupyter-page .environments-panel,
.jupyter-page .resource-list,
.jupyter-page .netdisk-style {
  background: rgba(243, 244, 245, 0.88);
}

.jupyter-page .projects-table-new {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 0.45rem;
}

.jupyter-page .projects-table-new th {
  padding: 0 0.75rem 0.45rem;
  font-size: 0.64rem;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: var(--text-muted);
  text-align: left;
}

.jupyter-page .projects-table-new td {
  padding: 0.72rem;
  background: rgba(255, 255, 255, 0.92);
}

.jupyter-page .projects-table-new td:first-child {
  border-top-left-radius: 13px;
  border-bottom-left-radius: 13px;
}

.jupyter-page .projects-table-new td:last-child {
  border-top-right-radius: 13px;
  border-bottom-right-radius: 13px;
}

.jupyter-page .project-row {
  transition: transform 0.2s ease;
}

.jupyter-page .project-row:hover {
  transform: translateY(-1px);
}

.jupyter-page .panel-toolbar {
  margin-bottom: 0.75rem;
}

.jupyter-page .resource-grid,
.jupyter-page .env-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 0.75rem;
}

.jupyter-page .resource-card,
.jupyter-page .env-card-new {
  padding: 0.9rem;
  transition: background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.jupyter-page .netdisk-toolbar,
.jupyter-page .selector-search {
  display: flex;
  gap: 0.55rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}

.jupyter-page .toolbar-btn,
.jupyter-page .selector-search button,
.jupyter-page .btn-cancel,
.jupyter-page .cancel-btn {
  min-height: 38px;
  padding: 0 0.8rem;
  border: none;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.86);
  color: var(--primary-strong);
  font-weight: 700;
  cursor: pointer;
}

.jupyter-page .toolbar-btn.primary,
.jupyter-page .confirm-btn,
.jupyter-page .action-btn.fork {
  background: linear-gradient(135deg, var(--primary-strong), var(--primary-soft));
  color: white;
}

.jupyter-page .toolbar-btn.upload {
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent-color);
}

.jupyter-page .netdisk-content {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.86);
  padding: 0.75rem;
}

.jupyter-page .netdisk-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.65rem;
}

.jupyter-page .netdisk-item {
  padding: 0.75rem;
  border: none;
  border-radius: 14px;
  background: rgba(248, 249, 250, 0.96);
  box-shadow: 0 14px 24px rgba(var(--primary-rgb), 0.05);
}

.jupyter-page .netdisk-item.selected {
  background: rgba(213, 227, 255, 0.72);
}

.jupyter-page .env-panel-desc {
  margin: -0.35rem 0 0.85rem;
  color: var(--text-secondary);
}

.jupyter-page .env-card-new.selected {
  background: rgba(213, 227, 255, 0.82);
  box-shadow: 0 20px 32px rgba(var(--primary-rgb), 0.1);
}

.jupyter-page .env-launch-section {
  margin-top: 0.85rem;
}

.jupyter-page .launch-jupyter-btn {
  min-height: 42px;
  padding: 0 0.95rem;
}

.jupyter-page .modal-overlay {
  background: rgba(0, 30, 64, 0.24);
  backdrop-filter: blur(8px);
}

.jupyter-page .modal-content {
  border: none;
  border-radius: 18px;
}

.jupyter-page .modal-header,
.jupyter-page .modal-footer {
  border: none;
}

.jupyter-page .modal-header h2,
.jupyter-page .modal-header h3 {
  font-family: var(--font-display);
  font-weight: 800;
  color: var(--primary-strong);
}

.jupyter-page .form-group input,
.jupyter-page .form-group textarea,
.jupyter-page .selector-search input {
  width: 100%;
  min-height: 40px;
  padding: 0.65rem 0.8rem;
  border: none;
  border-radius: 11px;
  background: rgba(243, 244, 245, 0.95);
  color: var(--primary-strong);
  outline: none;
}

.jupyter-page .form-group textarea {
  min-height: 86px;
  resize: vertical;
}

.jupyter-page .selector-item {
  border: none;
  border-radius: 13px;
  background: rgba(248, 249, 250, 0.96);
}

.jupyter-page .jupyter-nav {
  height: 58px;
  padding: 0 1.25rem;
}

.jupyter-page .nav-left {
  gap: 1rem;
}

.jupyter-page .logo {
  height: 34px;
}

.jupyter-page .stats-row {
  gap: 12px;
}

.jupyter-page .stat-card {
  gap: 12px;
  padding: 14px;
}

.jupyter-page .stat-icon {
  font-size: 24px;
}

.jupyter-page .stat-value {
  font-size: 19px;
}

.jupyter-page .table-body,
.jupyter-page .resource-list {
  min-height: 220px;
}

.jupyter-page .table-header,
.jupyter-page .table-row {
  padding: 0.7rem 0.9rem;
}

.jupyter-page .empty-state {
  padding: 36px 16px;
}

.jupyter-page .empty-icon {
  font-size: 42px;
  margin-bottom: 10px;
}

.jupyter-page .empty-row {
  padding: 36px 16px !important;
}

.jupyter-page .empty-row .empty-icon {
  font-size: 36px;
}

.jupyter-page .netdisk-content {
  min-height: 260px;
  margin: 10px 0;
}

.jupyter-page .netdisk-grid {
  padding: 0.75rem;
}

.jupyter-page .item-icon-wrapper {
  width: 56px;
  height: 56px;
}

.jupyter-page .item-icon-wrapper .item-icon {
  width: 46px;
  height: 46px;
}

.jupyter-page .file-icon {
  width: 46px;
  height: 52px;
}

.jupyter-page .login-container {
  min-height: 100vh;
}

.jupyter-page:not(.login-mode) .login-card {
  border-radius: 10px;
}

.jupyter-page:not(.login-mode) .login-input {
  border-radius: 8px;
}

.jupyter-page:not(.login-mode) .opengms-login-btn,
.jupyter-page:not(.login-mode) .social-login-btn {
  border-radius: 8px;
}

.jupyter-page:not(.login-mode) .opengms-login-btn {
  background: #07182f;
  color: white;
  font-weight: 800;
}

/* Unified workspace list system */
.jupyter-page .content-header.recent-mode {
  margin-bottom: 1.95rem;
}

.jupyter-page .content-header.recent-mode .page-title {
  font-size: 2.35rem;
  line-height: 1.08;
  letter-spacing: 0;
}

.jupyter-page .content-header.recent-mode .page-subtitle {
  margin-top: 0.65rem;
  font-size: 1rem;
  color: #5f6472;
}

.jupyter-page .recent-panel {
  display: grid;
  gap: 2.15rem;
  height: auto;
}

.jupyter-page .recent-top-grid {
  gap: 1.05rem;
}

.jupyter-page .action-tile {
  min-height: 156px;
  padding: 1.35rem 1.35rem 1.25rem;
  border: 1px solid #cfd4e5;
  border-radius: 5px;
  background: transparent;
  box-shadow: none;
  gap: 1.05rem;
}

.jupyter-page .action-tile:hover {
  border-color: #9fb0dc;
  background: rgba(255, 255, 255, 0.42);
  box-shadow: none;
  transform: none;
}

.jupyter-page .action-icon {
  width: 42px;
  height: 42px;
  border: 1px solid #cfd7ea;
  border-radius: 6px;
  background: #f2f5fb;
  color: #2f6cf6;
}

.jupyter-page .action-icon::before {
  width: 18px;
  height: 18px;
}

.jupyter-page .action-tile strong {
  margin-top: 0.4rem;
  color: #171d31;
  font-size: 1rem;
  line-height: 1.2;
  letter-spacing: 0;
}

.jupyter-page .action-tile span:last-child {
  color: #646978;
  font-size: 0.9rem;
}

.jupyter-page .recent-projects-section,
.jupyter-page .recent-resources-card {
  margin-top: 0;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.jupyter-page .recent-section-head {
  margin-bottom: 1.15rem;
  padding-bottom: 0.78rem;
  border-bottom: 1px solid #d9dce8;
}

.jupyter-page .section-title {
  margin: 0;
  color: #171d31;
  font-size: 0.82rem;
  font-weight: 900;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.jupyter-page .section-link {
  color: #1f5be8;
  font-size: 0.78rem;
  letter-spacing: 0;
}

.jupyter-page .project-activity-list,
.jupyter-page .workspace-project-list {
  display: grid;
  gap: 0.85rem;
}

.jupyter-page .project-activity-card,
.jupyter-page .workspace-project-row {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) 206px;
  align-items: center;
  gap: 1.25rem;
  min-height: 138px;
  padding: 1.05rem 1.3rem;
  border: 1px solid #cfd4e5;
  border-radius: 5px;
  background: transparent;
  box-shadow: none;
  transition: border-color 0.16s ease, background-color 0.16s ease;
}

.jupyter-page .workspace-project-row {
  grid-template-columns: minmax(0, 1.28fr) minmax(310px, 0.72fr) max-content;
  min-height: 116px;
}

.jupyter-page .project-activity-card:hover,
.jupyter-page .workspace-project-row:hover {
  border-color: #aab5d8;
  background: rgba(255, 255, 255, 0.35);
  box-shadow: none;
  transform: none;
}

.jupyter-page .project-mark,
.jupyter-page .project-mark.large,
.jupyter-page .myspace-project-mark {
  width: 72px;
  min-height: 72px;
  height: 72px;
  padding: 0.55rem 0.45rem;
  align-content: center;
  justify-items: center;
  gap: 0.34rem;
  border: 1px solid #cfd7ea;
  border-radius: 5px;
  background: transparent;
  text-align: center;
  box-shadow: none;
}

.jupyter-page .project-mark-kicker,
.jupyter-page .myspace-project-mark .project-mark-kicker {
  color: #8b95a8;
  font-size: 0.66rem;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.jupyter-page .project-mark strong,
.jupyter-page .myspace-project-mark strong {
  color: #171d31;
  font-size: 1rem;
  font-weight: 900;
  letter-spacing: 0;
}

.jupyter-page .project-activity-body,
.jupyter-page .workspace-project-copy {
  min-width: 0;
}

.jupyter-page .project-activity-header,
.jupyter-page .workspace-project-title-row {
  align-items: center;
  justify-content: flex-start;
  gap: 0.8rem;
}

.jupyter-page .project-activity-title,
.jupyter-page .workspace-project-title-row h3 {
  color: #171d31;
  font-size: 1rem;
  font-weight: 900;
  line-height: 1.25;
  letter-spacing: 0;
}

.jupyter-page .project-chip-row {
  gap: 0.45rem;
}

.jupyter-page .project-meaning-badge,
.jupyter-page .myspace-panel .project-meaning-badge {
  min-height: 26px;
  padding: 0 0.68rem;
  border: 1px solid #cbd2e5;
  border-radius: 3px;
  background: transparent;
  color: #2f6cf6;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  line-height: 1;
}

.jupyter-page .project-meaning-badge.owner {
  max-width: 160px;
  overflow: hidden;
  color: #667085;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.jupyter-page .project-activity-desc,
.jupyter-page .workspace-project-summary,
.jupyter-page .project-description {
  margin: 0.45rem 0 0;
  color: #4f5668;
  font-size: 0.92rem;
  line-height: 1.35;
  -webkit-line-clamp: 1;
}

.jupyter-page .project-activity-desc.empty,
.jupyter-page .project-description.empty {
  color: #8a92a5;
  font-style: normal;
}

.jupyter-page .project-activity-meta {
  gap: 1.15rem;
  margin-top: 0.8rem;
  color: #646978;
  font-family: var(--font-sans);
  font-size: 0.82rem;
  font-weight: 700;
}

.jupyter-page .project-open-btn {
  justify-content: center;
  width: 100%;
  min-height: 50px;
  padding: 0 1rem;
  border: 1px solid #c8d2ea;
  border-radius: 4px;
  background: #e6ebfb;
  color: #171d31;
  box-shadow: none;
  font-size: 0.9rem;
  font-weight: 800;
  letter-spacing: 0;
}

.jupyter-page .project-open-btn.primary {
  border-color: #1556d6;
  background: #1456d9;
  color: #ffffff;
  box-shadow: none;
}

.jupyter-page .project-open-btn.ghost {
  background: #e6ebfb;
  color: #171d31;
  box-shadow: none;
}

.jupyter-page .project-open-btn:hover {
  transform: none;
  filter: brightness(0.98);
}

.jupyter-page .myspace-directory-shell {
  gap: 1.35rem;
}

.jupyter-page .myspace-directory-header {
  padding-bottom: 0.4rem;
}

.jupyter-page .myspace-directory-intro h2 {
  font-size: 2.35rem;
  letter-spacing: 0;
}

.jupyter-page .myspace-create-btn {
  height: 56px;
  min-width: 232px;
  border-radius: 5px;
  background: #2f6cf6;
  box-shadow: none;
}

.jupyter-page .myspace-create-btn:hover {
  box-shadow: none;
  transform: none;
}

.jupyter-page .myspace-search-box input {
  border: 1px solid #cfd4e5;
  border-radius: 5px;
  background: transparent;
}

.jupyter-page .workspace-project-main {
  grid-template-columns: 72px minmax(0, 1fr);
}

.jupyter-page .workspace-project-metrics {
  grid-template-columns: repeat(3, minmax(74px, 1fr));
  gap: 0;
  padding-left: 1.1rem;
  border-left: 1px solid #d9dce8;
}

.jupyter-page .workspace-metric {
  padding: 0 0.75rem;
}

.jupyter-page .workspace-metric span {
  color: #8b95a8;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0;
}

.jupyter-page .workspace-metric strong {
  color: #171d31;
  font-size: 0.86rem;
  line-height: 1.3;
}

.jupyter-page .workspace-actions {
  gap: 0.34rem;
  justify-content: flex-end;
  padding-left: 0.65rem;
  border-left: none;
}

.jupyter-page .workspace-actions .action-icon-btn {
  width: 30px;
  height: 30px;
  border-radius: 4px;
}

.jupyter-page .recent-resources-card {
  min-height: 0;
}

.jupyter-page .resource-snippet-list {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.jupyter-page .resource-snippet-item {
  grid-template-columns: 42px minmax(0, 1fr);
  min-height: 80px;
  padding: 1rem;
  border: 1px solid #cfd4e5;
  border-radius: 5px;
  background: transparent;
}

.jupyter-page .resource-snippet-icon {
  width: 42px;
  height: 42px;
  border: 1px solid #cfd7ea;
  border-radius: 5px;
  background: #f2f5fb;
  color: #4f607c;
}

.jupyter-page .resource-snippet-main strong {
  overflow: hidden;
  color: #32394b;
  font-family: var(--font-sans);
  font-size: 0.86rem;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.jupyter-page .resource-snippet-main span,
.jupyter-page .resource-snippet-side {
  font-family: var(--font-sans);
  font-size: 0.78rem;
  font-weight: 700;
}

.jupyter-page .resource-snippet-side {
  display: none;
}

.jupyter-page .environment-registry-panel {
  min-height: 0;
  padding: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  color: #10182d;
}

.jupyter-page .environment-registry-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.4rem;
  padding: 0 0 1rem;
  border-bottom: 1px solid #d9dce8;
}

.jupyter-page .environment-registry-copy {
  min-width: 0;
}

.jupyter-page .env-registry-title {
  margin: 0;
  color: #10182d;
  font-family: var(--font-display);
  font-size: 2.12rem;
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1.05;
}

.jupyter-page .env-registry-desc {
  max-width: 820px;
  margin: 0.62rem 0 0;
  color: #5b6680;
  font-size: 0.92rem;
  font-weight: 650;
  line-height: 1.45;
}

.jupyter-page .env-create-project-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  min-width: 306px;
  min-height: 42px;
  padding: 0 0.9rem;
  border: 1px solid #d5dbea;
  border-radius: 5px;
  background: transparent;
  color: #7b8498;
  font-family: var(--font-display);
  font-size: 0.8rem;
  font-weight: 900;
  letter-spacing: 0.01em;
  box-shadow: none;
  cursor: pointer;
  transition: border-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.jupyter-page .env-create-project-btn:hover:not(:disabled) {
  border-color: #7da0ea;
  color: #1f56d8;
  box-shadow: 0 12px 26px rgba(47, 108, 246, 0.12);
  transform: translateY(-1px);
}

.jupyter-page .env-create-project-btn:disabled {
  opacity: 0.52;
  cursor: not-allowed;
}

.jupyter-page .env-create-plus {
  font-size: 1.1rem;
  line-height: 1;
}

.jupyter-page .env-registry-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid #d9dce8;
  background: transparent;
}

.jupyter-page .env-filter-tabs {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  flex-wrap: wrap;
}

.jupyter-page .env-filter-tab {
  min-width: 58px;
  height: 36px;
  padding: 0 0.82rem;
  border: 1px solid transparent;
  border-radius: 5px;
  background: transparent;
  color: #4f5b73;
  font-family: var(--font-display);
  font-size: 0.8rem;
  font-weight: 900;
  cursor: pointer;
  transition: background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease;
}

.jupyter-page .env-filter-tab:hover {
  border-color: #c6d3ef;
  background: rgba(229, 237, 252, 0.52);
}

.jupyter-page .env-filter-tab.active {
  border-color: #b8c8e6;
  background: #dfe9fb;
  color: #18233a;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.45);
}

.jupyter-page .env-registry-search {
  position: relative;
  display: flex;
  align-items: center;
  width: min(100%, 330px);
}

.jupyter-page .env-registry-search .search-icon {
  position: absolute;
  left: 1rem;
  color: #6b768c;
}

.jupyter-page .env-registry-search input {
  width: 100%;
  height: 40px;
  padding: 0 0.9rem 0 2.7rem;
  border: 1px solid #c8d0e3;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.72);
  color: #172037;
  font-size: 0.86rem;
  font-weight: 650;
  outline: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
}

.jupyter-page .env-registry-search input:focus {
  border-color: #7da0ea;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 0 0 3px rgba(47, 108, 246, 0.12);
}

.jupyter-page .env-registry-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  padding: 1.1rem 0 0;
}

.jupyter-page .env-registry-card {
  display: flex;
  min-height: 224px;
  flex-direction: column;
  padding: 1.05rem;
  border: 1px solid #cbd3e6;
  border-radius: 5px;
  background: transparent;
  box-shadow: none;
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.jupyter-page .env-registry-card:hover {
  border-color: #9fb2d8;
  background: rgba(255, 255, 255, 0.34);
  box-shadow: none;
  transform: none;
}

.jupyter-page .env-registry-card.selected {
  border-color: #2f6cf6;
  background: rgba(232, 239, 255, 0.62);
  box-shadow: inset 0 0 0 1px rgba(47, 108, 246, 0.25);
}

.jupyter-page .env-registry-card-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 26px;
  gap: 0.75rem;
  align-items: start;
}

.jupyter-page .env-registry-card-header h3 {
  margin: 0;
  color: #1b2438;
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1.22;
}

.jupyter-page .env-info-btn {
  width: 24px;
  height: 24px;
  border: 2px solid #858d9f;
  border-radius: 50%;
  background: transparent;
  color: #6d7688;
  font-family: Georgia, serif;
  font-size: 0.86rem;
  font-weight: 800;
  line-height: 1;
  cursor: help;
}

.jupyter-page .env-tag-row {
  display: flex;
  min-height: 28px;
  flex-wrap: wrap;
  gap: 0.36rem;
  margin: 0.85rem 0 0.8rem;
}

.jupyter-page .env-tag {
  display: inline-flex;
  align-items: center;
  height: 25px;
  padding: 0 0.5rem;
  border: 1px solid #c9d4f1;
  border-radius: 4px;
  background: #dfe8ff;
  color: #193070;
  font-family: var(--font-sans);
  font-size: 0.68rem;
  font-weight: 800;
}

.jupyter-page .env-tag.community {
  border-color: #bfd4ed;
  background: #d8e9fb;
  color: #203e5a;
}

.jupyter-page .env-tag.gpu {
  border-color: #ffc8c6;
  background: #ffe0dd;
  color: #a72521;
}

.jupyter-page .env-tag.stable,
.jupyter-page .env-tag.hydrology,
.jupyter-page .env-tag.raster,
.jupyter-page .env-tag.enterprise,
.jupyter-page .env-tag.modeling,
.jupyter-page .env-tag.ecology,
.jupyter-page .env-tag.oceanography,
.jupyter-page .env-tag.climate,
.jupyter-page .env-tag.gis {
  border-color: #cfd5e6;
  background: #e5e9f4;
  color: #626b7c;
}

.jupyter-page .env-stack-box {
  min-height: 58px;
  margin-bottom: auto;
  padding: 0.65rem 0.7rem;
  border: 1px solid #d3d8e9;
  border-radius: 5px;
  background: rgba(239, 242, 252, 0.9);
  color: #5f6676;
  font-family: var(--font-sans);
  font-size: 0.74rem;
  font-weight: 750;
  line-height: 1.38;
}

.jupyter-page .env-registry-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.55rem;
  margin-top: 1rem;
  padding-top: 0.85rem;
  border-top: 1px solid #e2e6f0;
  color: #4f586d;
  font-family: var(--font-sans);
  font-size: 0.68rem;
  font-weight: 850;
}

.jupyter-page .env-runtime-type,
.jupyter-page .env-size,
.jupyter-page .env-projects {
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  min-width: 0;
  white-space: nowrap;
}

.jupyter-page .env-runtime-type::before,
.jupyter-page .env-size::before {
  content: none;
}

.jupyter-page .env-runtime-type.gpu {
  color: #cc3531;
}

.jupyter-page .env-runtime-type.gpu::before {
  border-radius: 50%;
}

.jupyter-page .env-projects {
  margin-left: auto;
  justify-content: flex-end;
  text-align: right;
}

.jupyter-page .env-empty-state {
  margin: 3.5rem 2rem;
}

.jupyter-page .environment-drawer-layer {
  position: fixed;
  inset: 0;
  z-index: 260;
  display: flex;
  justify-content: flex-end;
  background: rgba(16, 24, 45, 0.16);
  backdrop-filter: blur(2px);
}

.jupyter-page .environment-detail-drawer {
  width: min(650px, 100vw);
  height: 100vh;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #cbd3e6;
  background: #fbfbff;
  box-shadow: -22px 0 46px rgba(16, 24, 45, 0.18);
}

.jupyter-page .environment-drawer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.2rem;
  padding: 2rem 2.15rem 1.7rem;
  border-bottom: 1px solid #cbd3e6;
  background: linear-gradient(115deg, rgba(246, 247, 255, 0.98), rgba(251, 251, 255, 0.98));
}

.jupyter-page .environment-drawer-title-block {
  min-width: 0;
}

.jupyter-page .environment-drawer-title-row {
  display: flex;
  align-items: center;
  gap: 0.72rem;
  flex-wrap: wrap;
}

.jupyter-page .environment-drawer-title-row h3 {
  margin: 0;
  color: #11182c;
  font-family: var(--font-display);
  font-size: 1.62rem;
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1.12;
}

.jupyter-page .environment-verified-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  height: 30px;
  padding: 0 0.72rem;
  border: 1px solid #c5d3ef;
  border-radius: 5px;
  background: #dce8ff;
  color: #596476;
  font-family: var(--font-display);
  font-size: 0.82rem;
  font-weight: 900;
}

.jupyter-page .environment-verified-badge::before {
  content: '';
  width: 13px;
  height: 13px;
  border: 2px solid currentColor;
  border-radius: 50%;
  box-shadow: inset 0 0 0 2px #dce8ff;
}

.jupyter-page .environment-version-line {
  display: flex;
  align-items: center;
  gap: 0.72rem;
  margin: 0.78rem 0 0;
  color: #5f687c;
  font-family: var(--font-sans);
  font-size: 0.86rem;
  font-weight: 800;
}

.jupyter-page .environment-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #c3cbda;
}

.jupyter-page .environment-drawer-close {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: #3c4355;
  font-size: 2rem;
  line-height: 1;
  cursor: pointer;
}

.jupyter-page .environment-drawer-close:hover {
  background: #edf1f8;
}

.jupyter-page .environment-drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 2rem 2.15rem 6.5rem;
}

.jupyter-page .environment-detail-section {
  margin-bottom: 2.1rem;
}

.jupyter-page .environment-detail-section h4,
.jupyter-page .environment-section-head h4 {
  margin: 0 0 1.1rem;
  color: #5c6374;
  font-family: var(--font-display);
  font-size: 0.82rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.jupyter-page .environment-overview-text {
  margin: 0;
  color: #2f374d;
  font-size: 0.96rem;
  font-weight: 650;
  line-height: 1.65;
}

.jupyter-page .runtime-stack-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}

.jupyter-page .runtime-stack-item {
  min-height: 82px;
  padding: 0.9rem;
  border: 1px solid #cdd4e6;
  border-radius: 5px;
  background: #f0f2fb;
}

.jupyter-page .runtime-stack-item span,
.jupyter-page .governance-panel label {
  display: block;
  margin-bottom: 0.42rem;
  color: #5b6476;
  font-size: 0.78rem;
  font-weight: 900;
}

.jupyter-page .runtime-stack-item strong {
  display: block;
  color: #353d50;
  font-family: var(--font-sans);
  font-size: 0.86rem;
  font-weight: 800;
  line-height: 1.5;
}

.jupyter-page .environment-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.jupyter-page .environment-section-head h4 {
  margin-bottom: 0;
}

.jupyter-page .library-filter-box {
  position: relative;
  display: flex;
  align-items: center;
  width: min(100%, 248px);
}

.jupyter-page .library-filter-box .search-icon {
  position: absolute;
  left: 0.8rem;
  color: #707a90;
}

.jupyter-page .library-filter-box input {
  width: 100%;
  height: 40px;
  padding: 0 0.8rem 0 2.45rem;
  border: 1px solid #cdd4e6;
  border-radius: 5px;
  background: #f8f9ff;
  color: #2d3548;
  font-weight: 700;
  outline: none;
}

.jupyter-page .library-filter-box input:focus {
  border-color: #7da0ea;
  box-shadow: 0 0 0 3px rgba(47, 108, 246, 0.11);
}

.jupyter-page .library-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.62rem;
}

.jupyter-page .library-chip,
.jupyter-page .library-more-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  min-height: 34px;
  padding: 0 0.72rem;
  border: 1px solid #cdd4e6;
  border-radius: 5px;
  background: #ffffff;
  color: #3f4657;
  font-family: var(--font-sans);
  font-size: 0.8rem;
  font-weight: 800;
}

.jupyter-page .library-chip span {
  color: #737c91;
}

.jupyter-page .library-chip span::before {
  content: '|';
  margin-right: 0.55rem;
  color: #b6bfd2;
}

.jupyter-page .library-more-chip {
  border-color: transparent;
  background: transparent;
  color: #1f56d8;
  cursor: pointer;
}

.jupyter-page .requirement-list {
  overflow: hidden;
  border: 1px solid #cdd4e6;
  border-radius: 5px;
  background: #f8f9ff;
}

.jupyter-page .requirement-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 56px;
  padding: 0 1rem;
  border-bottom: 1px solid #dbe1ef;
  color: #2f374b;
  font-size: 0.95rem;
  font-weight: 750;
}

.jupyter-page .requirement-row:last-child {
  border-bottom: none;
}

.jupyter-page .requirement-row strong {
  color: #2f374b;
  font-family: var(--font-sans);
  font-size: 0.86rem;
  font-weight: 850;
  text-align: right;
}

.jupyter-page .governance-panel {
  padding: 1.1rem;
  border: 1px solid #cdd4e6;
  border-radius: 5px;
  background: #f0f2fb;
}

.jupyter-page .digest-box {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  min-height: 44px;
  padding: 0.55rem 0.75rem;
  border: 1px solid #cdd4e6;
  border-radius: 5px;
  background: #fbfcff;
}

.jupyter-page .digest-box span {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  color: #2e3649;
  font-family: var(--font-sans);
  font-size: 0.78rem;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.jupyter-page .digest-box button {
  min-height: 30px;
  padding: 0 0.65rem;
  border: 1px solid #cdd4e6;
  border-radius: 4px;
  background: #ffffff;
  color: #4b556b;
  font-size: 0.74rem;
  font-weight: 850;
  cursor: pointer;
}

.jupyter-page .governance-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 1.15rem;
}

.jupyter-page .governance-meta-grid strong {
  display: block;
  color: #2e3649;
  font-size: 0.92rem;
  font-weight: 800;
  line-height: 1.45;
}

.jupyter-page .environment-drawer-footer {
  position: sticky;
  bottom: 0;
  display: flex;
  justify-content: flex-end;
  padding: 1rem 2.15rem;
  border-top: 1px solid #cbd3e6;
  background: rgba(251, 251, 255, 0.96);
  box-shadow: 0 -10px 24px rgba(16, 24, 45, 0.06);
}

.jupyter-page .environment-use-btn {
  min-width: 210px;
  min-height: 44px;
  border: none;
  border-radius: 5px;
  background: #0f5bd8;
  color: #ffffff;
  font-family: var(--font-display);
  font-size: 0.9rem;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 10px 20px rgba(15, 91, 216, 0.18);
}

.jupyter-page .environment-use-btn:hover {
  background: #0b4fbe;
}

.jupyter-page .environment-use-btn:disabled {
  opacity: 0.52;
  cursor: not-allowed;
  box-shadow: none;
}

.env-drawer-enter-active,
.env-drawer-leave-active {
  transition: opacity 0.2s ease;
}

.env-drawer-enter-active .environment-detail-drawer,
.env-drawer-leave-active .environment-detail-drawer {
  transition: transform 0.24s ease;
}

.env-drawer-enter-from,
.env-drawer-leave-to {
  opacity: 0;
}

.env-drawer-enter-from .environment-detail-drawer,
.env-drawer-leave-to .environment-detail-drawer {
  transform: translateX(100%);
}

/* Unified dashboard page header, toolbar, and button language */
.jupyter-page .content-header {
  align-items: flex-start;
  gap: 1.25rem;
  margin-bottom: 1.15rem;
  padding: 0 0 1.05rem;
  border-bottom: 1px solid #d9dce8;
  background: transparent;
}

.jupyter-page .content-header .page-title {
  margin: 0;
  color: #10182d;
  font-family: var(--font-display);
  font-size: clamp(2rem, 2.45vw, 2.35rem);
  font-weight: 900;
  line-height: 1.06;
  letter-spacing: 0;
}

.jupyter-page .content-header .page-subtitle {
  max-width: 780px;
  margin: 0.52rem 0 0;
  color: #5b6680;
  font-size: 0.92rem;
  font-weight: 650;
  line-height: 1.45;
}

.jupyter-page .header-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.72rem;
  min-height: 42px;
}

.jupyter-page .search-box {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: min(100%, 320px);
  min-width: 280px;
  min-height: 42px;
  padding: 0 0.85rem;
  border: 1px solid #c8d0e3;
  border-radius: 5px;
  background: transparent;
  box-shadow: none;
}

.jupyter-page .search-box input {
  width: 100%;
  color: #172037;
  font-size: 0.86rem;
  font-weight: 650;
}

.jupyter-page .search-box input::placeholder {
  color: #8a94a8;
}

.jupyter-page .dashboard-action-btn {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.58rem;
  padding: 0 1rem;
  border: 1px solid #c8d2ea;
  border-radius: 5px;
  background: #e6ebfb;
  color: #171d31;
  font-family: var(--font-display);
  font-size: 0.86rem;
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1;
  cursor: pointer;
  box-shadow: none;
  transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease;
}

.jupyter-page .dashboard-action-btn svg {
  width: 17px;
  height: 17px;
}

.jupyter-page .dashboard-action-btn.primary {
  border-color: #1556d6;
  background: #1456d9;
  color: #ffffff;
}

.jupyter-page .dashboard-action-btn:hover {
  border-color: #aab5d8;
  background: #dfe6f7;
  color: #171d31;
}

.jupyter-page .dashboard-action-btn.primary:hover {
  border-color: #0f4ec9;
  background: #0f4ec9;
  color: #ffffff;
}

.jupyter-page .myspace-directory-shell,
.jupyter-page .mymodel-panel,
.jupyter-page .mydatamethod-panel,
.jupyter-page .mydata-panel,
.jupyter-page .cases-panel {
  display: grid;
  gap: 0.85rem;
  padding: 0;
}

.jupyter-page .mydatamethod-panel .resource-list {
  min-height: 300px;
  padding: 0;
  background: transparent;
  box-shadow: none;
}

.jupyter-page .data-method-rows {
  display: grid;
  gap: 0.85rem;
}

.jupyter-page .data-method-row {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) minmax(190px, 0.28fr) 160px;
  align-items: center;
  gap: 1.25rem;
  min-height: 116px;
  padding: 1.05rem 1.3rem;
  border: 1px solid #cfd4e5;
  border-radius: 5px;
  background: transparent;
  box-shadow: none;
  transition: border-color 0.16s ease, background-color 0.16s ease;
}

.jupyter-page .data-method-row:hover {
  border-color: #aab5d8;
  background: rgba(255, 255, 255, 0.35);
}

.jupyter-page .data-method-mark {
  width: 72px;
  height: 72px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #cfd7ea;
  border-radius: 5px;
  background: transparent;
  color: #171d31;
}

.jupyter-page .data-method-mark span {
  font-size: 1rem;
  font-weight: 900;
}

.jupyter-page .data-method-main {
  min-width: 0;
}

.jupyter-page .data-method-name-line h3 {
  margin: 0;
  overflow: hidden;
  color: #171d31;
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 900;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.jupyter-page .data-method-description {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  margin: 0.45rem 0 0;
  overflow: hidden;
  color: #4f5668;
  font-size: 0.92rem;
  line-height: 1.35;
}

.jupyter-page .data-method-metrics {
  display: grid;
  min-width: 0;
  padding-left: 1.1rem;
  border-left: 1px solid #d9dce8;
}

.jupyter-page .data-method-metric {
  min-width: 0;
  padding: 0 0.75rem;
}

.jupyter-page .data-method-metric span {
  display: block;
  margin-bottom: 0.3rem;
  color: #8b95a8;
  font-size: 0.72rem;
  font-weight: 900;
}

.jupyter-page .data-method-metric strong {
  display: block;
  overflow: hidden;
  color: #171d31;
  font-family: var(--font-display);
  font-size: 0.86rem;
  font-weight: 900;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.jupyter-page .data-method-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.45rem;
  padding-left: 1rem;
  border-left: 1px solid #d9dce8;
}

.jupyter-page .data-method-action-btn {
  min-height: 42px;
  padding: 0 1rem;
  border: 1px solid #c8d2ea;
  border-radius: 4px;
  background: #e6ebfb;
  color: #171d31;
  font-family: var(--font-display);
  font-size: 0.86rem;
  font-weight: 900;
  cursor: pointer;
}

.jupyter-page .data-method-action-btn.primary {
  border-color: #1556d6;
  background: #1456d9;
  color: #ffffff;
}

.jupyter-page .data-method-icon-btn {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: #4f5668;
  cursor: pointer;
}

.jupyter-page .data-method-icon-btn svg {
  width: 17px;
  height: 17px;
}

.jupyter-page .data-method-icon-btn:hover {
  border-color: #c8d2ea;
  background: #e6ebfb;
  color: #171d31;
}

.jupyter-page .data-method-icon-btn.danger:hover {
  border-color: #f0caca;
  background: #fee2e2;
  color: #a61f2b;
}

.jupyter-page .mydata-panel.netdisk-style {
  display: grid;
  gap: 0.85rem;
  height: auto;
  padding: 0;
  background: transparent;
}

.jupyter-page .netdisk-toolbar {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  flex-wrap: wrap;
  margin-bottom: 0;
  padding: 0 0 1rem;
  border-bottom: 1px solid #d9dce8;
}

.jupyter-page .toolbar-btn {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0 0.9rem;
  border: 1px solid #c8d2ea;
  border-radius: 5px;
  background: #e6ebfb;
  color: #171d31;
  font-family: var(--font-display);
  font-size: 0.84rem;
  font-weight: 900;
  box-shadow: none;
}

.jupyter-page .toolbar-btn.primary {
  border-color: #1556d6;
  background: #1456d9;
  color: #ffffff;
  box-shadow: none;
}

.jupyter-page .toolbar-btn.upload {
  border-color: #c8d2ea;
  background: #e6ebfb;
  color: #171d31;
  box-shadow: none;
}

.jupyter-page .toolbar-btn:hover:not(:disabled),
.jupyter-page .toolbar-btn.upload:hover:not(:disabled) {
  border-color: #aab5d8;
  background: #dfe6f7;
  color: #171d31;
  transform: none;
  box-shadow: none;
}

.jupyter-page .toolbar-btn.primary:hover:not(:disabled) {
  border-color: #0f4ec9;
  background: #0f4ec9;
  color: #ffffff;
  transform: none;
  box-shadow: none;
}

.jupyter-page .toolbar-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.jupyter-page .current-path {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  margin-left: auto;
  padding: 0 0.85rem;
  border: 1px solid #c8d0e3;
  border-radius: 5px;
  background: transparent;
  color: #4f5668;
  font-family: var(--font-sans);
  font-size: 0.82rem;
  font-weight: 800;
}

.jupyter-page .netdisk-content {
  min-height: 320px;
  margin: 0;
  padding: 0;
  overflow: visible;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.jupyter-page .netdisk-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
  align-content: start;
  padding: 0.25rem 0;
}

.jupyter-page .netdisk-item {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) 150px;
  align-items: center;
  gap: 1.25rem;
  min-height: 96px;
  padding: 0.9rem 1.2rem;
  border: 1px solid #cfd4e5;
  border-radius: 5px;
  background: transparent;
  box-shadow: none;
}

.jupyter-page .netdisk-item:hover {
  border-color: #aab5d8;
  background: rgba(255, 255, 255, 0.35);
}

.jupyter-page .netdisk-item.selected {
  border-color: #1556d6;
  background: rgba(230, 235, 251, 0.55);
  outline: none;
}

.jupyter-page .item-icon-wrapper {
  width: 64px;
  height: 64px;
  margin-bottom: 0;
}

.jupyter-page .item-icon-wrapper .item-icon {
  width: 46px;
  height: 46px;
  filter: saturate(0.55);
}

.jupyter-page .file-icon,
.jupyter-page .file-icon.icon-image,
.jupyter-page .file-icon.icon-geo,
.jupyter-page .file-icon.icon-data,
.jupyter-page .file-icon.icon-table,
.jupyter-page .file-icon.icon-pdf,
.jupyter-page .file-icon.icon-archive,
.jupyter-page .file-icon.icon-doc {
  width: 46px;
  height: 52px;
  border: 1px solid #cfd7ea;
  border-radius: 5px;
  background: #e6ebfb;
  box-shadow: none;
}

.jupyter-page .file-icon::before {
  background: #c8d2ea;
}

.jupyter-page .file-icon .file-ext {
  background: transparent;
  color: #171d31;
  font-family: var(--font-sans);
  font-size: 0.62rem;
  font-weight: 900;
}

.jupyter-page .item-copy {
  min-width: 0;
}

.jupyter-page .item-name {
  margin: 0;
  color: #171d31;
  font-family: var(--font-display);
  font-size: 0.98rem;
  font-weight: 900;
  line-height: 1.25;
  text-align: left;
}

.jupyter-page .item-meta {
  margin-top: 0.42rem;
  color: #4f5668;
  font-size: 0.84rem;
  font-weight: 750;
  text-align: left;
}

.jupyter-page .item-side {
  display: flex;
  justify-content: flex-end;
}

.jupyter-page .item-side span {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 0.68rem;
  border: 1px solid #cbd2e5;
  border-radius: 3px;
  background: transparent;
  color: #2f6cf6;
  font-family: var(--font-sans);
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.jupyter-page .netdisk-statusbar {
  display: flex;
  gap: 1rem;
  padding: 0.75rem 0 0;
  border-top: 1px solid #d9dce8;
  color: #646978;
  font-size: 0.82rem;
  font-weight: 800;
}

.jupyter-page .recent-panel {
  gap: 1.65rem;
}

.jupyter-page .recent-top-grid {
  gap: 0.85rem;
}

.jupyter-page .action-tile {
  min-height: 132px;
  padding: 1.1rem 1.18rem;
  border: 1px solid #cfd4e5;
  border-radius: 5px;
  background: transparent;
  box-shadow: none;
}

.jupyter-page .action-tile:hover {
  border-color: #aab5d8;
  background: rgba(255, 255, 255, 0.35);
  box-shadow: none;
  transform: none;
}

.jupyter-page .section-link {
  min-height: 32px;
  padding: 0 0.7rem;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: #245fe7;
  font-size: 0.76rem;
  font-weight: 900;
  text-transform: uppercase;
  cursor: pointer;
}

.jupyter-page .section-link:hover {
  border-color: #c8d2ea;
  background: #e6ebfb;
  color: #171d31;
}

.jupyter-page .project-open-btn,
.jupyter-page .saved-model-open-btn,
.jupyter-page .saved-model-remove-btn,
.jupyter-page .workspace-list-retry {
  border-radius: 4px;
  box-shadow: none;
}

.jupyter-page .saved-model-row {
  grid-template-columns: 72px minmax(0, 1.18fr) minmax(360px, 0.72fr) 78px;
  min-height: 116px;
  padding: 1.05rem 1.3rem;
  border: 1px solid #cfd4e5;
  border-radius: 5px;
  background: transparent;
  box-shadow: none;
}

.jupyter-page .saved-model-row:hover {
  border-color: #aab5d8;
  background: rgba(255, 255, 255, 0.35);
  box-shadow: none;
  transform: none;
}

@media (max-width: 1200px) {
  .jupyter-page .recent-top-grid {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  .jupyter-page .env-registry-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .jupyter-page .recent-bottom-grid {
    grid-template-columns: 1fr;
  }

  .jupyter-page .workspace-project-row {
    grid-template-columns: 1fr;
    gap: 0.95rem;
  }

  .jupyter-page .data-method-row {
    grid-template-columns: 72px minmax(0, 1fr);
    gap: 0.95rem;
  }

  .jupyter-page .data-method-metrics,
  .jupyter-page .data-method-actions {
    grid-column: 1 / -1;
    padding-left: 0;
    border-left: none;
    border-top: 1px solid rgba(222, 229, 239, 0.9);
    padding-top: 0.9rem;
  }

  .jupyter-page .workspace-project-metrics,
  .jupyter-page .workspace-actions {
    padding-left: 0;
    border-left: none;
    border-top: 1px solid rgba(222, 229, 239, 0.9);
    padding-top: 0.9rem;
  }

  .jupyter-page .workspace-actions {
    justify-content: flex-end;
  }

  .jupyter-page .data-method-actions {
    justify-content: flex-end;
  }
}

@media (max-width: 960px) {
  .jupyter-page .dashboard-layout {
    grid-template-columns: 1fr;
  }

  .jupyter-page .sidebar {
    position: static;
    height: auto;
  }

  .jupyter-page .content-header {
    flex-direction: column;
    align-items: stretch;
  }

  .jupyter-page .environment-registry-hero,
  .jupyter-page .env-registry-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .jupyter-page .env-create-project-btn,
  .jupyter-page .env-registry-search {
    width: 100%;
    min-width: 0;
  }

  .jupyter-page .header-right {
    justify-content: stretch;
  }
}

@media (max-width: 720px) {
  .jupyter-page .jupyter-nav {
    flex-direction: column;
    align-items: flex-start;
  }

  .jupyter-page .main-content {
    padding: 0.85rem;
  }

  .jupyter-page .resource-grid,
  .jupyter-page .env-cards-grid,
  .jupyter-page .env-registry-grid {
    grid-template-columns: 1fr;
  }

  .jupyter-page .environment-registry-hero,
  .jupyter-page .env-registry-toolbar,
  .jupyter-page .env-registry-grid {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .jupyter-page .env-registry-title {
    font-size: 2rem;
  }

  .jupyter-page .env-registry-footer {
    grid-template-columns: 1fr;
  }

  .jupyter-page .env-projects {
    justify-content: flex-start;
    text-align: left;
  }

  .jupyter-page .environment-detail-drawer {
    width: 100vw;
  }

  .jupyter-page .environment-drawer-header,
  .jupyter-page .environment-drawer-body,
  .jupyter-page .environment-drawer-footer {
    padding-left: 1.15rem;
    padding-right: 1.15rem;
  }

  .jupyter-page .environment-drawer-title-row h3 {
    font-size: 1.35rem;
  }

  .jupyter-page .runtime-stack-grid,
  .jupyter-page .governance-meta-grid {
    grid-template-columns: 1fr;
  }

  .jupyter-page .environment-section-head {
    flex-direction: column;
    align-items: stretch;
  }

  .jupyter-page .library-filter-box,
  .jupyter-page .environment-use-btn {
    width: 100%;
  }

  .jupyter-page .project-activity-card {
    grid-template-columns: 1fr;
  }

  .jupyter-page .project-activity-header,
  .jupyter-page .workspace-project-title-row,
  .jupyter-page .myspace-directory-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .jupyter-page .myspace-directory-utility {
    width: 100%;
    max-width: none;
    justify-items: stretch;
  }

  .jupyter-page .myspace-directory-note {
    text-align: left;
  }

  .jupyter-page .myspace-directory-toolbar {
    justify-content: stretch;
  }

  .jupyter-page .myspace-search-box {
    width: 100%;
  }

  .jupyter-page .myspace-create-btn {
    width: 100%;
    min-width: 0;
  }

  .jupyter-page .workspace-project-main {
    grid-template-columns: 1fr;
  }

  .jupyter-page .data-method-row,
  .jupyter-page .netdisk-item {
    grid-template-columns: 1fr;
  }

  .jupyter-page .data-method-mark,
  .jupyter-page .item-icon-wrapper {
    justify-self: start;
  }

  .jupyter-page .workspace-project-metrics {
    grid-template-columns: 1fr;
    gap: 0.7rem;
  }

  .jupyter-page .workspace-actions,
  .jupyter-page .data-method-actions,
  .jupyter-page .item-side {
    justify-content: flex-start;
  }

  .jupyter-page .project-open-btn {
    width: 100%;
  }
}

/* ========== Scientific Workbench Normalization ========== */
.jupyter-page {
  --workbench-bg: #f3f5f7;
  --workbench-panel: #ffffff;
  --workbench-sidebar: #e7eaed;
  --workbench-border: #cfd6df;
  --workbench-border-soft: #dde3ea;
  --workbench-text: #111827;
  --workbench-muted: #5f6b7a;
  --workbench-accent: #007783;
  --workbench-accent-dark: #005b65;
  --workbench-primary: #0f172a;
  --workbench-radius: 5px;
  background: var(--workbench-bg);
}

.jupyter-page .jupyter-nav {
  min-height: 56px;
  padding: 0 18px;
  background: #ffffff;
  border-bottom: 1px solid var(--workbench-border-soft);
  box-shadow: none;
  backdrop-filter: none;
}

.jupyter-page .back-home-link {
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: var(--workbench-radius);
  background: transparent;
  color: #0f2b46;
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 750;
}

.jupyter-page .back-home-link:hover {
  border-color: var(--workbench-border);
  background: #f7f9fb;
}

.jupyter-page.login-mode {
  --workbench-bg: #020510;
  background: #020510;
}

.jupyter-page.login-mode .jupyter-nav {
  position: fixed;
  top: 0;
  z-index: 40;
  min-height: 72px;
  height: 72px;
  padding: 0 2rem;
  background: linear-gradient(180deg, rgba(2, 5, 16, 0.82), rgba(2, 5, 16, 0));
  border-bottom: none;
  box-shadow: none;
  backdrop-filter: none;
}

.jupyter-page.login-mode .back-home-link {
  min-height: 38px;
  padding: 0 0.95rem;
  border: 1px solid rgba(155, 190, 226, 0.28);
  border-radius: 8px;
  background: rgba(7, 16, 34, 0.42);
  color: rgba(234, 243, 255, 0.92);
  box-shadow: none;
  backdrop-filter: blur(12px);
}

.jupyter-page.login-mode .back-home-link:hover {
  color: #ffffff;
  border-color: rgba(129, 196, 255, 0.58);
  background: rgba(20, 46, 82, 0.56);
}

.jupyter-page.login-mode .login-card {
  --login-glass-radius: 14px;
  width: min(610px, 100%);
  border-radius: var(--login-glass-radius);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.17), rgba(255, 255, 255, 0.07) 34%, rgba(15, 28, 50, 0.46) 100%),
    rgba(20, 32, 54, 0.6);
  border-color: rgba(220, 235, 255, 0.26);
  border-top-color: rgba(255, 255, 255, 0.42);
  border-left-color: rgba(255, 255, 255, 0.28);
  box-shadow:
    0 30px 90px rgba(0, 0, 0, 0.38),
    0 12px 34px rgba(39, 107, 184, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.34),
    inset 0 -1px 0 rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(34px) saturate(180%) brightness(1.06);
  -webkit-backdrop-filter: blur(34px) saturate(180%) brightness(1.06);
}

.jupyter-page.login-mode .login-input {
  border-radius: 0;
}

.jupyter-page.login-mode .opengms-login-btn {
  border-radius: 0;
  background: #8bd7ff;
  color: #102033;
  font-weight: 850;
}

.jupyter-page.login-mode .opengms-login-btn:hover:not(:disabled) {
  background: #a6e2ff;
  color: #102033;
}

.jupyter-page.login-mode .social-login-btn {
  border-radius: 0;
}

@media (max-width: 640px) {
  .jupyter-page.login-mode .login-card {
    width: calc(100vw - 2rem);
    max-width: calc(100vw - 2rem);
    padding: 1.6rem;
  }
}

.jupyter-page .workspace-avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--workbench-radius);
  box-shadow: none;
}

.jupyter-page .dashboard-layout {
  grid-template-columns: 232px minmax(0, 1fr);
  min-height: calc(100vh - 56px);
}

.jupyter-page .sidebar {
  top: 56px;
  height: calc(100vh - 56px);
  padding: 0;
  background: var(--workbench-sidebar);
  border-right: 1px solid var(--workbench-border);
  box-shadow: none;
}

.jupyter-page .sidebar-user {
  min-height: 84px;
  margin: 0;
  padding: 16px;
  border-bottom: 1px solid var(--workbench-border);
}

.jupyter-page .user-avatar {
  width: 36px;
  height: 36px;
  flex-basis: 36px;
  border-radius: var(--workbench-radius);
  background: #0f2b46;
}

.jupyter-page .sidebar-nav {
  padding: 14px 0;
}

.jupyter-page .nav-section {
  margin-bottom: 18px;
}

.jupyter-page .nav-section-title {
  padding: 0 16px;
  margin-bottom: 6px;
  color: #697482;
  font-size: 0.68rem;
  letter-spacing: 0.12em;
}

.jupyter-page .nav-item {
  min-height: 38px;
  padding: 0 16px;
  gap: 10px;
  color: #3f4856;
  font-size: 0.82rem;
  font-weight: 760;
  letter-spacing: 0.015em;
  text-transform: none;
}

.jupyter-page .nav-icon,
.jupyter-page .logout-btn .nav-icon {
  width: 18px;
  height: 18px;
}

.jupyter-page .nav-item:hover {
  background: rgba(255, 255, 255, 0.62);
  color: var(--workbench-text);
}

.jupyter-page .nav-item.active {
  background: #ffffff;
  color: var(--workbench-accent);
}

.jupyter-page .nav-item.active::before {
  width: 3px;
  border-radius: 0;
  background: var(--workbench-accent);
}

.jupyter-page .sidebar-footer {
  padding: 12px 14px;
  border-top: 1px solid var(--workbench-border);
}

.jupyter-page .logout-btn {
  min-height: 38px;
  border: 1px solid #bfc8d3;
  border-radius: var(--workbench-radius);
  background: #ffffff;
  color: #243142;
  font-family: inherit;
  font-size: 0.84rem;
  font-weight: 780;
  box-shadow: none;
}

.jupyter-page .logout-btn:hover {
  border-color: #9aa8b8;
  background: #f7f9fb;
  color: #0f172a;
}

.jupyter-page .main-content {
  background: var(--workbench-bg);
}

.jupyter-page .content-header {
  border-bottom: 1px solid var(--workbench-border-soft);
}

.jupyter-page .dashboard-action-btn {
  min-height: 38px;
  padding: 0 13px;
  border-radius: var(--workbench-radius);
  font-family: inherit;
  font-weight: 780;
  letter-spacing: 0;
  box-shadow: none;
}

.jupyter-page .dashboard-action-btn svg {
  width: 16px;
  height: 16px;
}

.jupyter-page .dashboard-action-btn.primary {
  border: 1px solid var(--workbench-primary);
  background: var(--workbench-primary);
  color: #ffffff;
}

.jupyter-page .dashboard-action-btn.primary:hover {
  border-color: #1f2937;
  background: #1f2937;
  box-shadow: none;
  transform: none;
}

.jupyter-page .project-activity-card {
  grid-template-columns: 72px minmax(0, 1fr) 170px;
  align-items: center;
  border-color: var(--workbench-border);
  border-radius: var(--workbench-radius);
  background: transparent;
}

.jupyter-page .project-activity-card:hover {
  background: rgba(255, 255, 255, 0.55);
  border-color: #aeb9c6;
}

.jupyter-page .project-mark,
.jupyter-page .project-mark.large {
  width: 64px;
  height: 64px;
  min-height: 64px;
  border-radius: var(--workbench-radius);
  overflow: hidden;
}

.jupyter-page .project-mark-kicker {
  max-width: 100%;
  overflow: hidden;
  font-size: 0.56rem;
  letter-spacing: 0.045em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.jupyter-page .project-chip-row {
  min-width: 0;
  max-width: 100%;
  gap: 6px;
}

.jupyter-page .project-meaning-badge {
  max-width: 100%;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 3px;
  font-size: 0.66rem;
  letter-spacing: 0.055em;
  line-height: 1;
  white-space: nowrap;
}

.jupyter-page .project-open-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: auto;
  min-width: 156px;
  min-height: 40px;
  padding: 0 14px;
  border-radius: var(--workbench-radius);
  font-family: inherit;
  font-size: 0.86rem;
  font-weight: 780;
  letter-spacing: 0;
  box-shadow: none;
}

.jupyter-page .project-open-btn.primary {
  border-color: #1552cf;
  background: #1552cf;
  color: #ffffff;
}

.jupyter-page .project-open-btn.ghost {
  border-color: #c9d3e6;
  background: #eef3ff;
  color: #172033;
}

.jupyter-page .project-open-btn:hover {
  background: #123f9e;
  border-color: #123f9e;
  color: #ffffff;
  filter: none;
}

.jupyter-page .toolbar-btn,
.jupyter-page .toolbar-btn.upload {
  min-height: 34px;
  padding: 0 11px;
  border: 1px solid var(--workbench-border);
  border-radius: var(--workbench-radius);
  background: #ffffff;
  color: #253246;
  font-family: inherit;
  font-weight: 740;
  box-shadow: none;
}

.jupyter-page .toolbar-btn .btn-icon,
.jupyter-page .toolbar-btn .btn-icon svg {
  width: 16px;
  height: 16px;
}

.jupyter-page .toolbar-btn:hover:not(:disabled),
.jupyter-page .toolbar-btn.upload:hover:not(:disabled) {
  border-color: #9aa8b8;
  background: #f7f9fb;
  color: #111827;
  transform: none;
  box-shadow: none;
}

.jupyter-page .current-path {
  border-radius: var(--workbench-radius);
}
</style>
