import Collection from "@arcgis/core/core/Collection";
import Geometry from "@arcgis/core/geometry/Geometry";
import Graphic from "@arcgis/core/Graphic";
import { makeAutoObservable } from "mobx";

import { selectedStylesSymbols } from "../constants";
import { MapStore } from "../index";
import { Attributes, GraphicId, MapItem, Position, SymbolStyleType } from "../types";
import SpatialReference from "@arcgis/core/geometry/SpatialReference";

export class _Utils {
  constructor(private readonly _mapStore: MapStore) {
    makeAutoObservable(this);
  }

  public readonly addToView = (graphic: Graphic | Collection<Graphic>): void => {
    if (this.checkIsCollection(graphic)) {
      this._mapStore._view?.graphics.addMany(graphic as Collection<Graphic>); // checking is above
      return;
    }

    this._mapStore._view?.graphics.add(graphic as Graphic); // checking is above
  };

  public readonly addToGraphicsLayer = (graphic: Graphic | Collection<Graphic>): void => {
    if (this.checkIsCollection(graphic)) {
      this._mapStore._graphicsLayer.graphics.addMany(graphic as Collection<Graphic>); // checking is above
      return;
    }

    this._mapStore._graphicsLayer?.graphics.add(graphic as Graphic); // checking is above
  };

  public readonly getGraphicsByGraphicType = (typeId: GraphicId): Collection<Graphic> | undefined => {
    return this._mapStore._view?.graphics.filter(({ attributes }) => attributes?.id === typeId);
  };

  public readonly getGraphicByItemId = (id: string): Graphic | null => {
    const graphic =
      this._mapStore._view?.graphics?.find(({ attributes }) => this.handleCheckItemId(attributes, id)) ??
      this._mapStore._graphicsLayer.graphics.find(({ attributes }) => this.handleCheckItemId(attributes, id));

    return graphic ?? null;
  };

  public readonly removeGraphicsByGraphicType = (graphicType: GraphicId) => {
    const graphics = this.getGraphicsByGraphicType(graphicType);

    if (!graphics) {
      return;
    }

    this._mapStore._view?.graphics.removeMany(graphics);
  };

  public readonly removeGraphicByItemId = (itemId: string): void => {
    const graphic = this.getGraphicByItemId(itemId);

    if (!graphic) {
      return;
    }

    this._mapStore._view?.graphics.remove(graphic);
  };

  public readonly removeGeometriesByType = (graphics: Collection<Graphic>, type: Geometry["type"]) => {
    graphics.forEach(g => g.geometry.type === type && this._mapStore._graphicsLayer.remove(g));
  };

  public readonly setSymbolStylesForAllGraphics = (symbolStyleType: SymbolStyleType, graphicType?: GraphicId): void => {
    const graphics = graphicType ? this.getGraphicsByGraphicType(graphicType) : this._mapStore._view?.graphics;
    graphics?.forEach(g => this.setSymbolStyle(g, symbolStyleType));
  };

  public readonly setSymbolStyle = (graphic: Graphic, symbolStyleType: SymbolStyleType): void => {
    const symbolType = graphic.symbol.type;
    const graphicTypeSymbols = selectedStylesSymbols[symbolType];

    if (!graphicTypeSymbols) {
      console.warn(`Graphic type symbols do not setted for this symbol type: ${symbolType}`);
      return;
    }

    graphic.symbol = graphicTypeSymbols[symbolStyleType];
  };

  public readonly clearViewGraphics = (): void => {
    this._mapStore._view?.graphics.removeAll();
  };

  public readonly clearGraphicLayer = (): void => {
    if (this._mapStore.isAllMapInit) {
      this._mapStore._graphicsLayer.removeAll();
    } else {
      console.error("The card has not been initialized yet");
    }
  };

  public readonly resetMapInit = (): void => {
    this._mapStore.setIsMapAndGraphicLayerInit(false);
    this._mapStore.setIsSketchInit(false);
    this._mapStore.setIsViewInit(false);
  };

  public readonly zoomToGeometry = async (geometry: Geometry): Promise<void> => {
    await this._mapStore._view?.goTo({ target: geometry, spatialReference: SpatialReference.WebMercator });
  };

  public readonly setCoordinates = async (coordinates: Position, zoom: number): Promise<void> => {
    if (this._mapStore.isViewInit) {
      await this._mapStore._view?.goTo({
        center: coordinates,
        zoom,
      });
    }
  };

  public readonly getGraphicFromMap = (map: string): Graphic | null => {
    const parsedMap = JSON.parse(map); // graphic or { graphic, coordinates, zoom? }
    const parsedGraphic = parsedMap.graphic ?? parsedMap;
    if (parsedGraphic.geometry === undefined) {
      return null;
    }
    return Graphic.fromJSON(parsedMap.graphic ?? parsedMap);
  };

  public readonly filterExistingMap = <T extends MapItem>(mapItems: T[]): T[] => {
    return mapItems.filter(mi => !!Object.keys(JSON.parse(mi.map)).length);
  };

  private readonly handleCheckItemId = (attributes: Attributes, itemId: string): boolean => {
    return attributes?.itemId === itemId;
  };

  private readonly checkIsCollection = (graphic: Graphic | Collection<Graphic>): boolean =>
    graphic instanceof Collection;
}
