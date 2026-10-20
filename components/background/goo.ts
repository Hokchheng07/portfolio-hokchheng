/*
 * Gooey merge for the symbiote. Shapes are drawn sharp onto a small offscreen
 * canvas around the symbiote, blurred, and the blurred alpha is cut back to a
 * soft edge. Shapes that touch melt into one mass and corners round off.
 * Enclosed gaps are filled so the silhouette stays readable. Only the
 * symbiote's bounding box is processed, so the cost does not grow with the
 * window.
 */

const BLUR = 5;
const PAD = BLUR * 3;
const MAX_SIZE = 900;
// Blurred alpha (0-255) where the edge starts and where it is fully solid.
const EDGE_START = 100;
const EDGE_SOLID = 150;
const EDGE_FLOOR = 2;
// Blur and cut-back erase anything thinner than the blur. Shapes drawn into the
// goo are grown by this much so thin tips survive it.
export const GOO_GROW = 3;

export type Box = { left: number; top: number; right: number; bottom: number };

function context(canvas: HTMLCanvasElement, willReadFrequently = false) {
  const ctx = canvas.getContext("2d", { willReadFrequently });
  if (!ctx) throw new Error("2D canvas unavailable");
  return ctx;
}

export class Goo {
  private shapes = document.createElement("canvas");
  private merged = document.createElement("canvas");
  private shapesCtx = context(this.shapes);
  private mergedCtx = context(this.merged, true);
  private left = 0;
  private top = 0;
  private width = 0;
  private height = 0;
  private floodQueue = new Int32Array(0);

  // Returns a context to draw the mass into, in the same coordinates as the page.
  begin(box: Box) {
    this.left = Math.floor(box.left - PAD);
    this.top = Math.floor(box.top - PAD);
    this.width = Math.min(MAX_SIZE, Math.ceil(box.right + PAD) - this.left);
    this.height = Math.min(MAX_SIZE, Math.ceil(box.bottom + PAD) - this.top);
    this.fit(this.shapes);
    this.fit(this.merged);

    const ctx = this.shapesCtx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.setTransform(1, 0, 0, 1, -this.left, -this.top);
    ctx.fillStyle = "#fff";
    return ctx;
  }

  // Blurs, cuts the edge back, and paints the result onto the page canvas.
  end(target: CanvasRenderingContext2D) {
    const { width, height } = this;
    if (width <= 0 || height <= 0) return;
    const ctx = this.mergedCtx;
    ctx.clearRect(0, 0, width, height);
    ctx.filter = `blur(${BLUR}px)`;
    ctx.drawImage(this.shapes, 0, 0, width, height, 0, 0, width, height);
    ctx.filter = "none";

    const image = ctx.getImageData(0, 0, width, height);
    const data = image.data;
    const gain = 255 / (EDGE_SOLID - EDGE_START);
    for (let i = 3; i < data.length; i += 4) {
      const alpha = (data[i] - EDGE_START) * gain;
      data[i] = alpha < EDGE_FLOOR ? 0 : alpha > 255 ? 255 : alpha;
      data[i - 3] = 255;
      data[i - 2] = 255;
      data[i - 1] = 255;
    }
    this.fillEnclosedGaps(data, width, height);
    ctx.putImageData(image, 0, 0);
    target.drawImage(this.merged, 0, 0, width, height, this.left, this.top, width, height);
  }

  // Mark transparent pixels connected to the canvas edge, then fill the
  // remaining transparent pixels. The edge marker (alpha 1) is below the
  // visible threshold and avoids a separate visited bitmap.
  private fillEnclosedGaps(data: Uint8ClampedArray, width: number, height: number) {
    const pixelCount = width * height;
    if (this.floodQueue.length < pixelCount) this.floodQueue = new Int32Array(pixelCount);

    let head = 0;
    let tail = 0;
    const enqueue = (index: number) => {
      const alphaIndex = index * 4 + 3;
      if (data[alphaIndex] !== 0) return;
      data[alphaIndex] = 1;
      this.floodQueue[tail] = index;
      tail += 1;
    };

    for (let x = 0; x < width; x += 1) {
      enqueue(x);
      enqueue((height - 1) * width + x);
    }
    for (let y = 1; y < height - 1; y += 1) {
      enqueue(y * width);
      enqueue(y * width + width - 1);
    }

    while (head < tail) {
      const index = this.floodQueue[head];
      head += 1;
      const x = index % width;
      if (index >= width) enqueue(index - width);
      if (index + width < pixelCount) enqueue(index + width);
      if (x > 0) enqueue(index - 1);
      if (x + 1 < width) enqueue(index + 1);
    }

    for (let index = 0; index < pixelCount; index += 1) {
      const alphaIndex = index * 4 + 3;
      if (data[alphaIndex] === 1) data[alphaIndex] = 0;
      else if (data[alphaIndex] === 0) data[alphaIndex] = 255;
    }
  }

  // Canvases only ever grow, in steps, so they are not reallocated every frame.
  private fit(canvas: HTMLCanvasElement) {
    if (canvas.width >= this.width && canvas.height >= this.height) return;
    canvas.width = Math.max(canvas.width, Math.ceil(this.width / 64) * 64);
    canvas.height = Math.max(canvas.height, Math.ceil(this.height / 64) * 64);
  }
}
