// ==== Data layer ====

import type { DoubleLinkedList, LinkListNode } from "../types";

// server data
export type PicsumImage = {
  id: string;
  author: string;
  width: number;
  height: number;
  download_url: string;
};

export type ImageNode = LinkListNode<PicsumImage>;

// linked list of all images metadata
export type ImageNodesList = DoubleLinkedList<ImageNode>;

// ==== UI layer ====

export type CarouselSlot = {
  slotId: number;
  node: ImageNode;
};

export type SlotsLayout = {
  slots: CarouselSlot[];
  scrollOffset: number;
};