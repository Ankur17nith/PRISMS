"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { api } from "@/lib/api";

interface ThesisBookReaderProps {
  submissionId: string;
  fileId?: string;
  filename?: string;
  canDownload: boolean;
  userRole?: string | null;
}

export function ThesisBookReader({
  submissionId,
  fileId,
  filename = "thesis.pdf",
  canDownload,
  userRole,
}: ThesisBookReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const renderPromiseRef = useRef<Promise<void> | null>(null);
  const renderSeqRef = useRef<number>(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0);
  const [autoFitWidth, setAutoFitWidth] = useState<boolean>(true);
  const [pageInput, setPageInput] = useState<string>("1");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  // 1. Measure and observe available container width with ResizeObserver
  useEffect(() => {
    const target = scrollAreaRef.current || containerRef.current;
    if (!target) return;

    const measureWidth = () => {
      const el = scrollAreaRef.current || containerRef.current;
      if (el && el.clientWidth > 0) {
        setContainerWidth(el.clientWidth);
      }
    };

    measureWidth();

    let resizeTimer: NodeJS.Timeout;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width);
        if (w > 0) {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => {
            setContainerWidth(w);
          }, 80);
        }
      }
    });

    observer.observe(target);
    return () => {
      clearTimeout(resizeTimer);
      observer.disconnect();
    };
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      setTimeout(() => {
        const el = scrollAreaRef.current || containerRef.current;
        if (el && el.clientWidth > 0) {
          setContainerWidth(el.clientWidth);
        }
      }, 100);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Compute scale to fit width based on page dimensions and current container width
  const computeFitScale = useCallback(
    async (doc: any, pageNum: number, targetWidth?: number) => {
      if (!doc) return null;
      try {
        const page = await doc.getPage(pageNum);
        const unscaledViewport = page.getViewport({ scale: 1 });
        const availableWidth = (targetWidth ?? containerWidth) - 48; // 24px padding on each side
        if (availableWidth > 0 && unscaledViewport.width > 0) {
          const rawScale = availableWidth / unscaledViewport.width;
          return Math.max(0.4, Math.min(2.5, parseFloat(rawScale.toFixed(2))));
        }
      } catch (err) {
        console.warn("Could not compute fit scale for page", pageNum, err);
      }
      return null;
    },
    [containerWidth]
  );

  // 2. Authenticated fetch of the PDF binary
  const loadPdfDocument = useCallback(async () => {
    if (!submissionId) return;
    setLoading(true);
    setError(null);

    // Cancel any active render before loading a new document
    renderSeqRef.current++;
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {}
      renderTaskRef.current = null;
    }

    try {
      const endpoint = api.getViewUrl(submissionId, fileId, userRole || undefined);
      const res = await fetch(endpoint, {
        credentials: "include",
      });

      if (!res.ok) {
        let errorMsg = `Unable to load document (HTTP ${res.status})`;
        try {
          const json = await res.json();
          if (json?.error?.message) {
            errorMsg = json.error.message;
          } else if (json?.message) {
            errorMsg = json.message;
          }
        } catch {
          // Response was not JSON
        }

        if (res.status === 401) {
          errorMsg = "Authentication required. Your institutional session may have expired.";
        } else if (res.status === 403) {
          errorMsg = "Access restricted. You do not have permission to view this dissertation version.";
        } else if (res.status === 404) {
          errorMsg = "Document file not found in secure institutional storage.";
        }

        setError(errorMsg);
        setLoading(false);
        return;
      }

      const buffer = await res.arrayBuffer();
      const blob = new Blob([buffer], { type: "application/pdf" });
      const objectUrl = URL.createObjectURL(blob);
      setBlobUrl(objectUrl);

      // Dynamically load pdfjs-dist on client side
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        typeof window !== "undefined"
          ? "/pdf.worker.min.mjs"
          : `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
        cMapUrl: "/cmaps/",
        cMapPacked: true,
        standardFontDataUrl: "/standard_fonts/",
        wasmUrl: "/wasm/",
      });
      const loadedDoc = await loadingTask.promise;

      setPdfDoc(loadedDoc);
      setNumPages(loadedDoc.numPages);
      setCurrentPage(1);
      setPageInput("1");

      // Auto-fit initial scale to container width if container has measurable width
      const initialTargetWidth =
        scrollAreaRef.current?.clientWidth || containerRef.current?.clientWidth || containerWidth;
      if (initialTargetWidth > 0) {
        const fitScale = await computeFitScale(loadedDoc, 1, initialTargetWidth);
        if (fitScale) {
          setScale(fitScale);
        }
      }

      setLoading(false);
    } catch (err: unknown) {
      console.error("PDF loading error:", err);
      if (err instanceof Error) {
        setError(`Failed to render PDF: ${err.message}`);
      } else {
        setError("Failed to render thesis PDF document. Please verify your connection.");
      }
      setLoading(false);
    }
  }, [submissionId, fileId, userRole, containerWidth, computeFitScale]);

  useEffect(() => {
    loadPdfDocument();
    return () => {
      renderSeqRef.current++;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
        renderTaskRef.current = null;
      }
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [loadPdfDocument]);

  // Clean up PDF document on unmount
  useEffect(() => {
    return () => {
      if (pdfDoc) {
        try {
          pdfDoc.destroy();
        } catch {}
      }
    };
  }, [pdfDoc]);

  // Automatically adjust scale on container width change when in auto-fit mode
  useEffect(() => {
    if (autoFitWidth && pdfDoc && containerWidth > 0) {
      computeFitScale(pdfDoc, currentPage, containerWidth).then((fitScale) => {
        if (fitScale && Math.abs(fitScale - scale) > 0.04) {
          setScale(fitScale);
        }
      });
    }
  }, [containerWidth, autoFitWidth, pdfDoc, currentPage, computeFitScale, scale]);

  // 3. Render Page to Canvas with safe concurrency control and measurable dimensions
  const renderPage = useCallback(
    async (pageNum: number, currentScale: number) => {
      if (!pdfDoc || !canvasRef.current) return;

      const mySeq = ++renderSeqRef.current;

      // Cancel previous render task if active
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore cancellation
        }
      }

      // Wait for previous render to finish/settle before starting another on this canvas
      if (renderPromiseRef.current) {
        try {
          await renderPromiseRef.current;
        } catch {
          // ignore prior cancellation error
        }
      }

      // If a newer render request came in while waiting, bail out
      if (mySeq !== renderSeqRef.current) {
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;

      try {
        const page = await pdfDoc.getPage(pageNum);
        if (mySeq !== renderSeqRef.current) return;

        // Ensure container has measurable nonzero width before rendering
        const targetContainer = scrollAreaRef.current || containerRef.current;
        if (targetContainer && targetContainer.clientWidth <= 0) {
          return;
        }

        const effectiveScale = currentScale > 0 ? currentScale : 1.0;
        const viewport = page.getViewport({ scale: effectiveScale });

        // Ensure calculated page viewport has measurable nonzero width and height
        if (!viewport.width || !viewport.height || viewport.width <= 0 || viewport.height <= 0) {
          console.warn("Invalid page dimensions for page", pageNum, viewport);
          return;
        }

        const outputScale = window.devicePixelRatio || 1;
        const pixelWidth = Math.floor(viewport.width * outputScale);
        const pixelHeight = Math.floor(viewport.height * outputScale);

        if (pixelWidth <= 0 || pixelHeight <= 0) return;

        // Set explicit non-zero canvas dimensions
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const context = canvas.getContext("2d");
        if (!context) return;

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

        context.clearRect(0, 0, canvas.width, canvas.height);

        const renderContext = {
          canvasContext: context,
          transform,
          viewport,
        };

        const task = page.render(renderContext);
        renderTaskRef.current = task;

        const promise = (async () => {
          try {
            await task.promise;
          } catch (renderErr: any) {
            const isCancelled =
              renderErr?.name === "RenderingCancelledException" ||
              renderErr?.message?.toLowerCase().includes("cancelled") ||
              renderErr?.message?.toLowerCase().includes("canceled");

            if (!isCancelled) {
              console.error("Canvas render error on page", pageNum, renderErr);
              setError(`Render error on page ${pageNum}: ${renderErr.message || renderErr}`);
            }
          } finally {
            if (renderTaskRef.current === task) {
              renderTaskRef.current = null;
            }
          }
        })();

        renderPromiseRef.current = promise;
        await promise;
      } catch (renderErr: any) {
        const isCancelled =
          renderErr?.name === "RenderingCancelledException" ||
          renderErr?.message?.toLowerCase().includes("cancelled") ||
          renderErr?.message?.toLowerCase().includes("canceled");
        if (!isCancelled && mySeq === renderSeqRef.current) {
          console.error("Canvas render error on page", pageNum, renderErr);
        }
      }
    },
    [pdfDoc]
  );

  useEffect(() => {
    if (pdfDoc && numPages > 0) {
      renderPage(currentPage, scale);
    }
    return () => {
      renderSeqRef.current++;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
        renderTaskRef.current = null;
      }
    };
  }, [pdfDoc, currentPage, scale, renderPage, numPages]);

  // 4. Navigation Handlers
  const handlePrevPage = () => {
    if (currentPage > 1) {
      const nextP = currentPage - 1;
      setCurrentPage(nextP);
      setPageInput(String(nextP));
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      const nextP = currentPage + 1;
      setCurrentPage(nextP);
      setPageInput(String(nextP));
    }
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(pageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= numPages) {
      setCurrentPage(p);
    } else {
      setPageInput(String(currentPage));
    }
  };

  // 5. Zoom Handlers
  const handleZoomIn = () => {
    setAutoFitWidth(false);
    setScale((s) => Math.min(parseFloat((s + 0.25).toFixed(2)), 3.0));
  };

  const handleZoomOut = () => {
    setAutoFitWidth(false);
    setScale((s) => Math.max(parseFloat((s - 0.25).toFixed(2)), 0.4));
  };

  const handleFitWidth = async () => {
    setAutoFitWidth(true);
    const fitScale = await computeFitScale(pdfDoc, currentPage);
    if (fitScale) {
      setScale(fitScale);
    }
  };

  const handleResetZoom = () => {
    setAutoFitWidth(false);
    setScale(1.0);
  };

  // 6. Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // 7. Authenticated Download Handler
  const handleDownloadPdf = async () => {
    if (!canDownload) return;
    setDownloading(true);
    try {
      const downloadEndpoint = api.getDownloadUrl(submissionId, fileId, userRole || undefined);
      const res = await fetch(downloadEndpoint, { credentials: "include" });
      if (!res.ok) {
        let msg = "Download failed. Institutional access denied.";
        try {
          const json = await res.json();
          if (json?.error?.message) msg = json.error.message;
        } catch {
          // ignore
        }
        alert(msg);
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      alert("Error downloading document: " + (err instanceof Error ? err.message : "Network error"));
    } finally {
      setDownloading(false);
    }
  };

  // 8. Keyboard Navigation (Arrow Keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT") return;
      if (e.key === "ArrowLeft") handlePrevPage();
      if (e.key === "ArrowRight") handleNextPage();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, numPages]);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-[#262626] rounded-[8px] overflow-hidden border border-[#3e3e3e] text-white shadow-md ${
        isFullscreen ? "p-4 fixed inset-0 z-50 rounded-none" : "min-h-[640px]"
      }`}
    >
      {/* --- Top Reader Toolbar --- */}
      <div className="bg-[#1f1f1f] border-b border-[#333] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-[12.5px]">
        {/* Left: Document Info & Page Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-medium text-[#d4d4d4]">
            <svg className="w-4 h-4 text-[#d4d4d4] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="truncate max-w-[180px] sm:max-w-[260px] font-bold text-white">
              {filename}
            </span>
          </div>

          {numPages > 0 && (
            <div className="flex items-center gap-1.5 pl-3 border-l border-[#3e3e3e]">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                aria-label="Previous Page"
                className="bg-[#2d2d2d] hover:bg-[#3d3d3d] disabled:opacity-40 text-white px-2 py-1 rounded transition text-[12px] font-bold cursor-pointer"
              >
                ◀
              </button>

              <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1 text-[12px]">
                <input
                  type="text"
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  onBlur={() => setPageInput(String(currentPage))}
                  aria-label="Current Page Number"
                  className="w-10 bg-[#2d2d2d] border border-[#444] rounded px-1.5 py-0.5 text-center text-white focus:outline-none focus:border-[#daa32f] text-[12px]"
                />
                <span className="text-[#a3a3a3]">/ {numPages}</span>
              </form>

              <button
                type="button"
                onClick={handleNextPage}
                disabled={currentPage >= numPages}
                aria-label="Next Page"
                className="bg-[#2d2d2d] hover:bg-[#3d3d3d] disabled:opacity-40 text-white px-2 py-1 rounded transition text-[12px] font-bold cursor-pointer"
              >
                ▶
              </button>
            </div>
          )}
        </div>

        {/* Center/Right: Zoom & View Controls */}
        <div className="flex items-center gap-2">
          {numPages > 0 && (
            <div className="flex items-center gap-1 bg-[#2d2d2d] p-0.5 rounded border border-[#3e3e3e]">
              <button
                type="button"
                onClick={handleZoomOut}
                title="Zoom Out"
                aria-label="Zoom Out"
                className="hover:bg-[#3d3d3d] px-2 py-0.5 rounded text-[13px] text-white font-bold transition cursor-pointer"
              >
                −
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                title="Reset Zoom (100%)"
                className="px-2 py-0.5 text-[11px] font-mono text-[#d4d4d4] hover:text-white"
              >
                {Math.round(scale * 100)}%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                title="Zoom In"
                aria-label="Zoom In"
                className="hover:bg-[#3d3d3d] px-2 py-0.5 rounded text-[13px] text-white font-bold transition cursor-pointer"
              >
                +
              </button>
              <button
                type="button"
                onClick={handleFitWidth}
                title="Fit to Container Width"
                className={`hover:bg-[#3d3d3d] px-2 py-0.5 rounded text-[11px] transition cursor-pointer ${
                  autoFitWidth ? "text-[#daa32f] font-bold" : "text-[#bbb] hover:text-white"
                }`}
              >
                Fit Width
              </button>
            </div>
          )}

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Reading Mode"}
            aria-label="Toggle Fullscreen"
            className="bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white px-2.5 py-1 rounded text-[12px] transition cursor-pointer flex items-center gap-1.5"
          >
            {isFullscreen ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0l4 0m-4 0l0 4m11 0V4m0 0h-4m4 0l-5 5m-6 6l-5 5m0 0h4m-4 0v-4m16 0v4m0 0h-4m4 0l-5-5" />
                </svg>
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                <span>Fullscreen</span>
              </>
            )}
          </button>

          {/* Download Button OR Statutory View-Only Badge */}
          {canDownload ? (
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 text-white font-bold px-3 py-1 rounded text-[12px] transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span>{downloading ? "Downloading..." : "Download PDF"}</span>
              <span>↓</span>
            </button>
          ) : (
            <span
              title="NIT Hamirpur regulations restrict thesis file downloading in HOD review mode"
              className="bg-[#3e341f] border border-[#856404]/50 text-[#e6b800] text-[11px] font-bold px-2.5 py-1 rounded flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>View-Only Mode</span>
            </span>
          )}
        </div>
      </div>

      {/* --- Central Document Reading Area --- */}
      <div
        ref={scrollAreaRef}
        className="flex-1 overflow-auto bg-[#1a1a1a] p-4 md:p-8 min-h-[520px] flex flex-col items-center justify-start"
      >
        {loading ? (
          <div className="m-auto flex flex-col items-center justify-center space-y-3 py-16 text-[#a3a3a3]">
            <div className="w-8 h-8 border-2 border-[#daa32f] border-t-transparent rounded-full animate-spin" />
            <p className="text-[13px] font-medium">Loading thesis document...</p>
            <p className="text-[11px] text-[#737373]">Authenticating secure stream from institutional repository</p>
          </div>
        ) : error ? (
          <div className="m-auto max-w-md w-full bg-[#2a1b1b] border border-[#7f1d1d] p-6 rounded-[8px] text-center space-y-3 shadow-lg">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#7f1d1d]/30 flex items-center justify-center text-[#f87171]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h4 className="font-bold text-[15px] text-[#fca5a5]">Document Access Notice</h4>
            <p className="text-[12.5px] text-[#fecaca] leading-relaxed">{error}</p>
            <div className="pt-2">
              <button
                type="button"
                onClick={loadPdfDocument}
                className="bg-[#7f1d1d] hover:bg-[#991b1b] text-white font-bold text-[12px] px-4 py-2 rounded transition cursor-pointer"
              >
                Retry Document Request
              </button>
            </div>
          </div>
        ) : (
          <div className="m-auto flex flex-col items-center min-w-fit">
            {/* Academic Paper Sheet Canvas */}
            <div className="bg-white rounded-[2px] shadow-2xl ring-1 ring-black/20 overflow-hidden shrink-0">
              <canvas ref={canvasRef} className="block" />
            </div>

            {/* Bottom Book Pagination Strip */}
            <div className="mt-4 flex items-center justify-center gap-4 text-[12px] text-[#a3a3a3]">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                className="hover:text-white disabled:opacity-30 transition cursor-pointer"
              >
                ← Previous Page
              </button>
              <span className="font-mono">
                Page {currentPage} of {numPages}
              </span>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={currentPage >= numPages}
                className="hover:text-white disabled:opacity-30 transition cursor-pointer"
              >
                Next Page →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- Footer Status Strip --- */}
      <div className="bg-[#171717] border-t border-[#333] px-4 py-1.5 text-[11px] text-[#737373] flex flex-wrap items-center justify-between">
        <span>PRISMS Institutional Dissertation Reader · NIT Hamirpur</span>
        <span>
          {userRole === "HOD" ? (
            <span className="text-[#daa32f] font-semibold">Acting as HOD (View-Only Mode)</span>
          ) : canDownload ? (
            <span className="text-[#16a34a] font-semibold">Authorized Reviewer (Download Enabled)</span>
          ) : (
            <span className="text-[#a3a3a3]">View-Only Review</span>
          )}
        </span>
      </div>
    </div>
  );
}
