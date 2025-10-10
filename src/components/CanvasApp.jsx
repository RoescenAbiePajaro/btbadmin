import React, { useRef, useState, useEffect } from "react";
import axios from 'axios';
import Toolbar from "./Toolbar";
import Toast from "./Toast";

export default function CanvasApp({ userData }) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#ff66b2");
  const [brushSize, setBrushSize] = useState(8);
  const [eraserSize, setEraserSize] = useState(20);
  const [isEraser, setIsEraser] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [zoom, setZoom] = useState(1);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [toolMode, setToolMode] = useState("draw");
  const [selectedArea, setSelectedArea] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [insertedImages, setInsertedImages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [textData, setTextData] = useState({ x: 0, y: 0, content: "", fontSize: 24, cursorPosition: 0, font: "Arial" });
  const [cursorVisible, setCursorVisible] = useState(false);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [transformStart, setTransformStart] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [canvasSize] = useState({ width: 800, height: 600 });
  const [toasts, setToasts] = useState([]);
  const [currentErrorToastId, setCurrentErrorToastId] = useState(null);

  // Function to add a new toast
  const addToast = (message, type = "info", duration = 3000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  };

  // Function to remove a toast
  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => {
      if (toast.id === id) {
        // If we're removing the current error toast, clear the reference
        if (id === currentErrorToastId) {
          setCurrentErrorToastId(null);
        }
        return false;
      }
      return true;
    }));
  };

  const checkAIGeneration = async (text) => {
    try {
      // Skip AI check for short text (less than 10 characters)
      if (text.trim().length < 10) {
        return {
          aiPercentage: 0,
          isAIGenerated: false,
          message: "Text too short for AI detection",
        };
      }

      const apiKey = process.env.REACT_APP_ZEROGPT_API_KEY;
      const apiUrl = process.env.REACT_APP_ZEROGPT_API_URL || "https://zerogpt.p.rapidapi.com/api/v1/detectText";
      const apiHost = process.env.REACT_APP_ZEROGPT_HOST || "zerogpt.p.rapidapi.com";

      if (!apiKey) {
        throw new Error("ZeroGPT API key not configured");
      }

      const response = await axios.post(
        apiUrl,
        { input_text: text },
        {
          headers: {
            "Content-Type": "application/json",
            "X-RapidAPI-Key": apiKey,
            "X-RapidAPI-Host": apiHost,
          },
        }
      );

      const result = {
        aiPercentage: response.data.ai_percentage || 0,
        isAIGenerated: response.data.is_ai_generated || false,
        message: `AI Detection: ${(response.data.ai_percentage || 0).toFixed(1)}% AI-generated`,
      };

      addToast(result.message, result.isAIGenerated ? "error" : "success");
      return result;
    } catch (error) {
      console.error("AI detection error:", error);
      const errorMessage = "AI detection unavailable";
      addToast(errorMessage, "error");
      return {
        aiPercentage: 0,
        isAIGenerated: false,
        message: errorMessage,
      };
    }
  };

  const checkSpelling = async (text) => {
    try {
      // Skip check for short text (less than 10 characters)
      if (text.trim().length < 10) {
        return {
          errors: [],
          message: "Text too short for spelling check",
        };
      }

      const response = await axios.post(
        "https://api.languagetool.org/v2/check",
        new URLSearchParams({
          text: text,
          language: "en-US",
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const errors = response.data.matches || [];
      // Filter out low-confidence or minor suggestions
      const filteredErrors = errors.filter(
        (error) =>
          error.rule.confidence > 0.5 && // Filter low-confidence suggestions
          error.rule.issueType !== "typographical" // Skip minor issues like capitalization
      );

      // Remove any existing error toast if the spelling is now correct
      if (filteredErrors.length === 0 && currentErrorToastId) {
        removeToast(currentErrorToastId);
        setCurrentErrorToastId(null);
      }

      let message;
      if (filteredErrors.length === 0) {
        message = "No spelling or grammar issues found";
      } else {
        message = `Found ${filteredErrors.length} issue${filteredErrors.length > 1 ? 's' : ''}: `;
        message += filteredErrors
          .slice(0, 2) // Limit to first two errors for brevity
          .map((err) => err.message)
          .join(", ");
        if (filteredErrors.length > 2) message += "...";
      }

      // Only show a new toast if there are errors and we don't already have an error toast
      if (filteredErrors.length > 0 && !currentErrorToastId) {
        const toastId = Date.now();
        setCurrentErrorToastId(toastId);
        addToast(message, "error");
      } else if (filteredErrors.length === 0) {
        addToast(message, "success");
      }
      return {
        errors: filteredErrors,
        message,
      };
    } catch (error) {
      console.error("Spell check error:", error);
      const errorMessage = "Spell check unavailable";
      addToast(errorMessage, "error");
      return {
        
        errors: [],
        message: errorMessage,
      };
    }
  };

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    cvs.width = canvasSize.width;
    cvs.height = canvasSize.height;
    cvs.style.width = `${canvasSize.width}px`;
    cvs.style.height = `${canvasSize.height}px`;
    cvs.style.backgroundColor = 'black';
    const ctx = cvs.getContext("2d");
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
    redrawInsertedImages();
    pushHistory();
  }, []);

  useEffect(() => {
    if (toolMode !== 'text' && isTyping) {
      drawTextOnCanvas(true);
    }
  }, [toolMode]);

  useEffect(() => {
    if (!isTyping) return;
    const handleKeyDown = (e) => {
      e.preventDefault();
      
      if (e.key === 'Enter' || e.key === 'Escape') {
        drawTextOnCanvas(e.key === 'Enter');
        return;
      }
      
      if (e.key === 'Backspace') {
        setTextData(prev => {
          if (prev.cursorPosition === 0) return prev;
          const newContent = prev.content.slice(0, prev.cursorPosition - 1) + 
                           prev.content.slice(prev.cursorPosition);
          return {
            ...prev,
            content: newContent,
            cursorPosition: Math.max(0, prev.cursorPosition - 1)
          };
        });
        return;
      }
      
      if (e.key === 'ArrowLeft') {
        setTextData(prev => ({
          ...prev,
          cursorPosition: Math.max(0, prev.cursorPosition - 1)
        }));
        return;
      }
      
      if (e.key === 'ArrowRight') {
        setTextData(prev => ({
          ...prev,
          cursorPosition: Math.min(prev.content.length, prev.cursorPosition + 1)
        }));
        return;
      }
      
      if (e.key.length === 1) {
        setTextData(prev => {
          const newContent = prev.content.slice(0, prev.cursorPosition) + 
                           e.key + 
                           prev.content.slice(prev.cursorPosition);
          return {
            ...prev,
            content: newContent,
            cursorPosition: prev.cursorPosition + 1
          };
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isTyping, textData, color, historyIndex]);

  useEffect(() => {
    if (!isTyping) {
      setCursorVisible(false);
      return;
    }
    const cursorInterval = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 500);
    return () => {
      clearInterval(cursorInterval);
    };
  }, [isTyping]);

  useEffect(() => {
    if (isTyping) {
      handleTextChange(textData.content);
    }
  }, [cursorVisible]);

  const redrawInsertedImages = () => {
    const cvs = canvasRef.current;
    const ctx = cvs.getContext("2d");
    insertedImages.forEach((imgData) => {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, imgData.x, imgData.y, imgData.width, imgData.height);
      };
      img.src = imgData.dataURL;
    });
  };

  function getPointerPos(e) {
    const cvs = canvasRef.current;
    const rect = cvs.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0].clientX);
    const clientY = e.clientY ?? (e.touches && e.touches[0].clientY);
    const x = (clientX - rect.left) / zoom;
    const y = (clientY - rect.top) / zoom;
    return { x, y };
  }

  function beginDraw(e) {
    if (toolMode === "text") {
      const pos = getPointerPos(e);
      if (isTyping) {
        drawTextOnCanvas(true);
      }
      setTextData({
        ...textData,
        x: pos.x,
        y: pos.y,
        content: "",
        cursorPosition: 0
      });
      setIsTyping(true);
      return;
    }
    if (toolMode === "translate") {
      const pos = getPointerPos(e);
      setTransformStart({ x: pos.x, y: pos.y, translate: { ...translate } });
      setIsTranslating(true);
      return;
    }
    if (toolMode === "select") {
      const pos = getPointerPos(e);
      const clickedImage = insertedImages.find(
        (img) =>
          pos.x >= img.x &&
          pos.x <= img.x + img.width &&
          pos.y >= img.y &&
          pos.y <= img.y + img.height
      );
      if (clickedImage) {
        setSelectedArea({
          x: clickedImage.x,
          y: clickedImage.y,
          width: clickedImage.width,
          height: clickedImage.height,
          type: "image",
          imageData: clickedImage,
        });
        setIsDragging(true);
        setDragOffset({
          x: pos.x - clickedImage.x,
          y: pos.y - clickedImage.y,
        });
        drawSelectionRectangle(clickedImage);
        return;
      }
      if (selectedArea && isPointInSelection(pos)) {
        setIsDragging(true);
        setDragOffset({
          x: pos.x - selectedArea.x,
          y: pos.y - selectedArea.y,
        });
      } else {
        setSelectedArea({ x: pos.x, y: pos.y, width: 0, height: 0, type: "area" });
      }
      return;
    }
    e.preventDefault();
    const cvs = canvasRef.current;
    const ctx = cvs.getContext("2d");
    const pos = getPointerPos(e);
    setIsDrawing(true);
    setLastPos(pos);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = isEraser ? eraserSize : brushSize;
   
    if (isEraser) {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = 'white';
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
    }
  }

  function draw(e) {
    if (toolMode === "translate" && transformStart && isTranslating) {
      const pos = getPointerPos(e);
      const dx = pos.x - transformStart.x;
      const dy = pos.y - transformStart.y;
     
      requestAnimationFrame(() => {
        setTranslate({
          x: transformStart.translate.x + dx,
          y: transformStart.translate.y + dy,
        });
      });
      return;
    }
    if (toolMode === "select") {
      if (selectedArea && selectedArea.type === "area" && !isDragging) {
        const pos = getPointerPos(e);
        const newArea = {
          ...selectedArea,
          width: pos.x - selectedArea.x,
          height: pos.y - selectedArea.y,
        };
        setSelectedArea(newArea);
        drawSelectionRectangle(newArea);
      } else if (isDragging && selectedArea) {
        const pos = getPointerPos(e);
        const newX = pos.x - dragOffset.x;
        const newY = pos.y - dragOffset.y;
        if (selectedArea.type === "image") {
          setInsertedImages((prev) =>
            prev.map((img) =>
              img.dataURL === selectedArea.imageData.dataURL
                ? { ...img, x: newX, y: newY }
                : img
            )
          );
          redrawCanvas();
          setSelectedArea({ ...selectedArea, x: newX, y: newY });
          drawSelectionRectangle({ ...selectedArea, x: newX, y: newY });
        }
      }
      return;
    }
    if (toolMode === 'text') return;
    if (!isDrawing) return;
    const cvs = canvasRef.current;
    const ctx = cvs.getContext("2d");
    const pos = getPointerPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setLastPos(pos);
  }

  function drawSelectionRectangle(area) {
    const cvs = canvasRef.current;
    const ctx = cvs.getContext("2d");
    redrawCanvas();
    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#00ff00";
    ctx.strokeRect(area.x, area.y, area.width, area.height);
    ctx.restore();
  }

  function isPointInSelection(point) {
    if (!selectedArea) return false;
    return (
      point.x >= selectedArea.x &&
      point.x <= selectedArea.x + selectedArea.width &&
      point.y >= selectedArea.y &&
      point.y <= selectedArea.y + selectedArea.height
    );
  }

  function endDraw() {
    setTransformStart(null);
    setIsTranslating(false);
   
    if (toolMode === "select") {
      setIsDragging(false);
      return;
    }
    if (toolMode === "text" || !isDrawing) return;
    const ctx = canvasRef.current.getContext("2d");
    ctx.closePath();
    ctx.restore();
    setIsDrawing(false);
    pushHistory();
  }

  function redrawCanvas() {
    if (historyIndex >= 0) {
      restoreFromDataURL(history[historyIndex]);
    } else {
      const cvs = canvasRef.current;
      const ctx = cvs.getContext("2d");
      ctx.clearRect(0, 0, cvs.width, cvs.height);
      redrawInsertedImages();
    }
  }

  function handleTextChange(newContent) {
    const newText = typeof newContent === 'function' ? newContent(textData.content) : newContent;
    const cursorPos = typeof newContent === 'function' ? 
      newContent(textData.content).length : 
      (textData.cursorPosition || 0);
      
    if (historyIndex >= 0) {
      restoreFromDataURL(history[historyIndex], () => {
        const cvs = canvasRef.current;
        const ctx = cvs.getContext("2d");
        ctx.save();
        ctx.font = `${textData.fontSize}px Arial`;
        ctx.fillStyle = color;
        ctx.textBaseline = 'top';
        
        // Draw the text
        ctx.fillText(newText, textData.x, textData.y);
        
        if (isTyping) {
          // Calculate cursor position
          const textBeforeCursor = newText.substring(0, textData.cursorPosition);
          const cursorX = ctx.measureText(textBeforeCursor).width;
          
          // Draw cursor if visible
          if (cursorVisible) {
            ctx.beginPath();
            ctx.moveTo(textData.x + cursorX, textData.y);
            ctx.lineTo(textData.x + cursorX, textData.y + textData.fontSize);
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
        
        ctx.restore();
      });
    }
    
    setTextData(prev => ({
      ...prev, 
      content: newText,
      cursorPosition: Math.min(cursorPos, newText.length)
    }));
  }

  function drawTextOnCanvas(finalize) {
    if (!isTyping) return;
    setIsTyping(false);
    if (finalize && textData.content.trim()) {
      restoreFromDataURL(history[historyIndex], () => {
        const cvs = canvasRef.current;
        const ctx = cvs.getContext('2d');
        ctx.save();
        ctx.font = `${textData.fontSize}px Arial`;
        ctx.fillStyle = color;
        ctx.textBaseline = 'top';
        ctx.fillText(textData.content, textData.x, textData.y);
        ctx.restore();
        pushHistory();
        setTextData({ ...textData, content: '', cursorPosition: 0 });
        setToasts([]); // Clear all toasts when finalizing text
      });
    } else {
      if (historyIndex >= 0) {
        restoreFromDataURL(history[historyIndex]);
      }
      setTextData({ ...textData, content: '' });
      setToasts([]); // Clear toasts even if canceling
    }
  }

  function cancelTextInput() {
    drawTextOnCanvas(false);
  }

  function pushHistory() {
    const cvs = canvasRef.current;
    const url = cvs.toDataURL("image/png");
    const newHist = history.slice(0, historyIndex + 1);
    newHist.push(url);
    if (newHist.length > 50) newHist.shift();
    setHistory(newHist);
    setHistoryIndex(newHist.length - 1);
  }

  function undo() {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    restoreFromDataURL(history[newIndex]);
    setHistoryIndex(newIndex);
    setSelectedArea(null);
  }

  function redo() {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    restoreFromDataURL(history[newIndex]);
    setHistoryIndex(newIndex);
    setSelectedArea(null);
  }

  function restoreFromDataURL(dataURL, callback) {
    const img = new Image();
    img.onload = () => {
      const cvs = canvasRef.current;
      const ctx = cvs.getContext("2d");
      ctx.clearRect(0, 0, cvs.width, cvs.height);
      ctx.drawImage(img, 0, 0);
      redrawInsertedImages();
      if (callback) callback();
    };
    img.src = dataURL;
  }

  function clearCanvas() {
    const cvs = canvasRef.current;
    const ctx = cvs.getContext("2d");
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    setInsertedImages([]);
    setSelectedArea(null);
    setIsEraser(false);
    setToolMode("draw");
    setBrushSize(8);
    setEraserSize(20);
    setColor("#ff66b2");
    setZoom(1);
    setHistory([]);
    setHistoryIndex(-1);
    setIsTyping(false);
    setTextData({ x: 0, y: 0, content: "", fontSize: 24, font: "Arial" });
    setTranslate({ x: 0, y: 0 });
    pushHistory();
  }

  function resetTransform() {
    setTranslate({ x: 0, y: 0 });
    redrawCanvas();
  }

  function downloadImage() {
    try {
      const cvs = canvasRef.current;
      if (!cvs) {
        addToast('Canvas not found', 'error');
        return;
      }
      
      // Create a temporary canvas to ensure we get the exact content
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = cvs.width;
      tempCanvas.height = cvs.height;
      const tempCtx = tempCanvas.getContext('2d');
      
      // Fill with white background first
      tempCtx.fillStyle = 'white';
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      
      // Draw the current canvas content
      tempCtx.drawImage(cvs, 0, 0);
      
      // Convert to data URL
      const dataURL = tempCanvas.toDataURL('image/png');
      
      // Create download link
      const link = document.createElement('a');
      link.download = `drawing-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataURL;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      addToast('Image downloaded successfully!', 'success');
    } catch (error) {
      console.error('Error downloading image:', error);
      addToast('Failed to download image', 'error');
    }
  }

  function handleFileInsert(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const cvs = canvasRef.current;
      const ctx = cvs.getContext("2d");
      const iw = img.width;
      const ih = img.height;
      const cw = cvs.width;
      const ch = cvs.height;
      const ratio = Math.min(cw / iw, ch / ih) * 0.8;
      const w = iw * ratio;
      const h = ih * ratio;
      const x = (cw - w) / 2;
      const y = (ch - h) / 2;
      ctx.drawImage(img, x, y, w, h);
      setInsertedImages((prev) => [...prev, { dataURL: cvs.toDataURL("image/png"), x, y, width: w, height: h }]);
      pushHistory();
      URL.revokeObjectURL(url);
    };
    img.src = url;
    e.target.value = null;
  }

  function zoomIn() {
    setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)));
    setToolMode("translate");
  }

  function zoomOut() {
    setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)));
    setToolMode("translate");
  }

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-black p-0 flex flex-col">
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between mb-4"></header>
      <main className="max-w-6xl mx-auto w-full flex gap-4 flex-1 flex-col">
        <section className="flex-1 bg-black rounded-2xl shadow p-3 flex flex-col">
          <div className="fixed top-0 left-0 right-0 z-50">
            {toasts.map((toast) => (
              <Toast
                key={toast.id}
                message={toast.message}
                type={toast.type}
                duration={toast.duration}
                onClose={() => removeToast(toast.id)}
              />
            ))}
          </div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-700 text-gray-300 hover:bg-gray-600"
              >
                <i className="fas fa-bars"></i>
              </button>
            </div>
            <div className="hidden md:flex items-center gap-3 flex-wrap">
              <div className="flex gap-2">
                {["#ff00ff", "#0066ff", "#00ff00", "#fff500"].map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setColor(c);
                      setIsEraser(false);
                    }}
                    className="w-8 h-8 rounded"
                    style={{ background: c }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-white">Size</label>
                <input
                  type="range"
                  min={1}
                  max={200}
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                />
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={brushSize}
                  onChange={(e) => {
                    let val = Number(e.target.value);
                    if (val < 1) val = 1;
                    if (val > 200) val = 200;
                    setBrushSize(val);
                  }}
                  className="w-16 px-1 py-0.5 rounded text-black text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-white">Eraser Size</label>
                <input
                  type="range"
                  min={1}
                  max={200}
                  value={eraserSize}
                  onChange={(e) => setEraserSize(Number(e.target.value))}
                />
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={eraserSize}
                  onChange={(e) => {
                    let val = Number(e.target.value);
                    if (val < 1) val = 1;
                    if (val > 200) val = 200;
                    setEraserSize(val);
                  }}
                  className="w-16 px-1 py-0.5 rounded text-black text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-white">Font Size</label>
                <input
                  type="range"
                  min="8"
                  max="72"
                  value={textData.fontSize}
                  onChange={(e) => setTextData({ ...textData, fontSize: Number(e.target.value) })}
                  className="w-24"
                />
                <input
                  type="number"
                  min="8"
                  max="72"
                  value={textData.fontSize}
                  onChange={(e) => setTextData({ ...textData, fontSize: Number(e.target.value) })}
                  className="w-12 px-1 py-0.5 rounded text-black text-sm"
                />
              </div>
                  
              <div className="flex items-center gap-2">
                <label className="text-xs text-white">Mode</label>
                <div className="px-2 py-1 rounded bg-gray-50 text-sm">
                  {toolMode === "select"
                    ? "Select"
                    : toolMode === "translate"
                    ? "Translate"
                    : toolMode === 'text'
                    ? "Text"
                    : isEraser
                    ? "Eraser"
                    : "Brush"}
                </div>
              </div>
              {toolMode === "translate" && (
                <div className="text-white text-xs">
                  X: {Math.round(translate.x)} Y: {Math.round(translate.y)}
                </div>
              )}
            </div>
          </div>
          {isMenuOpen && (
            <div className="absolute top-16 left-4 right-4 bg-gray-800 p-4 rounded-lg shadow-lg z-20 flex flex-col gap-4 md:hidden">
              <button onClick={() => setIsMenuOpen(false)} className="absolute top-2 right-2 text-white">
                <i className="fas fa-times"></i>
              </button>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex gap-2">
                  {["#ff00ff", "#0066ff", "#00ff00", "#fff500"].map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setColor(c);
                        setIsEraser(false);
                      }}
                      className="w-8 h-8 rounded"
                      style={{ background: c }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-white">Size</label>
                  <input
                    type="range"
                    min={1}
                    max={200}
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                  />
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={brushSize}
                    onChange={(e) => {
                      let val = Number(e.target.value);
                      if (val < 1) val = 1;
                      if (val > 200) val = 200;
                      setBrushSize(val);
                    }}
                    className="w-16 px-1 py-0.5 rounded text-black text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-white">Eraser Size</label>
                  <input
                    type="range"
                    min={1}
                    max={200}
                    value={eraserSize}
                    onChange={(e) => setEraserSize(Number(e.target.value))}
                  />
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={eraserSize}
                    onChange={(e) => {
                      let val = Number(e.target.value);
                      if (val < 1) val = 1;
                      if (val > 200) val = 200;
                      setEraserSize(val);
                    }}
                    className="w-16 px-1 py-0.5 rounded text-black text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-white">Font Size</label>
                  <input
                    type="range"
                    min="8"
                    max="72"
                    value={textData.fontSize}
                    onChange={(e) => setTextData({ ...textData, fontSize: Number(e.target.value) })}
                    className="w-24"
                  />
                  <input
                    type="number"
                    min="8"
                    max="72"
                    value={textData.fontSize}
                    onChange={(e) => setTextData({ ...textData, fontSize: Number(e.target.value) })}
                    className="w-12 px-1 py-0.5 rounded text-black text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-white">Mode</label>
                  <div className="px-2 py-1 rounded bg-gray-50 text-sm">
                    {toolMode === "select"
                      ? "Select"
                      : toolMode === "translate"
                      ? "Translate"
                      : toolMode === 'text'
                      ? "Text"
                      : isEraser
                      ? "Eraser"
                      : "Brush"}
                  </div>
                </div>
                {toolMode === "translate" && (
                  <div className="text-white text-xs">
                    X: {Math.round(translate.x)} Y: {Math.round(translate.y)}
                  </div>
                )}
              </div>
            </div>
          )}
          <div
            ref={wrapperRef}
            className="relative flex-1 border border-dashed rounded-lg overflow-hidden flex items-center justify-center"
          >
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "center center",
                width: canvasSize.width,
                height: canvasSize.height,
              }}
            >
              <canvas
                ref={canvasRef}
                className="touch-none transition-transform duration-75 ease-out will-change-transform"
                onPointerDown={beginDraw}
                onPointerMove={draw}
                onPointerUp={endDraw}
                onPointerCancel={endDraw}
                onPointerLeave={endDraw}
                style={{
                  display: "block",
                  width: canvasSize.width,
                  height: canvasSize.height,
                  transform: `translate3d(${translate.x}px, ${translate.y}px, 0)`,
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  WebkitTransform: 'translateZ(0)',
                  cursor: toolMode === 'text' ? 'text' : 'default',
                }}
              />
            </div>
          </div>
          <footer className="mt-3 text-right text-xs text-gray-500">
            Tip: Use brush size slider or type size directly. Zoom resets to 100% when you Clear All.
          </footer>
        </section>
        <Toolbar
          isEraser={isEraser}
          setIsEraser={setIsEraser}
          clearCanvas={clearCanvas}
          undo={undo}
          redo={redo}
          downloadImage={downloadImage}
          zoom={zoom}
          zoomIn={zoomIn}
          zoomOut={zoomOut}
          toolMode={toolMode}
          setToolMode={setToolMode}
          textData={textData}
          setTextData={setTextData}
          drawTextOnCanvas={drawTextOnCanvas}
          cancelTextInput={cancelTextInput}
          isTyping={isTyping}
          translate={translate}
          setTranslate={setTranslate}
          resetTransform={resetTransform}
          scrollToTop={scrollToTop}
          checkAIGeneration={checkAIGeneration}
          checkSpelling={checkSpelling}
          addToast={addToast}
        />
      </main>
      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </div>
  );
}