/**
 * Model/Data Method Browser Component
 */
import * as React from 'react';
import { IModel, IDataMethod } from '../types';

interface IProps {
  items: (IModel | IDataMethod)[];
  loading: boolean;
  onSelect: (item: IModel | IDataMethod) => void;
  type: 'model' | 'datamethod';
}

export const ModelBrowser: React.FC<IProps> = ({ items, loading, onSelect, type }) => {
  if (loading) {
    return (
      <div className="geomodel-loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="geomodel-empty">
        <p>No {type === 'model' ? 'models' : 'data methods'} found</p>
      </div>
    );
  }

  return (
    <div className="geomodel-list">
      {items.map((item) => {
        const displayName = type === 'model'
          ? ((item as IModel).displayName || (item as IModel).display_name || item.name)
          : item.name;
        return (
        <div
          key={item.id}
          className="geomodel-item resource-item"
          onClick={() => onSelect(item)}
        >
          <div className={`item-icon ${type === 'model' ? 'model-badge' : 'method-badge'}`}>
            {type === 'model' ? 'M' : 'D'}
          </div>
          <div className="item-info">
            <div className="item-title-row">
              <h4 className="item-name" title={item.name}>{displayName}</h4>
              {renderPrimaryState(item, type)}
            </div>
            <p className="item-desc">
              {item.description || 'No description available'}
            </p>
            <div className="resource-chips">
              {renderChips(item, type)}
            </div>
            <div className="item-meta">
              {renderMeta(item, type)}
            </div>
          </div>
          <div className="item-arrow">›</div>
        </div>
        );
      })}
    </div>
  );
};

function renderPrimaryState(item: IModel | IDataMethod, type: 'model' | 'datamethod'): React.ReactNode {
  if (type === 'model') {
    const model = item as IModel;
    if (model.online) return <span className="resource-chip ready">Online</span>;
    if (model.deploy) return <span className="resource-chip">Deployed</span>;
    if (model.status) return <span className="resource-chip">{model.status}</span>;
    return <span className="resource-chip muted">OpenGMS</span>;
  }

  const method = item as IDataMethod;
  return <span className="resource-chip">{method.engine || method.methodType || 'Method'}</span>;
}

function renderChips(item: IModel | IDataMethod, type: 'model' | 'datamethod'): React.ReactNode[] {
  const chips: string[] = [];
  if (type === 'model') {
    const model = item as IModel;
    chips.push('Public');
    if (model.deploy) chips.push('Deployed');
    if (model.healthText && !model.online) chips.push(model.healthText);
    chips.push(...(model.tags || []).slice(0, 2));
  } else {
    const method = item as IDataMethod;
    chips.push(method.engine || 'OpenGMS');
    if (method.execution) chips.push(method.execution);
    if (method.methodType) chips.push(method.methodType);
    chips.push(...(method.tags || method.inputKinds || []).slice(0, 3));
  }

  return Array.from(new Set(chips.filter(Boolean))).slice(0, 5).map(chip => (
    <span key={chip} className="resource-chip">{chip}</span>
  ));
}

function renderMeta(item: IModel | IDataMethod, type: 'model' | 'datamethod'): React.ReactNode[] {
  if (type === 'model') {
    const model = item as IModel;
    return [
      <span key="author">{model.author || 'Unknown'}</span>,
      <span key="views">{model.viewCount || 0} views</span>,
      <span key="runs">{model.invokeCount || 0} runs</span>,
      <span key="updated">Updated {formatDate(model.lastModifyTime || model.createTime)}</span>
    ];
  }

  const method = item as IDataMethod;
  return [
    <span key="author">{method.author || 'Unknown'}</span>,
    <span key="inputs">Inputs {method.inputCount || 0}</span>,
    <span key="outputs">Outputs {method.outputCount || 0}</span>,
    <span key="params">Params {method.optionCount || method.paramCount || 0}</span>,
    <span key="created">Updated {formatDate(method.createTime)}</span>
  ];
}

function formatDate(value?: string): string {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString();
}
