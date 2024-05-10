import { createRoot } from "react-dom/client";
import MultiPoint from "@arcgis/core/geometry/Multipoint";
import Point from "@arcgis/core/geometry/Point";
import Polygon from "@arcgis/core/geometry/Polygon";
import Polyline from "@arcgis/core/geometry/Polyline";
import Graphic from "@arcgis/core/Graphic";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import BasemapToggle from "@arcgis/core/widgets/BasemapToggle";
import Search from "@arcgis/core/widgets/Search";
import Sketch from "@arcgis/core/widgets/Sketch";
import SketchViewModel from "@arcgis/core/widgets/Sketch/SketchViewModel";
import Zoom from "@arcgis/core/widgets/Zoom";
import { makeAutoObservable } from "mobx";

import { IConstructionSite } from "stores/managerService/constructionSiteStore/types";
import { ImageInfo } from "stores/measurementStore/types";
import RootStore from "stores/rootStore";

import { isObject } from "helpers/functions";
import { absolutePath, PATHS } from "router/paths";

import { _PopupManager } from "./helpers/_PopupManager";
import { _Utils } from "./helpers/_Utils";
import {
  coloredMarkerSymbol,
  CSicon,
  DEFAULT_ZOOM,
  markerSymbol,
  polygonSymbol,
} from "./constants";
import {
  ADDITIONAL_TOOL_CONTAINER,
  ARCGIS_SKETCH_TOOL_CONTAINER,
  Attributes,
  ButtonClickType,
  GetGeometry,
  GraphicId,
  GraphicWithUid,
  HitTestResult,
  MapItem,
  Position,
  SymbolStyleType,
} from "./types";
import { JobStatus } from "../managerService/jobStore/types";
import SpatialReference from "@arcgis/core/geometry/SpatialReference";
import { project } from "@arcgis/core/geometry/projection";
import Geometry from "@arcgis/core/geometry/Geometry";

export class MapStore {
  // helpers
  mapItemPopup: _PopupManager | null = null;
  utils = new _Utils(this);

  private map: Map | null = null;
  _view: MapView | null = null;
  _graphicsLayer = {} as GraphicsLayer;
  private zoom: Zoom | null = null;
  private sketch: Sketch | null = null;
  private popupContent: HTMLElement | null = null;

  imagesLocation: number[][] = [];
  sliderIndex: number | null = null;
  selectedGraphic: Graphic | null = null;
  hoveredGraphic: Graphic | null = null;
  rightClickGraphic: Graphic | null = null;

  kmlFileName: string | null = null;

  isSketchInit: boolean = false;
  isViewInit: boolean = false;
  isMapAndGraphicLayerInit: boolean = false;

  get isAllMapInit(): boolean {
    return this.isViewInit && this.isMapAndGraphicLayerInit;
  }

  constructor(private readonly rootStore: RootStore) {
    makeAutoObservable(this);
  }

  public readonly setPopupTemplate = (element: JSX.Element): void => {
    const container = document.createElement("div");
    createRoot(container).render(element);
    this.popupContent = container;
  };

  setSelectedGraphic(graphic: Graphic | null) {
    this.changeSymbolsSelectedGraphics(graphic);
    this.selectedGraphic = graphic;
  }

  setHoveredGraphic(graphic: Graphic | null): void {
    this.hoveredGraphic = graphic;
  }

  setRightClickGraphic(graphic: Graphic | null): void {
    this.rightClickGraphic = graphic;
  }

  setSliderIndex = (value: number): void => {
    this.sliderIndex = value;
  };

  setIsSketchInit(isInit: boolean): void {
    this.isSketchInit = isInit;
  }

  setIsViewInit(isInit: boolean): void {
    this.isViewInit = isInit;
  }

  setIsMapAndGraphicLayerInit(isInit: boolean): void {
    this.isMapAndGraphicLayerInit = isInit;
  }

  setKmlFileName(name: string | null): void {
    this.kmlFileName = name;
  }

