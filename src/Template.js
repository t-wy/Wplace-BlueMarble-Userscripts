import { uint8ToBase64, cleanUpCanvas, rgbToMeta, testCanvasSize } from "./utils";

/** An instance of a template.
 * Handles all mathematics, manipulation, and analysis regarding a single template.
 * @class Template
 * @since 0.65.2
 */
export default class Template {

  /** The constructor for the {@link Template} class with enhanced pixel tracking.
   * @param {Object} [params={}] - Object containing all optional parameters
   * @param {string} [params.displayName='My template'] - The display name of the template
   * @param {number} [params.sortID=0] - The sort number of the template for rendering priority
   * @param {string} [params.authorID=''] - The user ID of the person who exported the template (prevents sort ID collisions)
   * @param {string} [params.url=''] - The URL to the source image
   * @param {File} [params.file=null] - The template file (pre-processed File or processed bitmap)
   * @param {Array<number>} [params.coords=null] - The coordinates of the top left corner as (tileX, tileY, pixelX, pixelY)
   * @param {Object} [params.chunked=null] - The affected chunks of the template, and their template for each chunk
   * @param {number} [params.tileSize=1000] - The size of a tile in pixels (assumes square tiles)
   * @param {number} [params.pixelCount=0] - Total number of pixels in the template (calculated automatically during processing)
   * @since 0.65.2
   */
  constructor({
    displayName = 'My template',
    sortID = 0,
    authorID = '',
    url = '',
    file = null,
    coords = null,
    chunked = null,
    chunkedBuffer = null,
    tileSize = 1000,
  } = {}) {
    this.displayName = displayName;
    this.sortID = sortID;
    this.authorID = authorID;
    this.url = url;
    this.file = file;
    this.coords = coords;
    this.chunked = chunked; // tileKey => ImageBitmap, null if memory saving
    this.chunkedBuffer = chunkedBuffer;
    this.tileSize = tileSize;
    this.enabled = true;
    this.pixelCount = 0; // Total pixel count in template
    this.requiredPixelCount = 0; // Total number of non-transparent, non-#deface pixels
    this.defacePixelCount = 0; // Number of #deface pixels (represents Transparent color in-game)
    this.colorPalette = {}; // key: "r,g,b" -> { count: number, enabled: boolean }
    this.tilePrefixes = new Set(); // Set of "xxxx,yyyy" tiles this template touches
    this.storageKey = null; // Key used inside templatesJSON to persist settings
    this.storageTimeString = Date.now().toString(); // Use to identify if the template is replaced but still with the same storageKey

    // Build allowed color set from site palette (exclude special Transparent entry by name)
    // Creates a Set of Wplace palette colors excluding "transparent"
    // const allowed = Array.isArray(colorpalette) ? colorpalette : [];
    // this.allowedColorsSet = allowedColorsSet;

    // Map rgb-> {id, premium}
    // this.rgbToMeta = rgbToMeta;

    console.log('Allowed colors for template:', new Set(rgbToMeta.keys()));

    this.shreadSize = null; // Scale image factor, same as TemplateManager's drawMult
  }

  customMask(x, y, shreadSize) {
    // Original: Center dot
    // return x % shreadSize == 1 && y % shreadSize == 1;
    // Modifed: + cross
    const center = (shreadSize - 1) >> 1; // Even: better be up left than down right
    return (
      x % shreadSize == center || y % shreadSize == center
    ) && (
      x % shreadSize >= center - 1 && x % shreadSize <= center + 1 &&
      y % shreadSize >= center - 1 && y % shreadSize <= center + 1
    );
  }

  customMaskPoints(shreadSize) {
    const result = [];
    for (let offsetY = 0; offsetY < shreadSize; offsetY++) {
      for (let offsetX = 0; offsetX < shreadSize; offsetX++) {
        if (this.customMask(offsetX, offsetY, shreadSize)) {
          result.push([offsetX, offsetY]);
        }
      }
    }
    return result;
  }

