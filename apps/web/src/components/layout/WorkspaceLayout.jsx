import React, { useState, useRef, useCallback } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import './WorkspaceLayout.css';

const MIN_LEFT_WIDTH = 25;
const MAX_LEFT_WIDTH = 65;
const INITIAL_LEFT_WIDTH = 38;

// ─── Resize Divider Handle Component ───────────────────────────────────────────
function ResizeHandle({ containerRef, onResize, currentWidth }) {
  const [isActive, setIsActive] = useState(false);
  const dragState = useRef(null);

  const handleMouseDown = useCallback((e) => {
    setIsActive(true);
    dragState.current = {
      startX: e.clientX,
      startPercent: currentWidth,
    };
    e.preventDefault();

    const handleMouseMove = (moveEvent) => {
      if (!dragState.current || !containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      if (containerWidth === 0) return;

      const deltaX = moveEvent.clientX - dragState.current.startX;
      const deltaPercent = (deltaX / containerWidth) * 100;
      const newPercent = Math.min(
        Math.max(dragState.current.startPercent + deltaPercent, MIN_LEFT_WIDTH),
        MAX_LEFT_WIDTH
      );
      onResize(newPercent);
    };

    const handleMouseUp = () => {
      setIsActive(false);
      dragState.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [containerRef, onResize, currentWidth]);

  return (
    <div
      className={`workspace-resize-handle ${isActive ? 'workspace-resize-handle--active' : ''}`}
      onMouseDown={handleMouseDown}
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label="Drag to resize panels"
    />
  );
}

// ─── Collapse Toggle Drawer trigger ─────────────────────────────────────────────
function CollapseToggle({ isCollapsed, onToggle }) {
  return (
    <button
      className="workspace-collapse-toggle"
      onClick={onToggle}
      title={isCollapsed ? 'Expand panel' : 'Collapse panel'}
      aria-label={isCollapsed ? 'Expand problem description' : 'Collapse problem description'}
    >
      {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
    </button>
  );
}

// ─── Shared Layout Wrapper ─────────────────────────────────────────────────────
export function WorkspaceLayout({
  headerLeft,
  headerRight,
  leftPane,
  rightPane,
  className = '',
  initialLeftWidth = INITIAL_LEFT_WIDTH
}) {
  const containerRef = useRef(null);
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);

  const handleResize = useCallback((newPercent) => {
    setLeftWidth(newPercent);
  }, []);

  return (
    <div className={`workspace-root ${className}`} ref={containerRef}>
      {/* Shared Header */}
      {(headerLeft || headerRight) && (
        <header className="workspace-header">
          <div className="workspace-header-left">
            {headerLeft}
          </div>
          <div className="workspace-header-right">
            {headerRight}
          </div>
        </header>
      )}

      {/* Main split viewport */}
      <div className="workspace-body">
        <div className="workspace-canvas">
          {/* Left Pane */}
          <section
            className={`workspace-pane workspace-pane--left ${isLeftCollapsed ? 'workspace-pane--collapsed' : ''}`}
            style={{ 
              width: isLeftCollapsed ? '0px' : `${leftWidth}%`, 
              minWidth: isLeftCollapsed ? '0px' : undefined 
            }}
          >
            <div className="workspace-pane-inner" style={{ opacity: isLeftCollapsed ? 0 : 1 }}>
              {leftPane}
            </div>
            <CollapseToggle
              isCollapsed={isLeftCollapsed}
              onToggle={() => setIsLeftCollapsed(!isLeftCollapsed)}
            />
          </section>

          {/* Resize Handle (visible only when left pane is expanded) */}
          {!isLeftCollapsed && (
            <ResizeHandle
              containerRef={containerRef}
              onResize={handleResize}
              currentWidth={leftWidth}
            />
          )}

          {/* Right Pane */}
          <section className="workspace-pane workspace-pane--right">
            {rightPane}
          </section>
        </div>
      </div>
    </div>
  );
}

export default WorkspaceLayout;
