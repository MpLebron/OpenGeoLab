"""OpenGeoLab Data Method helper for generated notebooks."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Mapping, Optional, Set, Union

import requests


DEFAULT_API_BASE = "http://host.docker.internal:3000/api"


def run_datamethod(
    method_name: str,
    params: Optional[Mapping[str, Any]] = None,
    api_base: Optional[str] = None,
    output_dir: Optional[Union[str, Path]] = None,
    session: Optional[Any] = None,
) -> Dict[str, Any]:
    """Execute an OpenGMS Data Method through the OpenGeoLab backend.

    Parameters are keyed by the method flag names shown in the JupyterLab form.
    File inputs are uploaded automatically when the value points to an existing
    local file. Output parameters are passed to the backend by stem name and are
    used as local filenames when downloadable outputs are returned.
    """

    http = session or requests.Session()
    base = _api_base(api_base)
    param_values = dict(params or {})

    info = _get_method_info(http, base, method_name)
    method_id = info.get("method", {}).get("id") or info.get("method", {}).get("_id")
    if method_id is None:
        raise RuntimeError(f"Data method '{method_name}' did not include a method id")

    param_type = info.get("paramType") or {}
    file_keys = list(param_type.get("FileInput") or [])
    output_keys = list(param_type.get("Output") or [])
    param_keys = list(param_type.get("ParamInput") or [])
    ordered_keys = _unique(file_keys + output_keys + param_keys + list(param_values.keys()))

    file_key_set = set(file_keys)
    output_key_set = set(output_keys)
    output_targets: Dict[str, Path] = {}
    inputs: Dict[str, Any] = {}

    for key in ordered_keys:
        if key not in param_values:
            continue
        value = param_values[key]

        if key in file_key_set and _is_existing_file(value):
            inputs[key] = _upload_file(http, base, Path(value))
        elif key in output_key_set:
            local_path = _resolve_output_path(value, output_dir)
            output_targets[key] = local_path
            inputs[key] = local_path.stem
        else:
            inputs[key] = value

    result = _post_json(http, f"{base}/datamethods/run", {
        "modelId": method_id,
        "inputs": inputs,
    })
    if result.get("status") != "success":
        raise RuntimeError(result.get("message") or result.get("error") or f"Data method '{method_name}' failed")

    downloaded = _download_outputs(http, result.get("output") or {}, output_targets, output_dir)
    return {
        "status": "success",
        "method": method_name,
        "method_id": method_id,
        "inputs": inputs,
        "outputs": downloaded,
        "raw_output": result.get("output") or {},
        "info": result.get("info", ""),
    }


def _api_base(api_base: Optional[str]) -> str:
    return (api_base or os.environ.get("OPENGEOLAB_API") or DEFAULT_API_BASE).rstrip("/")


def _get_method_info(http: Any, base: str, method_name: str) -> Dict[str, Any]:
    response = http.get(f"{base}/datamethods/info/{method_name}", timeout=30)
    response.raise_for_status()
    payload = response.json()
    if payload.get("code") not in (0, None):
        raise RuntimeError(payload.get("msg") or payload.get("message") or f"Failed to load data method '{method_name}'")
    return payload


def _post_json(http: Any, url: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    response = http.post(
        url,
        data=json.dumps(payload),
        headers={"Content-Type": "application/json"},
        timeout=120,
    )
    response.raise_for_status()
    return response.json()


def _upload_file(http: Any, base: str, path: Path) -> str:
    with path.open("rb") as file_obj:
        response = http.post(
            f"{base}/upload",
            files={"file": (path.name, file_obj)},
            timeout=120,
        )
    response.raise_for_status()
    payload = response.json()
    file_id = payload.get("id") or payload.get("data", {}).get("id")
    if payload.get("status") != "success" or not file_id:
        raise RuntimeError(payload.get("error") or f"File upload failed for {path}")
    return file_id


def _download_outputs(
    http: Any,
    output_info: Mapping[str, Any],
    output_targets: Mapping[str, Path],
    output_dir: Optional[Union[str, Path]],
) -> Dict[str, List[str]]:
    downloaded: Dict[str, List[str]] = {}
    for key, value in output_info.items():
        values = value if isinstance(value, list) else [value]
        targets: List[str] = []
        for index, url_or_id in enumerate([item for item in values if item]):
            target = _target_for_output(key, index, len(values), output_targets, output_dir, url_or_id)
            _download_file(http, str(url_or_id), target)
            targets.append(str(target))
        if targets:
            downloaded[key] = targets
    return downloaded


def _download_file(http: Any, url: str, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    response = http.get(url, timeout=120)
    response.raise_for_status()
    target.write_bytes(response.content)


def _target_for_output(
    key: str,
    index: int,
    total: int,
    output_targets: Mapping[str, Path],
    output_dir: Optional[Union[str, Path]],
    url_or_id: Any,
) -> Path:
    base = output_targets.get(key)
    if base is None:
        suffix = _suffix_from_value(url_or_id)
        base_name = f"{_safe_stem(key)}{suffix}"
        base = Path(output_dir or ".") / base_name
    if total <= 1:
        return base
    return base.with_name(f"{base.stem}_{index + 1}{base.suffix}")


def _resolve_output_path(value: Any, output_dir: Optional[Union[str, Path]]) -> Path:
    raw = str(value or "output.dat")
    path = Path(raw)
    if output_dir and not path.is_absolute():
        return Path(output_dir) / path.name
    return path


def _is_existing_file(value: Any) -> bool:
    try:
        return Path(value).is_file()
    except (TypeError, ValueError):
        return False


def _suffix_from_value(value: Any) -> str:
    suffix = Path(str(value)).suffix
    return suffix if suffix else ".dat"


def _safe_stem(value: str) -> str:
    safe = "".join(ch if ch.isalnum() or ch in ("-", "_") else "-" for ch in str(value).strip())
    return safe.strip("-_") or "output"


def _unique(values: List[str]) -> List[str]:
    seen: Set[str] = set()
    result: List[str] = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        result.append(value)
    return result
