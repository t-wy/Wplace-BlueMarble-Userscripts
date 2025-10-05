import Template from "./Template";
import { base64ToUint8, numberToEncoded, cleanUpCanvas, colorpalette, allowedColorsSet, rgbToMeta, sortByOptions } from "./utils";

/** Manages the template system.
 * This class handles all external requests for template modification, creation, and analysis.
 * It serves as the central coordinator between template instances and the user interface.
 * @class TemplateManager
 * @since 0.55.8
 * @example
 * // JSON structure for a template
 * {
 *   "whoami": "BlueMarble",
 *   "scriptVersion": "1.13.0",
 *   "schemaVersion": "2.1.0",
 *   "templates": {
 *     "0 $Z": {
 *       "name": "My Template",
 *       "enabled": true,
 *       "tiles": {
 *         "1231,0047,183,593": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA",
 *         "1231,0048,183,000": "data:image/png;AAAFCAYAAACNbyblAAAAHElEQVQI12P4"
 *       }
 *     },
 *     "1 $Z": {
 *       "name": "My Template",
 *       "URL": "https://github.com/SwingTheVine/Wplace-BlueMarble/blob/main/dist/assets/Favicon.png",
 *       "URLType": "template",
 *       "enabled": false,
 *       "tiles": {
 *         "375,1846,276,188": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA",
 *         "376,1846,000,188": "data:image/png;AAAFCAYAAACNbyblAAAAHElEQVQI12P4"
 *       }
 *     }
 *   }
 * }
 */
export default class TemplateManager {

  /** The constructor for the {@link TemplateManager} class.
   * @since 0.55.8
   */
  constructor(name, version, overlay) {

    // Meta
    this.name = name; // Name of userscript
    this.version = version; // Version of userscript
    this.overlay = overlay; // The main instance of the Overlay class
    this.templatesVersion = '1.0.0'; // Version of JSON schema
    this.userID = null; // The ID of the current user
    this.encodingBase = '!#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~'; // Characters to use for encoding/decoding
    this.tileSize = 1000; // The number of pixels in a tile. Assumes the tile is square

    let canvas = new OffscreenCanvas(5000,5000);
    const context = canvas.getContext('2d');
    context.fillRect(4999, 4999, 1, 1);
    if (context.getImageData(4999, 4999, 1, 1).data[3] !== 0) {
      this.drawMult = 5; // The enlarged size for each pixel. E.g. when "3", a 1x1 pixel becomes a 1x1 pixel inside a 3x3 area. MUST BE ODD
    } else {
      this.drawMult = 4;
    }
    // Release canvas
    cleanUpCanvas(canvas);
    canvas = null;

    this.drawMultCenter = (this.drawMult - 1) >> 1; // Even: better be up left than down right
    
    // Template
    this.canvasTemplate = null; // Our canvas
    this.canvasTemplateZoomed = null; // The template when zoomed out
    this.canvasTemplateID = 'bm-canvas'; // Our canvas ID
    this.canvasMainID = 'div#map canvas.maplibregl-canvas'; // The selector for the main canvas
    this.template = null; // The template image.
    this.templateState = ''; // The state of the template ('blob', 'proccessing', 'template', etc.)
    this.templatesArray = []; // All Template instnaces currently loaded (Template)
    this.templatesJSON = null; // All templates currently loaded (JSON)
    this.templatesShouldBeDrawn = true; // Should ALL templates be drawn to the canvas?
    this.tileProgress = new Map(); // Tracks per-tile progress stats {painted, required, wrong}
    this.extraColorsBitmap = 0; // List of unlocked colors, set by apiManager
    this.userSettings = {}; // User settings
    this.hideLockedColors = false; 
  }

  /** Retrieves the pixel art canvas.
   * If the canvas has been updated/replaced, it retrieves the new one.
   * @param {string} selector - The CSS selector to use to find the canvas.
   * @returns {HTMLCanvasElement|null} The canvas as an HTML Canvas Element, or null if the canvas does not exist
   * @since 0.58.3
   * @deprecated Not in use since 0.63.25
   */
  /* @__PURE__ */getCanvas() {

    // If the stored canvas is "fresh", return the stored canvas
    if (document.body.contains(this.canvasTemplate)) {return this.canvasTemplate;}
    // Else, the stored canvas is "stale", get the canvas again

    // Attempt to find and destroy the "stale" canvas
    document.getElementById(this.canvasTemplateID)?.remove(); 

    const canvasMain = document.querySelector(this.canvasMainID);

    const canvasTemplateNew = document.createElement('canvas');
    canvasTemplateNew.id = this.canvasTemplateID;
    canvasTemplateNew.className = 'maplibregl-canvas';
    canvasTemplateNew.style.position = 'absolute';
    canvasTemplateNew.style.top = '0';
    canvasTemplateNew.style.left = '0';
    canvasTemplateNew.style.height = `${canvasMain?.clientHeight * (window.devicePixelRatio || 1)}px`;
    canvasTemplateNew.style.width = `${canvasMain?.clientWidth * (window.devicePixelRatio || 1)}px`;
    canvasTemplateNew.height = canvasMain?.clientHeight * (window.devicePixelRatio || 1);
    canvasTemplateNew.width = canvasMain?.clientWidth * (window.devicePixelRatio || 1);
    canvasTemplateNew.style.zIndex = '8999';
    canvasTemplateNew.style.pointerEvents = 'none';
    canvasMain?.parentElement?.appendChild(canvasTemplateNew); // Append the newCanvas as a child of the parent of the main canvas
    this.canvasTemplate = canvasTemplateNew; // Store the new canvas

    window.addEventListener('move', this.onMove);
    window.addEventListener('zoom', this.onZoom);
    window.addEventListener('resize', this.onResize);

    return this.canvasTemplate; // Return the new canvas
  }

