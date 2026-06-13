/**
 * Type Definitions
 */

// Parameter options (for dropdown selection)
export interface IParamOption {
  label: string;
  value: string | number;
}

// Parameter definition
export interface IParameter {
  name: string;
  sdkName?: string;
  label?: string;
  type: 'string' | 'number' | 'boolean' | 'file' | 'select' | 'textarea';
  description?: string;
  required?: boolean;
  default?: any;
  defaultValue?: any;  // Default value
  placeholder?: string;
  // Number type specific
  min?: number;
  max?: number;
  step?: number;
  // Select type specific
  options?: IParamOption[];
}

// Model definition
export interface IModel {
  id: string;
  name: string;
  displayName?: string;
  display_name?: string;
  description?: string;
  author?: string;
  type?: 'model';
  parameters?: IParameter[];
  // OpenGMS specific fields
  md5?: string;
  mdlJson?: any;
  tags?: string[];
  status?: string;
  deploy?: boolean;
  online?: boolean;
  healthText?: string;
  viewCount?: number;
  invokeCount?: number;
  createTime?: string;
  lastModifyTime?: string;
  externalUrl?: string;
  parameterParseStatus?: 'parsed' | 'failed';
  syncError?: string | null;
}

// Data method definition
export interface IDataMethod {
  id: string | number;
  name: string;
  description?: string;
  author?: string;
  type?: 'datamethod';
  parameters?: IParameter[];
  // Specific fields
  toolId?: string;
  tags?: string[];
  engine?: string;
  execution?: string;
  methodType?: string;
  category?: string;
  createTime?: string;
  inputCount?: number;
  outputCount?: number;
  optionCount?: number;
  paramCount?: number;
  inputKinds?: string[];
  outputKinds?: string[];
}

export interface ICloudDataItem {
  id: string | number;
  name: string;
  filename?: string;
  kind?: 'file' | 'folder';
  type?: string;
  extension?: string;
  path?: string;
  parentId?: string | number | null;
  description?: string;
  size?: number;
  source?: string;
  downloadable?: boolean;
  uploadedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
}

export interface IProjectDataBinding {
  id: string;
  dataId: string | number;
  name: string;
  sourcePath?: string;
  mountPath: string;
  localPath?: string;
  mode?: string;
  bindingType?: string;
  status?: string;
  sourceAvailable?: boolean;
  materialized?: boolean;
  materializedAt?: string;
  downloadable?: boolean;
  url?: string;
  error?: string;
  metadata?: Record<string, any>;
  sourceItem?: ICloudDataItem | null;
}

// API Response
export interface IApiResponse<T> {
  data: T[];
  total: number;
  page: number;
}

// API Configuration
export interface IApiConfig {
  baseUrl: string;
  token?: string;
}
