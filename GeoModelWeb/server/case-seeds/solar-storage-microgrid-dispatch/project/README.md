# Solar Storage Microgrid Dispatch

A multi-stage microgrid dispatch and scenario planning notebook.

## Data
- `data/` - Bundled local inputs. The notebook does not download external data.
- `outputs/` - Created when the notebook is executed.

## Workflow
1. Load a week-long demand, PV, temperature, tariff, and critical-load dataset.
2. Diagnose load shape, solar coincidence, ramps, and price exposure.
3. Build a baseline grid-import cost and emissions inventory.
4. Formulate a storage dispatch optimization with state-of-charge constraints.
5. Solve multiple PV and battery scenarios with scipy/HiGHS-style linear programming.
6. Compare cost, peak import, PV curtailment, and resilience metrics.
7. Allocate benefits across districts using peak-share and critical-load weights.
8. Export dispatch schedules, scenario tables, and visual diagnostics.

## Reference Workflows
- PyPSA overview: https://pypsa.org/
- PyPSA optimal power flow docs: https://docs.pypsa.org/
- pvlib Python project: https://pvlib-python.readthedocs.io/

## Source Notes
This case is a local, reproducible OpenGeoLab adaptation of mature public geospatial workflows. It does not copy third-party notebooks or require remote data at runtime.
