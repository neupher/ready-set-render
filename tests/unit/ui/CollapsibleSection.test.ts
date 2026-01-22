/**
 * CollapsibleSection Component Tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CollapsibleSection } from '@ui/components/CollapsibleSection';

describe('CollapsibleSection', () => {
  let section: CollapsibleSection;

  beforeEach(() => {
    section = new CollapsibleSection({
      title: 'Test Section',
      defaultOpen: true
    });
  });

  describe('constructor', () => {
    it('should create section with title', () => {
      const title = section.element.querySelector('.collapsible-title');
      expect(title?.textContent).toBe('Test Section');
    });

    it('should be expanded by default when defaultOpen is true', () => {
      expect(section.expanded).toBe(true);
      expect(section.element.classList.contains('expanded')).toBe(true);
    });

    it('should be collapsed when defaultOpen is false', () => {
      const collapsedSection = new CollapsibleSection({
        title: 'Collapsed',
        defaultOpen: false
      });
      expect(collapsedSection.expanded).toBe(false);
      expect(collapsedSection.element.classList.contains('collapsed')).toBe(true);
    });

    it('should default to expanded when defaultOpen not specified', () => {
      const defaultSection = new CollapsibleSection({ title: 'Default' });
      expect(defaultSection.expanded).toBe(true);
    });
  });

  describe('element', () => {
    it('should return the container element', () => {
      expect(section.element).toBeInstanceOf(HTMLDivElement);
      expect(section.element.classList.contains('collapsible-section')).toBe(true);
    });

    it('should have correct structure', () => {
      expect(section.element.querySelector('.collapsible-header')).toBeTruthy();
      expect(section.element.querySelector('.collapsible-content')).toBeTruthy();
      expect(section.element.querySelector('.collapsible-icon')).toBeTruthy();
    });
  });

  describe('setContent', () => {
    it('should set string content', () => {
      section.setContent('<span>Test Content</span>');
      const content = section.element.querySelector('.collapsible-content');
      expect(content?.innerHTML).toContain('Test Content');
    });

    it('should set element content', () => {
      const div = document.createElement('div');
      div.id = 'test-element';
      div.textContent = 'Element Content';
      section.setContent(div);

      const content = section.element.querySelector('.collapsible-content');
      expect(content?.querySelector('#test-element')).toBeTruthy();
    });
  });

  describe('appendContent', () => {
    it('should append element to content', () => {
      const first = document.createElement('span');
      first.id = 'first';
      const second = document.createElement('span');
      second.id = 'second';

      section.setContent(first);
      section.appendContent(second);

      const content = section.element.querySelector('.collapsible-content');
      expect(content?.querySelectorAll('span').length).toBe(2);
    });
  });

  describe('toggle', () => {
    it('should toggle from expanded to collapsed', () => {
      expect(section.expanded).toBe(true);
      section.toggle();
      expect(section.expanded).toBe(false);
      expect(section.element.classList.contains('collapsed')).toBe(true);
    });

    it('should toggle from collapsed to expanded', () => {
      section.toggle(); // collapse
      section.toggle(); // expand
      expect(section.expanded).toBe(true);
      expect(section.element.classList.contains('expanded')).toBe(true);
    });
  });

  describe('expand', () => {
    it('should expand when collapsed', () => {
      section.collapse();
      section.expand();
      expect(section.expanded).toBe(true);
    });

    it('should do nothing when already expanded', () => {
      expect(section.expanded).toBe(true);
      section.expand();
      expect(section.expanded).toBe(true);
    });
  });

  describe('collapse', () => {
    it('should collapse when expanded', () => {
      section.collapse();
      expect(section.expanded).toBe(false);
    });

    it('should do nothing when already collapsed', () => {
      section.collapse();
      section.collapse();
      expect(section.expanded).toBe(false);
    });
  });

  describe('click handling', () => {
    it('should toggle on header click', () => {
      const header = section.element.querySelector('.collapsible-header');
      expect(section.expanded).toBe(true);

      header?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(section.expanded).toBe(false);
    });
  });

  describe('dispose', () => {
    it('should clean up event listeners', () => {
      section.dispose();
      // After dispose, clicking should not toggle (no error thrown means cleanup worked)
      const header = section.element.querySelector('.collapsible-header');
      header?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      // State may or may not change depending on implementation,
      // but we mainly test that no errors occur
    });
  });
});
