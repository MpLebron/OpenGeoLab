# Streetview Semantic Comfort Audit

A longer street-view CV workflow with segmentation, feature extraction, clustering, and comfort modeling.

## Data
- `data/` - Bundled local inputs. The notebook does not download external data.
- `outputs/` - Created when the notebook is executed.

## Workflow
1. Load a local street-view image set with location and comfort observations.
2. Inspect image inventory, metadata, and sample montage.
3. Segment sky, vegetation, road, and built facade using color-space and morphology rules.
4. Measure green-view, sky-view, enclosure, edge density, and facade texture indicators.
5. Validate indicator distributions and flag segmentation outliers.
6. Cluster scenes into streetscape typologies with standardized image metrics.
7. Model observed heat stress from image-derived indicators.
8. Rank corridors and simulate a greening intervention for low-comfort scenes.
9. Export segmentation panels, metric tables, clusters, and intervention rankings.

## Reference Workflows
- scikit-image watershed segmentation example: https://scikit-image.org/docs/0.25.x/auto_examples/segmentation/plot_watershed.html
- OpenCV documentation: https://docs.opencv.org/
- TorchGeo overview: https://docs.torchgeo.org/

## Source Notes
This case is a local, reproducible OpenGeoLab adaptation of mature public geospatial workflows. It does not copy third-party notebooks or require remote data at runtime.
