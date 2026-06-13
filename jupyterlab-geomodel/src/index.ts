/**
 * JupyterLab GeoModel Extension
 *
 * Main entry file - Register extension and sidebar panels
 * - Left sidebar: JupyterLab File Browser remains the primary navigation
 * - Right sidebar: OpenGeoLab Resources Panel
 * - Header: Brand top bar
 * - Main area: Welcome page
 * - Launcher: Brand cards
 */
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILayoutRestorer
} from '@jupyterlab/application';

import { INotebookTracker } from '@jupyterlab/notebook';
import { ILauncher } from '@jupyterlab/launcher';
import { LabIcon } from '@jupyterlab/ui-components';
import { GeoModelWidget } from './widget';
import { AgentWidget } from './agentWidget';
import { WelcomeWidget } from './welcomePage';
import { FAVICON_BASE64 } from './assets';

// GeoModel icon SVG
const geoModelIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
</svg>`;

// AI Agent icon SVG
const agentIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5A2.5 2.5 0 0 0 7.5 18a2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5a2.5 2.5 0 0 0 2.5 2.5a2.5 2.5 0 0 0 2.5-2.5a2.5 2.5 0 0 0-2.5-2.5z"/>
</svg>`;

const geoModelIcon = new LabIcon({
  name: 'geomodel:icon',
  svgstr: geoModelIconSvg
});

const agentIcon = new LabIcon({
  name: 'geomodel:agent-icon',
  svgstr: agentIconSvg
});

/**
 * Extension ID
 */
const EXTENSION_ID = 'jupyterlab-geomodel:plugin';

/**
 * Command IDs
 */
const CommandIds = {
  openTools: 'geomodel:open-tools',
  openAgent: 'geomodel:open-agent'
};

/**
 * Main plugin definition
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: EXTENSION_ID,
  autoStart: true,
  requires: [INotebookTracker],
  optional: [ILayoutRestorer, ILauncher],
  activate: (
    app: JupyterFrontEnd,
    notebookTracker: INotebookTracker,
    restorer: ILayoutRestorer | null,
    launcher: ILauncher | null
  ) => {
    console.log('JupyterLab GeoModel extension is activated!');

    // ==================== Right Sidebar: GeoModel Tools ====================
    const toolsWidget = new GeoModelWidget(notebookTracker);
    toolsWidget.id = 'geomodel-sidebar';
    toolsWidget.title.icon = geoModelIcon;
    toolsWidget.title.caption = 'OpenGeoLab';

    // Add to right sidebar
    app.shell.add(toolsWidget, 'right', { rank: 100 });

    // Register tools panel command
    app.commands.addCommand(CommandIds.openTools, {
      label: 'OpenGeoLab Panel',
      icon: geoModelIcon,
      execute: () => {
        app.shell.activateById(toolsWidget.id);
      }
    });

    // ==================== Left Sidebar: AI Agent ====================
    const agentWidget = new AgentWidget(notebookTracker, app);
    agentWidget.id = 'geomodel-agent';
    agentWidget.title.icon = agentIcon;
    agentWidget.title.caption = 'OpenGeoLab AI Agent (Developing)';

    // Add to left sidebar, but keep the File Browser as the default workspace panel.
    app.shell.add(agentWidget, 'left', { rank: 900 });

    // Register agent panel command
    app.commands.addCommand(CommandIds.openAgent, {
      label: 'OpenGeoLab AI Agent (Developing)',
      icon: agentIcon,
      execute: () => {
        app.shell.activateById(agentWidget.id);
      }
    });

    // ==================== Restorer ====================
    if (restorer) {
      restorer.add(toolsWidget, 'geomodel-sidebar');
      restorer.add(agentWidget, 'geomodel-agent');
    }

    // ==================== Launcher Brand Cards ====================
    if (launcher) {
      launcher.add({
        command: CommandIds.openAgent,
        category: 'OpenGeoLab',
        rank: 1
      });
      launcher.add({
        command: CommandIds.openTools,
        category: 'OpenGeoLab',
        rank: 2
      });
    }

    // ==================== Welcome Page ====================
    // Show branded welcome page after app is fully restored
    app.restored.then(() => {
      const welcomeWidget = new WelcomeWidget(app);
      app.shell.add(welcomeWidget, 'main');
      app.shell.activateById(welcomeWidget.id);

      // Use the scientific workbench layout by default:
      // files on the left, OpenGeoLab Resources on the right.
      _activateDefaultWorkspace(app, toolsWidget.id);

      // ==================== Brand: Replace JupyterLab Logo ====================
      _applyBranding(app);
    });

    console.log('OpenGeoLab: Tools panel added to right sidebar');
    console.log('OpenGeoLab: AI Agent panel added to left sidebar');
  }
};

/**
 * Restore the default OpenGeoLab workspace:
 * - JupyterLab file browser active on the left
 * - OpenGeoLab Resources active on the right
 * - AI Agent available but not foregrounded while it is still under development
 */
function _activateDefaultWorkspace(app: JupyterFrontEnd, resourcesWidgetId: string): void {
  let usedToggleFallback = false;

  const activate = () => {
    if (app.commands.hasCommand('filebrowser:activate')) {
      void app.commands.execute('filebrowser:activate');
    } else if (!usedToggleFallback && app.commands.hasCommand('filebrowser:toggle-main')) {
      usedToggleFallback = true;
      void app.commands.execute('filebrowser:toggle-main');
    }

    app.shell.activateById(resourcesWidgetId);
    _setDefaultPanelWidths(app);
  };

  requestAnimationFrame(() => {
    activate();
    // Lumino restores layout asynchronously; a second pass keeps the intended
    // side panels visible after saved layout restoration has finished.
    setTimeout(activate, 300);
  });
}