  /** Creates the JSON object to store templates in
   * @returns {{ whoami: string, scriptVersion: string, schemaVersion: string, templates: Object }} The JSON object
   * @since 0.65.4
   */
  async createJSON() {
    return {
      "whoami": this.name.replace(' ', ''), // Name of userscript without spaces
      "scriptVersion": this.version, // Version of userscript
      "schemaVersion": this.templatesVersion, // Version of JSON schema
      "templates": {} // The templates
    };
  }

  /** Creates the template from the inputed file blob
   * @param {File} blob - The file blob to create a template from
   * @param {string} name - The display name of the template
   * @param {Array<number, number, number, number>} coords - The coordinates of the top left corner of the template
   * @since 0.65.77
   */
  async createTemplate(blob, name, coords) {

    // Creates the JSON object if it does not already exist
    if (!this.templatesJSON) {this.templatesJSON = await this.createJSON(); console.log(`Creating JSON...`);}

    this.overlay.handleDisplayStatus(`Creating template at ${coords.join(', ')}...`);

    // Creates a new template instance
    const template = new Template({
      displayName: name,
      sortID: Object.keys(this.templatesJSON.templates).length || 0, // Uncomment this to enable multiple templates (1/2)
      authorID: numberToEncoded(this.userID || 0, this.encodingBase),
      file: blob,
      coords: coords
    });
    template.shreadSize = this.drawMult; // Copy to template's shread Size
    //template.chunked = await template.createTemplateTiles(this.tileSize); // Chunks the tiles
    const { templateTiles, templateTilesBuffers } = await template.createTemplateTiles(this.tileSize); // Chunks the tiles
    // Modify palette enabled status using the honored one
    const toggleStatus = this.getPaletteToggledStatus();
    for (const key of Object.keys(template.colorPalette)) {
      if (toggleStatus[key] !== undefined) {
        template.colorPalette[key].enabled = toggleStatus[key];
      }
    }
    template.chunked = templateTiles; // Stores the chunked tile bitmaps

    // Appends a child into the templates object
    // The child's name is the number of templates already in the list (sort order) plus the encoded player ID
    const storageKey = `${template.sortID} ${template.authorID}`;
    template.storageKey = storageKey;
    this.templatesJSON.templates[storageKey] = {
      "name": template.displayName, // Display name of template
      "coords": coords.join(', '), // The coords of the template
      "enabled": true,
      "tiles": templateTilesBuffers, // Stores the chunked tile buffers
      "palette": template.colorPalette // Persist palette and enabled flags
    };

    // this.templatesArray = []; // Remove this to enable multiple templates (2/2)
    this.templatesArray.push(template); // Pushes the Template object instance to the Template Array

    // reset related tiles
    this.clearTileProgress(template);

    // ==================== PIXEL COUNT DISPLAY SYSTEM ====================
    // Display pixel count statistics with internationalized number formatting
    // This provides immediate feedback to users about template complexity and size
    const pixelCountFormatted = new Intl.NumberFormat().format(template.pixelCount);
    this.overlay.handleDisplayStatus(`Template created at ${coords.join(', ')}! Total pixels: ${pixelCountFormatted}`);

    // Ensure color filter UI is visible when a template is created
    this.requestListRebuild();

    console.log(Object.keys(this.templatesJSON.templates).length);
    console.log(this.templatesJSON);
    console.log(this.templatesArray);
    console.log(JSON.stringify(this.templatesJSON));

    await this.storeTemplates();
  }

  requestListRebuild() {
    try {
      const colorUI = document.querySelector('#bm-contain-colorfilter');
      if (colorUI) { colorUI.style.display = ''; }
      // Deferred palette list rendering; actual DOM is built in main via helper
      window.postMessage({ source: 'blue-marble', bmEvent: 'bm-rebuild-color-list' }, '*');
    } catch (_) { /* no-op */ }
    try {
      const templateUI = document.querySelector('#bm-contain-templatefilter');
      if (templateUI) { templateUI.style.display = ''; }
      // Deferred palette list rendering; actual DOM is built in main via helper
      window.postMessage({ source: 'blue-marble', bmEvent: 'bm-rebuild-template-list' }, '*');
    } catch (_) { /* no-op */ }
  }

