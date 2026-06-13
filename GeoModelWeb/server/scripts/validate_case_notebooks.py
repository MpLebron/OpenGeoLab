#!/usr/bin/env python3
"""Validate OpenGeoLab case notebooks after execution."""

from __future__ import annotations

import json
import sys
from pathlib import Path


def validate_notebook(path: Path) -> list[str]:
    errors: list[str] = []
    notebook = json.loads(path.read_text(encoding="utf-8"))
    code_cells = [
        (index, cell)
        for index, cell in enumerate(notebook.get("cells", []))
        if cell.get("cell_type") == "code"
    ]

    if not code_cells:
        errors.append(f"{path}: no code cells found")
        return errors

    for index, cell in code_cells:
        outputs = cell.get("outputs", [])
        if cell.get("execution_count") is None:
            errors.append(f"{path}: code cell {index} has no execution_count")
        if not outputs:
            errors.append(f"{path}: code cell {index} has no outputs")
        for output in outputs:
            if output.get("output_type") == "error":
                errors.append(
                    f"{path}: code cell {index} raised "
                    f"{output.get('ename', 'Error')}: {output.get('evalue', '')}"
                )

    return errors


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print("Usage: validate_case_notebooks.py NOTEBOOK.ipynb [...]", file=sys.stderr)
        return 2

    all_errors: list[str] = []
    for raw_path in argv[1:]:
        path = Path(raw_path)
        if not path.exists():
            all_errors.append(f"{path}: file does not exist")
            continue
        all_errors.extend(validate_notebook(path))

    if all_errors:
        print("\n".join(all_errors), file=sys.stderr)
        return 1

    print(f"Validated {len(argv) - 1} notebook(s): all code cells executed with outputs.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
