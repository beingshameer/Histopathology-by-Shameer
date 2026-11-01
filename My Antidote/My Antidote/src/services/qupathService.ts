import type { AnnotationShape, TissueLabelType, QuPathFeature, QuPathGeoJSON } from '../types';

export interface QuPathSummary {
  featureCount: number;
  classifications: { name: string; count: number; color: string }[];
  totalNuclei: number;
  totalAreaUm2: number;
  suggestedPrimaryGleason: number;
  suggestedSecondaryGleason: number;
}

export function parseQuPathGeoJson(rawInput: string | object): {
  success: boolean;
  features: QuPathFeature[];
  shapes: AnnotationShape[];
  summary: QuPathSummary;
  rawJson?: any;
  error?: string;
} {
  try {
    let json: any = typeof rawInput === 'string' ? JSON.parse(rawInput) : rawInput;

    let featureList: QuPathFeature[] = [];
    if (json.type === 'FeatureCollection' && Array.isArray(json.features)) {
      featureList = json.features;
    } else if (json.type === 'Feature') {
      featureList = [json];
    } else if (Array.isArray(json)) {
      featureList = json;
    } else {
      return {
        success: false,
        features: [],
        shapes: [],
        summary: defaultSummary(),
        error: 'Invalid QuPath file format. Expected a GeoJSON FeatureCollection or Feature object.',
      };
    }

    if (featureList.length === 0) {
      return {
        success: false,
        features: [],
        shapes: [],
        summary: defaultSummary(),
        error: 'The uploaded QuPath GeoJSON does not contain any annotation features.',
      };
    }

    const shapes: AnnotationShape[] = [];
    const classCountMap: Record<string, { count: number; color: string; pattern?: number }> = {};
    let totalNuclei = 0;
    let totalAreaUm2 = 0;

    featureList.forEach((feat, index) => {
      const classificationName = feat.properties?.classification?.name || feat.properties?.name || 'Unclassified Gland';
      const tissueLabel = mapQuPathClassToLabel(classificationName);
      const color = getTissueColor(tissueLabel, feat.properties?.classification?.color);

      // Extract geometry points (GeoJSON Polygon coordinates: [[[x, y], [x, y], ...]])
      let points: { x: number; y: number }[] = [];
      const geom = feat.geometry;
      if (geom) {
        if (geom.type === 'Polygon' && Array.isArray(geom.coordinates) && geom.coordinates[0]) {
          points = geom.coordinates[0].map((coord: number[]) => ({ x: coord[0], y: coord[1] }));
        } else if (geom.type === 'MultiPolygon' && Array.isArray(geom.coordinates) && geom.coordinates[0]?.[0]) {
          points = geom.coordinates[0][0].map((coord: number[]) => ({ x: coord[0], y: coord[1] }));
        } else if (geom.type === 'Point' && Array.isArray(geom.coordinates)) {
          points = [{ x: geom.coordinates[0], y: geom.coordinates[1] }];
        }
      }

      if (points.length >= 2) {
        shapes.push({
          id: feat.id || `qupath-shape-${index + 1}`,
          type: 'polygon',
          points,
          label: tissueLabel,
          color,
          description: feat.properties?.name || classificationName,
        });
      }

      // Aggregate measurements
      const nuclei = feat.properties?.measurements?.['Num Nuclei'] || feat.properties?.measurements?.['Nuclei: Count'] || 0;
      const area = feat.properties?.measurements?.['Area µm^2'] || feat.properties?.measurements?.['Area'] || 0;
      totalNuclei += nuclei;
      totalAreaUm2 += area;

      if (!classCountMap[classificationName]) {
        let pattern: number | undefined = undefined;
        if (tissueLabel === 'gleason_5') pattern = 5;
        else if (tissueLabel === 'gleason_4') pattern = 4;
        else if (tissueLabel === 'gleason_3') pattern = 3;

        classCountMap[classificationName] = { count: 0, color, pattern };
      }
      classCountMap[classificationName].count += 1;
    });

    // Determine suggested Gleason grading
    let primary = 4;
    let secondary = 3;
    const gleasonEntries = Object.values(classCountMap)
      .filter(entry => entry.pattern !== undefined)
      .sort((a, b) => b.count - a.count);

    if (gleasonEntries.length >= 1 && gleasonEntries[0].pattern) {
      primary = gleasonEntries[0].pattern;
      secondary = gleasonEntries.length >= 2 && gleasonEntries[1].pattern ? gleasonEntries[1].pattern : primary;
    }

    const summary: QuPathSummary = {
      featureCount: shapes.length,
      classifications: Object.entries(classCountMap).map(([name, data]) => ({
        name,
        count: data.count,
        color: data.color,
      })),
      totalNuclei: Math.round(totalNuclei),
      totalAreaUm2: Math.round(totalAreaUm2),
      suggestedPrimaryGleason: primary,
      suggestedSecondaryGleason: secondary,
    };

    return {
      success: true,
      features: featureList,
      shapes,
      summary,
      rawJson: json,
    };
  } catch (e: any) {
    return {
      success: false,
      features: [],
      shapes: [],
      summary: defaultSummary(),
      error: `Failed to parse QuPath GeoJSON: ${e.message}`,
    };
  }
}

function defaultSummary(): QuPathSummary {
  return {
    featureCount: 0,
    classifications: [],
    totalNuclei: 0,
    totalAreaUm2: 0,
    suggestedPrimaryGleason: 4,
    suggestedSecondaryGleason: 3,
  };
}

function mapQuPathClassToLabel(qupathClass: string): TissueLabelType {
  const normalized = qupathClass.toLowerCase();
  if (normalized.includes('gleason 5') || normalized.includes('pattern 5')) return 'gleason_5';
  if (normalized.includes('gleason 4') || normalized.includes('pattern 4') || normalized.includes('cribriform')) return 'gleason_4';
  if (normalized.includes('gleason 3') || normalized.includes('pattern 3')) return 'gleason_3';
  if (normalized.includes('benign')) return 'benign_gland';
  if (normalized.includes('stroma')) return 'stroma';
  if (normalized.includes('nuclei')) return 'nuclei_cluster';
  return 'gleason_4'; // Default to pattern 4
}

function getTissueColor(label: TissueLabelType, qupathColor?: any): string {
  if (qupathColor && Array.isArray(qupathColor) && qupathColor.length >= 3) {
    return `rgb(${qupathColor[0]}, ${qupathColor[1]}, ${qupathColor[2]})`;
  }
  switch (label) {
    case 'gleason_5': return '#ef4444';
    case 'gleason_4': return '#ea580c';
    case 'gleason_3': return '#f59e0b';
    case 'benign_gland': return '#10b981';
    case 'stroma': return '#64748b';
    default: return '#00685f';
  }
}
