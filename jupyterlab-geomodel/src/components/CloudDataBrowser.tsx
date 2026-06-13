/**
 * Cloud Data Browser - maps OpenGeoLab My Data assets into the current Jupyter project.
 */
import * as React from 'react';
import { ICloudDataItem, IProjectDataBinding } from '../types';

interface IProps {
  items: ICloudDataItem[];
  bindings: IProjectDataBinding[];
  loading: boolean;
  mappingIds: Set<string>;
  projectName: string;
  onMap: (item: ICloudDataItem) => void;
  onMaterialize: (binding: IProjectDataBinding) => void;
  onInsertPath: (binding: IProjectDataBinding) => void;
}

function getKind(item: ICloudDataItem): 'file' | 'folder' {
  return item.kind === 'folder' || item.type === 'folder' ? 'folder' : 'file';
}

function formatSize(size?: number): string {
  const bytes = Number(size || 0);
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function getBadge(item: ICloudDataItem): string {
  if (getKind(item) === 'folder') return 'DIR';
  const ext = String(item.extension || item.type || item.name.split('.').pop() || '')
    .replace(/^\./, '')
    .toUpperCase();
  return ext && ext !== item.name.toUpperCase() ? ext.slice(0, 4) : 'FILE';
}

function getUpdatedText(item: ICloudDataItem): string {
  const date = item.updatedAt || item.uploadedAt || item.createdAt;
  return date ? new Date(date).toLocaleDateString() : '--';
}

function findBinding(item: ICloudDataItem, bindings: IProjectDataBinding[]): IProjectDataBinding | null {
  return bindings.find(binding => String(binding.dataId) === String(item.id)) || null;
}

export const CloudDataBrowser: React.FC<IProps> = ({
  items,
  bindings,
  loading,
  mappingIds,
  projectName,
  onMap,
  onMaterialize,
  onInsertPath
}) => {
  if (loading) {
    return (
      <div className="geomodel-loading">
        <div className="spinner"></div>
        <p>Loading cloud data...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="geomodel-empty">
        <p>No cloud data assets found</p>
      </div>
    );
  }

  return (
    <div className="geomodel-list cloud-data-list">
      {!projectName && (
        <div className="cloud-project-warning">
          Project context is not available yet. You can browse My Data, but mapping requires opening JupyterLab from an OpenGeoLab project.
        </div>
      )}
      {items.map(item => {
        const kind = getKind(item);
        const binding = findBinding(item, bindings);
        const isMapped = Boolean(binding);
        const isReady = Boolean(binding?.materialized && (binding.localPath || binding.mountPath));
        const isMapping = mappingIds.has(String(item.id)) || (binding ? mappingIds.has(binding.id) : false);
        const canMap = Boolean(projectName) && kind === 'file' && Boolean(item.downloadable);
        const localPath = binding?.localPath || binding?.mountPath || '';

        return (
          <article key={String(item.id)} className={`geomodel-item cloud-data-item ${kind}`}>
            <div className="item-icon data-badge">{getBadge(item)}</div>
            <div className="item-info">
              <div className="item-title-row">
                <h4 className="item-name" title={item.name}>{item.name}</h4>
                {isMapped && (
                  <span className={`resource-chip ${isReady ? 'ready' : 'pending'}`}>
                    {isReady ? 'Mapped' : 'Attached'}
                  </span>
                )}
              </div>
              <p className="item-desc">
                {item.description || item.path || 'No description available'}
              </p>
              <div className="resource-chips">
                <span className="resource-chip">{kind === 'folder' ? 'Folder' : item.metadata?.formatLabel || getBadge(item)}</span>
                <span className="resource-chip">{item.source || 'OpenGeoLab'}</span>
                {item.downloadable ? <span className="resource-chip">Downloadable</span> : <span className="resource-chip muted">Cloud only</span>}
              </div>
              <div className="item-meta">
                <span>{item.path || '/'}</span>
                {kind === 'file' && <span>{formatSize(item.size)}</span>}
                <span>Updated {getUpdatedText(item)}</span>
              </div>
              {localPath && (
                <div className="local-path" title={localPath}>{localPath}</div>
              )}
              {binding?.error && (
                <div className="item-error">{binding.error}</div>
              )}
            </div>
            <div className="item-actions">
              {kind === 'folder' ? (
                <span className="action-note">Group</span>
              ) : isReady && binding ? (
                <button className="secondary-action" onClick={() => onInsertPath(binding)}>
                  Insert Path
                </button>
              ) : isMapped && binding ? (
                <button className="primary-action" disabled={isMapping || !binding.downloadable} onClick={() => onMaterialize(binding)}>
                  {isMapping ? 'Preparing' : 'Prepare'}
                </button>
              ) : (
                <button className="primary-action" disabled={!canMap || isMapping} onClick={() => onMap(item)}>
                  {isMapping ? 'Mapping' : canMap ? 'Map to Jupyter' : !projectName ? 'Project missing' : 'Unavailable'}
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
};