  public readonly initMap = () => {
    this._graphicsLayer = new GraphicsLayer();

    this.map = new Map({
      basemap: {
        portalItem: {
          id: "86265e5a4bbb4187a59719cf134e0018",
        },
      },
      layers: [this._graphicsLayer],
    });

    this.setIsMapAndGraphicLayerInit(true);
    console.log(`IsMapAndGraphicLayerInit: ${this.isMapAndGraphicLayerInit}`);
    console.log(`Is all map init: ${this.isAllMapInit}`);
  };

  public readonly initView = (mapItemElement: JSX.Element): void => {
    if (this.map === null) {
      return;
    }

    this._view = new MapView({
      map: this.map,
      center: [13.379495, 52.517588],
      zoom: 3,
      container: "viewDiv",
      spatialReference: SpatialReference.WebMercator,
    });
    this._view.when(() => {
      this.setIsViewInit(true);
      console.log(`Is view init: ${this.isViewInit}`);
      console.log(`Is all map init: ${this.isAllMapInit}`);
    });
    this.mapItemPopup = new _PopupManager(this._view, mapItemElement);
    this.mapItemPopup._setUpPopupSettings(true);

    this._view.constraints = {
      minZoom: 2,
    };

    this._view.ui.components = ["attribution"];

    this.subscribeOnRightClickPointMenu();
    this.subscribeOnPointerMoveMapItemInfo();
    this.subscribeOnClickItemSelecting();

    this._view.when(() => {
      this._view?.on("click", e => this._view?.hitTest(e).then(this.addGraphicUidToSelected));

      if (!this._view) {
        return;
      }

      const sketchViewModel = new SketchViewModel({
        view: this._view,
        layer: this._graphicsLayer,
        polygonSymbol,
        pointSymbol: markerSymbol,
      });

      this.sketch = new Sketch({
        layer: this._graphicsLayer,
        view: this._view,
        creationMode: "update",
        visibleElements: { settingsMenu: false },
        availableCreateTools: ["point", "polygon", "rectangle", "circle"],
        viewModel: sketchViewModel,
      });
      this.sketch?.when(() => {
        this.setIsSketchInit(true);
        console.log(`Is sketch init: ${this.isSketchInit}`);
        console.log(`Is all map init: ${this.isAllMapInit}`);
      });
      this.sketch?.on("create", () => this.setKmlFileName(null));
      this.sketch?.on("delete", () => this.setKmlFileName(null));
      this.sketch?.on("create", e => {
        this.setSelectedGraphic(e.graphic);
      });
      this.sketch?.on("update", e => this.setSelectedGraphic(e.graphics[0] ?? null));
      this.sketch?.on("delete", () => {
        this.setSelectedGraphic(null);
      });

      const searchWidget = new Search({
        view: this._view,
      });

      this.zoom = new Zoom({
        view: this._view,
      });
      const csInfo = document.createElement("div");
      csInfo.classList.add("esri-widget", "esri-csInfo");
      this._view.ui.add(csInfo);
      this._view.ui.add([this.sketch, searchWidget], {
        position: "top-right",
      });

      const basemapToggle = new BasemapToggle({
        view: this._view,
        nextBasemap: {
          portalItem: {
            id: "358ec1e175ea41c3bf5c68f0da11ae2b",
          },
        },
      });

      this._view.ui.add([this.zoom, basemapToggle], {
        position: "bottom-right",
      });
    });
  };

  public readonly renderAdditionalToolbar = (element: JSX.Element): void => {
    const sketchContainer = this.sketch?.container as HTMLElement;
    const toolsContainer = sketchContainer?.querySelectorAll(ARCGIS_SKETCH_TOOL_CONTAINER)[1];
    const container = this.getAdditionalToolsButtonsContainer();

    if (toolsContainer) {
      toolsContainer?.appendChild(container);
      const root = createRoot(container);
      root.render(element);
    }
  };

  private getAdditionalToolsButtonsContainer(): Element {
    const container = document.createElement("div");
    container.setAttribute("id", ADDITIONAL_TOOL_CONTAINER);
    return container;
  }

