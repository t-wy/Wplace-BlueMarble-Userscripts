if (!window.OffscreenCanvas) {
  window.OffscreenCanvas = function (width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.convertToBlob = function ({ type, quality } = {}) {
      return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
          if (blob) resolve(blob);
          else reject(new Error("toBlob() returned null"));
        }, type, quality);
      });
    }
    return canvas;
  }
}