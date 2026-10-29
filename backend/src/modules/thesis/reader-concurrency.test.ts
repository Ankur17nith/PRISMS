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
