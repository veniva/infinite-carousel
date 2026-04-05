import {
  closeList,
  createLinkedList,
  isLinkedListClosed,
  joinLists,
} from "../helpers";

import { SlotsController } from "./SlotsController";
import type { InsertPosition } from "../types";
import type { ImageNodesList, SlotsLayout, PicsumImage, ImageNode } from "./types";

export class CarouselController {
  // next API page to fetch from Picsum
  private nextPage = 1;

  // prevents overlapping fetch requests
  private isFetching = false;

  private height = 0;

  // the Picsum metadata url
  private readonly url: string;

  // horizontal padding outside the carousel viewport
  private readonly horizontalMargin: number;

  // hard cap for how many images can be loaded
  private readonly maxImages: number;
  
  // the gap between images in px
  private readonly imageGap: number;

  // number of images requested per API call
  private readonly loadBatch: number;

  // multiplier used to prerender beyond the visible width
  private readonly prerenderFactor: number;

  // minimum buffered distance before more images are loaded
  private readonly loadMoreTresholdDistancePx: number;

  // manages the rendered slot window and recycling logic
  private readonly slotsController: SlotsController;

  constructor(
    url: string,
    horizontalMargin: number,
    maxImages = 40,
    imageGap = 16,
    loadBatch = 5,
    prerenderFactor = 3,
    loadMoreTresholdDistancePx = 100,
    slotsController?: SlotsController,
  ) {
    this.url = url;
    this.horizontalMargin = horizontalMargin;
    this.maxImages = maxImages;
    this.imageGap = imageGap;
    this.loadBatch = loadBatch;
    this.prerenderFactor = prerenderFactor;
    this.loadMoreTresholdDistancePx = loadMoreTresholdDistancePx;

    this.slotsController =
      slotsController ??
      new SlotsController(
        (node) => this.getRenderedImageWidth(node.data),
        () => this.availableWidth,
        (availableWidth) => this.prerenderWidth(availableWidth),
        this.imageGap
      );
  }

  // currently available width for the carousel
  availableWidth = 0;

  // load images until this width is filled
  readonly prerenderWidth = (screenWidth: number) =>
    screenWidth * this.prerenderFactor;

  // backing data
  readonly imageNodesList: ImageNodesList = {
    length: 0,
    head: undefined,
    tail: undefined,
  };

  // UI data
  get slotsLayout(): SlotsLayout {
    return this.slotsController.slotsLayout;
  }

  setHeight(height: number) {
    this.height = Math.max(0, height);
    this.slotsController.setHeight(height);
  }

  // updates the usable carousel width from the available width
  setAvailableWidth(screenWidth: number): void {
    this.availableWidth = Math.max(0, screenWidth - 2 * this.horizontalMargin);
  }

  // convenience method when both dimensions may change together
  setViewport(screenWidth: number, rowHeight: number): void {
    this.setAvailableWidth(screenWidth);
    this.setHeight(rowHeight);
  }

  // calculates what's gonna be the image's width when rendered on the screen
  private getRenderedImageWidth(image: PicsumImage): number {
    return Math.max(1, Math.round((image.width / image.height) * this.height));
  }

  private getTargetHiddenWidth(): number {
    return Math.max(
      0,
      (this.prerenderWidth(this.availableWidth) - this.availableWidth) / 2,
    );
  }

  /**
   * Calculate the total width of all images in the metadata list.
   */
  private getListWidth(list: ImageNodesList): number {
    let total = 0;
    let node = list.head as ImageNode | undefined;
    let index = 0;

    while (node && index < list.length) {
      if (index > 0) total += this.imageGap;
      total += this.getRenderedImageWidth(node.data);
      node = node.next as ImageNode | undefined;
      index += 1;
    }

    return total;
  }

  /**
   * Calculate the total width of array of images when displayed on the UI
   */
  private getImagesWidth(images: PicsumImage[]): number {
    return images.reduce((total, image, index) => {
      return total + this.getRenderedImageWidth(image) + (index > 0 ? this.imageGap : 0);
    }, 0);
  }

  // fetches the next page of images from the remote source
  private async fetchBatch(limit: number): Promise<PicsumImage[]> {
    const response = await fetch(
      `${this.url}/v2/list?page=${this.nextPage}&limit=${limit}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch images: ${response.status}`);
    }

    const data = (await response.json()) as PicsumImage[];

