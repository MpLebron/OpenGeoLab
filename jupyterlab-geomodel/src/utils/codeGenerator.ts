/**
 * Code Generator - Generate reproducible notebook code for OpenGeoLab resources.
 */
import { IModel, IDataMethod, IParameter } from '../types';

/**
 * Generate model invocation code using the PyGeoModel Core API.
 */
export function generateModelCode(model: IModel, paramValues: Record<string, any>): string {
  const resultDir = `data/results/${slugify(model.name) || 'model-run'}`;
  const lines: string[] = [
    '# OpenGMS model invocation via PyGeoModel',
    'from pathlib import Path',
    'from pygeomodel import GeoModeler',
    '',
    'modeler = GeoModeler()',
    '',
    'params = {',
    ...formatParamDict(model.parameters || [], paramValues, 'model'),
    '}',
    '',
    'result = modeler.invoke(',
    `    "${escapeString(model.name)}",`,
    '    params=params,',
    `    output_dir=Path("${escapeString(resultDir)}")`,
    ')',
    `result.to_json(Path("${escapeString(resultDir)}/run.json"))`,
    'result'
  ];

  return lines.join('\n');
}

/**
 * Generate data method invocation code using the packaged OpenGeoLab helper.
 */
export function generateDataMethodCode(method: IDataMethod, paramValues: Record<string, any>): string {
  const resultDir = `data/results/${slugify(method.name) || 'data-method-run'}`;
  const lines: string[] = [
    '# OpenGMS data method invocation via OpenGeoLab helper',
    'from pathlib import Path',
    'from jupyterlab_geomodel.datamethod import run_datamethod',
    ''
  ];

  lines.push(`# Data Method: ${method.name}`);
  if (method.description) {
    lines.push(`# ${method.description}`);
  }
  lines.push('');
  lines.push('params = {');
  lines.push(...formatParamDict(method.parameters || [], paramValues, 'datamethod'));
  lines.push('}');
  lines.push('');
  lines.push('result = run_datamethod(');
  lines.push(`    "${escapeString(method.name)}",`);
  lines.push('    params=params,');
  lines.push(`    output_dir=Path("${escapeString(resultDir)}")`);
  lines.push(')');
  lines.push('result');

  return lines.join('\n');
}

export function generateCloudDataPathCode(binding: any): string {
  const localPath = binding?.localPath || binding?.mountPath || '';
  const name = binding?.name || localPath || 'Project Data asset';

  return [
    '# OpenGeoLab Project Data',
    'from pathlib import Path',
    '',
    `data_path = Path("${escapeString(localPath)}")`,
    `print("${escapeString(name)}:", data_path)`,
    '',
    '# Use data_path in model or data method parameters.'
  ].join('\n');
}

/**
 * Generate simplified code for quick invocation previews.
 */
export function generateQuickCode(item: IModel | IDataMethod, paramValues: Record<string, any>): string {
  const isModel = 'md5' in item || item.type === 'model';
  return isModel
    ? generateModelCode(item as IModel, paramValues)
    : generateDataMethodCode(item as IDataMethod, paramValues);
}

function formatParamDict(parameters: IParameter[], paramValues: Record<string, any>, kind: 'model' | 'datamethod'): string[] {
  if (parameters.length === 0) {
    return ['    # Add input parameters here'];
  }

  return parameters.map((param) => {
    const key = param.sdkName || inferSdkParamName(param, kind);
    const value = normalizeParamValue(param, paramValues);
    const comment = param.label && param.label !== key ? `  # ${param.label}` : '';
    return `    "${escapeString(key)}": ${formatPythonValue(value, param.type || 'string')},${comment}`;
  });
}

function normalizeParamValue(param: IParameter, paramValues: Record<string, any>): any {
  const value = paramValues[param.name];
  if (value !== undefined && value !== '') {
    return value;
  }

  if (param.defaultValue !== undefined && param.defaultValue !== '') {
    return param.defaultValue;
  }

  if (param.default !== undefined && param.default !== '') {
    return param.default;
  }

  if (param.type === 'boolean') return false;
  if (param.type === 'number') return 0;
  if (param.type === 'file') return `data/${slugify(param.label || param.name) || 'input'}`;
  if (param.placeholder && /output/i.test(param.placeholder)) return `${slugify(param.label || param.name) || 'output'}.tif`;
  return '';
}

function inferSdkParamName(param: IParameter, kind: 'model' | 'datamethod'): string {
  if (kind === 'datamethod') return param.name;
  const parts = param.name.split('.');
  return parts[2] || parts[1] || param.name;
}

function formatPythonValue(value: any, type: string): string {
  switch (type) {
    case 'number':
      return Number.isFinite(Number(value)) ? String(value) : `"${escapeString(String(value))}"`;
    case 'boolean':
      return value ? 'True' : 'False';
    case 'string':
    case 'file':
    case 'textarea':
    case 'select':
    default:
      return `"${escapeString(String(value))}"`;
  }
}

function slugify(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Escape special characters in string
 */
function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}
