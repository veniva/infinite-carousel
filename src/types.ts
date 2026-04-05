export type InsertPosition = "start" | "end";

// Double Linked List node
export type LinkListNode<D = unknown> = {
  data: D;
  next?: LinkListNode<D>;
  prev?: LinkListNode<D>;
};

export type DoubleLinkedList<T extends LinkListNode = LinkListNode> = {
  length: number;
  head?: T;
  tail?: T;
};