export type ResizeProps = {
  active: ('r' | 'rb' | 'b' | 'lb' | 'l' | 'lt' | 't' | 'rt')[]; // all
  fitParent: boolean; // false
  minWidth: number; // 0
  minHeight: number; // 0

  disableAttributes: ('l' | 't' | 'w' | 'h')[]; // []
  maxWidth?: number;
  maxHeight?: number;

  onResize?(e: ResizeEvent): void;
  onDoubleClick?(originalEvent: MouseEvent): void;
};

export type ResizeEvent = {
  eventName: string;
  changedX?: number;
  changedY?: number;
  width?: number;
  height?: number;
};

export enum ResizeEvents {
  start = 'resize:start',
  move = 'resize:move',
  end = 'resize:end',
}

const RESIZE_MASK: { [key: string]: any } = {
  'resizable-r': { bit: 0b0001, cursor: 'ew-resize' },
  'resizable-rb': { bit: 0b0011, cursor: 'se-resize' },
  'resizable-b': { bit: 0b0010, cursor: 's-resize' },
  'resizable-lb': { bit: 0b0110, cursor: 'sw-resize' },
  'resizable-l': { bit: 0b0100, cursor: 'w-resize' },
  'resizable-lt': { bit: 0b1100, cursor: 'nw-resize' },
  'resizable-t': { bit: 0b1000, cursor: 'n-resize' },
  'resizable-rt': { bit: 0b1001, cursor: 'ne-resize' },
};

const DISABLE_MASK = {
  l: 0b0001,
  t: 0b0010,
  w: 0b0100,
  h: 0b1000,
};

const defaultProps = (props: Partial<ResizeProps>): ResizeProps => {
  return {
    ...props,
    fitParent: props.fitParent || false,
    active: props.active || [],
    disableAttributes: props.disableAttributes || [],
    minWidth: props.minWidth || 0,
    minHeight: props.minHeight || 0,
  };
};

export class ResizeDirective {
  private $el: HTMLElement;
  private props: ResizeProps;
  private minW: number;
  private minH: number;
  private maxW: number;
  private maxH: number;

  private mouseX: number = 0;
  private mouseY: number = 0;

  private width: number = 0;
  private height: number = 0;

  private changeX: number = 0;
  private changeY: number = 0;

  private parent: { width: number; height: number };
  private resizeState: number;
  private activeResizer: HTMLElement | null;
  private disableCalcMap: number = 0b1111;

  private mouseMoveFunc: () => void;
  private mouseUpFunc: () => void;

  constructor(
    private initialProps: Partial<ResizeProps>,
    private $event?: (e: ResizeEvent) => void,
  ) {
    this.props = defaultProps(initialProps);
    this.mouseMoveFunc = this.handleMove.bind(this);
    this.mouseUpFunc = this.handleUp.bind(this);

    this.minW = this.props.minWidth;
    this.minH = this.props.minHeight;
    this.maxW = this.props.maxWidth;
    this.maxH = this.props.maxHeight;
    this.parent = { width: 0, height: 0 };
    this.resizeState = 0;
  }

  set($el: HTMLElement) {
    this.$el = $el;
    this.props.disableAttributes.forEach(attr => {
      switch (attr) {
        case 'l':
          this.disableCalcMap &= ~DISABLE_MASK.l;
          break;
        case 't':
          this.disableCalcMap &= ~DISABLE_MASK.t;
          break;
        case 'w':
          this.disableCalcMap &= ~DISABLE_MASK.w;
          break;
        case 'h':
          this.disableCalcMap &= ~DISABLE_MASK.h;
      }
    });
  }
  emitEvent(eventName: string, additionalOptions?: any) {
    if (!this.$event) {
      return;
    }
    const isLeft = this.activeResizer?.classList.contains('resizable-l');
    this.$event({
      eventName,
      width: this.width + this.changeX * (isLeft ? -1 : 1),
      height: this.height + this.changeY,
      changedX: this.changeX,
      changedY: this.changeY,
      ...additionalOptions,
    });
  }

  private static isTouchEvent(e: MouseEvent | TouchEvent): e is TouchEvent {
    const event = e as TouchEvent;
    return event.touches?.length >= 0;
  }

