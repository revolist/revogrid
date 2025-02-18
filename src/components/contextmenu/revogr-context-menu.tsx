import { Component, Prop, h, State, Event, EventEmitter, Method } from '@stencil/core';

interface MenuItem {
  label: string;
  action: () => void;
}

@Component({
  tag: 'revogr-context-menu',
  styleUrl: 'revogr-context-menu.scss',
  shadow: true,
})
export class RevogrContextMenu {
  @Prop() items: MenuItem[] = [];
  @State() visible: boolean = false;
  @State() position: { x: number; y: number } = { x: 0, y: 0 };

  @Event() menuClosed: EventEmitter<void>;

  @Method()
  async handleContextMenu(event: MouseEvent) {
    event.preventDefault();
    this.position = { x: event.clientX, y: event.clientY };
    this.visible = true;
  }

  @Method()
  async closeMenu() {
    this.visible = false;
    this.menuClosed.emit();
  }

  private handleClickOutside() {
    this.visible = false;
    this.menuClosed.emit();
  }

  private handleItemClick(action: () => void) {
    action();
    this.handleClickOutside();
  }

  render() {
    return (
      <div
        onContextMenu={(e) => this.handleContextMenu(e)}
        onClick={() => this.handleClickOutside()}
      >
        {this.visible && (
          <div
            class="context-menu"
            style={{ top: `${this.position.y}px`, left: `${this.position.x}px` }}
          >
            {this.items.map((item) => (
              <div
                class="menu-item"
                onClick={() => this.handleItemClick(item.action)}
              >
                {item.label}
              </div>
            ))}
          </div>
        )}
        <slot />
      </div>
    );
  }
} 