# Urban Accessibility Equity Scenarios

A complex urban accessibility and scenario-planning notebook with local network data.

## Data
- `data/` - Bundled local inputs. The notebook does not download external data.
- `outputs/` - Created when the notebook is executed.

## Workflow
1. Load local street nodes, weighted edges, neighborhoods, existing facilities, and candidate sites.
2. Build a directed walking graph and audit graph connectivity and travel-time assumptions.
3. Snap neighborhood demand to network nodes and compute vulnerability-weighted demand.
4. Calculate shortest walking time from every neighborhood to each facility class.
5. Map baseline access gaps and summarize who is outside a 12 minute service threshold.
6. Run a greedy scenario optimizer that adds candidate facilities to maximize vulnerable-population coverage.
7. Compare baseline and scenario access by district and social group.
8. Run a walking-speed sensitivity test for slower pedestrian groups.
9. Export accessibility tables, maps, and scenario rankings to outputs/.

## Reference Workflows
- OSMnx examples gallery: https://github.com/gboeing/osmnx-examples
- NetworkX geospatial example: https://networkx.org/documentation/stable/auto_examples/geospatial/plot_osmnx.html
- OSMnx documentation: https://osmnx.readthedocs.io/

## Source Notes
This case is a local, reproducible OpenGeoLab adaptation of mature public geospatial workflows. It does not copy third-party notebooks or require remote data at runtime.