  public readonly addConstructionSiteIcons = async (
    constructionSites: IConstructionSite[] | null
  ) => {
    if (!constructionSites?.length) return;

    const isValidCoordinate = (coordinate: Position | null): coordinate is Position => {
      return (
        !!coordinate &&
        coordinate.length === 2 &&
        coordinate.every(value => typeof value === "number") &&
        coordinate[0] >= -180 &&
        coordinate[0] <= 180 &&
        coordinate[1] >= -90 &&
        coordinate[1] <= 90
      );
    };

    let sumLatitude = 0;
    let sumLongitude = 0;
    let validCoordinatesCount = 0;

    for (let index = 0; index < constructionSites.length; index++) {
      const coordinates = this.getCoordinatesFromMap(constructionSites[index].map);
      const { title, id, createdBy, description } = constructionSites[index];
      if (isValidCoordinate(coordinates)) {
        sumLatitude += coordinates[1];
        sumLongitude += coordinates[0];
        validCoordinatesCount++;
        const point = new Point({
          longitude: coordinates[0],
          latitude: coordinates[1],
        });
        const graphic = new Graphic({
          geometry: point,
          symbol: CSicon,
          attributes: {
            title,
            itemId: id,
            createdBy,
            index,
            description,
            id: GraphicId.constructionSite,
          },
        });
        this._view?.graphics.add(graphic);
      }
    }
    if (validCoordinatesCount > 0) {
      const averageLatitude = sumLatitude / validCoordinatesCount;
      const averageLongitude = sumLongitude / validCoordinatesCount;

      this._view?.goTo({
        center: [averageLongitude, averageLatitude],
        zoom: 5,
      });
    }
  };

  async initConstructionSiteGraphic(): Promise<void> {
    this.utils.removeGeometriesByType(this._graphicsLayer.graphics, "point");

    if (!this._graphicsLayer.graphics.length) {
      if (this.isViewInit) {
        await this._view?.goTo({ zoom: DEFAULT_ZOOM });
      }

      const x = this._view?.center.x;
      const y = this._view?.center.y;

      if (!x || !y) {
        return;
      }

      const polygonGraphic = this.getDefaultPolygonGraphic(x, y, GraphicId.constructionSite);
      await this.addGraphicAndUpdate(polygonGraphic);
    }
  }

  updateGraphic = (id: string, valueType: "title" | "description", value: string) => {
    this._view?.graphics.forEach(graphic => {
      if (graphic.attributes.itemId === id) {
        graphic.attributes[valueType] = value;
      }
    });
  };

  async initJobGraphic(): Promise<void> {
    if (this.isLayerIsEmpty()) {
      const areaIndex =
        this.rootStore.areaStore.areaIndex !== undefined
          ? this.rootStore.areaStore.areaIndex + 1
          : 0;
      const graphics = this._view?.graphics.toArray();
      const currentArea = graphics?.[areaIndex];
      await this.addDefaultPointInGraphic(currentArea!);
    }
  }

  async initAreaGraphic(): Promise<void> {
    const graphics = this._graphicsLayer.graphics;
    this.utils.removeGeometriesByType(graphics, "point");
    if (graphics.length === 0) {
      const constructionSite = this.utils
        .getGraphicsByGraphicType(GraphicId.constructionSite)
        ?.getItemAt(0);
      await this.addDefaultPolygonInGraphic(constructionSite!);
    }
  }

  getCoordinatesFromMap = (map: string): Position | null => {
    const graphic = this.utils.getGraphicFromMap(map);

    if (graphic === null) {
      return null;
    }

    return this.getCenter(graphic);
  };

  getCoordinates() {
    const constructionSiteGraphic = this._graphicsLayer.graphics.getItemAt(0);
    return this.getCenter(constructionSiteGraphic);
  }

  async addToGraphicsLayer(graphic: JSON, itemId: string): Promise<void> {
    const graphicFromJSON = Graphic.fromJSON(graphic);
    this.addAttributes(graphicFromJSON, { itemId });

    if (graphicFromJSON.attributes?.id === GraphicId.job) {
      graphicFromJSON.symbol = coloredMarkerSymbol;
    }
    await this.addGraphicAndUpdate(graphicFromJSON);
  }

  graphicToJSON() {
    const graphic = this.selectedGraphic ?? this._graphicsLayer.graphics.getItemAt(0);
    if (graphic.attributes && graphic.attributes?.id === GraphicId.job) {
      graphic.symbol = markerSymbol;
    }
    let projectedGeometry = project(graphic.geometry, SpatialReference.WGS84);

    graphic.geometry = projectedGeometry as Geometry;

    return graphic.toJSON();
  }

