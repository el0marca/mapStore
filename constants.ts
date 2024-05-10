import PictureMarkerSymbol from "@arcgis/core/symbols/PictureMarkerSymbol";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol";

import { RGBColor, SelectedStyles } from "./types";

export const SEARCH_PARAMS_TASK_ID_KEY = "taskId";

export const DEFAULT_ZOOM = 17;

const FILL_POLYGON_COLOR: RGBColor = [0, 0, 0, 0];
const FILL_POINT_COLOR: RGBColor = [255, 255, 255];
const MAIN_BORDER_COLOR: RGBColor = [243, 112, 40];
const SECONDARY_BORDER_COLOR: RGBColor = [...MAIN_BORDER_COLOR, 0.5];
const HOVER_BORDER_COLOR: RGBColor = [255, 201, 0];

export const polygonSymbol = new SimpleFillSymbol({
  color: FILL_POLYGON_COLOR,
  outline: {
    color: MAIN_BORDER_COLOR,
    width: 2,
  },
});

export const hoverPolygonSymbol = new SimpleFillSymbol({
  color: FILL_POLYGON_COLOR,
  outline: {
    color: HOVER_BORDER_COLOR,
    width: 2,
  },
});

export const CSicon = new PictureMarkerSymbol({
  url: "/images/icons/CS.png",
  width: "24px",
  height: "24px",
});

export const transparentPolygonSymbol = new SimpleFillSymbol({
  color: FILL_POLYGON_COLOR,
  outline: {
    color: SECONDARY_BORDER_COLOR,
    width: 2,
  },
});

export const markerSymbol = new SimpleMarkerSymbol({
  color: FILL_POINT_COLOR,
  outline: {
    color: [50, 50, 50],
    width: 1,
  },
  size: "12px",
});

export const coloredMarkerSymbol = new SimpleMarkerSymbol({
  color: FILL_POINT_COLOR,
  outline: {
    color: MAIN_BORDER_COLOR,
    width: 1,
  },
  size: "14px",
});

export const hoverMarkerSymbol = new SimpleMarkerSymbol({
  color: FILL_POINT_COLOR,
  outline: {
    color: HOVER_BORDER_COLOR,
    width: 1,
  },
  size: "14px",
});

// key is Symbol["type"]
export const selectedStylesSymbols: Record<string, SelectedStyles> = {
  "simple-marker": {
    select: coloredMarkerSymbol,
    unselect: markerSymbol,
    hover: hoverMarkerSymbol,
  },
  "simple-fill": {
    select: polygonSymbol,
    unselect: transparentPolygonSymbol,
    hover: hoverPolygonSymbol,
  },
};