/**
 * Apply OpenGeoLab branding to the JupyterLab UI:
 * - Replace the JupyterLab logo with OpenGeoLab icon + text
 * - Replace favicon
 * - Update document title
 * - Add body class for CSS targeting
 */
function _applyBranding(app: JupyterFrontEnd): void {
  document.body.classList.add('opengeolab-branded');

  // 1. Replace the main logo (with retry since DOM may not be ready)
  _replaceLogo(0);

  // 2. Update page title
  document.title = 'OpenGeoLab';

  // 3. Replace favicon
  const favicons = document.querySelectorAll<HTMLLinkElement>('link.favicon, link[rel="icon"]');
  favicons.forEach((link) => {
    link.href = `data:image/x-icon;base64,${FAVICON_BASE64}`;
  });

  // 4. Monitor title changes and keep our brand
  const titleObserver = new MutationObserver(() => {
    if (!document.title.includes('OpenGeoLab')) {
      document.title = document.title.replace('JupyterLab', 'OpenGeoLab');
    }
  });
  const titleEl = document.querySelector('head > title');
  if (titleEl) {
    titleObserver.observe(titleEl, { childList: true, characterData: true, subtree: true });
  }

  // 5. Keep the side panels in a balanced modeling-workbench layout
  _setDefaultPanelWidths(app);

  console.log('OpenGeoLab: Branding applied');
}

/**
 * Replace the JupyterLab logo with retry mechanism.
 * The logo widget may not be rendered immediately.
 */
function _replaceLogo(attempt: number): void {
  const logoEl = document.getElementById('jp-MainLogo');
  if (logoEl) {
    // Clear existing content (the JupyterLab SVG)
    logoEl.classList.add('opengeolab-logo-replaced');
    logoEl.innerHTML = `
      <img class="opengeolab-main-logo"
           src="data:image/x-icon;base64,${FAVICON_BASE64}"
           alt="OpenGeoLab" />
      <span class="opengeolab-logo-text">OpenGeoLab</span>
    `;
    console.log('OpenGeoLab: Logo replaced successfully');
    return;
  }
  // Retry up to 20 times (2 seconds)
  if (attempt < 20) {
    setTimeout(() => _replaceLogo(attempt + 1), 100);
  } else {
    console.warn('OpenGeoLab: Could not find #jp-MainLogo after retries');
  }
}

/**
 * Set balanced side panel widths for the modeling workbench.
 * Uses interval-based retry to overcome Lumino layout recalculations.
 */
function _setDefaultPanelWidths(app: JupyterFrontEnd): void {
  let attempts = 0;
  const maxAttempts = 30;

  const interval = setInterval(() => {
    attempts++;
    try {
      const shell = app.shell as any;

      // Method 1: Access JupyterLab's internal horizontal SplitPanel
      const hsplit = shell._hsplitPanel || shell._splitPanel;
      if (hsplit && hsplit.layout && typeof hsplit.layout.setRelativeSizes === 'function') {
        hsplit.layout.setRelativeSizes([0.23, 0.53, 0.24]);
        console.log('OpenGeoLab: Side panel widths set via shell split panel');
        clearInterval(interval);
        return;
      }

      // Method 2: Walk DOM to find the SplitPanel containing sidebars
      const leftStack = document.getElementById('jp-left-stack');
      const rightStack = document.getElementById('jp-right-stack');
      if (leftStack) {
        const splitChild = leftStack.closest('.lm-SplitPanel-child') as HTMLElement;
        if (splitChild) {
          const splitPanel = splitChild.parentElement;
          if (splitPanel) {
            const splitWidget = (splitPanel as any).__Lumino_widget__ || (splitPanel as any).__Phosphor_widget__;
            if (splitWidget && splitWidget.layout && typeof splitWidget.layout.setRelativeSizes === 'function') {
              splitWidget.layout.setRelativeSizes([0.23, 0.53, 0.24]);
              console.log('OpenGeoLab: Side panel widths set via DOM walk');
              clearInterval(interval);
              return;
            }
          }
          // Fallback: force width via inline style
          const leftWidth = Math.floor(window.innerWidth * 0.23);
          splitChild.style.setProperty('width', leftWidth + 'px', 'important');
          console.log(`OpenGeoLab: Left panel width set to ${leftWidth}px via inline style`);

          if (rightStack) {
            const rightChild = rightStack.closest('.lm-SplitPanel-child') as HTMLElement;
            if (rightChild) {
              const rightWidth = Math.floor(window.innerWidth * 0.24);
              rightChild.style.setProperty('width', rightWidth + 'px', 'important');
              console.log(`OpenGeoLab: Right panel width set to ${rightWidth}px via inline style`);
            }
          }

          // Remove min-width after layout settles
          setTimeout(() => {
            splitChild.style.removeProperty('min-width');
          }, 1000);
          clearInterval(interval);
          return;
        }
      }

      if (attempts >= maxAttempts) {
        console.warn('OpenGeoLab: Could not set side panel widths after max attempts');
        clearInterval(interval);
      }
    } catch (e) {
      console.warn('OpenGeoLab: Failed to set side panel widths', e);
      clearInterval(interval);
    }
  }, 500);
}

export default plugin;
