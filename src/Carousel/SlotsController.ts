import type {
  ImageNode,
  ImageNodesList,
  SlotsLayout,
} from "./types";
import { clamp } from "./../helpers";


type GetRenderedImageWidth = (node: ImageNode) => number;
type GetVisibleWIdth = () => number;
type GetPrerenderWidth = (availableWidth: number) => number;

export class SlotsController {
  // monotonically increasing id for rendered slots
  private nextSlotId = 0;

  // current row height used for width calculations
  private height = 0;

  // current rendered slot positions and viewport offset
  readonly slotsLayout: SlotsLayout = {
    scrollOffset: 0,
    slots: [],
  };

  // measures rendered width for a node at the current row height
  private readonly getRenderedImageWidth: GetRenderedImageWidth;

  // returns the current visible carousel width
  private readonly getVisibleWidth: GetVisibleWIdth;

  // returns the desired prerender width (includes hidden and shown slots)
  private readonly getPrerenderWidth: GetPrerenderWidth;

  // the gap between images in px
  private readonly imageGap: number;

  constructor(
    getRenderedImageWidth: GetRenderedImageWidth,
    getVisibleWidth: GetVisibleWIdth,
    getPrerenderWidth: GetPrerenderWidth,
    imageGap: number,
  ) {
    this.getRenderedImageWidth = getRenderedImageWidth;
    this.getVisibleWidth = getVisibleWidth;
    this.getPrerenderWidth = getPrerenderWidth;
    this.imageGap = imageGap;
  }

  getRowHeight(): number {
    return this.height;
  }

  setHeight(rowHeight: number): void {
    this.height = Math.max(0, rowHeight);
  }

  // returns how much rendered content exists to the left of the viewport
  getHiddenWidthLeft(): number {
    return clamp(-this.slotsLayout.scrollOffset, 0, this.getSlotsWidth());
  }

  // returns how much rendered content exists to the right of the viewport
  getHiddenWidthRight(): number {
    const totalWidth = this.getSlotsWidth();

    return clamp(
      totalWidth + this.slotsLayout.scrollOffset - this.getVisibleWidth(),
      0,
      totalWidth,
    );
  }

  // attaches newly loaded nodes as rendered slots on either side
  attachNewSlots(newList: ImageNodesList, position: "start" | "end"): void {
    if (!newList.head || !newList.tail || newList.length === 0) {
      return;
    }

    if (position === "end") {
      let node = newList.head as ImageNode | undefined;
      let count = 0;

      while (node && count < newList.length) {
        this.appendNodeAsSlot(node);
        node = node.next as ImageNode | undefined;
        count += 1;
      }
    } else {
      let node = newList.tail as ImageNode | undefined;
      let count = 0;

      while (node && count < newList.length) {
        this.prependNodeAsSlot(node);
        node = node.prev as ImageNode | undefined;
        count += 1;
      }
    }
  }

  // builds the initial set of rendered slots from the loaded list
  createInitialSlots(imageNodesList: ImageNodesList): void {
    this.slotsLayout.slots = [];
    this.slotsLayout.scrollOffset = 0;

    if (!imageNodesList.head || imageNodesList.length === 0) {
      return;
    }

    const visibleWidth = this.getVisibleWidth();
    const targetWidth = Math.max(
      visibleWidth,
      this.getPrerenderWidth(visibleWidth),
    );

    let renderedWidth = 0;
    let node = imageNodesList.head as ImageNode | undefined;
    let count = 0;

    while (node && count < imageNodesList.length) {
      renderedWidth += this.getNodeWidth(node) + (count > 0 ? this.imageGap : 0);
      this.appendNodeAsSlot(node);

      if (renderedWidth >= targetWidth) {
        break;
      }

      node = node.next as ImageNode | undefined;
      count += 1;
    }

    const totalWidth = this.getSlotsWidth();
    const centeredHiddenLeft = clamp(
      (totalWidth - visibleWidth) / 2,
      0,
      Math.max(0, totalWidth - visibleWidth),
    );

    this.slotsLayout.scrollOffset = -centeredHiddenLeft;
  }

