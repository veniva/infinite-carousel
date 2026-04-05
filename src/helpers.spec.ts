import { describe, it, expect, afterEach } from "vitest";
import * as helpers from "./helpers";
import type { PicsumImage, ImageNodesList } from "./types";

const { createLinkedList, joinLists, isLinkedListClosed, closeList } = helpers;

function makeImage(id: string): PicsumImage {
  return {
    id,
    author: `author-${id}`,
    width: 100,
    height: 200,
    download_url: `https://example.com/${id}.jpg`,
  };
}

function toArrayForward(list: ImageNodesList): string[] {
  const result: string[] = [];
  let current = list.head;
  let steps = 0;

  while (current && steps < list.length) {
    result.push(current.data.id);
    current = current.next;
    steps++;
  }

  return result;
}

function toArrayBackward(list: ImageNodesList): string[] {
  const result: string[] = [];
  let current = list.tail;
  let steps = 0;

  while (current && steps < list.length) {
    result.push(current.data.id);
    current = current.prev;
    steps++;
  }

  return result;
}

describe("createLinkedList", () => {
  it("creates an empty list from an empty array", () => {
    const list = createLinkedList([]);

    expect(list.length).toBe(0);
    expect(list.head).toBeUndefined();
    expect(list.tail).toBeUndefined();
  });

  it("creates a single-node list", () => {
    const image = makeImage("1");

    const list = createLinkedList([image]);

    expect(list.length).toBe(1);
    expect(list.head?.data).toEqual(image);
    expect(list.tail?.data).toEqual(image);

    expect(list.head).toBe(list.tail);
    expect(list.head?.prev).toBeUndefined();
    expect(list.head?.next).toBeUndefined();
  });

  it("creates a doubly linked list from multiple images", () => {
    const images = [makeImage("1"), makeImage("2"), makeImage("3")];

    const list = createLinkedList(images);

    expect(list.length).toBe(3);
    expect(list.head?.data.id).toBe("1");
    expect(list.tail?.data.id).toBe("3");

    expect(toArrayForward(list)).toEqual(["1", "2", "3"]);
    expect(toArrayBackward(list)).toEqual(["3", "2", "1"]);

    expect(list.head?.prev).toBeUndefined();
    expect(list.head?.next?.data.id).toBe("2");

    expect(list.head?.next?.prev).toBe(list.head);
    expect(list.head?.next?.next?.data.id).toBe("3");

    expect(list.tail?.next).toBeUndefined();
    expect(list.tail?.prev?.data.id).toBe("2");
  });

  it("creates a closed single-node list when closed is true", () => {
    const image = makeImage("1");

    const list = createLinkedList([image], true);

    expect(list.length).toBe(1);
    expect(list.head?.data).toEqual(image);
    expect(list.tail?.data).toEqual(image);
    expect(list.head).toBe(list.tail);
    expect(list.head?.next).toBe(list.head);
    expect(list.head?.prev).toBe(list.head);
    expect(isLinkedListClosed(list)).toBe(true);
  });

  it("creates a closed multi-node list when closed is true", () => {
    const images = [makeImage("1"), makeImage("2"), makeImage("3")];

    const list = createLinkedList(images, true);

    expect(list.length).toBe(3);
    expect(list.head?.data.id).toBe("1");
    expect(list.tail?.data.id).toBe("3");

    expect(toArrayForward(list)).toEqual(["1", "2", "3"]);
    expect(toArrayBackward(list)).toEqual(["3", "2", "1"]);

    expect(list.head?.prev).toBe(list.tail);
    expect(list.tail?.next).toBe(list.head);

    expect(list.head?.next?.data.id).toBe("2");
    expect(list.head?.next?.prev).toBe(list.head);
    expect(list.tail?.prev?.data.id).toBe("2");
    expect(isLinkedListClosed(list)).toBe(true);
  });

  it("does not close the list when closed is false", () => {
    const images = [makeImage("1"), makeImage("2"), makeImage("3")];

    const list = createLinkedList(images, false);

    expect(list.head?.prev).toBeUndefined();
    expect(list.tail?.next).toBeUndefined();
    expect(isLinkedListClosed(list)).toBe(false);
  });
});

