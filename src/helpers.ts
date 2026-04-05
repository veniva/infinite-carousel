import type { InsertPosition, DoubleLinkedList, LinkListNode } from "./types";

export function createLinkedList<D>(dataArr: D[], closed = false): DoubleLinkedList<LinkListNode<D>> {
  const list: DoubleLinkedList<LinkListNode<D>> = {
    length: 0,
    head: undefined,
    tail: undefined,
  };

  for (const data of dataArr) {
    const newNode: LinkListNode<D> = {
      data,
      prev: list.tail,
    };

    if (!list.head) {
      list.head = newNode;
      list.tail = newNode;
    } else {
      list.tail!.next = newNode;
      list.tail = newNode;
    }

    list.length += 1;
  }

  if (closed) {
    closeList(list);
  }

  return list;
}

export function closeList<T extends LinkListNode>(list: DoubleLinkedList<T>): void {
  if (list.head && list.tail) {
    list.tail.next = list.head;
    list.head.prev = list.tail;
  }
}

export function isLinkedListClosed<T extends LinkListNode>(list: DoubleLinkedList<T>): boolean {
  if (!list.head || !list.tail) return false;

  return list.head.prev === list.tail && list.tail.next === list.head;
}

export function joinLists<T extends LinkListNode>(
  list: DoubleLinkedList<T>,
  newList: DoubleLinkedList<T>,
  position: InsertPosition = "end"
): void {
  if (!newList.length || !newList.head || !newList.tail) {
    return;
  }

  if (!list.length || !list.head || !list.tail) {
    list.head = newList.head;
    list.tail = newList.tail;
    list.length = newList.length;
    return;
  }

  if (position === "end") {
    list.tail.next = newList.head;
    newList.head.prev = list.tail;
    list.tail = newList.tail;
  } else {
    newList.tail.next = list.head;
    list.head.prev = newList.tail;
    list.head = newList.head;
  }

  list.length += newList.length;
}

/**
 * Restricts a number to a given range.
 *
 * Returns `value` if it lies between `min` and `max` (inclusive).
 * If `value` is less than `min`, returns `min`.
 * If `value` is greater than `max`, returns `max`.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}