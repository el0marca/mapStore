import { createRoot } from "react-dom/client";
import Point from "@arcgis/core/geometry/Point";
import MapView from "@arcgis/core/views/MapView";
import Popup from "@arcgis/core/widgets/Popup";
import { makeAutoObservable } from "mobx";

export class _PopupManager {
  private readonly popupTemplate: HTMLElement;

  public get isVisible(): boolean {
    return this._mapView.popup.visible;
  }

  constructor(private readonly _mapView: MapView, popupTemplateElement: JSX.Element) {
    makeAutoObservable(this);
    this.popupTemplate = this.getHtmlFromReactComponent(popupTemplateElement);
  }

  public openPopup(location: Point): void {
    if (this._mapView.popup.visible) {
      this._mapView.popup.location = location;
    } else {
      this._mapView.popup.open({ location });
    }
  }

  public closePopup(): void {
    this._mapView.popup.close();
  }

  public async _setUpPopupSettings(
    defaultSettings = false,
    hideCloseButton = false,
    options?: Partial<Popup>
  ): Promise<void> {
    await this._mapView.when(() => {
      if (defaultSettings) {
        this.setUpDefaultPopupSettings();
      }

      if (hideCloseButton) {
        this.hideClosePopupButton();
      }

      if (options) {
        this._mapView.popup = new Popup({ ...this._mapView.popup, ...options });
      }

      this._mapView.popup.content = this.popupTemplate;

      // also styling settings in esri-ui.css -> arcgis popup styles
    });
  }

  private setUpDefaultPopupSettings(): void {
    // bottom action elements
    this._mapView.popup.viewModel.includeDefaultActions = false;
    // dock button near close button
    this._mapView.popup.dockEnabled = false;
    this._mapView.popup.dockOptions = {
      breakpoint: false,
      buttonEnabled: false,
    };

    this._mapView.popup.alignment = "bottom-right";
  }

  private hideClosePopupButton(): void {
    this._mapView.popup.visibleElements.closeButton = false;
    this._mapView.popup.visibleElements.featureNavigation = false;
  }

  private getHtmlFromReactComponent(element: JSX.Element): HTMLDivElement {
    const container = document.createElement("div");
    createRoot(container).render(element);
    return container;
  }
}