  // indicates whether any slots are currently rendered
  hasSlots(): boolean {
    return this.slotsLayout.slots.length > 0;
  }

  // shifts the rendered content relative to the viewport
  scrollBy(deltaPx: number): void {
    this.slotsLayout.scrollOffset += deltaPx;
  }

  // grows the needed side and trims the opposite side back to target buffer width
  ensureBufferedSlots(loadMoreThresholdDistancePx: number): {
    needsStart: boolean;
    needsEnd: boolean;
  } {
    
    if (!this.hasSlots()) {
      return {
        needsStart: false,
        needsEnd: false,
      };
    }

    const targetHiddenWidth = this.getTargetHiddenWidth();
    let needsStart = false;
    let needsEnd = false;

    // try changes to the slot data up to 8 times. Break when no changes were made in a given itteration.
    for (let index = 0; index < 8; index++) {
      let changed = false;

      if (this.getHiddenWidthLeft() < loadMoreThresholdDistancePx) {
        while (this.getHiddenWidthLeft() < targetHiddenWidth) {
          const candidate = this.getFirstNode()?.prev as ImageNode | undefined;

          if (!candidate) {  // linked list still open
            needsStart = true;
            break;
          }

          this.prependNodeAsSlot(candidate);
          changed = true;
        }

        while (
          this.getHiddenWidthRight() > targetHiddenWidth &&
          this.slotsLayout.slots.length > 1
        ) {
          this.removeLastSlot();
          changed = true;
        }
      }

      if (this.getHiddenWidthRight() < loadMoreThresholdDistancePx) {
        while (this.getHiddenWidthRight() < targetHiddenWidth) {
          const candidate = this.getLastNode()?.next as ImageNode | undefined;

          if (!candidate) {  // linked list still open
            needsEnd = true;
            break;
          }

          this.appendNodeAsSlot(candidate);
          changed = true;
        }

        while (
          this.getHiddenWidthLeft() > targetHiddenWidth &&
          this.slotsLayout.slots.length > 1
        ) {
          this.removeFirstSlot();
          changed = true;
        }
      }

      if (!changed) {
        break;
      }
    }

    return {
      needsStart,
      needsEnd,
    };
  }

  private appendNodeAsSlot(node: ImageNode): void {
    this.slotsLayout.slots.push({
      slotId: this.nextSlotId,
      node,
    });
    this.nextSlotId += 1;
  }

  private prependNodeAsSlot(node: ImageNode): void {
    const addedWidth = this.getNodeWidth(node) + (this.hasSlots() ? this.imageGap : 0);

    this.slotsLayout.slots.unshift({
      slotId: this.nextSlotId,
      node,
    });

    this.nextSlotId += 1;
    this.slotsLayout.scrollOffset -= addedWidth;
  }

  private removeFirstSlot(): void {
    const firstSlot = this.slotsLayout.slots.shift();

    if (!firstSlot) {
      return;
    }

    if (this.slotsLayout.slots.length === 0) {
      this.slotsLayout.scrollOffset = 0;
      return;
    }

    this.slotsLayout.scrollOffset += this.getNodeWidth(firstSlot.node) + this.imageGap;
  }

  private removeLastSlot(): void {
    this.slotsLayout.slots.pop();

    if (this.slotsLayout.slots.length === 0) {
      this.slotsLayout.scrollOffset = 0;
    }
  }

  private getFirstNode(): ImageNode | undefined {
    return this.slotsLayout.slots[0]?.node;
  }

  private getLastNode(): ImageNode | undefined {
    return this.slotsLayout.slots[this.slotsLayout.slots.length - 1]?.node;
  }

  private getNodeWidth(node: ImageNode): number {
    return Math.max(1, this.getRenderedImageWidth(node));
  }

  private getSlotsWidth(): number {
    return this.slotsLayout.slots.reduce((total, slot, index) => {
      return total + this.getNodeWidth(slot.node) + (index > 0 ? this.imageGap : 0);
    }, 0);
  }

  private getTargetHiddenWidth(): number {
    const visibleWidth = this.getVisibleWidth();
    return Math.max(
      0,
      (this.getPrerenderWidth(visibleWidth) - visibleWidth) / 2,
    );
  }
}