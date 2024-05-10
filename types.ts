import Geometry from "@arcgis/core/geometry/Geometry";
import Point from "@arcgis/core/geometry/Point";
import Graphic from "@arcgis/core/Graphic";
import Symbol from "@arcgis/core/symbols/Symbol";
import MapView from "@arcgis/core/views/MapView";
import { geojsonToArcGIS } from "@terraformer/arcgis";

export type ParsedGeometry = ReturnType<typeof geojsonToArcGIS>;
export type Position = [Point["x"], Point["y"]] | [Point["x"], Point["y"], Point["z"]];

export type HitTestResult = Awaited<ReturnType<MapView["hitTest"]>>;

export interface GraphicWithUid extends Graphic {
  readonly uid: number;
}

export type GetGeometry<Coordinate, GeometryType extends Geometry> = (
  coordinate: Coordinate,
  geometryOptions?: ParsedGeometry
) => GeometryType;

export const ARCGIS_SKETCH_TOOL_CONTAINER = ".esri-sketch__tool-section";
export const ADDITIONAL_TOOL_CONTAINER = "additional-tool-container";

export interface MapItem {
  acl: string;
  id: string;
  title: string;
  description: string;
  map: string;
  createdAt: string;
  createdBy: string;
}

export enum GraphicId {
  area = "area",
  job = "job",
  constructionSite = "constructionSite",
  imageLocation = "imageLocation",
  measurement = "measurement",
}

interface ExistentAttributes {
  id?: GraphicId;
  itemId?: string;
  title?: string;
  description?: string;
}

export type Attributes = ExistentAttributes | null;

export const enum ButtonClickType {
  LEFT,
  MID,
  RIGHT,
}

export type RGBColor = [number, number, number] | [number, number, number, number];

export const enum SymbolStyleType {
  UNSELECT = "unselect",
  SELECT = "select",
  HOVER = "hover",
}

export type SelectedStyles = Record<SymbolStyleType, Symbol>;

export interface MapItemsRouteParams {
  constructionSiteId: string;
  areaId: string;
  jobId: string;
  processingId: string;
}
