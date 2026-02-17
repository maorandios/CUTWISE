import { useRef, useState, useEffect } from 'react';
import { 
  getColorHex, 
  getLineWidth, 
  applyMarkupSettings as applyMarkupSettingsUtil,
  getCanvasContext as getCanvasContextUtil,
  setupCanvas as setupCanvasUtil,
  getCanvasCoordinates as getCanvasCoordinatesUtil,
  drawArrow,
  drawCloud
} from '../utils';

export interface MarkupElement {
  type: 'pencil' | 'arrow' | 'cloud' | 'text';
  data: any;
  id: string;
  color?: string;
  thickness?: number;
  path?: Array<{ x: number; y: number }>;
}

export interface TextElement {
  id: string;
  element: HTMLDivElement;
  x: number;
  y: number;
}

export interface UseMarkupOptions {
  containerRef: React.RefObject<HTMLDivElement>;
}

export interface UseMarkupReturn {
  // State
  markupMode: boolean;
  activeMarkupTool: 'pencil' | 'arrow' | 'cloud' | 'text' | null;
  markupColor: 'red' | 'black' | 'yellow' | 'green' | 'blue';
  markupThickness: number;
  
  // Setters
  setMarkupMode: (mode: boolean) => void;
  setActiveMarkupTool: (tool: 'pencil' | 'arrow' | 'cloud' | 'text' | null) => void;
  setMarkupColor: (color: 'red' | 'black' | 'yellow' | 'green' | 'blue') => void;
  setMarkupThickness: (thickness: number) => void;
  
  // Refs
  markupCanvasRef: React.RefObject<HTMLCanvasElement>;
  markupContainerRef: React.RefObject<HTMLDivElement>;
  markupElementsRef: React.MutableRefObject<MarkupElement[]>;
  textElementsRef: React.MutableRefObject<TextElement[]>;
  
  // Functions
  handleToggleMarkup: () => void;
  clearAllMarkups: () => void;
  handleMarkupPointerDown: (event: React.PointerEvent) => void;
  handleMarkupPointerMove: (event: React.PointerEvent) => void;
  handleMarkupPointerUp: (event: React.PointerEvent) => void;
}