describe("closeList", () => {
  it("does nothing for an empty list", () => {
    const list = createLinkedList([]);

    closeList(list);

    expect(list.length).toBe(0);
    expect(list.head).toBeUndefined();
    expect(list.tail).toBeUndefined();
  });

  it("closes a single-node list", () => {
    const list = createLinkedList([makeImage("1")]);

    closeList(list);

    expect(list.length).toBe(1);
    expect(list.head).toBe(list.tail);
    expect(list.head?.next).toBe(list.head);
    expect(list.head?.prev).toBe(list.head);
    expect(isLinkedListClosed(list)).toBe(true);
  });

  it("connects tail to head for a multi-node list", () => {
    const list = createLinkedList([makeImage("1"), makeImage("2"), makeImage("3")]);

    closeList(list);

    expect(list.length).toBe(3);
    expect(list.head?.data.id).toBe("1");
    expect(list.tail?.data.id).toBe("3");

    expect(list.head?.prev).toBe(list.tail);
    expect(list.tail?.next).toBe(list.head);

    expect(toArrayForward(list)).toEqual(["1", "2", "3"]);
    expect(toArrayBackward(list)).toEqual(["3", "2", "1"]);
    expect(isLinkedListClosed(list)).toBe(true);
  });

  it("keeps an already closed list closed", () => {
    const list = createLinkedList([makeImage("1"), makeImage("2"), makeImage("3")], true);

    closeList(list);

    expect(list.head?.prev).toBe(list.tail);
    expect(list.tail?.next).toBe(list.head);
    expect(isLinkedListClosed(list)).toBe(true);
    expect(toArrayForward(list)).toEqual(["1", "2", "3"]);
    expect(toArrayBackward(list)).toEqual(["3", "2", "1"]);
  });
});

describe("isLinkedListClosed", () => {
  it("returns false for an empty list", () => {
    const list = createLinkedList([]);

    expect(isLinkedListClosed(list)).toBe(false);
  });

  it("returns false for a single-node open list", () => {
    const list = createLinkedList([makeImage("1")]);

    expect(isLinkedListClosed(list)).toBe(false);
  });

  it("returns true for a single-node closed list", () => {
    const list = createLinkedList([makeImage("1")], true);

    expect(isLinkedListClosed(list)).toBe(true);
  });

  it("returns false for a multi-node open list", () => {
    const list = createLinkedList([
      makeImage("1"),
      makeImage("2"),
      makeImage("3"),
    ]);

    expect(isLinkedListClosed(list)).toBe(false);
  });

  it("returns true for a properly closed multi-node list", () => {
    const list = createLinkedList(
      [makeImage("1"), makeImage("2"), makeImage("3")],
      true
    );

    expect(isLinkedListClosed(list)).toBe(true);
  });

  it("returns false if only tail.next points to head (broken closure)", () => {
    const list = createLinkedList([
      makeImage("1"),
      makeImage("2"),
      makeImage("3"),
    ]);

    if (list.tail && list.head) {
      list.tail.next = list.head;
    }

    expect(isLinkedListClosed(list)).toBe(false);
  });

  it("returns false if only head.prev points to tail (broken closure)", () => {
    const list = createLinkedList([
      makeImage("1"),
      makeImage("2"),
      makeImage("3"),
    ]);

    if (list.head && list.tail) {
      list.head.prev = list.tail;
    }

    expect(isLinkedListClosed(list)).toBe(false);
  });
});