    const roundHeight = Math.round(this.height);
    const resized = data.map((image) => {
      const scaledWidth = Math.round((image.width / image.height) * this.height);
  
      return {
        ...image,
        width: scaledWidth,
        height: roundHeight,
        download_url: `${this.url}/id/${image.id}/${scaledWidth}/${roundHeight}`,
      };
    });

    this.nextPage += 1;
    return resized;
  }

  private async syncSlotsWindow(): Promise<void> {
    if (!this.slotsController.hasSlots()) {
      return;
    }

    // check up to 8 times for the need to load more images, as after each load recalculations are needed.
    for (let index = 0; index < 8; index += 1) {
      const { needsStart, needsEnd } = this.slotsController.ensureBufferedSlots(
        this.loadMoreTresholdDistancePx,
      );

      if (!needsStart && !needsEnd) {
        return;
      }

      const previousLength = this.imageNodesList.length;

      if (needsStart) {
        await this.loadMoreImages("start");
      }

      if (needsEnd) {
        await this.loadMoreImages("end");
      }

      if (this.imageNodesList.length === previousLength) {
        return;
      }
    }
  }

  // initial load: fill roughly prerenderFactor * availableWidth
  async initialDataList(): Promise<ImageNodesList> {
    if (this.availableWidth <= 0) {
      return this.imageNodesList;
    }

    if (this.imageNodesList.length === 0) {
      const targetWidth = this.prerenderWidth(this.availableWidth);

      while (
        this.getListWidth(this.imageNodesList) < targetWidth &&
        this.imageNodesList.length < this.maxImages
      ) {
        const remaining = this.maxImages - this.imageNodesList.length;
        const batch = await this.fetchBatch(Math.min(this.loadBatch, remaining));

        if (batch.length === 0) {
          break;
        }

        const linked = createLinkedList<PicsumImage>(batch);
        joinLists(this.imageNodesList, linked, "end");
      }

      if (this.imageNodesList.length >= this.maxImages) {
        closeList(this.imageNodesList);
      }
    }

    if (!this.slotsController.hasSlots()) {
      this.slotsController.createInitialSlots(this.imageNodesList);
    }

    await this.syncSlotsWindow();
    return this.imageNodesList;
  }

  // loads additional images and inserts them at the requested side
  async loadMoreImages(insertPosition: InsertPosition): Promise<void> {
    if (
      this.availableWidth <= 0 ||
      this.isFetching ||
      isLinkedListClosed(this.imageNodesList) ||
      this.imageNodesList.length >= this.maxImages
    ) {
      return;
    }

    this.isFetching = true;

    try {
      const remainingCapacity = this.maxImages - this.imageNodesList.length;

      if (remainingCapacity <= 0) {
        closeList(this.imageNodesList);
        return;
      }
  
      const newData: PicsumImage[] = [];
      const targetHiddenWidth = this.getTargetHiddenWidth();

      while (
        this.getImagesWidth(newData) < targetHiddenWidth &&
        newData.length < remainingCapacity
      ) {
        const batch = await this.fetchBatch(
          Math.min(this.loadBatch, remainingCapacity - newData.length)
        );

        if (batch.length === 0) {
          break;
        }

        newData.push(...batch);
      }

      if (newData.length === 0) {
        if (this.imageNodesList.length >= this.maxImages) {
          closeList(this.imageNodesList);
        }
        return;
      }

      const newLinkedList = createLinkedList<PicsumImage>(newData);
      joinLists(this.imageNodesList, newLinkedList, insertPosition);

      if (this.slotsController.hasSlots()) {
        this.slotsController.attachNewSlots(newLinkedList, insertPosition);
      }

      if (this.imageNodesList.length >= this.maxImages) {
        closeList(this.imageNodesList);
      }
    } finally {
      this.isFetching = false;
    }
  }

  // ensures initial data and rendered slots exist
  async ensureSlots(): Promise<SlotsLayout> {
    await this.initialDataList();
    return this.slotsLayout;
  }

  // applies scroll delta and rebalances the rendered window
  async scrollBy(deltaPx: number): Promise<SlotsLayout> {
    if (this.availableWidth <= 0) {
      return this.slotsLayout;
    }

    if (!this.slotsController.hasSlots()) {
      await this.initialDataList();
    }

    if (deltaPx !== 0) {
      this.slotsController.scrollBy(deltaPx);
      await this.syncSlotsWindow();
    }

    return this.slotsLayout;
  }
}