import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Concurrency coordinator simulating the safe canvas rendering model in ThesisBookReader.tsx.
 * Ensures that:
 * 1. An ongoing render task is cancelled before a new render begins.
 * 2. Rapid sequential renders wait for prior canvas operations to settle.
 * 3. RenderingCancelledException is caught and suppressed.
 * 4. Stale or superseded renders are discarded via sequence counters.
 */
class CanvasRenderCoordinator {
  private activeTask: { cancel: () => void; promise: Promise<void> } | null = null;
  private inFlightPromise: Promise<void> | null = null;
  private seq = 0;
  public renderedPages: number[] = [];
  public cancelledErrorsCaught: number[] = [];
  public genericErrorsCaught: string[] = [];

  async renderPage(pageNum: number, durationMs = 20, simulateCancel = false): Promise<void> {
    const mySeq = ++this.seq;

    // 1. Cancel previous render if active
    if (this.activeTask) {
      this.activeTask.cancel();
    }

    // 2. Wait for previous render to finish/settle
    if (this.inFlightPromise) {
      try {
        await this.inFlightPromise;
      } catch {
        // ignore cancellation of prior render
      }
    }

    // 3. Drop superseded renders
    if (mySeq !== this.seq) {
      return;
    }

    // 4. Start new render task
    let cancelFn = () => {};
    const taskPromise = new Promise<void>((resolve, reject) => {
      let isCancelled = false;
      cancelFn = () => {
        isCancelled = true;
        const err = new Error("Rendering cancelled by supervisor operation");
        err.name = "RenderingCancelledException";
        reject(err);
      };

      setTimeout(() => {
        if (isCancelled) return;
        if (simulateCancel) {
          cancelFn();
        } else {
          resolve();
        }
      }, durationMs);
    });

    const task = { cancel: cancelFn, promise: taskPromise };
    this.activeTask = task;

    const wrappedPromise = (async () => {
      try {
        await task.promise;
        if (mySeq === this.seq) {
          this.renderedPages.push(pageNum);
        }
      } catch (err: any) {
        const isCancelled =
          err?.name === "RenderingCancelledException" ||
          err?.message?.toLowerCase().includes("cancelled") ||
          err?.message?.toLowerCase().includes("canceled");

        if (isCancelled) {
          this.cancelledErrorsCaught.push(pageNum);
        } else {
          this.genericErrorsCaught.push(err.message || String(err));
        }
      } finally {
        if (this.activeTask === task) {
          this.activeTask = null;
        }
      }
    })();

    this.inFlightPromise = wrappedPromise;
    await wrappedPromise;
  }
}

describe("ThesisBookReader Concurrency & Canvas Coordination", () => {
  it("should render a single page successfully", async () => {
    const coordinator = new CanvasRenderCoordinator();
    await coordinator.renderPage(1, 10);
    assert.deepEqual(coordinator.renderedPages, [1]);
    assert.equal(coordinator.cancelledErrorsCaught.length, 0);
  });

  it("should safely cancel prior render during rapid page jumps and only complete the latest page", async () => {
    const coordinator = new CanvasRenderCoordinator();

    // Trigger rapid navigation: page 1, page 2, page 3 without awaiting each
    const p1 = coordinator.renderPage(1, 30);
    const p2 = coordinator.renderPage(2, 30);
    const p3 = coordinator.renderPage(3, 10);

    await Promise.all([p1, p2, p3]);

    // Page 1 and 2 were cancelled and dropped; only page 3 was rendered to canvas
    assert.deepEqual(coordinator.renderedPages, [3]);
    assert.ok(coordinator.cancelledErrorsCaught.length >= 1);
    assert.equal(coordinator.genericErrorsCaught.length, 0);
  });

  it("should suppress RenderingCancelledException without setting error state", async () => {
    const coordinator = new CanvasRenderCoordinator();
    await coordinator.renderPage(5, 10, true);

    // Cancelled error is classified and suppressed
    assert.deepEqual(coordinator.renderedPages, []);
    assert.deepEqual(coordinator.cancelledErrorsCaught, [5]);
    assert.equal(coordinator.genericErrorsCaught.length, 0);
  });
});

