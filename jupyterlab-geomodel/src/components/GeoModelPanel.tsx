/**
 * GeoModel Main Panel Component
 */
import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { INotebookTracker } from '@jupyterlab/notebook';
import { ModelBrowser } from './ModelBrowser';
import { CloudDataBrowser } from './CloudDataBrowser';
import { ParameterForm } from './ParameterForm';
import { CodePreview } from './CodePreview';
import {
  fetchModels, fetchDataMethods, fetchMyModels, fetchMyDataMethods,
  fetchModelDetail, fetchDataMethodDetail, fetchMyData, fetchProjectDataBindings,
  attachProjectData, materializeProjectData, getProjectName, resolveProjectName,
  isAuthenticated, IPaginatedResult
} from '../services/api';
import { generateModelCode, generateDataMethodCode, generateCloudDataPathCode } from '../utils/codeGenerator';
import { IModel, IDataMethod, ICloudDataItem, IProjectDataBinding } from '../types';

interface IProps {
  notebookTracker: INotebookTracker;
}

type TabType = 'model' | 'datamethod' | 'clouddata';
type SourceType = 'all' | 'personal';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export const GeoModelPanel: React.FC<IProps> = ({ notebookTracker }) => {
  // State
  const [activeTab, setActiveTab] = useState<TabType>('model');
  const [source, setSource] = useState<SourceType>('all');
  const [items, setItems] = useState<(IModel | IDataMethod)[]>([]);
  const [cloudDataItems, setCloudDataItems] = useState<ICloudDataItem[]>([]);
  const [projectDataBindings, setProjectDataBindings] = useState<IProjectDataBinding[]>([]);
  const [mappingIds, setMappingIds] = useState<Set<string>>(new Set());
  const [cloudError, setCloudError] = useState('');
  const [projectName, setProjectName] = useState(getProjectName());
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [authWarning, setAuthWarning] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const pageSize = 20;

  // Debounced search query (300ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Selected item (with full details)
  const [selectedItem, setSelectedItem] = useState<IModel | IDataMethod | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Parameter values
  const [paramValues, setParamValues] = useState<Record<string, any>>({});

  // Generated code
  const [generatedCode, setGeneratedCode] = useState('');

  // Reset page when search query or tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, activeTab, source]);

  useEffect(() => {
    if (projectName) return;

    let cancelled = false;
    resolveProjectName().then(resolvedName => {
      if (!cancelled && resolvedName) {
        setProjectName(resolvedName);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [projectName]);

  // Load data
  useEffect(() => {
    loadItems();
  }, [activeTab, source, debouncedSearchQuery, currentPage, projectName]);

  const loadItems = async () => {
    setLoading(true);
    setAuthWarning(false);
    setCloudError('');
    try {
      if (activeTab === 'clouddata') {
        if (!isAuthenticated()) {
          setAuthWarning(true);
          setCloudDataItems([]);
          setProjectDataBindings([]);
          setTotalItems(0);
          setTotalPages(0);
          return;
        }

        const [dataItems, bindings] = await Promise.all([
          fetchMyData(),
          fetchProjectDataBindings(projectName)
        ]);
        setCloudDataItems(dataItems);
        setProjectDataBindings(bindings);
        setItems([]);
        setTotalItems(dataItems.length);
        setTotalPages(1);
        return;
      }

      if (activeTab === 'model') {
        if (source === 'all') {
          const result = await fetchModels(debouncedSearchQuery, currentPage, pageSize);
          setItems(result.data);
          setTotalItems(result.total);
          setTotalPages(result.totalPages);
        } else {
          if (!isAuthenticated()) {
            setAuthWarning(true);
            setItems([]);
            setTotalItems(0);
            setTotalPages(0);
          } else {
            const data = await fetchMyModels();
            setItems(data);
            setTotalItems(data.length);
            setTotalPages(1);
          }
        }
      } else {
        if (source === 'all') {
          const result = await fetchDataMethods(debouncedSearchQuery, currentPage, pageSize);
          setItems(result.data);
          setTotalItems(result.total);
          setTotalPages(result.totalPages);
        } else {
          if (!isAuthenticated()) {
            setAuthWarning(true);
            setItems([]);
            setTotalItems(0);
            setTotalPages(0);
          } else {
            const data = await fetchMyDataMethods();
            setItems(data);
            setTotalItems(data.length);
            setTotalPages(1);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load items:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCloudDataItems = cloudDataItems.filter(item => {
    const query = debouncedSearchQuery.trim().toLowerCase();
    if (!query) return true;
    return [
      item.name,
      item.filename,
      item.description,
      item.path,
      item.type,
      item.metadata?.formatLabel,
      item.metadata?.domain
    ].some(value => String(value || '').toLowerCase().includes(query));
  });

  // Select item - load detailed info
  const handleSelectItem = async (item: IModel | IDataMethod) => {
    setLoadingDetail(true);
    setParamValues({});
    setGeneratedCode('');

    try {
      let detail: IModel | IDataMethod | null = null;

      // Use name as ID to get details
      const itemName = item.name || item.id;

      if (activeTab === 'model') {
        detail = await fetchModelDetail(String(itemName));
      } else {
        detail = await fetchDataMethodDetail(String(itemName));
      }

      if (detail) {
        setSelectedItem(detail);
        console.log('[GeoModel] Loaded detail with parameters:', detail.parameters);

        // Generate initial code immediately
        const initialCode = activeTab === 'model'
          ? generateModelCode(detail as IModel, {})
          : generateDataMethodCode(detail as IDataMethod, {});
        setGeneratedCode(initialCode);
      } else {
        // If getting details failed, use original data
        setSelectedItem(item);
        console.warn('[GeoModel] Failed to load detail, using original item');

        // Use original data to generate code
        const initialCode = activeTab === 'model'
          ? generateModelCode(item as IModel, {})
          : generateDataMethodCode(item as IDataMethod, {});
        setGeneratedCode(initialCode);
      }
    } catch (error) {
      console.error('Failed to load item detail:', error);
      setSelectedItem(item);

      // Generate basic code even on error
      const initialCode = activeTab === 'model'
        ? generateModelCode(item as IModel, {})
        : generateDataMethodCode(item as IDataMethod, {});
      setGeneratedCode(initialCode);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Back to list
  const handleBack = () => {
    setSelectedItem(null);
    setParamValues({});
    setGeneratedCode('');
  };

  // Parameter value change
  const handleParamChange = (name: string, value: any) => {
    const newValues = { ...paramValues, [name]: value };
    setParamValues(newValues);

    // Generate code preview in realtime
    if (selectedItem) {
      const code = activeTab === 'model'
        ? generateModelCode(selectedItem as IModel, newValues)
        : generateDataMethodCode(selectedItem as IDataMethod, newValues);
      setGeneratedCode(code);
    }
  };

  const insertCodeCell = (code: string): boolean => {
    const notebook = notebookTracker.currentWidget;
    if (!notebook || !code) {
      alert('Please open a Notebook first');
      return false;
    }

    const notebookModel = notebook.content.model;
    if (!notebookModel) {
      return false;
    }

    const activeCellIndex = notebook.content.activeCellIndex;
    notebookModel.sharedModel.insertCell(activeCellIndex + 1, {
      cell_type: 'code',
      source: code
    });
    notebook.content.activeCellIndex = activeCellIndex + 1;
    return true;
  };

  // Insert code into Notebook
  const handleInsertCode = async () => {
    if (!generatedCode) {
      alert('Please generate code first');
      return;
    }

    const notebook = notebookTracker.currentWidget;
    if (!notebook) {
      alert('Please open a Notebook first');
      return;
    }

    if (insertCodeCell(generatedCode)) {
      console.log('Code inserted successfully!');
    }
  };

  const handleMapCloudData = async (item: ICloudDataItem) => {
    if (!projectName) {
      alert('Open JupyterLab from an OpenGeoLab project to map cloud data.');
      return;
    }

    const key = String(item.id);
    setMappingIds(prev => new Set(prev).add(key));
    setCloudError('');
    try {
      const result = await attachProjectData(projectName, item.id);
      setProjectDataBindings(result.dataBindings);
    } catch (error: any) {
      setCloudError(error.message || 'Failed to map cloud data');
    } finally {
      setMappingIds(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleMaterializeCloudData = async (binding: IProjectDataBinding) => {
    const key = binding.id;
    setMappingIds(prev => new Set(prev).add(key));
    setCloudError('');
    try {
      const result = await materializeProjectData(projectName, binding.id);
      setProjectDataBindings(result.dataBindings);
    } catch (error: any) {
      setCloudError(error.message || 'Failed to prepare Project Data');
    } finally {
      setMappingIds(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleInsertCloudDataPath = (binding: IProjectDataBinding) => {
    insertCodeCell(generateCloudDataPathCode(binding));
  };

  return (
    <div className="geomodel-panel">
      {/* Header */}
      <div className="geomodel-header">
        <h2>OpenGeoLab Resources</h2>
        <p>Models, methods, and cloud data for notebook workflows</p>
      </div>

      {/* Tab Switch */}
      <div className="geomodel-tabs">
        <button
          className={`tab-btn ${activeTab === 'model' ? 'active' : ''}`}
          onClick={() => { setActiveTab('model'); setSelectedItem(null); }}
        >
          Model
        </button>
        <button
          className={`tab-btn ${activeTab === 'datamethod' ? 'active' : ''}`}
          onClick={() => { setActiveTab('datamethod'); setSelectedItem(null); }}
        >
          Data Method
        </button>
        <button
          className={`tab-btn ${activeTab === 'clouddata' ? 'active' : ''}`}
          onClick={() => { setActiveTab('clouddata'); setSelectedItem(null); }}
        >
          Cloud Data
        </button>
      </div>

      {/* Main Content Area */}
      {!selectedItem ? (
        <>
          {activeTab !== 'clouddata' ? (
            <div className="geomodel-source">
              <label>
                <input
                  type="radio"
                  name="source"
                  value="all"
                  checked={source === 'all'}
                  onChange={() => setSource('all')}
                />
                All
              </label>
              <label>
                <input
                  type="radio"
                  name="source"
                  value="personal"
                  checked={source === 'personal'}
                  onChange={() => setSource('personal')}
                />
                My Favorites
              </label>
            </div>
          ) : (
            <div className="geomodel-source cloud-source">
              <span>Project: {projectName || 'Unknown'}</span>
              <span>{projectDataBindings.length} mapped</span>
            </div>
          )}

          {/* Search Box */}
          <div className="geomodel-search">
            <input
              type="text"
              placeholder={`Search ${activeTab === 'model' ? 'models' : activeTab === 'datamethod' ? 'data methods' : 'cloud data'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="search-clear"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>

          {/* Results count */}
          {!loading && source === 'all' && activeTab !== 'clouddata' && (
            <div className="geomodel-results-info">
              {searchQuery ? (
                <span>Found {totalItems} {activeTab === 'model' ? 'models' : 'data methods'} for "{searchQuery}"</span>
              ) : (
                <span>Total: {totalItems} {activeTab === 'model' ? 'models' : 'data methods'}</span>
              )}
            </div>
          )}

          {/* Unauthenticated Notice */}
          {authWarning && (
            <div className="geomodel-auth-warning">
              <p>Not logged in, cannot view personal resources</p>
              <p className="auth-hint">Please reopen Jupyter from OpenGeoLab to authenticate</p>
            </div>
          )}

          {cloudError && (
            <div className="geomodel-auth-warning error">
              <p>{cloudError}</p>
            </div>
          )}

          {/* List */}
          {activeTab === 'clouddata' ? (
            <CloudDataBrowser
              items={filteredCloudDataItems}
              bindings={projectDataBindings}
              loading={loading}
              mappingIds={mappingIds}
              projectName={projectName}
              onMap={handleMapCloudData}
              onMaterialize={handleMaterializeCloudData}
              onInsertPath={handleInsertCloudDataPath}
            />
          ) : (
            <ModelBrowser
              items={items}
              loading={loading}
              onSelect={handleSelectItem}
              type={activeTab as 'model' | 'datamethod'}
            />
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && activeTab !== 'clouddata' && (
            <div className="geomodel-pagination">
              <button
                className="page-btn"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                title="First page"
              >
                «
              </button>
              <button
                className="page-btn"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                ‹ Prev
              </button>
              <span className="page-info">
                Page {currentPage} / {totalPages}
              </span>
              <button
                className="page-btn"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next ›
              </button>
              <button
                className="page-btn"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                title="Last page"
              >
                »
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Back Button */}
          <div className="geomodel-back">
            <button onClick={handleBack}>← Back to List</button>
            <span className="item-name">{selectedItem.name}</span>
          </div>

          {loadingDetail ? (
            <div className="geomodel-loading">
              <div className="spinner"></div>
              <p>Loading parameter info...</p>
            </div>
          ) : (
            <>
              {/* Parameter Form */}
              <ParameterForm
                item={selectedItem}
                values={paramValues}
                onChange={handleParamChange}
                projectName={projectName}
              />

              {/* Code Preview */}
              <CodePreview code={generatedCode} />

              {/* Insert Button */}
              <div className="geomodel-actions">
                <button
                  className="insert-btn"
                  onClick={handleInsertCode}
                  disabled={!generatedCode}
                >
                  Insert Code
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