  /** Generates a {@link Template} class instance from the JSON object template
   */
  #loadTemplate() {

  }

  /** Stores the JSON object of the loaded templates into TamperMonkey (GreaseMonkey) storage.
   * @since 0.72.7
   */
  async storeTemplates() {
    await GM.setValue('bmTemplates', JSON.stringify(this.templatesJSON));
  }

  /** Deletes a template from the JSON object.
   * Also delete's the corrosponding {@link Template} class instance
   */
  async deleteTemplate(storageKey) {
    // Delete the template class instance
    const targetTemplate = this.templatesArray.find(template => template.storageKey === storageKey);
    if (targetTemplate === undefined) return;
    const removeIndex = this.templatesArray.indexOf(targetTemplate);
    this.templatesArray.splice(removeIndex, 1);

    // Delete the JSON Entry
    const templates = this.templatesJSON?.templates;
    if (templates && templates?.[storageKey]) {
      delete templates[storageKey];
    }

    // reset related tiles
    this.clearTileProgress(targetTemplate);

    this.overlay.handleDisplayStatus(`Template ${targetTemplate.displayName} is deleted!`);
  
    await this.storeTemplates();
    this.requestListRebuild();
  }

  /** Disables the template from view
   */
  async disableTemplate() {

    // Creates the JSON object if it does not already exist
    if (!this.templatesJSON) {this.templatesJSON = await this.createJSON(); console.log(`Creating JSON...`);}


  }

  /** Draws all templates on the specified tile.
   * This method handles the rendering of template overlays on individual tiles.
   * @param {File} tileBlob - The pixels that are placed on a tile
   * @param {Array<number>} tileCoords - The tile coordinates [x, y]
   * @since 0.65.77
   */
  async drawTemplateOnTile(tileBlob, tileCoords) {

    // Returns early if no templates should be drawn
    if (!this.templatesShouldBeDrawn) {return tileBlob;}

    const timeStart = performance.now();

    const drawSize = this.tileSize * this.drawMult; // Calculate draw multiplier for scaling
    
    const tileCoordsRaw = tileCoords; // We want the number version for later example finding
    // Format tile coordinates with proper padding for consistent lookup
    tileCoords = tileCoords[0].toString().padStart(4, '0') + ',' + tileCoords[1].toString().padStart(4, '0');

    console.log(`Searching for templates in tile: "${tileCoords}"`);

    const templateArray = this.templatesArray; // Stores a copy for sorting
    console.log(templateArray);

    // Sorts the array of Template class instances. 0 = first = lowest draw priority
    templateArray.sort((a, b) => {return a.sortID - b.sortID;});

    console.log(templateArray);

    console.log(`Start checking touching templates...`, performance.now() - timeStart + ' ms');

    // Early exit if none of the active templates touch this tile
    const anyTouches = templateArray.some(t => {
      if (!t?.chunked) { return false; }
      // Fast path via recorded tile prefixes if available
      if (t.tilePrefixes && t.tilePrefixes.size > 0) {
        return t.tilePrefixes.has(tileCoords);
      }
      // Fallback: scan chunked keys
      return Object.keys(t.chunked).some(k => k.startsWith(tileCoords));
    });
    if (!anyTouches) { return tileBlob; }

    // Retrieves the relavent template tile blobs
    const templatesTilesToDraw = templateArray
      .map(template => {
        const matchingTiles = Object.keys(template.chunked).filter(tile =>
          tile.startsWith(tileCoords)
        );

        if (matchingTiles.length === 0) {return null;} // Return null when nothing is found

        // Retrieves the blobs of the templates for this tile
        const matchingTileBlobs = matchingTiles.map(tile => {

          const coords = tile.split(','); // [x, y, x, y] Tile/pixel coordinates
          
          return {
            template: template,
            storageKey: template.storageKey,
            bitmap: template.chunked[tile],
            tileCoords: [coords[0], coords[1]],
            pixelCoords: [coords[2], coords[3]]
          }
        });

        return matchingTileBlobs?.[0];
      })
    .filter(Boolean);

    console.log(templatesTilesToDraw, performance.now() - timeStart + ' ms');

    const templateCount = templatesTilesToDraw?.length || 0; // Number of templates to draw on this tile
    console.log(`templateCount = ${templateCount}`);
    const enabledTemplateCount = this.templatesArray.filter(t => t.enabled).length;

    // We'll compute per-tile painted/wrong/required counts when templates exist for this tile
    let paintedCount = 0;
    let wrongCount = 0;
    let requiredCount = 0;
  
    // Per-color stat
    let paletteStats = {};
    // Per-template stat
    let templateStats = {};
    
    const tileBitmap = await createImageBitmap(tileBlob);

    let canvas = new OffscreenCanvas(drawSize, drawSize);
    const context = canvas.getContext('2d');

    context.imageSmoothingEnabled = false; // Nearest neighbor

    // Tells the canvas to ignore anything outside of this area
    context.beginPath();
    context.rect(0, 0, drawSize, drawSize);
    context.clip();

    context.clearRect(0, 0, drawSize, drawSize); // Draws transparent background
    context.drawImage(tileBitmap, 0, 0, drawSize, drawSize);

    // Grab a snapshot of the tile pixels BEFORE we draw any template overlays
    let tilePixels = null;
    try {
      tilePixels = context.getImageData(0, 0, drawSize, drawSize).data;
    } catch (_) {
      // If reading fails for any reason, we will skip stats
    }

    const colorpaletteRev = Object.fromEntries(colorpalette.map(color => {
      const [r, g, b] = color.rgb;
      return [`${r},${g},${b}`, color];
    }))

    // honor the same toggle Status for all templates
    const toggleStatus = this.getPaletteToggledStatus(); // Obtain the color palette of the template
    const hideLocked = this.areLockedColorsHidden();
    const hasDisabled = Object.values(toggleStatus).some(v => v === false) || hideLocked;
    const allDisabled = Object.values(toggleStatus).every(v => v === false); // Check if every color is disabled

    // For each template in this tile, draw them.
    for (const templateTile of templatesTilesToDraw) {
      const templateKey = templateTile.storageKey;
      console.log(`Template:`);
      console.log(templateTile);
      console.log(performance.now() - timeStart + ' ms');

      // Compute stats by sampling template center pixels against tile pixels,
      // honoring color enable/disable from the active template's palette
      if (tilePixels) {
        try {
          
          const tempWidth = templateTile.bitmap.width;
          const tempHeight = templateTile.bitmap.height;
          let tempCanvas = new OffscreenCanvas(tempWidth, tempHeight);
          const tempContext = tempCanvas.getContext('2d', { willReadFrequently: true });
          tempContext.imageSmoothingEnabled = false;
          tempContext.clearRect(0, 0, tempWidth, tempHeight);
          tempContext.drawImage(templateTile.bitmap, 0, 0);
          const tImg = tempContext.getImageData(0, 0, tempWidth, tempHeight);
          const tData = tImg.data; // Tile Data, Template Data, or Temp Data????
          cleanUpCanvas(tempCanvas);
          tempCanvas = null;

          const offsetX = Number(templateTile.pixelCoords[0]) * this.drawMult;
          const offsetY = Number(templateTile.pixelCoords[1]) * this.drawMult;

          // Loops over all pixels in the template
          // Assigns each pixel a color (if center pixel)
          // Optimized the inefficient loop
          for (let y = this.drawMultCenter; y < tempHeight; y += this.drawMult) {
            for (let x = this.drawMultCenter; x < tempWidth; x += this.drawMult) {
              // Purpose: Count which pixels are painted correctly???

              // Only evaluate the center pixel of each shread block
              // Skip if not the center pixel of the shread block

              const gx = x + offsetX;
              const gy = y + offsetY;

              // IF the pixel is out of bounds of the template, OR if the pixel is outside of the tile, then skip the pixel
              if (gx < 0 || gy < 0 || gx >= drawSize || gy >= drawSize) { continue; }

              const templatePixelCenter = (y * tempWidth + x) * 4; // Shread block center pixel
              const templatePixelCenterRed = tData[templatePixelCenter]; // Shread block's center pixel's RED value
              const templatePixelCenterGreen = tData[templatePixelCenter + 1]; // Shread block's center pixel's GREEN value
              const templatePixelCenterBlue = tData[templatePixelCenter + 2]; // Shread block's center pixel's BLUE value
              const templatePixelCenterAlpha = tData[templatePixelCenter + 3]; // Shread block's center pixel's ALPHA value

              // Possibly needs to be removed 
              // Handle template transparent pixel (alpha < 64): wrong if board has any site palette color here
              // If the alpha of the center pixel is less than 64...
              if (templatePixelCenterAlpha < 64) {
                try {
                  const tileIdx = (gy * drawSize + gx) * 4;
                  const pr = tilePixels[tileIdx];
                  const pg = tilePixels[tileIdx + 1];
                  const pb = tilePixels[tileIdx + 2];
                  const pa = tilePixels[tileIdx + 3];

                  const key = allowedColorsSet.has(`${pr},${pg},${pb}`) ? `${pr},${pg},${pb}` : 'other';

                  const isSiteColor = allowedColorsSet.has(key);
                  
                  // IF the alpha of the center pixel that is placed on the canvas is greater than or equal to 64, AND the pixel is a Wplace palette color, then it is incorrect.
                  if (pa >= 64 && isSiteColor) {
                    wrongCount++;
                  }
                } catch (ignored) {}

                continue; // Continue to the next pixel
              }

              // Treat #deface as Transparent palette color (required and paintable)
              // Ignore non-palette colors (match against allowed set when available) for counting required template pixels
              // try {

              //   const activeTemplate = this.templatesArray?.[0]; // Get the first template

              //   // IF the stored palette data exists, AND the pixel is not in the allowed palette
              //   if (allowedColorsSet && !allowedColorsSet.has(`${templatePixelCenterRed},${templatePixelCenterGreen},${templatePixelCenterBlue}`)) {

              //     continue; // Skip this pixel if it is not in the allowed palette
              //   }
              // } catch (ignored) {}

              requiredCount++;

              // Strict center-pixel matching. Treat transparent tile pixels as unpainted (not wrong)
              const realPixelCenter = (gy * drawSize + gx) * 4;
              const realPixelRed = tilePixels[realPixelCenter];
              const realPixelCenterGreen = tilePixels[realPixelCenter + 1];
              const realPixelCenterBlue = tilePixels[realPixelCenter + 2];
              const realPixelCenterAlpha = tilePixels[realPixelCenter + 3];

              let isPainted = false;
              // IF the alpha of the pixel is less than 64...
              if (realPixelCenterAlpha < 64) {
                // Unpainted -> neither painted nor wrong

                // ELSE IF the pixel matches the template center pixel color
              } else if (realPixelRed === templatePixelCenterRed && realPixelCenterGreen === templatePixelCenterGreen && realPixelCenterBlue === templatePixelCenterBlue) {
                paintedCount++; // ...the pixel is painted correctly
                isPainted = true;
                let colorKey = `${templatePixelCenterRed},${templatePixelCenterGreen},${templatePixelCenterBlue}`;
                if (colorpaletteRev[colorKey] === undefined) colorKey = 'other';
                if (paletteStats[colorKey] === undefined) {
                  paletteStats[colorKey] = {
                    painted: 1,
                    paintedAndEnabled: +(templateTile.template.enabled ?? true),
                    missing: 0,
                    examples: [ ],
                    examplesEnabled: [ ],
                  }
                } else {
                  paletteStats[colorKey].painted++;
                  if (templateTile.template.enabled ?? true) {
                    paletteStats[colorKey].paintedAndEnabled++;
                  }
                }
                if (templateStats[templateKey] === undefined) {
                  templateStats[templateKey] = {
                    painted: 1,
                  }
                } else {
                  templateStats[templateKey].painted++;
                }
              } else {
                wrongCount++; // ...the pixel is NOT painted correctly
              }
              if (!isPainted) {
                // add to palette stat
                let key = `${templatePixelCenterRed},${templatePixelCenterGreen},${templatePixelCenterBlue}`;
                if (colorpaletteRev[key] === undefined) key = 'other';
                const example = [ // use this tile as example
                  tileCoordsRaw,
                  [
                    Math.floor(gx / this.drawMult),
                    Math.floor(gy / this.drawMult)
                  ]
                ];
                if (paletteStats[key] === undefined) {
                  paletteStats[key] = {
                    painted: 0,
                    paintedAndEnabled: 0,
                    missing: 1,
                    examples: [ example ],
                    examplesEnabled: [ ],
                  }
                  if (templateTile.template.enabled ?? true) {
                    paletteStats[key].examplesEnabled.push(example);
                  }
                } else {
                  const exampleMax = (this.userSettings?.smartPlace ?? false) ? 1 << 20 : 100;
                  // missing count >= 1
                  paletteStats[key].missing++;
                  if (paletteStats[key].examples.length < exampleMax) {
                    paletteStats[key].examples.push(example);
                  } else if (Math.random() * paletteStats[key].examples.length < exampleMax) {
                    // pick a random sample, so the new entry share the same weight
                    const replaceIndex = Math.floor(Math.random() * exampleMax);
                    paletteStats[key].examples[replaceIndex] = example;
                  }
                  if (templateTile.template.enabled ?? true) {
                    if (paletteStats[key].examplesEnabled.length < exampleMax) {
                      paletteStats[key].examplesEnabled.push(example);
                    } else if (Math.random() * paletteStats[key].examplesEnabled.length < exampleMax) {
                      // pick a random sample, so the new entry share the same weight
                      const replaceIndex = Math.floor(Math.random() * exampleMax);
                      paletteStats[key].examplesEnabled[replaceIndex] = example;
                    }
                  }
                }
              }
            }
          }
        } catch (exception) {
          console.warn('Failed to compute per-tile painted/wrong stats:', exception);
        }
      }

      // Draw the template overlay for visual guidance, honoring color filter
      if (templateTile.template.enabled ?? true) {
        try {

          const offsetX = Number(templateTile.pixelCoords[0]) * this.drawMult;
          const offsetY = Number(templateTile.pixelCoords[1]) * this.drawMult;

          // If none of the template colors are disabled, then draw the image normally
          if (!hasDisabled) {
            context.drawImage(templateTile.bitmap, offsetX, offsetY);
          } else {
            // ELSE we need to apply the color filter
            if (!allDisabled) {

              console.log('Applying color filter...', performance.now() - timeStart + ' ms');

              const tempW = templateTile.bitmap.width;
              const tempH = templateTile.bitmap.height;

              let filterCanvas = new OffscreenCanvas(tempW, tempH);
              const filterCtx = filterCanvas.getContext('2d', { willReadFrequently: true });
              filterCtx.imageSmoothingEnabled = false; // Nearest neighbor
              filterCtx.clearRect(0, 0, tempW, tempH);
              filterCtx.drawImage(templateTile.bitmap, 0, 0);

              const img = filterCtx.getImageData(0, 0, tempW, tempH);
              const data = img.data;

              // Further reduce the number of iterations
              for (const [offsetX, offsetY] of templateTile.template.customMaskPoints(this.drawMult)) {
                for (let y = offsetY; y < tempH; y += this.drawMult) {
                  for (let x = offsetX; x < tempW; x += this.drawMult) {

                    const idx = (y * tempW + x) * 4;
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];
                    const a = data[idx + 3];

                    if (a < 1) { continue; }

                    let key = allowedColorsSet.has(`${r},${g},${b}`) ? `${r},${g},${b}` : 'other';

                    // Hide if color is not in allowed palette or explicitly disabled
                    const inWplacePalette = allowedColorsSet.has(key);

                    // if (inWplacePalette) {
                    //   key = 'other'; // Map all non-palette colors to "other"
                    //   console.log('Added color to other');
                    // }

                    const isPaletteColorEnabled = toggleStatus?.[key] !== false;
                    const isForceHidden = hideLocked && (
                      key === 'other' || (
                        rgbToMeta.has(key) &&
                        !this.isColorUnlocked(rgbToMeta.get(key).id)
                      )
                    );
                    if (!inWplacePalette || !isPaletteColorEnabled || isForceHidden) {
                      data[idx + 3] = 0; // hide disabled color center pixel
                    }
                  }
                }
              }

              // Draws the template with somes colors disabled
              filterCtx.putImageData(img, 0, 0);
              context.drawImage(filterCanvas, offsetX, offsetY);

              cleanUpCanvas(filterCanvas);
              filterCanvas = null;
            } 
          }
        } catch (exception) {

          // If filtering fails, we can log the error or handle it accordingly
          console.warn('Failed to apply color filter:', exception);

          // Fallback to drawing raw bitmap if filtering fails
            context.drawImage(templateTile.bitmap, offsetX, offsetY);
        }
      }
    }

    console.log('Saving per-tile stats...', performance.now() - timeStart + ' ms');

    // Save per-tile stats and compute global aggregates across all processed tiles
    if (templateCount > 0) {
      const tileKey = tileCoords; // already padded string "xxxx,yyyy"
      this.tileProgress.set(tileKey, {
        painted: paintedCount,
        required: requiredCount,
        wrong: wrongCount,
        palette: paletteStats,
        template: templateStats,
      });

      // Aggregate painted/wrong across tiles we've processed
      let aggPainted = 0;
      let aggRequiredTiles = 0;
      let aggWrong = 0;
      for (const stats of this.tileProgress.values()) {
        aggPainted += stats.painted || 0;
        aggRequiredTiles += stats.required || 0;
        aggWrong += stats.wrong || 0;
      }

      // Determine total required across all templates
      // Prefer precomputed per-template required counts; fall back to sum of processed tiles
      const totalRequiredTemplates = this.templatesArray.reduce((sum, t) =>
        sum + (t.requiredPixelCount || t.pixelCount || 0), 0);
      const totalRequired = totalRequiredTemplates > 0 ? totalRequiredTemplates : aggRequiredTiles;

      // Turns numbers into formatted number strings. E.g., 1234 -> 1,234 OR 1.234 based on location of user
      const paintedStr = new Intl.NumberFormat().format(aggPainted);
      const requiredStr = new Intl.NumberFormat().format(totalRequired);
      const wrongStr = new Intl.NumberFormat().format(totalRequired - aggPainted); // Used to be aggWrong, but that is bugged

      this.overlay.handleDisplayStatus(
        `Displaying ${enabledTemplateCount} template${enabledTemplateCount == 1 ? '' : 's'}.\nPainted ${paintedStr} / ${requiredStr} • Wrong ${wrongStr}`
      );
    } else {
      this.overlay.handleDisplayStatus(`Displaying ${enabledTemplateCount} template${enabledTemplateCount == 1 ? '' : 's'}.`);
    }

    console.log('Exporting tile overlay...', performance.now() - timeStart + ' ms');

    // const resultBlob = typeof ImageBitmap !== 'undefined' ? createImageBitmap(canvas) : await canvas.convertToBlob({ type: 'image/png' });

    console.log('Cleaning up...', performance.now() - timeStart + ' ms');

    window.buildColorFilterList();
    window.buildTemplateFilterList();

    console.log('Finish...', performance.now() - timeStart + ' ms');

    // return canvas;
    // return resultBlob;
    return await canvas.convertToBlob({ type: 'image/png' });
  }

  /** Imports the JSON object, and appends it to any JSON object already loaded
   * @param {string} json - The JSON string to parse
   */
  importJSON(json) {

    console.log(`Importing JSON...`);
    console.log(json);

    // If the passed in JSON is a Blue Marble template object...
    if (json?.whoami == 'BlueMarble') {
      this.templatesJSON = json;
      this.#parseBlueMarble(json); // ...parse the template object as Blue Marble
    }
  }

  /** Parses the Blue Marble JSON object
   * @param {string} json - The JSON string to parse
   * @since 0.72.13
   */
  async #parseBlueMarble(json) {

    console.log(`Parsing BlueMarble...`);

    const templates = json.templates;

    console.log(`BlueMarble length: ${Object.keys(templates).length}`);

    if (Object.keys(templates).length > 0) {

      for (const template in templates) {

        const templateKey = template;
        const templateValue = templates[template];
        console.log(templateKey);
        const templateCoords = templateValue.coords.split(',').map(Number);

        if (templates.hasOwnProperty(template)) {

          const templateKeyArray = templateKey.split(' '); // E.g., "0 $Z" -> ["0", "$Z"]
          const sortID = Number(templateKeyArray?.[0]); // Sort ID of the template
          const authorID = templateKeyArray?.[1] || '0'; // User ID of the person who exported the template
          const displayName = templateValue.name || `Template ${sortID || ''}`; // Display name of the template
          //const coords = templateValue?.coords?.split(',').map(Number); // "1,2,3,4" -> [1, 2, 3, 4]
          const tilesbase64 = templateValue.tiles;
          const templateTiles = {}; // Stores the template bitmap tiles for each tile.
          let requiredPixelCount = 0; // Global required pixel count for this imported template
          const paletteMap = new Map(); // Accumulates color counts across tiles (center pixels only)

          for (const tile in tilesbase64) {
            console.log(tile);
            if (tilesbase64.hasOwnProperty(tile)) {
              const encodedTemplateBase64 = tilesbase64[tile];
              const templateUint8Array = base64ToUint8(encodedTemplateBase64); // Base 64 -> Uint8Array

              const templateBlob = new Blob([templateUint8Array], { type: "image/png" }); // Uint8Array -> Blob
              const templateBitmap = await createImageBitmap(templateBlob) // Blob -> Bitmap
              templateTiles[tile] = templateBitmap;

              // Count required pixels in this bitmap (center pixels with alpha >= 64 and not #deface)
              try {
                const w = templateBitmap.width;
                const h = templateBitmap.height;
                let c = new OffscreenCanvas(w, h);
                const cx = c.getContext('2d', { willReadFrequently: true });
                cx.imageSmoothingEnabled = false;
                cx.clearRect(0, 0, w, h);
                cx.drawImage(templateBitmap, 0, 0);
                const data = cx.getImageData(0, 0, w, h).data;
                cleanUpCanvas(c);
                c = null;
                // Optimize for-loop
                // Only count center pixels of each mult-x block
                for (let y = this.drawMultCenter; y < h; y += this.drawMult) {
                  for (let x = this.drawMultCenter; x < w; x += this.drawMult) {
                    const idx = (y * w + x) * 4;
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];
                    const a = data[idx + 3];
                    if (a < 64) { continue; }
                    if (r === 222 && g === 250 && b === 206) { continue; }
                    requiredPixelCount++;
                    const key = Object.hasOwn(templates[templateKey].palette, `${r},${g},${b}`) ? `${r},${g},${b}` : "other";
                    paletteMap.set(key, (paletteMap.get(key) || 0) + 1);
                  }
                }
              } catch (e) {
                console.warn('Failed to count required pixels for imported tile', e);
              }
            }
          }

          // Creates a new Template class instance
          const template = new Template({
            displayName: displayName,
            sortID: sortID || this.templatesArray?.length || 0,
            authorID: authorID || '',
            coords: templateCoords,
          });
          template.shreadSize = this.drawMult; // Copy to template's shread Size
          template.chunked = templateTiles;
          template.requiredPixelCount = requiredPixelCount;
          template.enabled = templateValue.enabled ?? true;
          // Construct colorPalette from paletteMap
          const paletteObj = {};
          for (const [key, count] of paletteMap.entries()) { paletteObj[key] = { count, enabled: true }; }
          template.colorPalette = paletteObj;
          // Populate tilePrefixes for fast-scoping
          try { Object.keys(templateTiles).forEach(k => { template.tilePrefixes?.add(k.split(',').slice(0,2).join(',')); }); } catch (_) {}
          // Merge persisted palette (enabled/disabled) if present
          try {
            const persisted = templates?.[templateKey]?.palette;
            if (persisted) {
              for (const [rgb, meta] of Object.entries(persisted)) {
                if (!template.colorPalette[rgb]) {
                  template.colorPalette[rgb] = { count: meta?.count || 0, enabled: !!meta?.enabled };
                } else {
                  template.colorPalette[rgb].enabled = !!meta?.enabled;
                }
              }
            }
          } catch (_) {}
          // Store storageKey for later writes
          template.storageKey = templateKey;
          this.templatesArray.push(template);
          console.log(this.templatesArray);
          console.log(`^^^ This ^^^`);
        }
      }
      // After importing templates from storage, reveal color UI and request palette list build
      try {
        const colorUI = document.querySelector('#bm-contain-colorfilter');
        if (colorUI) { colorUI.style.display = ''; }
        window.postMessage({ source: 'blue-marble', bmEvent: 'bm-rebuild-color-list' }, '*');
      } catch (_) { /* no-op */ }
      try {
        const templateUI = document.querySelector('#bm-contain-templatefilter');
        if (templateUI) { templateUI.style.display = ''; }
        window.postMessage({ source: 'blue-marble', bmEvent: 'bm-rebuild-template-list' }, '*');
      } catch (_) { /* no-op */ }
    }
    
  }

  /** Parses the OSU! Place JSON object
   */
  #parseOSU() {

  }

  /** Sets the `templatesShouldBeDrawn` boolean to a value.
   * @param {boolean} value - The value to set the boolean to
   * @since 0.73.7
   */
  setTemplatesShouldBeDrawn(value) {
    this.templatesShouldBeDrawn = value;
  }

  /** Gets the palette toggled status from the first appearance of the color as a temporary measure
   * @since 0.85.11
   */
  getPaletteToggledStatus() {
    const status = {};
    for (const template of this.templatesArray) {
      for (const [rgb, meta] of Object.entries(template.colorPalette)) {
        if (status[rgb]) { continue; }; // take the first appearance
        status[rgb] = meta.enabled;
      }
    }
    return status;
  }

  /** Stores the JSON object of the user settings into TamperMonkey (GreaseMonkey) storage.
   * @since 0.85.17
   */
  async storeUserSettings() {
    await GM.setValue('bmUserSettings', JSON.stringify(this.userSettings));
  }

  /** Sets the `userSettings` object to a value.
   * @param {object} value - The value to set the object to
   * @since 0.85.17
   */
  setUserSettings(value) {
    this.userSettings = value;
  }

  /** A utility to check if hidden colors are set to be hidden.
   * @since 0.85.17
   */
  areLockedColorsHidden() {
    return this.userSettings?.hideLockedColors ?? false;
  }

  /** Sets the `hideLockedColors` boolean in the `userSettings` to a value.
   * @param {boolean} value - The value to set the boolean to
   * @since 0.85.17
   */
  async setHideLockedColors(value) {
    this.userSettings.hideLockedColors = value;
    await this.storeUserSettings();
  }

  /** A utility to get the current sort criteria.
   * @since 0.85.23
   */
  getSortBy() {
    const temp = this.userSettings?.sortBy ?? 'total-desc';
    if (this.isValidSortBy(temp)) return temp;
    return 'total-desc';
  }


  /** A utility to check if the sort criteria is valid.
   * @param {string} value - The sort criteria
   * @since 0.85.23
   */
  isValidSortBy(value) {
    const parts = value.toLowerCase().split("-");
    if (parts.length !== 2) return false;
    if (sortByOptions[parts[0]] === undefined) return false;
    if (!['desc', 'asc'].includes(parts[1])) return false;
    return true;
  }

  /** Sets the sort criteria to a value.
   * @param {string} value - The sort criteria
   * @since 0.85.23
   */
  async setSortBy(value) {
    if (!this.isValidSortBy(value)) return false;
    this.userSettings.sortBy = value.toLowerCase();
    await this.storeUserSettings();
    return true;
  }

  /** A utility to check if hidden colors are set to be hidden.
   * @since 0.85.26
   */
  isProgressBarEnabled() {
    return this.userSettings?.progressBarEnabled ?? true;
  }

  /** Sets the sort criteria to a value.
   * @param {boolean} value - The sort criteria
   * @since 0.85.23
   */
  async setProgressBarEnabled(value) {
    this.userSettings.progressBarEnabled = value;
    await this.storeUserSettings();
  }

  /** Sets the `extraColorsBitmap` to an updated mask, refresh the color filter if changed.
   * @param {number} value - The value to set the mask to
   * @since 0.85.17
   */
  updateExtraColorsBitmap(value) {
    if (this.extraColorsBitmap === value) return;
    this.extraColorsBitmap = value;
    window.buildColorFilterList();
  }

  /** A utility to check if a color is unlocked.
   * @param {number} color - The id of the color
   * @since 0.85.17
   */
  isColorUnlocked(color) {
    if (color < 32) return true;
    const mask = 1 << (color - 32);
    return (this.extraColorsBitmap & mask) !== 0;
  }

  /** A utility clear all the tiles related to a template
   * @param {Template} template
   * @since 0.85.19
   */
  clearTileProgress(template) {
    template.tilePrefixes.forEach(prefix => {
      this.tileProgress.delete(prefix);
    })
  }
}
