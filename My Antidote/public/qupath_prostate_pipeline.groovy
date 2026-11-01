/**
 * My Antidote — QuPath Digital Pathology Automation Script
 * Automated Prostate Biopsy Analysis, Nuclei Detection & Gleason Annotation Export
 * Compatible with QuPath v0.5.x and v0.6.x
 */

import qupath.lib.scripting.QP
import qupath.lib.gui.QuPathGUI
import qupath.lib.objects.PathObjects
import qupath.lib.roi.ROIs

println "=== My Antidote: QuPath Prostate Analysis Pipeline ==="

// 1. Stain Deconvolution & Optical Density Calibration
setColorDeconvolutionStains('{"Name": "H&E default", "Stain 1": "Hematoxylin", "Values 1": [0.65111, 0.70119, 0.29049], "Stain 2": "Eosin", "Values 2": [0.2159, 0.8012, 0.5581], "Background": [255, 255, 255]}')

// 2. Automated Watershed Nuclei Detection
runPlugin('qupath.imagej.detect.cells.WatershedCellDetection', 
    '{"detectionImage": "Hematoxylin", "requestedPixelSizeMicrons": 0.5, "backgroundRadiusMicrons": 8.0, "medianRadiusMicrons": 0.0, "sigmaMicrons": 1.5, "minAreaMicrons": 10.0, "maxAreaMicrons": 400.0, "threshold": 0.1, "watershedPostProcess": true, "cellExpansionMicrons": 2.0, "includeNuclei": true, "smoothBoundaries": true, "makeMeasurements": true}')

// 3. Log extracted features
def annotations = getAnnotationObjects()
println "Annotated structures extracted: ${annotations.size()}"

// 4. Export to standard GeoJSON FeatureCollection for My Antidote
def exportPath = buildFilePath(PROJECT_BASE_DIR, 'myantidote_qupath_export.geojson')
exportObjectsToGeoJson(annotations, exportPath, "FEATURE_COLLECTION")
println "Successfully exported QuPath annotation GeoJSON to: ${exportPath}"