  initGeometries(items: MapItem[], attributeId: GraphicId): void {
    // removing for clearing deleted map items
    this.utils.removeGraphicsByGraphicType(attributeId);

    items.forEach(({ map, id, title, description }) => {
      const json = JSON.parse(map);
      const graphic = Graphic.fromJSON(json);
      this.addAttributes(graphic, { id: attributeId, itemId: id, title, description });
      this.utils.setSymbolStyle(graphic, SymbolStyleType.UNSELECT);
      this._view?.graphics.add(graphic);
    });
  }

  addAttributes(graphic: Graphic, attributes: Attributes): void {
    if (isObject(graphic.attributes)) {
      graphic.attributes = { ...graphic.attributes, ...attributes };
    } else {
      graphic.attributes = attributes;
    }
  }

  private async addDefaultPolygonInGraphic(graphic: Graphic): Promise<void> {
    const [x, y] = this.getCenter(graphic);
    const polygonGraphic = this.getDefaultPolygonGraphic(x, y, GraphicId.area);
    await this.addGraphicAndUpdate(polygonGraphic);
  }

  private isLayerIsEmpty(): boolean {
    return this._graphicsLayer.graphics.length === 0;
  }

  private getDefaultPolygonGraphic(x: number, y: number, type: GraphicId): Graphic {
    function isSpatialReferenceWGS84(x: number, y: number): boolean {
      if (x >= -180 && x <= 180 && y >= -90 && y <= 90) {
        return true;
      } else {
        return false;
      }
    }

    if (isSpatialReferenceWGS84(x, y)) {
      let point = new Point({
        x,
        y,
        spatialReference: SpatialReference.WGS84,
      });

      point = project(point, SpatialReference.WebMercator) as Point;

      x = point.x;
      y = point.y;
    }

    const width = type === GraphicId.constructionSite ? 200 : 100;
    const height = type === GraphicId.constructionSite ? 100 : 50;

    const polygon = new Polygon({
      spatialReference: SpatialReference.WebMercator,
      rings: [
        [
          [x + width, y + height],
          [x + width, y - height],
          [x - width, y - height],
          [x - width, y + height],
          [x + width, y + height],
        ],
      ],
    });

    return new Graphic({
      geometry: polygon,
      symbol: polygonSymbol,
    });
  }

  private async addDefaultPointInGraphic(graphic: Graphic): Promise<void> {
    const [x, y] = this.getCenter(graphic);
    const pointGraphic = this.getDefaultPointGraphic(x, y);
    await this.addGraphicAndUpdate(pointGraphic);
  }

  private subscribeOnRightClickPointMenu(): void {
    this._view?.when(() => {
      this._view?.on("click", event => {
        if (event.button !== ButtonClickType.RIGHT) {
          return;
        }

        this._view?.hitTest(event).then(response => {
          const res = response.results[0];

          if (res.type !== "graphic" || res.graphic.geometry.type !== "point") {
            if (this.mapItemPopup?.isVisible) {
              this.mapItemPopup?.closePopup();
            }
            this.setRightClickGraphic(null);
            return;
          }

          this.setRightClickGraphic(res.graphic);
          this.mapItemPopup?.openPopup(res.graphic.geometry as Point); // checked "is point" above
        });
      });
      this._view?.on("click", event => {
        if (event.button !== ButtonClickType.RIGHT) {
          return;
        }
        this.setRightClickGraphic(null);
      });
    });
  }

  private subscribeOnPointerMoveMapItemInfo(): void {
    this._view?.when(() => {
      this._view?.on("pointer-move", event => {
        this._view?.hitTest(event).then(response => {
          const res = response.results[0];

          if (res?.type !== "graphic") {
            if (this.hoveredGraphic) {
              this.setHoveredGraphic(null);
            }
            return;
          }

          const attributes = res.graphic.attributes;

          if (attributes.itemId && attributes.id) {
            if (attributes.itemId === this.hoveredGraphic?.attributes.itemId) {
              return;
            }

            this.utils.setSymbolStylesForAllGraphics(SymbolStyleType.UNSELECT);
            this.setHoveredGraphic(res.graphic);

            if (attributes.id !== GraphicId.constructionSite) {
              this.utils.setSymbolStyle(res.graphic, SymbolStyleType.HOVER);
            }
          } else {
            if (this.hoveredGraphic) {
              this.utils.setSymbolStylesForAllGraphics(SymbolStyleType.UNSELECT);
            }
            this.setHoveredGraphic(null);
          }
        });
      });
    });
  }

