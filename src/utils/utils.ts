export function range(size: number, startAt: number = 0): number[] {
  const res: number[] = [];
  const end = startAt + size;
  for (let i = startAt; i < end; i++) {
    res.push(i);
  }
  return res;
}

export function findPositionInArray<T>(this: T[], el: T, compareFn: (el: T, el2: T) => number): number {
  return (function(arr): number {
    let m: number = 0;
    let n: number = arr.length - 1;

    while(m <= n) {
      const k: number = (n + m) >> 1;
      const cmp: number = compareFn(el, arr[k]);

      if(cmp > 0) {
        m = k + 1;
      } else if(cmp < 0) {
        n = k - 1;
      } else {
        return k;
      }
    }

    return -m - 1;
  })(this);
}

export function pushSorted<T>(arr: T[], el: T, fn: (el: T, el2: T) => number): T[] {
  arr.splice(findPositionInArray.bind(arr)(el, fn), 0, el);
  return arr;
}

// (arr1[index1] < arr2[index2])
function simpleCompare<T>(el1: T, el2: T): boolean {
  return el1 < el2;
}
export function mergeSortedArray<T>(arr1: T[], arr2: T[], compareFn: (el: T, el2: T) => boolean = simpleCompare): T[] {
  const merged: T[] = [];
  let index1: number = 0;
  let index2: number = 0;
  let current: number = 0;

  while (current < (arr1.length + arr2.length)) {
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

export function getScrollbarWidth(doc: Document): number {
  // Creating invisible container
  const outer: HTMLDivElement = doc.createElement('div');
  outer.style.visibility = 'hidden';
  outer.style.overflow = 'scroll'; // forcing scrollbar to appear
  outer.style.msOverflowStyle = 'scrollbar'; // needed for WinJS apps
  doc.body.appendChild(outer);

  // Creating inner element and placing it in the container
  const inner: HTMLDivElement = doc.createElement('div');
  outer.appendChild(inner);

  // Calculating difference between container's full width and the child width
  const scrollbarWidth: number = (outer.offsetWidth - inner.offsetWidth);

  // Removing temporary elements from the DOM
  outer.parentNode.removeChild(outer);

  return scrollbarWidth;
}
