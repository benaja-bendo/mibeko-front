import { useState, useEffect } from 'react';
import { useViewerStore } from '../../store/useViewerStore';
import { cn } from '../../lib/utils';

export default function Splitter() {
  const { setLeftPanelWidth } = useViewerStore();
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      // Get the width of the main container if possible, or just limit based on screen width
      const newWidth = Math.max(250, Math.min(e.clientX, window.innerWidth * 0.72));
      setLeftPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    if (isDragging) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, setLeftPanelWidth]);

  return (
    <div 
      className={cn(
        "w-1 bg-b1 cursor-col-resize shrink-0 relative transition-colors z-50 hover:bg-gold",
        isDragging && "bg-gold"
      )}
      onMouseDown={() => setIsDragging(true)}
      title="Redimensionner"
    />
  );
}
