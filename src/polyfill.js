
if (!window.OffscreenCanvas) {
  window.OffscreenCanvas = class OffscreenCanvas {
    constructor(width, height) {
      this.canvas = document.createElement("canvas");
      this.canvas.width = width;
      this.canvas.height = height;
    }

    get width() { return this.canvas.width; }
    set width(v) { this.canvas.width = v; }
    get height() { return this.canvas.height; }
    set height(v) { this.canvas.height = v; }

    getContext(type, opts) {
      return this.canvas.getContext(type, opts);
    }

    convertToBlob({ type, quality } = {}) {
      return new Promise(resolve => {
        this.canvas.toBlob(resolve, type, quality);
      });
    }

    transferToImageBitmap() {
      return createImageBitmap(this.canvas);
    }
  };

  if (HTMLCanvasElement && !HTMLCanvasElement.prototype.transferControlToOffscreen) {
    HTMLCanvasElement.prototype.transferControlToOffscreen = function() {
      const oc = new OffscreenCanvas(this.width, this.height);
      oc.canvas = this;
      return oc;
    };
  }
}