describe("joinLists", () => {
  it("does nothing when newList is empty", () => {
    const list = createLinkedList([makeImage("1"), makeImage("2")]);
    const emptyList = createLinkedList([]);

    joinLists(list, emptyList);

    expect(list.length).toBe(2);
    expect(toArrayForward(list)).toEqual(["1", "2"]);
    expect(list.head?.data.id).toBe("1");
    expect(list.tail?.data.id).toBe("2");
  });

  it("copies newList into list when list is empty", () => {
    const list = createLinkedList([]);
    const newList = createLinkedList([makeImage("1"), makeImage("2")]);

    joinLists(list, newList);

    expect(list.length).toBe(2);
    expect(list.head).toBe(newList.head);
    expect(list.tail).toBe(newList.tail);
    expect(toArrayForward(list)).toEqual(["1", "2"]);
    expect(toArrayBackward(list)).toEqual(["2", "1"]);
  });

  it("appends newList to the end by default", () => {
    const list = createLinkedList([makeImage("1"), makeImage("2")]);
    const newList = createLinkedList([makeImage("3"), makeImage("4")]);

    const oldTail = list.tail;
    const newHead = newList.head;

    joinLists(list, newList);

    expect(list.length).toBe(4);
    expect(list.head?.data.id).toBe("1");
    expect(list.tail?.data.id).toBe("4");
    expect(toArrayForward(list)).toEqual(["1", "2", "3", "4"]);
    expect(toArrayBackward(list)).toEqual(["4", "3", "2", "1"]);

    expect(oldTail?.next).toBe(newHead);
    expect(newHead?.prev).toBe(oldTail);
  });

  it("prepends newList to the start", () => {
    const list = createLinkedList([makeImage("3"), makeImage("4")]);
    const newList = createLinkedList([makeImage("1"), makeImage("2")]);

    const oldHead = list.head;
    const newTail = newList.tail;

    joinLists(list, newList, "start");

    expect(list.length).toBe(4);
    expect(list.head?.data.id).toBe("1");
    expect(list.tail?.data.id).toBe("4");
    expect(toArrayForward(list)).toEqual(["1", "2", "3", "4"]);
    expect(toArrayBackward(list)).toEqual(["4", "3", "2", "1"]);

    expect(newTail?.next).toBe(oldHead);
    expect(oldHead?.prev).toBe(newTail);
  });

  it("keeps head.prev undefined after prepend and tail.next undefined after append", () => {
    const list = createLinkedList([makeImage("2"), makeImage("3")]);
    const newList = createLinkedList([makeImage("1")]);

    joinLists(list, newList, "start");

    expect(list.head?.data.id).toBe("1");
    expect(list.head?.prev).toBeUndefined();
    expect(list.tail?.data.id).toBe("3");
    expect(list.tail?.next).toBeUndefined();
  });

  it("updates length correctly when joining multiple-node lists", () => {
    const list = createLinkedList([makeImage("1"), makeImage("2"), makeImage("3")]);
    const newList = createLinkedList([makeImage("4"), makeImage("5")]);

    joinLists(list, newList);

    expect(list.length).toBe(5);
    expect(toArrayForward(list)).toEqual(["1", "2", "3", "4", "5"]);
  });

  describe('clamp', () => {
    it('returns the value when it is within range', () => {
      expect(helpers.clamp(5, 0, 10)).toBe(5);
      expect(helpers.clamp(0, 0, 10)).toBe(0);
      expect(helpers.clamp(10, 0, 10)).toBe(10);
    });
  
    it('clamps to min when value is below range', () => {
      expect(helpers.clamp(-5, 0, 10)).toBe(0);
      expect(helpers.clamp(-1, -1, 5)).toBe(-1);
    });
  
    it('clamps to max when value is above range', () => {
      expect(helpers.clamp(15, 0, 10)).toBe(10);
      expect(helpers.clamp(100, -10, 50)).toBe(50);
    });
  
    it('works with negative ranges', () => {
      expect(helpers.clamp(-5, -10, -1)).toBe(-5);
      expect(helpers.clamp(-20, -10, -1)).toBe(-10);
      expect(helpers.clamp(0, -10, -1)).toBe(-1);
    });
  
    it('handles min greater than max (edge case)', () => {
      expect(helpers.clamp(5, 10, 0)).toBe(10); // current behavior due to Math.max/min order
    });
  });
});