  handleMove(event: MouseEvent | TouchEvent) {
    if (!this.resizeState) {
      return;
    }
    let eventY, eventX;
    if (ResizeDirective.isTouchEvent(event)) {
      eventY = event.touches[0].clientY;
      eventX = event.touches[0].clientX;
    } else {
      eventY = event.clientY;
      eventX = event.clientX;
    }
    let isX =
      this.resizeState & RESIZE_MASK['resizable-r'].bit ||
      this.resizeState & RESIZE_MASK['resizable-l'].bit;

    let isY =
      this.resizeState & RESIZE_MASK['resizable-t'].bit ||
      this.resizeState & RESIZE_MASK['resizable-b'].bit;

    if (isY && this.disableCalcMap & DISABLE_MASK.h) {
      let diffY = eventY - this.mouseY;
      let changedY = this.changeY + diffY;
      const newHeight = this.height + changedY;
      // if overcrossed min height
      if (newHeight < this.minH) {
        changedY = -(this.height - this.minH);
      }
      // if overcrossed max heiht
      if (this.maxH && newHeight > this.maxH) {
        changedY = this.maxH - this.height;
      }

      this.changeY = changedY;
      this.mouseY = eventY;

      if (this.activeResizer) {
        this.activeResizer.style.bottom = `${-this.changeY}px`;
      }
    }
    if (isX && this.disableCalcMap & DISABLE_MASK.w) {
      const isLeft = this.activeResizer?.classList.contains('resizable-l');
      let diffX = eventX - this.mouseX;
      let changedX = this.changeX + diffX;
      const newWidth = this.width + changedX * (isLeft ? -1 : 1);

      // if overcrossed min width
      if (newWidth < this.minW) {
        changedX = -(this.width - this.minW);
      }
      // if overcrossed max width
      if (this.maxW && newWidth > this.maxW) {
        changedX = this.maxW - this.width;
      }

      this.changeX = changedX;
      this.mouseX = eventX;

      if (this.activeResizer) {
        if (!isLeft) {
          this.activeResizer.style.right = `${-this.changeX}px`;
        } else {
          this.activeResizer.style.left = `${this.changeX}px`;
        }
      }
    }
    this.emitEvent(ResizeEvents.move);
  }

  handleDown(event: MouseEvent | TouchEvent) {
    if (event.defaultPrevented) {
      return;
    }
    // stop other events if resize in progress
    event.preventDefault();

    this.dropInitial();
    for (let elClass in RESIZE_MASK) {
      const target = event.target as HTMLElement | null;
      if (this.$el.contains(target) && target?.classList.contains(elClass)) {
        document.body.style.cursor = RESIZE_MASK[elClass].cursor;
        if (ResizeDirective.isTouchEvent(event)) {
          this.setInitials(event.touches[0], target);
        } else {
          event.preventDefault && event.preventDefault();
          this.setInitials(event, target);
        }
        this.resizeState = RESIZE_MASK[elClass].bit;
        const eventName = ResizeEvents.start;
        this.emitEvent(eventName);
        break;
      }
    }
    this.bindMove();
  }

  handleUp(e: MouseEvent) {
    e.preventDefault();
    if (this.resizeState !== 0) {
      this.resizeState = 0;
      document.body.style.cursor = '';
      const eventName = ResizeEvents.end;
      this.emitEvent(eventName);
    }
    this.dropInitial();
    this.unbindMove();
  }

  private setInitials(
    { clientX, clientY }: { clientX: number; clientY: number },
    target?: HTMLElement,
  ) {
    const computedStyle = getComputedStyle(this.$el);
    this.$el.classList.add('active');
    this.activeResizer = target;

    if (this.disableCalcMap & DISABLE_MASK.w) {
      this.mouseX = clientX;
      this.width = this.$el.clientWidth;
      this.parent.width = this.$el.parentElement.clientWidth;

      // min width
      const minPaddingX =
        parseFloat(computedStyle.paddingLeft) +
        parseFloat(computedStyle.paddingRight);
      this.minW = Math.max(minPaddingX, this.initialProps.minWidth || 0);

      // max width
      if (this.initialProps.maxWidth) {
        this.maxW = Math.max(this.width, this.initialProps.maxWidth);
      }
    }

    if (this.disableCalcMap & DISABLE_MASK.h) {
      this.mouseY = clientY;
      this.height = this.$el.clientHeight;
      this.parent.height = this.$el.parentElement.clientHeight;

      // min height
      const minPaddingY =
        parseFloat(computedStyle.paddingTop) +
        parseFloat(computedStyle.paddingBottom);
      this.minH = Math.max(minPaddingY, this.initialProps.minHeight || 0);
      // max height
      if (this.initialProps.maxHeight) {
        this.maxH = Math.max(this.height, this.initialProps.maxHeight);
      }
    }
  }

  private dropInitial() {
    this.changeX = this.changeY = this.minW = this.minH;
    this.width = this.height = 0;
    if (this.activeResizer) {
      this.activeResizer.removeAttribute('style');
    }
    this.$el.classList.remove('active');
    this.activeResizer = null;
  }

  private bindMove() {
    document.documentElement.addEventListener(
      'mouseup',
      this.mouseUpFunc,
      true,
    );
    document.documentElement.addEventListener(
      'touchend',
      this.mouseUpFunc,
      true,
    );
    document.documentElement.addEventListener(
      'mousemove',
      this.mouseMoveFunc,
      true,
    );
    document.documentElement.addEventListener(
      'touchmove',
      this.mouseMoveFunc,
      true,
    );
    document.documentElement.addEventListener('mouseleave', this.mouseUpFunc);
  }

  private unbindMove() {
    document.documentElement.removeEventListener(
      'mouseup',
      this.mouseUpFunc,
      true,
    );
    document.documentElement.removeEventListener(
      'touchend',
      this.mouseUpFunc,
      true,
    );
    document.documentElement.removeEventListener(
      'mousemove',
      this.mouseMoveFunc,
      true,
    );
    document.documentElement.removeEventListener(
      'touchmove',
      this.mouseMoveFunc,
      true,
    );
    document.documentElement.removeEventListener(
      'mouseleave',
      this.mouseUpFunc,
    );
  }
}
