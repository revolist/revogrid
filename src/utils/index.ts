/* Generate range on size
 */
export function range(size: number, startAt = 0): number[] {
  const res: number[] = [];
  const end = startAt + size;
  for (let i = startAt; i < end; i++) {
    res.push(i);
  }
  return res;
}

/* Find index position in array */
export function findPositionInArray<T>(this: T[], el: T, compareFn: (el: T, el2: T) => number): number {
  return (function (arr): number {
    let m = 0;
    let n = arr.length - 1;

    while (m <= n) {
      const k = (n + m) >> 1;
      const cmp = compareFn(el, arr[k]);

      if (cmp > 0) {
        m = k + 1;
      } else if (cmp < 0) {
        n = k - 1;
      } else {
        return k;
      }
    }

    return -m - 1;
  })(this);
}

/**
 * Sorted push
 */
export function pushSorted<T>(arr: T[], el: T, fn: (el: T, el2: T) => number): T[] {
  arr.splice(findPositionInArray.bind(arr)(el, fn), 0, el);
  return arr;
}

// (arr1[index1] < arr2[index2])
function simpleCompare<T>(el1: T, el2: T): boolean {
  return el1 < el2;
}

/**
 * Merge sorted array helper function
 */
export function mergeSortedArray<T>(arr1: T[], arr2: T[], compareFn: (el: T, el2: T) => boolean = simpleCompare): T[] {
  const merged: T[] = [];
  let index1 = 0;
  let index2 = 0;
  let current = 0;

  while (current < arr1.length + arr2.length) {
    let isArr1Depleted = index1 >= arr1.length;
    let isArr2Depleted = index2 >= arr2.length;

    if (!isArr1Depleted && (isArr2Depleted || compareFn(arr1[index1], arr2[index2]))) {
      merged[current] = arr1[index1];
      index1++;
    } else {
      merged[current] = arr2[index2];
      index2++;
    }

    current++;
  }

  return merged;
}

/**
 * Calculate system scrollbar size
 */
export function getScrollbarSize(document: Document): number {
  // Create a temporary div container and append it to the body
  const container = document.createElement('div');

  // Apply styling to ensure the div is scrollable
  container.style.overflow = 'scroll';
  container.style.visibility = 'hidden'; // make sure the container isn't visible
  container.style.position = 'absolute';
  container.style.top = '-9999px'; // move it out of the screen
  container.style.width = '50px'; // arbitrary width
  container.style.height = '50px'; // arbitrary height

  // Append the div to the body
  document.body.appendChild(container);

  // Calculate the width of the scrollbar
  const scrollbarWidth = container.offsetWidth - container.clientWidth;

  // Remove the div from the body after calculation
  document.body.removeChild(container);

  // Return the calculated width of the scrollbar
  return scrollbarWidth;
}

/* Scale a value between 2 ranges
 *
 * Sample:
 * // 55 from a 0-100 range to a 0-1000 range (Ranges don't have to be positive)
 * const n = scaleValue(55, [0,100], [0,1000]);
 *
 * Ranges of two values
 * @from
 * @to
 *
 * ~~ return value does the equivalent of Math.floor but faster.
 */
export function scaleValue(value: number, from: [number, number], to: [number, number]): number {
  return ((to[1] - to[0]) * (value - from[0])) / (from[1] - from[0]) + to[0];
}

/**
 * Async timeout
 */
export async function timeout(delay = 0): Promise<void> {
  await new Promise((r: (v?: any) => void) => {
    setTimeout(() => r(), delay);
  });
}

/**
 * Type script mixins
 */
export function applyMixins(derivedCtor: any, constructors: any[]) {
  constructors.forEach(baseCtor => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
      Object.defineProperty(derivedCtor.prototype, name, Object.getOwnPropertyDescriptor(baseCtor.prototype, name) || Object.create(null));
    });
  });
}