  private subscribeOnClickItemSelecting(): void {
    this._view?.when(() => {
      this._view?.on("click", event => {
        if (event.button !== ButtonClickType.LEFT) {
          return;
        }

        this._view?.hitTest(event).then(response => {
          if (response.results[0]?.type !== "graphic") {
            return;
          }
          if (response.results.length) {
            const attributes = response.results[0].graphic.attributes;
            if (attributes) {
              const { itemId, id, index } = attributes;
              if (itemId) {
                const params = this.rootStore.navigateStore.getParams();
                const paramId = params.id;

                if (paramId === itemId) {
                  return;
                }

                switch (id) {
                  case GraphicId.constructionSite:
                    this.clearAreasAndNested();
                    this.rootStore.navigateStore.navigate(absolutePath(PATHS.HOME.CS_CARD(itemId)));
                    this.setSliderIndex(index);
                    break;
                  case GraphicId.area:
                    this.clearAreaAndNested();
                    this.rootStore.navigateStore.navigate(
                      absolutePath(PATHS.HOME.AREA_CARD(itemId))
                    );
                    break;
                  case GraphicId.job:
                    this.clearJobAndNested();

                    if (
                      this.rootStore.jobStore.jobs.find(j => j.id === itemId)?.status !==
                      JobStatus.CREATE_SUCCESS
                    ) {
                      break;
                    }

                    this.rootStore.navigateStore.navigate(
                      absolutePath(PATHS.HOME.JOB_CARD(itemId))
                    );
                    break;
                }
              }
            }
          }
        });
      });
    });
  }

  getPolygon: GetGeometry<Polygon["rings"], Polygon> = (rings, geometryOptions?) => {
    return new Polygon({
      spatialReference: SpatialReference.WebMercator,
      rings,
      ...geometryOptions,
    });
  };

  getPolyline: GetGeometry<Polyline["paths"], Polyline> = (paths, geometryOptions) => {
    return new Polyline({
      spatialReference: SpatialReference.WebMercator,
      paths,
      ...geometryOptions,
    });
  };

  getPoint: GetGeometry<Position, Point> = (position, geometryOptions) => {
    return new Point({
      spatialReference: SpatialReference.WebMercator,
      x: position[0],
      y: position[1],
      z: position[2],
      ...geometryOptions,
    });
  };

  private getDefaultPointGraphic(x: number, y: number): Graphic {
    let point = new Point({
      spatialReference: SpatialReference.WGS84,
      x,
      y,
    });

    point = project(point, SpatialReference.WebMercator) as Point;

    return new Graphic({
      geometry: point,
      symbol: markerSymbol,
    });
  }

  getCenter = (graphic: Graphic | Graphic[]): Position => {
    const geometry = Array.isArray(graphic) ? graphic[0].geometry : graphic.geometry;
    if (geometry.type === "point") {
      const g = geometry as Point;
      return [g.x, g.y];
    }

    const x = geometry.extent.center.x;
    const y = geometry.extent.center.y;
    return [x, y];
  };

  async addGraphicAndUpdate(graphic: Graphic | Graphic[]): Promise<void> {
    if (!this.sketch) {
      return;
    }

    if (Array.isArray(graphic)) {
      this._graphicsLayer.addMany(graphic);
    } else {
      this._graphicsLayer.add(graphic);
    }

    await this.sketch.update(graphic);
    this.setKmlFileName(null);
  }

  addAllPoints = (points: ImageInfo[]) => {
    points.forEach(p => this.imagesLocation.push([p.longitude, p.latitude]));
    const point = new MultiPoint({
      spatialReference: SpatialReference.WebMercator,
      points: this.imagesLocation,
    });
    const pointGraphic = new Graphic({
      geometry: point,
      symbol: markerSymbol,
      visible: false,
      attributes: { id: GraphicId.imageLocation },
    });
    this._graphicsLayer.add(pointGraphic);
  };