describe("ThesisBookReader Layout, Responsive Sizing & Viewport Calculation", () => {
  function computeFitScale(
    containerWidth: number,
    unscaledPageWidth: number,
    padding = 48,
    minScale = 0.4,
    maxScale = 2.5
  ): number | null {
    const availableWidth = containerWidth - padding;
    if (availableWidth <= 0 || unscaledPageWidth <= 0) return null;
    const raw = availableWidth / unscaledPageWidth;
    return Math.max(minScale, Math.min(maxScale, parseFloat(raw.toFixed(2))));
  }

  function calculateCanvasDimensions(
    viewportWidth: number,
    viewportHeight: number,
    devicePixelRatio = 1
  ): { pixelWidth: number; pixelHeight: number; cssWidth: string; cssHeight: string } | null {
    if (viewportWidth <= 0 || viewportHeight <= 0) return null;
    const pixelWidth = Math.floor(viewportWidth * devicePixelRatio);
    const pixelHeight = Math.floor(viewportHeight * devicePixelRatio);
    if (pixelWidth <= 0 || pixelHeight <= 0) return null;
    return {
      pixelWidth,
      pixelHeight,
      cssWidth: `${Math.floor(viewportWidth)}px`,
      cssHeight: `${Math.floor(viewportHeight)}px`,
    };
  }

  it("should accurately compute dynamic fit-width scale based on actual page width and container width", () => {
    // 1. Standard desktop layout: 640px container, 514pt book page -> scale = (640-48)/514 = 1.15
    const scale1 = computeFitScale(640, 514);
    assert.equal(scale1, 1.15);

    // 2. Wide desktop layout: 1200px container, 612pt letter page -> scale = (1200-48)/612 = 1.88
    const scale2 = computeFitScale(1200, 612);
    assert.equal(scale2, 1.88);

    // 3. Narrow container (mobile/tablet column): 300px container, 612pt -> scale = (300-48)/612 = 0.41
    const scale3 = computeFitScale(300, 612);
    assert.equal(scale3, 0.41);

    // 4. Clamps to minimum scale 0.40 on ultra-narrow viewports
    const scaleMin = computeFitScale(150, 612);
    assert.equal(scaleMin, 0.4);

    // 5. Clamps to maximum scale 2.5 on ultra-wide viewports
    const scaleMax = computeFitScale(3000, 500);
    assert.equal(scaleMax, 2.5);
  });

  it("should defer rendering when container clientWidth is zero or negative (pre-layout)", () => {
    const scaleZero = computeFitScale(0, 514);
    assert.equal(scaleZero, null);

    const scaleNegative = computeFitScale(-100, 514);
    assert.equal(scaleNegative, null);

    const scaleZeroPage = computeFitScale(640, 0);
    assert.equal(scaleZeroPage, null);
  });

  it("should enforce positive measurable canvas dimensions before initiating PDF render", () => {
    // Valid viewport with dpr = 1
    const dims1 = calculateCanvasDimensions(592, 842, 1);
    assert.ok(dims1);
    assert.equal(dims1.pixelWidth, 592);
    assert.equal(dims1.pixelHeight, 842);
    assert.equal(dims1.cssWidth, "592px");
    assert.equal(dims1.cssHeight, "842px");

    // HiDPI (Retina) with dpr = 2
    const dims2 = calculateCanvasDimensions(592, 842, 2);
    assert.ok(dims2);
    assert.equal(dims2.pixelWidth, 1184);
    assert.equal(dims2.pixelHeight, 1684);
    assert.equal(dims2.cssWidth, "592px");
    assert.equal(dims2.cssHeight, "842px");

    // Zero or invalid viewport dimensions rejected
    assert.equal(calculateCanvasDimensions(0, 842), null);
    assert.equal(calculateCanvasDimensions(592, 0), null);
    assert.equal(calculateCanvasDimensions(-50, -50), null);
  });

  it("should avoid negative coordinate clipping when canvas width exceeds container width", () => {
    function computeScrollOffset(containerWidth: number, canvasWidth: number): {
      isCentered: boolean;
      scrollOriginX: number;
    } {
      if (canvasWidth <= containerWidth) {
        // Fits inside container: centered with equal margins
        return { isCentered: true, scrollOriginX: (containerWidth - canvasWidth) / 2 };
      }
      // Overflows container: margins collapse to 0, start at origin 0 without clipping left edge
      return { isCentered: false, scrollOriginX: 0 };
    }

    // 1. Fits comfortably: centered
    const offsetFit = computeScrollOffset(800, 600);
    assert.equal(offsetFit.isCentered, true);
    assert.equal(offsetFit.scrollOriginX, 100);

    // 2. Zoomed in: wider than container, must start at x=0 (never negative)
    const offsetZoomed = computeScrollOffset(800, 1200);
    assert.equal(offsetZoomed.isCentered, false);
    assert.equal(offsetZoomed.scrollOriginX, 0);
  });

  it("should re-render at updated scale upon container resize or fullscreen toggle", () => {
    let currentScale = computeFitScale(640, 514)!;
    assert.equal(currentScale, 1.15);

    // Fullscreen toggled: container expands to 1440px
    const fullscreenScale = computeFitScale(1440, 514)!;
    assert.equal(fullscreenScale, 2.5); // clamped to maxScale 2.5

    // Exited fullscreen: container returns to 640px
    currentScale = computeFitScale(640, 514)!;
    assert.equal(currentScale, 1.15);
  });
});

