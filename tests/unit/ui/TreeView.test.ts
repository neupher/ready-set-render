/**
 * TreeView Component Tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TreeView, TreeNode } from '@ui/components/TreeView';

describe('TreeView', () => {
  let treeView: TreeView;
  let onSelect: ReturnType<typeof vi.fn<(id: string, node: TreeNode) => void>>;
  let onToggle: ReturnType<typeof vi.fn<(id: string, expanded: boolean) => void>>;

  const mockData: TreeNode[] = [
    {
      id: 'root',
      name: 'Scene',
      type: 'group',
      children: [
        { id: 'cube-1', name: 'Cube.001', type: 'mesh' },
        { id: 'sphere-1', name: 'Sphere.001', type: 'mesh' },
        {
          id: 'group-1',
          name: 'Objects',
          type: 'group',
          children: [
            { id: 'cube-2', name: 'Cube.002', type: 'mesh' }
          ]
        }
      ]
    }
  ];

  beforeEach(() => {
    onSelect = vi.fn<(id: string, node: TreeNode) => void>();
    onToggle = vi.fn<(id: string, expanded: boolean) => void>();
    treeView = new TreeView({
      onSelect,
      onToggle,
      expandedIds: new Set(['root'])
    });
    treeView.setData(mockData);
  });

  describe('constructor', () => {
    it('should create tree view container', () => {
      expect(treeView.element).toBeInstanceOf(HTMLDivElement);
      expect(treeView.element.classList.contains('tree-view')).toBe(true);
    });

    it('should initialize with provided expanded IDs', () => {
      const items = treeView.element.querySelectorAll('.tree-item');
      // Root expanded, so children visible
      expect(items.length).toBeGreaterThan(1);
    });
  });

  describe('setData', () => {
    it('should render tree nodes', () => {
      const items = treeView.element.querySelectorAll('.tree-item');
      expect(items.length).toBeGreaterThan(0);
    });

    it('should display node names', () => {
      const names = treeView.element.querySelectorAll('.tree-name');
      const nameTexts = Array.from(names).map(n => n.textContent);
      expect(nameTexts).toContain('Scene');
      expect(nameTexts).toContain('Cube.001');
    });

    it('should show expand buttons for nodes with children', () => {
      const expandBtns = treeView.element.querySelectorAll('.tree-expand-btn');
      expect(expandBtns.length).toBeGreaterThan(0);
    });
  });

  describe('getSelectedId', () => {
    it('should return null when nothing selected', () => {
      expect(treeView.getSelectedId()).toBeNull();
    });

    it('should return selected ID after selection', () => {
      treeView.select('cube-1');
      expect(treeView.getSelectedId()).toBe('cube-1');
    });
  });

  describe('select', () => {
    it('should select a node by ID', () => {
      treeView.select('cube-1');
      expect(treeView.getSelectedId()).toBe('cube-1');
    });

    it('should call onSelect callback', () => {
      treeView.select('cube-1');
      expect(onSelect).toHaveBeenCalledWith('cube-1', expect.objectContaining({ id: 'cube-1' }));
    });

    it('should add selected class to item', () => {
      treeView.select('cube-1');
      const selected = treeView.element.querySelector('.tree-item.selected') as HTMLElement;
      expect(selected?.dataset?.id).toBe('cube-1');
    });

    it('should not select non-existent node', () => {
      treeView.select('non-existent');
      expect(treeView.getSelectedId()).toBeNull();
    });
  });

  describe('expand', () => {
    it('should expand a node', () => {
      treeView.expand('group-1');
      expect(onToggle).toHaveBeenCalledWith('group-1', true);
    });

    it('should show children when expanded', () => {
      treeView.expand('group-1');
      const names = Array.from(treeView.element.querySelectorAll('.tree-name'))
        .map(n => n.textContent);
      expect(names).toContain('Cube.002');
    });
  });

  describe('collapse', () => {
    it('should collapse a node', () => {
      treeView.collapse('root');
      expect(onToggle).toHaveBeenCalledWith('root', false);
    });

    it('should hide children when collapsed', () => {
      treeView.collapse('root');
      const items = treeView.element.querySelectorAll('.tree-item');
      expect(items.length).toBe(1); // Only root visible
    });
  });

  describe('toggle', () => {
    it('should toggle expanded to collapsed', () => {
      treeView.toggle('root');
      expect(onToggle).toHaveBeenCalledWith('root', false);
    });

    it('should toggle collapsed to expanded', () => {
      treeView.collapse('root');
      onToggle.mockClear();
      treeView.toggle('root');
      expect(onToggle).toHaveBeenCalledWith('root', true);
    });
  });

  describe('expandAll', () => {
    it('should expand all nodes with children', () => {
      treeView.collapseAll();
      onToggle.mockClear();
      treeView.expandAll();

      const names = Array.from(treeView.element.querySelectorAll('.tree-name'))
        .map(n => n.textContent);
      expect(names).toContain('Cube.002'); // Nested child visible
    });
  });

  describe('collapseAll', () => {
    it('should collapse all nodes', () => {
      treeView.collapseAll();
      const items = treeView.element.querySelectorAll('.tree-item');
      expect(items.length).toBe(1); // Only root visible
    });
  });

  describe('click handling', () => {
    it('should select on item click', () => {
      const item = treeView.element.querySelector('[data-id="cube-1"]');
      item?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(treeView.getSelectedId()).toBe('cube-1');
      expect(onSelect).toHaveBeenCalled();
    });

    it('should toggle on expand button click', () => {
      const expandBtn = treeView.element.querySelector('.tree-expand-btn');
      expandBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(onToggle).toHaveBeenCalled();
    });
  });

  describe('icons', () => {
    it('should show mesh icon for mesh type', () => {
      const meshItem = treeView.element.querySelector('[data-id="cube-1"]');
      const icon = meshItem?.querySelector('.tree-icon.mesh');
      expect(icon).toBeTruthy();
    });

    it('should show group icon for group type', () => {
      const groupItem = treeView.element.querySelector('[data-id="root"]');
      const icon = groupItem?.querySelector('.tree-icon.group');
      expect(icon).toBeTruthy();
    });
  });

  describe('dispose', () => {
    it('should clear the container', () => {
      treeView.dispose();
      expect(treeView.element.innerHTML).toBe('');
    });
  });
});