  tooglePointVisible = async (foreignId: string) => {
    if (!this.rootStore.measurementStore.imageInfo) {
      const points = await this.rootStore.measurementStore.getImagePoints(foreignId);
      if (points) {
        this.addAllPoints(points);
      }
    }
    const point = this._graphicsLayer.graphics.filter(
      item => item.attributes?.id === GraphicId.imageLocation
    );
    point.forEach((e, i) => {
      e.visible = !e.visible;
      if (i === 0 && e.visible) {
        this.utils.setCoordinates([this.imagesLocation[0][0], this.imagesLocation[0][1]], 15);
      }
    });
  };

  addSinglePoint = async (id: string, foreignId: string) => {
    if (!this.rootStore.measurementStore.imageInfo) {
      const points = await this.rootStore.measurementStore.getImagePoints(foreignId, id);
      if (points) {
        this.addAllPoints(points);
      }
    }
    const coords = this.rootStore.measurementStore.imageInfo!.filter(image => image.id === id);
    const point = this._graphicsLayer.graphics
      .filter(item => item.attributes?.itemId === coords[0].id)
      .getItemAt(0);

    if (point) {
      point.visible = !point.visible;
      if (point.visible) {
        await this.utils.setCoordinates([coords[0].longitude, coords[0].latitude], 15);
      }
    } else {
      const point = new Point({
        spatialReference: SpatialReference.WebMercator,
        longitude: coords[0].longitude,
        latitude: coords[0].latitude,
      });
      const pointGraphic = new Graphic({
        geometry: point,
        symbol: markerSymbol,
        attributes: { itemId: id, id: GraphicId.imageLocation },
      });
      this._graphicsLayer.add(pointGraphic);
      await this.utils.setCoordinates([coords[0].longitude, coords[0].latitude], 18);
    }
  };

  removeCSIcons = async (map: any) => {
    this.utils.removeGraphicsByGraphicType(GraphicId.imageLocation);
    this.imagesLocation = [];
  };

  private readonly addGraphicUidToSelected = (hitTestResult: HitTestResult): void => {
    if (hitTestResult.results[1]?.type !== "graphic") {
      return;
    }

    // second element is needed graphic
    const graphicTestResult = hitTestResult.results[1]?.graphic;
    if (graphicTestResult === undefined) {
      this.setSelectedGraphic(null);
      return;
    }

    const hitTestGraphic = graphicTestResult as GraphicWithUid;
    const hitTestUid = hitTestGraphic.uid;

    const graphic = this._graphicsLayer.graphics.find(g => {
      const g1 = g as GraphicWithUid;
      return g1.uid === hitTestUid;
    }) as GraphicWithUid;
    if (graphic) {
      this.setSelectedGraphic(graphic);
    } else {
      this.setSelectedGraphic(null);
    }
  };

  private changeSymbolsSelectedGraphics(graphic: Graphic | null): void {
    if (this.selectedGraphic) {
      this.utils.setSymbolStyle(this.selectedGraphic, SymbolStyleType.SELECT);
    }

    if (graphic) {
      this.utils.setSymbolStyle(graphic, SymbolStyleType.HOVER);
    }
  }

  // temporary

  public readonly clearProcessing = () => {
    this.rootStore.processingStore._setProcessing(null);
  };

  public readonly clearJobAndNested = () => {
    this.clearProcessing();
    this.rootStore.jobStore._setJob(null);
    this.rootStore.processingStore._setProcessings([]);
  };

  public readonly clearAreaAndNested = () => {
    this.clearJobAndNested();
    this.rootStore.areaStore._setArea(null);
    this.rootStore.jobStore._setJobs([]);
  };

  public readonly clearAreasAndNested = () => {
    this.clearAreaAndNested();
    this.rootStore.areaStore.setAreas([]);
  };

  public readonly clearCSAndNestedAndFetchAllCS = async () => {
    this.clearAreasAndNested();
    this.rootStore.constructionSiteStore._setConstructionSite({} as IConstructionSite);
    await this.rootStore.constructionSiteStore.getAll();
  };
}