export const useMarkup = ({ containerRef }: UseMarkupOptions): UseMarkupReturn => {
  // State
  const [markupMode, setMarkupMode] = useState<boolean>(false);
  const [activeMarkupTool, setActiveMarkupTool] = useState<'pencil' | 'arrow' | 'cloud' | 'text' | null>(null);
  const [markupColor, setMarkupColor] = useState<'red' | 'black' | 'yellow' | 'green' | 'blue'>('red');
  const [markupThickness, setMarkupThickness] = useState<number>(3);
  
  // Refs
  const markupCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const markupContainerRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const drawingStartRef = useRef<{ x: number; y: number } | null>(null);
  const currentPencilPathRef = useRef<Array<{ x: number; y: number }>>([]);
  const lastPencilPointRef = useRef<{ x: number; y: number } | null>(null);
  const markupElementsRef = useRef<MarkupElement[]>([]);
  const textElementsRef = useRef<TextElement[]>([]);
  
  // Helper functions
  const getCanvasContext = (): CanvasRenderingContext2D | null => {
    return getCanvasContextUtil(markupCanvasRef.current);
  };
  
  const applyMarkupSettings = (ctx: CanvasRenderingContext2D) => {
    applyMarkupSettingsUtil(ctx, markupColor, markupThickness);
  };
  
  const setupMarkupCanvas = () => {
    const container = containerRef.current;
    const canvas = markupCanvasRef.current;
    if (!container || !canvas) return;
    
    setupCanvasUtil(canvas, container, applyMarkupSettings);
  };
  
  const getCanvasCoordinates = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const container = containerRef.current;
    if (!container) return null;
    return getCanvasCoordinatesUtil(container, clientX, clientY, true);
  };
  
  const redrawMarkupCanvas = () => {
    const ctx = getCanvasContext();
    if (!ctx) return;
    
    const canvas = markupCanvasRef.current;
    if (!canvas) return;
    
    // Get the actual canvas dimensions (accounting for devicePixelRatio)
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.width / dpr;
    const displayHeight = canvas.height / dpr;
    
    // Clear the entire canvas
    ctx.clearRect(0, 0, displayWidth, displayHeight);
    
    // Redraw all saved markup elements
    markupElementsRef.current.forEach(element => {
      if (element.type === 'arrow' && element.data.start && element.data.end) {
        drawArrow(ctx, element.data.start, element.data.end, element.color, element.thickness);
      } else if (element.type === 'cloud' && element.data.start && element.data.end) {
        drawCloud(ctx, element.data.start, element.data.end, element.color, element.thickness);
      } else if (element.type === 'pencil' && element.path && element.path.length > 0) {
        // Redraw pencil path with smooth curves
        if (element.color && element.thickness !== undefined) {
          const colorHex = getColorHex(element.color as 'red' | 'black' | 'yellow' | 'green' | 'blue');
          const lineWidth = getLineWidth(element.thickness);
          ctx.strokeStyle = colorHex;
          ctx.lineWidth = lineWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.miterLimit = 10;
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
        }
        
        if (element.path.length === 1) {
          // Single point
          const p = element.path[0];
          ctx.beginPath();
          ctx.arc(p.x, p.y, getLineWidth(element.thickness || 3) / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Draw smooth curves using quadratic curves
          ctx.beginPath();
          ctx.moveTo(element.path[0].x, element.path[0].y);
          
          for (let i = 1; i < element.path.length; i++) {
            const prevPoint = element.path[i - 1];
            const currentPoint = element.path[i];
            
            if (i === 1) {
              // First segment - straight line
              ctx.lineTo(currentPoint.x, currentPoint.y);
            } else {
              // Use quadratic curve for smooth transitions
              ctx.quadraticCurveTo(
                prevPoint.x,
                prevPoint.y,
                currentPoint.x,
                currentPoint.y
              );
            }
          }
          ctx.stroke();
        }
      }
    });
    
    // Redraw current pencil path if it exists (for in-progress pencil drawing)
    if (currentPencilPathRef.current.length > 0 && activeMarkupTool === 'pencil') {
      applyMarkupSettings(ctx);
      
      if (currentPencilPathRef.current.length === 1) {
        // Single point
        const p = currentPencilPathRef.current[0];
        ctx.beginPath();
        ctx.arc(p.x, p.y, getLineWidth(markupThickness) / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Draw smooth curves using quadratic curves
        ctx.beginPath();
        const firstPoint = currentPencilPathRef.current[0];
        ctx.moveTo(firstPoint.x, firstPoint.y);
        
        for (let i = 1; i < currentPencilPathRef.current.length; i++) {
          const prevPoint = currentPencilPathRef.current[i - 1];
          const currentPoint = currentPencilPathRef.current[i];
          
          if (i === 1) {
            // First segment - straight line
            ctx.lineTo(currentPoint.x, currentPoint.y);
          } else {
            // Use quadratic curve for smooth transitions
            ctx.quadraticCurveTo(
              prevPoint.x,
              prevPoint.y,
              currentPoint.x,
              currentPoint.y
            );
          }
        }
        ctx.stroke();
      }
    }
  };
  
  const createTextElement = (x: number, y: number) => {
    const container = markupContainerRef.current;
    if (!container) return;
    
    const textDiv = document.createElement('div');
    textDiv.style.position = 'absolute';
    textDiv.style.left = `${x}px`;
    textDiv.style.top = `${y}px`;
    textDiv.style.background = 'rgba(255, 255, 255, 0.9)';
    textDiv.style.border = '2px solid #ff0000';
    textDiv.style.padding = '8px';
    textDiv.style.borderRadius = '4px';
    textDiv.style.cursor = 'text';
    textDiv.style.minWidth = '200px';
    textDiv.style.zIndex = '1000';
    textDiv.style.display = 'inline-block';
    
    const textarea = document.createElement('textarea');
    textarea.placeholder = 'Enter text...';
    textarea.style.border = 'none';
    textarea.style.outline = 'none';
    textarea.style.background = 'transparent';
    textarea.style.width = '400px';
    textarea.style.fontSize = '20px';
    textarea.style.resize = 'none';
    textarea.style.overflow = 'hidden';
    textarea.style.fontFamily = 'inherit';
    textarea.style.lineHeight = '1.4';
    textarea.style.padding = '0';
    textarea.style.margin = '0';
    textarea.style.boxSizing = 'border-box';
    
    // Calculate single line height (fontSize * lineHeight)
    const singleLineHeight = 20 * 1.4; // 28px for 20px font with 1.4 line height
    
    // Set initial height to exactly one line
    textarea.style.height = `${singleLineHeight}px`;
    textarea.style.minHeight = `${singleLineHeight}px`;
    
    // Auto-resize function - only expand when text wraps
    const autoResize = () => {
      // Reset height to single line to get accurate scrollHeight
      textarea.style.height = `${singleLineHeight}px`;
      const scrollHeight = textarea.scrollHeight;
      
      // Only set new height if content actually requires more than one line
      if (scrollHeight > singleLineHeight) {
        textarea.style.height = `${scrollHeight}px`;
      } else {
        textarea.style.height = `${singleLineHeight}px`;
      }
    };
    
    // Auto-resize on input
    textarea.addEventListener('input', autoResize);
    
    // Also resize on paste
    textarea.addEventListener('paste', () => {
      setTimeout(autoResize, 0);
    });
    
    textDiv.appendChild(textarea);
    container.appendChild(textDiv);
    
    textarea.focus();
    
    const id = `text-${Date.now()}`;
    textElementsRef.current.push({
      id,
      element: textDiv,
      x,
      y
    });
    
    markupElementsRef.current.push({
      type: 'text',
      data: { x, y, text: '' },
      id
    });
    
    // Update text on blur
    textarea.addEventListener('blur', () => {
      const textData = markupElementsRef.current.find(el => el.id === id);
      if (textData) {
        textData.data.text = textarea.value;
      }
    });
    
    // Remove on double click
    textDiv.addEventListener('dblclick', () => {
      textDiv.remove();
      textElementsRef.current = textElementsRef.current.filter(el => el.id !== id);
      markupElementsRef.current = markupElementsRef.current.filter(el => el.id !== id);
    });
  };
  
  // Main functions
  const clearAllMarkups = () => {
    // Clear canvas
    const ctx = getCanvasContext();
    const canvas = markupCanvasRef.current;
    if (ctx && canvas) {
      const dpr = window.devicePixelRatio || 1;
      const displayWidth = canvas.width / dpr;
      const displayHeight = canvas.height / dpr;
      ctx.clearRect(0, 0, displayWidth, displayHeight);
    }
    
    // Clear stored markup elements
    markupElementsRef.current = [];
    currentPencilPathRef.current = [];
    lastPencilPointRef.current = null;
    
    // Clear text elements
    const container = markupContainerRef.current;
    if (container) {
      textElementsRef.current.forEach(textEl => {
        if (textEl.element && textEl.element.parentNode) {
          textEl.element.parentNode.removeChild(textEl.element);
        }
      });
      textElementsRef.current = [];
    }
  };
  
  const handleToggleMarkup = () => {
    const newMode = !markupMode;
    setMarkupMode(newMode);
    if (!newMode) {
      // Clear active tool and all markups when disabling markup
      setActiveMarkupTool(null);
      clearAllMarkups();
    } else {
      // Clear markups when re-enabling markup mode
      clearAllMarkups();
    }
  };
  
  const handleMarkupPointerDown = (event: React.PointerEvent) => {
    if (!markupMode || !activeMarkupTool) return;
    
    const coords = getCanvasCoordinates(event.clientX, event.clientY);
    if (!coords) return;
    
    isDrawingRef.current = true;
    drawingStartRef.current = coords;
    
    if (activeMarkupTool === 'text') {
      // For text, create input at click position
      createTextElement(coords.x, coords.y);
    } else if (activeMarkupTool === 'pencil') {
      // Initialize pencil path - store original coordinates for smooth drawing
      currentPencilPathRef.current = [coords];
      lastPencilPointRef.current = coords;
      const ctx = getCanvasContext();
      if (ctx) {
        applyMarkupSettings(ctx);
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
      }
    }
  };
  
  const handleMarkupPointerMove = (event: React.PointerEvent) => {
    if (!markupMode || !activeMarkupTool || !isDrawingRef.current) return;
    
    const coords = getCanvasCoordinates(event.clientX, event.clientY);
    if (!coords || !drawingStartRef.current) return;
    
    const ctx = getCanvasContext();
    if (!ctx) return;
    
    if (activeMarkupTool === 'pencil') {
      // Store original coordinates for smooth drawing
      currentPencilPathRef.current.push(coords);
      
      applyMarkupSettings(ctx);
      
      const lastPoint = lastPencilPointRef.current;
      if (lastPoint) {
        // Use quadratic curve for smooth transitions between points
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.quadraticCurveTo(
          lastPoint.x,
          lastPoint.y,
          coords.x,
          coords.y
        );
        ctx.stroke();
      } else {
        // First point
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
        ctx.stroke();
      }
      
      lastPencilPointRef.current = coords;
    } else if (activeMarkupTool === 'arrow' || activeMarkupTool === 'cloud') {
      // For arrow and cloud, redraw all saved elements and show preview
      redrawMarkupCanvas();
      
      // Draw preview with current settings
      applyMarkupSettings(ctx);
      if (activeMarkupTool === 'arrow') {
        drawArrow(ctx, drawingStartRef.current, coords);
      } else if (activeMarkupTool === 'cloud') {
        drawCloud(ctx, drawingStartRef.current, coords);
      }
    }
  };
  
  const handleMarkupPointerUp = (event: React.PointerEvent) => {
    if (!markupMode || !activeMarkupTool || !isDrawingRef.current) return;
    
    const coords = getCanvasCoordinates(event.clientX, event.clientY);
    if (!coords || !drawingStartRef.current) return;
    
    const ctx = getCanvasContext();
    if (!ctx) return;
    
    if (activeMarkupTool === 'arrow' || activeMarkupTool === 'cloud') {
      // Redraw all saved elements first
      redrawMarkupCanvas();
      
      // Draw the final element and save it
      applyMarkupSettings(ctx);
      if (activeMarkupTool === 'arrow') {
        drawArrow(ctx, drawingStartRef.current, coords);
        markupElementsRef.current.push({
          type: 'arrow',
          data: { start: drawingStartRef.current, end: coords },
          id: `arrow-${Date.now()}`,
          color: markupColor,
          thickness: markupThickness
        });
      } else if (activeMarkupTool === 'cloud') {
        drawCloud(ctx, drawingStartRef.current, coords);
        markupElementsRef.current.push({
          type: 'cloud',
          data: { start: drawingStartRef.current, end: coords },
          id: `cloud-${Date.now()}`,
          color: markupColor,
          thickness: markupThickness
        });
      }
    } else if (activeMarkupTool === 'pencil') {
      // Pencil drawing is already drawn during move, save the path
      markupElementsRef.current.push({
        type: 'pencil',
        data: { start: drawingStartRef.current, end: coords },
        id: `pencil-${Date.now()}`,
        color: markupColor,
        thickness: markupThickness,
        path: [...currentPencilPathRef.current] // Store the complete path
      });
      // Clear current pencil path
      currentPencilPathRef.current = [];
      lastPencilPointRef.current = null;
    }
    
    isDrawingRef.current = false;
    drawingStartRef.current = null;
    lastPencilPointRef.current = null;
  };
  
  // Setup canvas on mount and resize
  useEffect(() => {
    if (markupMode) {
      setupMarkupCanvas();
      const handleResize = () => setupMarkupCanvas();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [markupMode]);
  
  return {
    // State
    markupMode,
    activeMarkupTool,
    markupColor,
    markupThickness,
    
    // Setters
    setMarkupMode,
    setActiveMarkupTool,
    setMarkupColor,
    setMarkupThickness,
    
    // Refs
    markupCanvasRef,
    markupContainerRef,
    markupElementsRef,
    textElementsRef,
    
    // Functions
    handleToggleMarkup,
    clearAllMarkups,
    handleMarkupPointerDown,
    handleMarkupPointerMove,
    handleMarkupPointerUp
  };
};