  /** Creates chunks of the template for each tile.
   * 
   * @returns {Object} Collection of template bitmaps & buffers organized by tile coordinates
   * @since 0.65.4
   */
  async createTemplateTiles(anchor) {
    console.log('Template coordinates:', this.coords);

    if (this.shreadSize === null) {
      // initialize shreadSize (usually already assigned by the template manager)
      this.shreadSize = testCanvasSize(5000, 5000) ? 5 : 4; // Scale image factor for pixel art enhancement (must be odd)
    }
    const shreadSize = this.shreadSize;
    const bitmap = await createImageBitmap(this.file, { "colorSpaceConversion": "none" }); // Create efficient bitmap from uploaded file
    const imageWidth = bitmap.width;
    const imageHeight = bitmap.height;
  
    const [tx, ty, px, py] = this.coords;
    let mapX = tx * this.tileSize + px;
    let mapY = ty * this.tileSize + py;
    // process anchor
    mapX -= Math.floor((imageWidth - 1) * {
      "l": 0,
      "m": 0.5,
      "r": 1,
    }[anchor[0]]);
    mapY -= Math.floor((imageHeight - 1) * {
      "t": 0,
      "m": 0.5,
      "b": 1,
    }[anchor[1]]);
    if (mapX < 0) {
      mapX += 2048 * this.tileSize;
    }
    this.coords = [
      Math.floor(mapX / this.tileSize),
      Math.floor(mapY / this.tileSize),
      mapX % this.tileSize,
      mapY % this.tileSize
    ];
    console.log('Top left template coordinates:', this.coords);
    
    // Calculate total pixel count using standard width × height formula
    // TODO: Use non-transparent pixels instead of basic width times height
    const totalPixels = imageWidth * imageHeight;
    console.log(`Template pixel analysis - Dimensions: ${imageWidth}×${imageHeight} = ${totalPixels.toLocaleString()} pixels`);
    
    // Store pixel count in instance property for access by template manager and UI components
    this.pixelCount = totalPixels;

    // ==================== REQUIRED/DEFACE PIXEL COUNTING ====================
    // Build a 1× scale canvas to inspect original pixels and count required vs deface
    try {
      let inspectCanvas = new OffscreenCanvas(imageWidth, imageHeight);
      const inspectCtx = inspectCanvas.getContext('2d', { willReadFrequently: true });
      inspectCtx.imageSmoothingEnabled = false;
      inspectCtx.clearRect(0, 0, imageWidth, imageHeight);
      inspectCtx.drawImage(bitmap, 0, 0);
      const inspectData = inspectCtx.getImageData(0, 0, imageWidth, imageHeight).data;
      cleanUpCanvas(inspectCanvas);
      inspectCanvas = null;

      let required = 0;
      let deface = 0;
      const paletteMap = new Map();
      for (let y = 0; y < imageHeight; y++) {
        for (let x = 0; x < imageWidth; x++) {
          const idx = (y * imageWidth + x) * 4;
          const r = inspectData[idx];
          const g = inspectData[idx + 1];
          const b = inspectData[idx + 2];
          const a = inspectData[idx + 3];
          if (a === 0) { continue; } // Ignored transparent pixel
          if (r === 222 && g === 250 && b === 206) { deface++; }
          // this key also includes #deface as "222,250,206"
          const key = rgbToMeta.has(`${r},${g},${b}`) ? `${r},${g},${b}` : 'other';
          //if (!rgbToMeta.has(key)) { continue; } // Skip non-palette colors (but #deface added to allowed)
          required++;
          paletteMap.set(key, (paletteMap.get(key) || 0) + 1);
        }
      }

      this.requiredPixelCount = required;
      this.defacePixelCount = deface;

      // Persist palette with all colors enabled by default
      const paletteObj = {};
      for (const [key, count] of paletteMap.entries()) {
        paletteObj[key] = { count, enabled: true };
      }
      this.colorPalette = paletteObj;
    } catch (err) {
      // Fail-safe: if OffscreenCanvas not available or any error, fall back to width×height
      this.requiredPixelCount = Math.max(0, this.pixelCount);
      this.defacePixelCount = 0;
      console.warn('Failed to compute required/deface counts. Falling back to total pixels.', err);
    }

    const templateTiles = {}; // Holds the template tiles
    const templateTilesBuffers = {}; // Holds the buffers of the template tiles

    let canvas = new OffscreenCanvas(this.tileSize, this.tileSize);
    const context = canvas.getContext('2d', { willReadFrequently: true });

    // For every tile...
    for (let pixelY = this.coords[3]; pixelY < imageHeight + this.coords[3]; ) {

      // Draws the partial tile first, if any
      // This calculates the size based on which is smaller:
      // A. The top left corner of the current tile to the bottom right corner of the current tile
      // B. The top left corner of the current tile to the bottom right corner of the image
      const drawSizeY = Math.min(
        this.tileSize - (pixelY % this.tileSize), // remaining y in this tile
        imageHeight + this.coords[3] - pixelY // bottom y
      );

      console.log(`Math.min(${this.tileSize} - (${pixelY} % ${this.tileSize}), ${imageHeight} - (${pixelY - this.coords[3]}))`);

      for (let pixelX = this.coords[2]; pixelX < imageWidth + this.coords[2];) {

        console.log(`Pixel X: ${pixelX}\nPixel Y: ${pixelY}`);

        // Draws the partial tile first, if any
        // This calculates the size based on which is smaller:
        // A. The top left corner of the current tile to the bottom right corner of the current tile
        // B. The top left corner of the current tile to the bottom right corner of the image
        const drawSizeX = Math.min(
          this.tileSize - (pixelX % this.tileSize), // remaining x in this tile
          imageWidth + this.coords[2] - pixelX　// right x
        );

        console.log(`Math.min(${this.tileSize} - (${pixelX} % ${this.tileSize}), ${imageWidth} - (${pixelX - this.coords[2]}))`);

        console.log(`Draw Size X: ${drawSizeX}\nDraw Size Y: ${drawSizeY}`);

        // Change the canvas size and wipe the canvas
        const canvasWidth = drawSizeX * shreadSize;// + (pixelX % this.tileSize) * shreadSize;
        const canvasHeight = drawSizeY * shreadSize;// + (pixelY % this.tileSize) * shreadSize;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        console.log(`Draw X: ${drawSizeX}\nDraw Y: ${drawSizeY}\nCanvas Width: ${canvasWidth}\nCanvas Height: ${canvasHeight}`);

        context.imageSmoothingEnabled = false; // Nearest neighbor

        console.log(`Getting X ${pixelX}-${pixelX + drawSizeX}\nGetting Y ${pixelY}-${pixelY + drawSizeY}`);

        // Draws the template segment on this tile segment
        context.clearRect(0, 0, canvasWidth, canvasHeight); // Clear any previous drawing (only runs when canvas size does not change)
        context.drawImage(
          bitmap, // Bitmap image to draw
          pixelX - this.coords[2], // Coordinate X to draw from
          pixelY - this.coords[3], // Coordinate Y to draw from
          drawSizeX, // X width to draw from
          drawSizeY, // Y height to draw from
          0, // Coordinate X to draw at
          0, // Coordinate Y to draw at
          drawSizeX * shreadSize, // X width to draw at
          drawSizeY * shreadSize // Y height to draw at
        ); // Coordinates and size of draw area of source image, then canvas

        // const final = await canvas.convertToBlob({ type: 'image/png' });
        // const url = URL.createObjectURL(final); // Creates a blob URL
        // window.open(url, '_blank'); // Opens a new tab with blob
        // setTimeout(() => URL.revokeObjectURL(url), 60000); // Destroys the blob 1 minute later

        const imageData = context.getImageData(0, 0, canvasWidth, canvasHeight); // Data of the image on the canvas

        for (let y = 0; y < canvasHeight; y++) {
          for (let x = 0; x < canvasWidth; x++) {
            // For every pixel...
            const pixelIndex = (y * canvasWidth + x) * 4; // Find the pixel index in an array where every 4 indexes are 1 pixel
            // If the pixel is the color #deface, draw a translucent gray checkerboard pattern
            if (
              imageData.data[pixelIndex] === 222 &&
              imageData.data[pixelIndex + 1] === 250 &&
              imageData.data[pixelIndex + 2] === 206
            ) {
              if ((x + y) % 2 === 0) { // Formula for checkerboard pattern
                imageData.data[pixelIndex] = 0;
                imageData.data[pixelIndex + 1] = 0;
                imageData.data[pixelIndex + 2] = 0;
              } else {
                imageData.data[pixelIndex] = 255;
                imageData.data[pixelIndex + 1] = 255;
                imageData.data[pixelIndex + 2] = 255;
              }
              imageData.data[pixelIndex + 3] = 32; // Make it translucent
            } else if (!this.customMask(x, y, shreadSize)) { // Otherwise only draw the middle pixel
              imageData.data[pixelIndex + 3] = 0; // Make the pixel transparent on the alpha channel
            /* } else {
              // Center pixel: keep only if in allowed site palette
              const r = imageData.data[pixelIndex];
              const g = imageData.data[pixelIndex + 1];
              const b = imageData.data[pixelIndex + 2];
              if (!rgbToMeta.has(`${r},${g},${b}`)) {
                //imageData.data[pixelIndex + 3] = 0; // hide non-palette colors
              }
            */
            }
          }
        }

        console.log(`Shreaded pixels for ${pixelX}, ${pixelY}`, imageData);

        context.putImageData(imageData, 0, 0);

        // Creates the "0000,0000,000,000" key name
        const templateTileName = `${(this.coords[0] + Math.floor(pixelX / this.tileSize))
          .toString()
          .padStart(4, '0')},${(this.coords[1] + Math.floor(pixelY / this.tileSize))
          .toString()
          .padStart(4, '0')},${(pixelX % this.tileSize)
          .toString()
          .padStart(3, '0')},${(pixelY % this.tileSize).toString().padStart(3, '0')}`;
          
        templateTiles[templateTileName] = await createImageBitmap(canvas); // Creates the bitmap
        // Record tile prefix for fast lookup later
        this.tilePrefixes.add(templateTileName.split(',').slice(0,2).join(','));
        
        const canvasBlob = await canvas.convertToBlob();
        const canvasBuffer = await canvasBlob.arrayBuffer();
        const canvasBufferBytes = Array.from(new Uint8Array(canvasBuffer));
        templateTilesBuffers[templateTileName] = uint8ToBase64(canvasBufferBytes); // Stores the buffer

        console.log(templateTiles);

        pixelX += drawSizeX;
      }

      pixelY += drawSizeY;
    }
    bitmap.close();
    cleanUpCanvas(canvas);
    canvas = null;

    console.log('Template Tiles: ', templateTiles);
    console.log('Template Tiles Buffers: ', templateTilesBuffers);
    return { templateTiles, templateTilesBuffers };
  }

  /** Get the bitmap for a tile key. Supporting memory-saving mode
   * @param {string} tileKey - The tile key
   * @param {boolean} memorySaving - Whether to store the bitmap in memory
   * @since 0.85.33
   */
  async getChunked(tileKey, memorySaving = false) {
    if (this.chunked[tileKey] === undefined) {
      return undefined;
    }
    if (this.chunked[tileKey] !== null) {
      return this.chunked[tileKey];
    }
    const templateBlob = new Blob([this.chunkedBuffer[tileKey]], { type: "image/png" }); // Uint8Array -> Blob
    const templateBitmap = await createImageBitmap(templateBlob); // Blob -> Bitmap
    if (memorySaving === false) {
      this.chunked[tileKey] = templateBitmap;
    };
    return templateBitmap;
  }
}
