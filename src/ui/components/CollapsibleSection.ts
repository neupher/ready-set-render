/**
 * CollapsibleSection Component
 *
 * A collapsible section with header and content area.
 * Used in the Properties panel for grouping related properties.
 *
 * @example
 * ```ts
 * const section = new CollapsibleSection({
 *   title: 'Transform',
 *   defaultOpen: true
 * });
 * section.setContent(transformInputs);
 * container.appendChild(section.element);
 * ```
 */

export interface CollapsibleSectionOptions {
  /** Section title displayed in header */
  title: string;
  /** Whether section starts expanded (default: true) */
  defaultOpen?: boolean;
}

/**
 * Collapsible section with toggle functionality.
 * NOT a plugin - standard UI component.
 */
export class CollapsibleSection {
  private readonly container: HTMLDivElement;
  private readonly header: HTMLDivElement;
  private readonly content: HTMLDivElement;
  private readonly icon: HTMLSpanElement;
  private isOpen: boolean;

  constructor(options: CollapsibleSectionOptions) {
    this.isOpen = options.defaultOpen ?? true;

    this.container = document.createElement('div');
    this.container.className = `collapsible-section ${this.isOpen ? 'expanded' : 'collapsed'}`;

    // Create header
    this.header = document.createElement('div');
    this.header.className = 'collapsible-header';

    // Create chevron icon
    this.icon = document.createElement('span');
    this.icon.className = 'collapsible-icon';
    this.updateIcon();

    // Create title
    const title = document.createElement('span');
    title.className = 'collapsible-title';
    title.textContent = options.title;

    this.header.appendChild(this.icon);
    this.header.appendChild(title);

    // Create content area
    this.content = document.createElement('div');
    this.content.className = 'collapsible-content';

    // Assemble
    this.container.appendChild(this.header);
    this.container.appendChild(this.content);

    // Setup event listeners
    this.setupEvents();
  }

  /**
   * Get the root DOM element.
   */
  get element(): HTMLDivElement {
    return this.container;
  }

  /**
   * Set the content of the collapsible section.
   * @param content - HTML element or string to display
   */
  setContent(content: HTMLElement | string): void {
    if (typeof content === 'string') {
      this.content.innerHTML = content;
    } else {
      this.content.innerHTML = '';
      this.content.appendChild(content);
    }
  }

  /**
   * Append content to the section.
   * @param element - Element to append
   */
  appendContent(element: HTMLElement): void {
    this.content.appendChild(element);
  }

  /**
   * Toggle the collapsed/expanded state.
   */
  toggle(): void {
    this.isOpen = !this.isOpen;
    this.updateState();
  }

  /**
   * Expand the section.
   */
  expand(): void {
    if (!this.isOpen) {
      this.isOpen = true;
      this.updateState();
    }
  }

  /**
   * Collapse the section.
   */
  collapse(): void {
    if (this.isOpen) {
      this.isOpen = false;
      this.updateState();
    }
  }

  /**
   * Check if section is currently expanded.
   */
  get expanded(): boolean {
    return this.isOpen;
  }

  /**
   * Clean up event listeners.
   */
  dispose(): void {
    this.header.removeEventListener('click', this.handleClick);
  }

  private setupEvents(): void {
    this.handleClick = this.handleClick.bind(this);
    this.header.addEventListener('click', this.handleClick);
  }

  private handleClick(): void {
    this.toggle();
  }

  private updateState(): void {
    if (this.isOpen) {
      this.container.classList.remove('collapsed');
      this.container.classList.add('expanded');
    } else {
      this.container.classList.remove('expanded');
      this.container.classList.add('collapsed');
    }
    this.updateIcon();
  }

  private updateIcon(): void {
    // SVG chevron icons
    if (this.isOpen) {
      this.icon.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
    } else {
      this.icon.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
    }
  }
}
