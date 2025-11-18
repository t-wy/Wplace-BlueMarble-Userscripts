import Template from "./Template";
import { base64ToUint8, numberToEncoded, cleanUpCanvas, rgbToMeta, sortByOptions, testCanvasSize, getCurrentColor, sleep } from "./utils";
import { themeList, addTemplateCanvas, removeLayer, doAfterMapFound } from './utilsMaptiler.js';

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

    this.drawMult = testCanvasSize(5000, 5000) ? 5 : 4; // The enlarged size for each pixel. E.g. when "3", a 1x1 pixel becomes a 1x1 pixel inside a 3x3 area. MUST BE ODD

    this.drawMultCenter = (this.drawMult - 1) >> 1; // Even: better be upper left than down right
    
    // Template
    this.canvasTemplate = null; // Our canvas
    this.canvasTemplateZoomed = null; // The template when zoomed out
    this.canvasTemplateID = 'bm-canvas'; // Our canvas ID
    this.canvasMainID = 'div#map canvas.maplibregl-canvas'; // The selector for the main canvas
    this.template = null; // The template image.
    // this.templateState = ''; // The state of the template ('blob', 'proccessing', 'template', etc.)
    /** @type {Template[]} */
    this.templatesArray = []; // All Template instnaces currently loaded (Template)
    this.templatesJSON = null; // All templates currently loaded (JSON)
    // this.templatesShouldBeDrawn = true; // Should ALL templates be drawn to the canvas?
    this.tileProgress = new Map(); // Tracks per-tile progress stats {painted, required, wrong}
    // this.tileOverlay = new Map(); // Cache tile overlay to save time
    this.extraColorsBitmap = 0; // List of unlocked colors, set by apiManager
    this.userSettings = {}; // User settings
    this.hideLockedColors = false; 
    this.largestSeenSortID = 0; // Even a safer approach: recording the largest storage Keys that have been used in this session. Don't remove anything here.
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
    const authorID = numberToEncoded(this.userID || 0, this.encodingBase);
    const template = new Template({
      displayName: name,
      sortID: this.largestSeenSortID + 1, // Uncomment this to enable multiple templates (1/2)
      authorID: authorID,
      file: blob,
      coords: coords,
      tileSize: this.tileSize,
    });
    this.largestSeenSortID++;
    template.shreadSize = this.drawMult; // Copy to template's shread Size
    //template.chunked = await template.createTemplateTiles(this.tileSize); // Chunks the tiles
    const { templateTiles, templateTilesBuffers } = await template.createTemplateTiles(this.getAnchor()); // Chunks the tiles
    // Modify palette enabled status using the honored one
    const toggleStatus = this.getPaletteToggledStatus();
    for (const key of Object.keys(template.colorPalette)) {
      if (toggleStatus[key] !== undefined) {
        template.colorPalette[key].enabled = toggleStatus[key];
      }
    }
    if (this.isMemorySavingModeOn()) {
      template.chunked = {};
      Object.entries(templateTiles).forEach(([key, value]) => {
        template.chunked[key] = null;
        value.close();
      });
    } else {
      template.chunked = templateTiles; // Stores the chunked tile bitmaps
    }
    template.chunkedBuffer = Object.fromEntries(Object.entries(
      templateTilesBuffers
    ).map(([key, value]) => [key, base64ToUint8(value)]));

    // Appends a child into the templates object
    // The child's name is the number of templates already in the list (sort order) plus the encoded player ID
    const storageKey = `${template.sortID} ${template.authorID}`;
    template.storageKey = storageKey;
    this.templatesJSON.templates[storageKey] = {
      "name": template.displayName, // Display name of template
      "coords": coords.join(', '), // The coords of the template
      "enabled": true,
      "tiles": templateTilesBuffers, // Stores the chunked tile buffers
      "palette": template.colorPalette, // Persist palette and enabled flags
      "shreadSize": template.shreadSize // Record shread size of the created template
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
      // const colorUI = document.querySelector('#bm-contain-colorfilter');
      // if (colorUI) { colorUI.style.display = ''; }
      // Deferred palette list rendering; actual DOM is built in main via helper
      window.postMessage({ source: 'blue-marble', bmEvent: 'bm-rebuild-color-list' }, '*');
    } catch (_) { /* no-op */ }
    try {
      // const templateUI = document.querySelector('#bm-contain-templatefilter');
      // if (templateUI) { templateUI.style.display = ''; }
      // Deferred palette list rendering; actual DOM is built in main via helper
      window.postMessage({ source: 'blue-marble', bmEvent: 'bm-rebuild-template-list' }, '*');
    } catch (_) { /* no-op */ }
  }

  requestEventRebuild() {
    if (!this.isEventEnabled()) return;
    try {
      const templateUI = document.querySelector('#bm-contain-eventlist');
      if (templateUI) { templateUI.style.display = ''; }
      // Deferred palette list rendering; actual DOM is built in main via helper
      window.postMessage({ source: 'blue-marble', bmEvent: 'bm-rebuild-event-list' }, '*');
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
  async countTemplateStatus(tileBlob, tileCoords) {
    const timeStart = performance.now();
    
    // Format tile coordinates with proper padding for consistent lookup
    const tileCoordsPadded = tileCoords[0].toString().padStart(4, '0') + ',' + tileCoords[1].toString().padStart(4, '0');

    console.log(`Start checking touching templates...`, performance.now() - timeStart + ' ms');

    // Early exit if none of the active templates touch this tile
    const involvedTemplates = this.getInvolvedTemplates(tileCoords);
    if (involvedTemplates.length === 0) return;

    const currentMemorySavingMode = this.isMemorySavingModeOn(); // To make sure that we do not free the object if it is stored due to race conditions.

    // Retrieves the relavent template tile blobs
    const templatesTilesToHandle = involvedTemplates.map(template => {
        const matchingTiles = Object.keys(template.chunked).filter(
          tile => tile.startsWith(tileCoordsPadded)
        );
        // Return null when nothing is found (should not happen here anyways)
        if (matchingTiles.length === 0) return null;
        // The length should be 1 anyways
        const tileKey = matchingTiles[0];
        const coords = tileKey.split(','); // [x, y, x, y] Tile/pixel coordinates
        return {
          template: template,
          tileKey: tileKey,
          tileCoords: [+coords[0], +coords[1]],
          pixelCoords: [+coords[2], +coords[3]]
        }
    }).filter(Boolean);

    console.log(templatesTilesToHandle, performance.now() - timeStart + ' ms');

    const templateCount = templatesTilesToHandle?.length || 0; // Number of templates to draw on this tile
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

    const isErrorMapShown = this.isErrorMapShown();
  
    const drawMultTemplate = this.drawMult;
    const drawMultCenterTemplate = this.drawMultCenter;
    const tileSize = this.tileSize; // Calculate draw multiplier for scaling

    let canvas = new OffscreenCanvas(tileSize, tileSize);
    const context = canvas.getContext('2d');

    context.imageSmoothingEnabled = false; // Nearest neighbor

    // Tells the canvas to ignore anything outside of this area
    context.beginPath();
    context.rect(0, 0, tileSize, tileSize);
    context.clip();

    context.clearRect(0, 0, tileSize, tileSize); // Draws transparent background
    context.drawImage(tileBitmap, 0, 0, tileSize, tileSize); // Enlarge the tile
    tileBitmap.close(); // manually dispose

    // Grab a snapshot of the tile pixels BEFORE we draw any template overlays
    const tilePixels = context.getImageData(0, 0, tileSize, tileSize).data;

    // For each template in this tile, draw them.
    for (const templateTile of templatesTilesToHandle) {
      const template = templateTile.template;
      const templateKey = template.storageKey;
      const templateTileBitmap = await template.getChunked(templateTile.tileKey, currentMemorySavingMode);
      console.log(`Template:`);
      console.log(templateTile);
      console.log(performance.now() - timeStart + ' ms');
      
      const templateWidth = templateTileBitmap.width;
      const templateHeight = templateTileBitmap.height;
      let templateCanvas = new OffscreenCanvas(templateWidth, templateHeight);
      const templateContext = templateCanvas.getContext('2d', { willReadFrequently: true });
      templateContext.imageSmoothingEnabled = false;
      templateContext.clearRect(0, 0, templateWidth, templateHeight);
      templateContext.drawImage(templateTileBitmap, 0, 0);
      const templateData = templateContext.getImageData(0, 0, templateWidth, templateHeight).data;
      const errorWidth = templateWidth / drawMultTemplate;
      const errorHeight = templateHeight / drawMultTemplate;
      let errorCanvas = null;
      let errorContext = null;
      let errorImage = null;
      let errorData = null;

      const templateTileEnabled = templateTile.template.enabled ?? true;
      if (isErrorMapShown && templateTileEnabled) {
        errorCanvas = new OffscreenCanvas(errorWidth, errorHeight);
        errorContext = errorCanvas.getContext('2d', { willReadFrequently: true });
        errorContext.clearRect(0, 0, errorWidth, errorHeight);
        errorImage = errorContext.getImageData(0, 0, errorWidth, errorHeight)
        errorData = errorImage.data
      }

      const offsetXResult = templateTile.pixelCoords[0];
      const offsetYResult = templateTile.pixelCoords[1];

      // Compute stats by sampling template center pixels against tile pixels,
      // honoring color enable/disable from the active template's palette
      try {

        // Loops over all pixels in the template
        // Assigns each pixel a color (if center pixel)
        // Optimized the inefficient loop
        // t: template, r: result
        for (
          let yt = drawMultCenterTemplate, gyr = offsetYResult, ye = 0;
          yt < templateHeight;
          yt += drawMultTemplate, gyr++, ye++
        ) {
          // await sleep(0);
          for (
            let xt = drawMultCenterTemplate, gxr = offsetXResult, xe = 0;
            xt < templateWidth;
            xt += drawMultTemplate, gxr++, xe++
          ) {
            // Purpose: Count which pixels are painted correctly???

            // Only evaluate the center pixel of each shread block
            // Skip if not the center pixel of the shread block

            // IF the pixel is out of bounds of the template, OR if the pixel is outside of the tile, then skip the pixel
            if (gxr < 0 || gyr < 0 || gxr >= tileSize || gyr >= tileSize) { continue; }

            const templatePixelCenter = (yt * templateWidth + xt) * 4; // Shread block center pixel
            const templatePixelCenterRed = templateData[templatePixelCenter]; // Shread block's center pixel's RED value
            const templatePixelCenterGreen = templateData[templatePixelCenter + 1]; // Shread block's center pixel's GREEN value
            const templatePixelCenterBlue = templateData[templatePixelCenter + 2]; // Shread block's center pixel's BLUE value
            const templatePixelCenterAlpha = templateData[templatePixelCenter + 3]; // Shread block's center pixel's ALPHA value

            // Strict center-pixel matching. Treat transparent tile pixels as unpainted (not wrong)
            const realPixelCenter = (gyr * tileSize + gxr) * 4;
            const realPixelRed = tilePixels[realPixelCenter];
            const realPixelCenterGreen = tilePixels[realPixelCenter + 1];
            const realPixelCenterBlue = tilePixels[realPixelCenter + 2];
            const realPixelCenterAlpha = tilePixels[realPixelCenter + 3];
            let isPainted = false;

            const errorIndex = (ye * errorWidth + xe) * 4;

            if (templatePixelCenterAlpha < 64) {
              try {
                const key = rgbToMeta.has(`${realPixelRed},${realPixelCenterGreen},${realPixelCenterBlue}`) ? `${realPixelRed},${realPixelCenterGreen},${realPixelCenterBlue}` : 'other';
                
                // IF the alpha of the center pixel that is placed on the canvas is greater than or equal to 64, AND the pixel is a Wplace palette color, then it is incorrect.
                if (realPixelCenterAlpha >= 64 && key !== "other") {
                  wrongCount++;
                  // if (isErrorMapShown) {
                  //   fillErrorMap(gxr, gyr, [255, 0, 0, 255]); // red
                  // }
                }
              } catch (ignored) {}

              continue; // Continue to the next pixel
            } else {
              requiredCount++;
            }

            // IF the alpha of the pixel is less than 64...
            if (realPixelCenterAlpha < 64) {
              // Unpainted -> neither painted nor wrong
              if (templatePixelCenterAlpha !== 0) {
                if (isErrorMapShown && templateTileEnabled) {
                  errorData[errorIndex] = 255; // yellow
                  errorData[errorIndex + 1] = 255;
                  errorData[errorIndex + 2] = 0;
                  errorData[errorIndex + 3] = 16;
                }
              }

              // ELSE IF the pixel matches the template center pixel color
            } else if (realPixelRed === templatePixelCenterRed && realPixelCenterGreen === templatePixelCenterGreen && realPixelCenterBlue === templatePixelCenterBlue) {
              paintedCount++; // ...the pixel is painted correctly
              isPainted = true;
              let colorKey = `${templatePixelCenterRed},${templatePixelCenterGreen},${templatePixelCenterBlue}`;
              if (!rgbToMeta.has(colorKey)) colorKey = 'other';
              if (paletteStats[colorKey] === undefined) {
                paletteStats[colorKey] = {
                  painted: 1,
                  paintedAndEnabled: +templateTileEnabled,
                  missing: 0,
                  // examples: [ ],
                  examplesEnabled: [ ],
                }
              } else {
                paletteStats[colorKey].painted++;
                if (templateTileEnabled) {
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
              if (isErrorMapShown && templateTileEnabled) {
                errorData[errorIndex] = 0; // green
                errorData[errorIndex + 1] = 128;
                errorData[errorIndex + 2] = 0;
                errorData[errorIndex + 3] = 160;
              }
            } else {
              wrongCount++; // ...the pixel is NOT painted correctly
              if (isErrorMapShown && templateTileEnabled) {
                errorData[errorIndex] = 255; // red
                errorData[errorIndex + 1] = 0;
                errorData[errorIndex + 2] = 0;
                errorData[errorIndex + 3] = 224;
              }
            }
            if (!isPainted) {
              // add to palette stat
              let key = `${templatePixelCenterRed},${templatePixelCenterGreen},${templatePixelCenterBlue}`;
              if (!rgbToMeta.has(key)) key = 'other';
              const example = [ // use this tile as example
                tileCoords,
                [ gxr, gyr ]
              ];
              if (paletteStats[key] === undefined) {
                paletteStats[key] = {
                  painted: 0,
                  paintedAndEnabled: 0,
                  missing: 1,
                  // examples: [ example ],
                  examplesEnabled: [ ],
                }
                if (templateTileEnabled) {
                  paletteStats[key].examplesEnabled.push(example);
                }
              } else {
                const exampleMax = (this.userSettings?.smartPlace ?? false) ? 1 << 20 : 10000;
                // missing count >= 1
                paletteStats[key].missing++;
                // if (paletteStats[key].examples.length < exampleMax) {
                //   paletteStats[key].examples.push(example);
                // } else if (Math.random() * paletteStats[key].examples.length < exampleMax) {
                //   // pick a random sample, so the new entry share the same weight
                //   const replaceIndex = Math.floor(Math.random() * exampleMax);
                //   paletteStats[key].examples[replaceIndex] = example;
                // }
                if (templateTileEnabled) {
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
        
        // create error layer
        if (isErrorMapShown && templateTileEnabled) {
          errorContext.putImageData(errorImage, 0, 0);
          const errorBlob = await errorCanvas.convertToBlob({ type: 'image/png' });
          addTemplateCanvas(template.sortID, templateTile.tileKey, [errorWidth, errorHeight], errorBlob, "error");
          cleanUpCanvas(errorCanvas);
          errorCanvas = null;
        }
      } catch (exception) {
        console.warn('Failed to compute per-tile painted/wrong stats:', exception);
      }

      cleanUpCanvas(templateCanvas);
      templateCanvas = null;

      if (currentMemorySavingMode) {
        templateTileBitmap.close();
      }
    }

    console.log('Saving per-tile stats...', performance.now() - timeStart + ' ms');

    // Save per-tile stats and compute global aggregates across all processed tiles
    // if (templateCount > 0) {
    if (templateCount === 0) {
      // if this is ever executed, idk why this still does not get deleted before
      if (this.tileProgress.has(tileCoordsPadded)) {
        this.tileProgress.delete(tileCoordsPadded);
      }
      // if (this.tileOverlay.has(tileCoordsPadded)) {
      //   this.tileOverlay.delete(tileCoordsPadded);
      // }
    } else {
      this.tileProgress.set(tileCoordsPadded, {
        painted: paintedCount,
        required: requiredCount,
        wrong: wrongCount,
        palette: paletteStats,
        template: templateStats,
      });
      // this.tileOverlay.set(tileCoordsPadded, ...);
    }

    // Aggregate painted/wrong across tiles we've processed
    let aggPainted = 0;
    // let aggRequiredTiles = 0;
    // let aggWrong = 0;
    const templateEnabledState = Object.fromEntries((this?.templatesArray ?? []).map(t => [t.storageKey, t.enabled]));
    for (const stats of this.tileProgress.values()) {
      Object.entries(stats.template).forEach(([storageKey, content]) => {
        if (!templateEnabledState[storageKey]) return;
        aggPainted += content.painted || 0;
      })
    }

    // Determine total required across all templates
    // Prefer precomputed per-template required counts; fall back to sum of processed tiles
    // const totalRequiredTemplates = this.templatesArray.reduce((sum, t) =>
    //   sum + (t.requiredPixelCount || t.pixelCount || 0), 0);
    // const totalRequired = totalRequiredTemplates > 0 ? totalRequiredTemplates : aggRequiredTiles;
    // Only include enabled templates
    const totalRequired = this.templatesArray.reduce((sum, t) =>
      sum + (t.enabled ? (t.requiredPixelCount || t.pixelCount || 0) : 0), 0);

    // Turns numbers into formatted number strings. E.g., 1234 -> 1,234 OR 1.234 based on location of user
    const paintedStr = new Intl.NumberFormat().format(aggPainted);
    const requiredStr = new Intl.NumberFormat().format(totalRequired);
    const wrongStr = new Intl.NumberFormat().format(totalRequired - aggPainted); // Used to be aggWrong, but that is bugged

    this.overlay.handleDisplayStatus(
      `Displaying ${enabledTemplateCount} template${enabledTemplateCount == 1 ? '' : 's'}.\nPainted ${paintedStr} / ${requiredStr} • Wrong ${wrongStr}`
    );

    console.log('Cleaning up...', performance.now() - timeStart + ' ms');

    // const resultBlob = typeof ImageBitmap !== 'undefined' ? createImageBitmap(canvas) : await canvas.convertToBlob({ type: 'image/png' });
    cleanUpCanvas(canvas);

    window.buildColorFilterList();
    window.buildTemplateFilterList();

    console.log('Finish...', performance.now() - timeStart + ' ms');

    return tileBlob;
  }

  /** Add the template overlay layer to the map
   * @param {number?} sortID
   * @since 0.86.1
   */
  async createOverlayOnMap(sortID = null) {
    const timeStart = performance.now();

    console.log(`Start creating overlay for template ${sortID}...`, performance.now() - timeStart + ' ms');

    const currentMemorySavingMode = this.isMemorySavingModeOn(); // To make sure that we do not free the object if it is stored due to race conditions.
    const templates = (this.templatesArray ?? []).filter(t => t.enabled && (sortID === null || t.sortID == sortID));

    for (const template of templates) {
      console.log(`Template:`);
      console.log(template);
    
      if (!template.enabled) return; // no need to draw if template is disabled
      // honor the same toggle Status for all templates
      const displayedColors = this.getDisplayedColorsSorted();
      // const tileCacheKey = this.getTileCacheKeyFromCalculated(displayedColors, involvedTemplates);
      const displayedColorSet = new Set(displayedColors);
      const hasColorDisabled = displayedColors.length !== Object.keys(this.getPaletteToggledStatus()).length;
      const allColorsDisabled = displayedColors.length === 0; // Check if every color is disabled
      if (allColorsDisabled) {
        // make sure we removed all layers related to this template
        removeLayer("overlay", template.sortID);
        continue;
      };
      const isLegacyDisplay = this.isLegacyDisplay();
      for (const tileKey of Object.keys(template.chunked)) {
        console.log(`Handling tile chunk ${tileKey}...`, performance.now() - timeStart + ' ms');
        const coords = tileKey.split(','); // [x, y, x, y] Tile/pixel coordinates

        const drawMultTemplate = template.shreadSize;
        const drawMultCenterTemplate = (template.shreadSize - 1) >> 1;
        const drawMultResult = isLegacyDisplay ? 3 : this.drawMult;
      
        const templateTileBitmap = await template.getChunked(tileKey, currentMemorySavingMode);
        const originalWidth = templateTileBitmap.width / template.shreadSize;
        const originalHeight = templateTileBitmap.height / template.shreadSize;
        const resultWidth = originalWidth * drawMultResult; // Calculate draw multiplier for scaling
        const resultHeight = originalHeight * drawMultResult;

        let resultCanvas = new OffscreenCanvas(resultWidth, resultHeight);
        const resultContext = resultCanvas.getContext('2d');

        resultContext.imageSmoothingEnabled = false; // Nearest neighbor

        // Tells the canvas to ignore anything outside of this area
        resultContext.beginPath();
        resultContext.rect(0, 0, resultWidth, resultHeight);
        resultContext.clip();

        resultContext.clearRect(0, 0, resultWidth, resultHeight); // Draws transparent background

        try {
          // If none of the template colors are disabled, then draw the image normally
          if (!hasColorDisabled && drawMultTemplate === drawMultResult) {
            // the template has the same zoom as the tile
            // just copy the bitmap
            resultContext.drawImage(templateTileBitmap, 0, 0);
            // done
          } else if (!allColorsDisabled) {
            // ELSE we need to apply the color filter
            console.log('Applying color filter...', performance.now() - timeStart + ' ms');

            const templateWidth = templateTileBitmap.width;
            const templateHeight = templateTileBitmap.height;
            let templateCanvas = new OffscreenCanvas(templateWidth, templateHeight);
            const templateContext = templateCanvas.getContext('2d', { willReadFrequently: true });
            templateContext.imageSmoothingEnabled = false;
            templateContext.clearRect(0, 0, templateWidth, templateHeight);
            templateContext.drawImage(templateTileBitmap, 0, 0);
            const templateData = templateContext.getImageData(0, 0, templateWidth, templateHeight).data;

            const image = resultContext.getImageData(0, 0, resultWidth, resultHeight);
            const imageData = image.data;
            const maskPoints = isLegacyDisplay ? [[1, 1]] : template.customMaskPoints(drawMultResult);
            for (const [offsetX, offsetY] of maskPoints) {
              for (
                let yt = drawMultCenterTemplate, yr = offsetY;
                yt < templateHeight;
                yt += drawMultTemplate, yr += drawMultResult
              ) {
                // await sleep(0);
                for (
                  let xt = drawMultCenterTemplate, xr = offsetX;
                  xt < templateWidth;
                  xt += drawMultTemplate, xr += drawMultResult
                ) {

                  const templatePixelCenter = (yt * templateWidth + xt) * 4; // Shread block center pixel
                  const templatePixelCenterRed = templateData[templatePixelCenter]; // Shread block's center pixel's RED value
                  const templatePixelCenterGreen = templateData[templatePixelCenter + 1]; // Shread block's center pixel's GREEN value
                  const templatePixelCenterBlue = templateData[templatePixelCenter + 2]; // Shread block's center pixel's BLUE value
                  const templatePixelCenterAlpha = templateData[templatePixelCenter + 3]; // Shread block's center pixel's ALPHA value

                  if (templatePixelCenterAlpha < 1) { continue; } // leave transparent pixels as is

                  let key = `${templatePixelCenterRed},${templatePixelCenterGreen},${templatePixelCenterBlue}`;
                  if (!rgbToMeta.has(`${templatePixelCenterRed},${templatePixelCenterGreen},${templatePixelCenterBlue}`)) key = 'other';
                  if (displayedColorSet.has(key)) {
                    const realPixelCenter = (yr * resultWidth + xr) * 4;

                    // // show enabled color center pixel
                    imageData[realPixelCenter] = templatePixelCenterRed;
                    imageData[realPixelCenter + 1] = templatePixelCenterGreen;
                    imageData[realPixelCenter + 2] = templatePixelCenterBlue;
                    imageData[realPixelCenter + 3] = templatePixelCenterAlpha;
                  };
                }
              }
            }
            resultContext.putImageData(image, 0, 0);
          }
        } catch (exception) {

          // If filtering fails, we can log the error or handle it accordingly
          console.warn('Failed to apply color filter:', exception);

          // Fallback to drawing raw bitmap if filtering fails
          resultContext.drawImage(templateTileBitmap, 0, 0);
        }

        console.log('Exporting canvas...', performance.now() - timeStart + ' ms');
        const resultBlob = await resultCanvas.convertToBlob({ type: 'image/png' });
        doAfterMapFound(() => addTemplateCanvas(template.sortID, tileKey, [originalWidth, originalHeight], resultBlob, "overlay"));

        console.log('Cleaning up...', performance.now() - timeStart + ' ms');
        cleanUpCanvas(resultCanvas);
        resultCanvas = null;
        
        if (currentMemorySavingMode) {
          templateTileBitmap.close();
        }
      };
    }

    console.log('Finish...', performance.now() - timeStart + ' ms');
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

    const currentMemorySavingMode = this.isMemorySavingModeOn(); // To make sure that we do not free the object if it is stored due to race conditions.

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
          const templateTilesBuffer = {}; // Store the template bitmap tiles for each tile in Uint8Array.
          let requiredPixelCount = 0; // Global required pixel count for this imported template
          const paletteMap = new Map(); // Accumulates color counts across tiles (center pixels only)

          for (const tile in tilesbase64) {
            console.log(tile);
            if (tilesbase64.hasOwnProperty(tile)) {
              const encodedTemplateBase64 = tilesbase64[tile];
              const templateUint8Array = base64ToUint8(encodedTemplateBase64); // Base 64 -> Uint8Array

              const templateBlob = new Blob([templateUint8Array], { type: "image/png" }); // Uint8Array -> Blob
              const templateBitmap = await createImageBitmap(templateBlob) // Blob -> Bitmap
              if (currentMemorySavingMode) {
                templateTiles[tile] = null;
              } else {
                templateTiles[tile] = templateBitmap;
              }
              templateTilesBuffer[tile] = templateUint8Array;

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
              if (currentMemorySavingMode) {
                templateBitmap.close();
              }
            }
          }

          // Creates a new Template class instance
          const template = new Template({
            displayName: displayName,
            sortID: sortID || (this.largestSeenSortID + 1) || 0,
            authorID: authorID || '',
            coords: templateCoords,
          });
          if (template.sortID > this.largestSeenSortID) { this.largestSeenSortID = template.sortID; }
          template.shreadSize = templateValue.shreadSize ?? this.drawMult; // Copy to template's shread Size
          template.chunked = templateTiles;
          template.chunkedBuffer = templateTilesBuffer;
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
        // const colorUI = document.querySelector('#bm-contain-colorfilter');
        // if (colorUI) { colorUI.style.display = ''; }
        window.postMessage({ source: 'blue-marble', bmEvent: 'bm-rebuild-color-list' }, '*');
      } catch (_) { /* no-op */ }
      try {
        // const templateUI = document.querySelector('#bm-contain-templatefilter');
        // if (templateUI) { templateUI.style.display = ''; }
        window.postMessage({ source: 'blue-marble', bmEvent: 'bm-rebuild-template-list' }, '*');
      } catch (_) { /* no-op */ }
      // create the overlay
      this.createOverlayOnMap();
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
  // setTemplatesShouldBeDrawn(value) {
  //   this.templatesShouldBeDrawn = value;
  // }

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

  /** Gets the list of displayed colors, sorted by rgb
   * does not hide completed colors as that may become incomplete over time
   * @returns {string[]}
   * @since 0.85.30
   */
  getDisplayedColorsSorted() {
    const currentOnly = this.isOnlyCurrentColorShown();
    const hideLocked = this.areLockedColorsHidden();
    const toggledStatus = this.getPaletteToggledStatus();
    const colors = [];
    if (currentOnly) {
      const currentColor = getCurrentColor();
      Object.entries(toggledStatus).forEach(([rgb, enabled]) => {
        if (rgbToMeta.get(rgb).id !== currentColor) return;
        if (hideLocked && !this.isColorUnlocked(rgbToMeta.get(rgb).id)) return;
        colors.push(rgb);
      });
    } else {
      Object.entries(toggledStatus).forEach(([rgb, enabled]) => {
        if (!enabled) return;
        if (hideLocked && !this.isColorUnlocked(rgbToMeta.get(rgb).id)) return;
        colors.push(rgb);
      });
    }
    return colors.sort();
  }

  /** Gets the list of involved templates, sorted by sortID
   * @param {number[]} tileCoords
   * @returns {Template[]}
   * @since 0.85.30
   */
  getInvolvedTemplates(tileCoords) {
    const tileCoordsPadded = tileCoords[0].toString().padStart(4, '0') + ',' + tileCoords[1].toString().padStart(4, '0');
    return this.templatesArray.filter( template => {
      if (!template?.chunked) return false; // no bitmap
      // Fast path via recorded tile prefixes if available
      if (template.tilePrefixes && template.tilePrefixes.size > 0) {
        return template.tilePrefixes.has(tileCoordsPadded);
      }
      // Fallback: scan chunked keys
      return Object.keys(template.chunked).some(k => k.startsWith(tileCoordsPadded));
    }).sort((a, b) => a.sortID - b.sortID);
  }

  /** Gets the key that indicates if the toggled status is unchanged, so we can skip redrawing the overlay
   * @param {number[]} tileCoords
   * @since 0.85.30
   */
  getTileCacheKey(tileCoords) {
    const displayedColors = this.getDisplayedColorsSorted();
    const involvedTemplates = this.getInvolvedTemplates(tileCoords);
    return this.getTileCacheKeyFromCalculated(displayedColors, involvedTemplates);
  }

  /** Gets the key that indicates if the toggled status is unchanged, so we can skip redrawing the overlay
   * @param {string[]} displayedColors
   * @param {Template[]} involvedTemplates
   * @returns {string}
   * @since 0.85.30
   */
  getTileCacheKeyFromCalculated(displayedColors, involvedTemplates) {
    // we still need to check the enabled status since disabled templates should still have the painted count updated.
    return displayedColors.join(';') + '||' + involvedTemplates.map(t => t.storageKey + "," + t.storageTimeString + "," + (+(t.enabled ?? true))).join(';');
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
   * @returns {boolean}
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
   * @returns {boolean}
   * @since 0.85.23
   */
  async setSortBy(value) {
    if (!this.isValidSortBy(value)) return false;
    this.userSettings.sortBy = value.toLowerCase();
    await this.storeUserSettings();
    return true;
  }

  /** A utility to check if hidden colors are set to be hidden.
   * @returns {boolean}
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

  /** A utility to check if completed colors are set to be hidden.
   * @returns {boolean}
   * @since 0.85.27
   */
  areCompletedColorsHidden() {
    return this.userSettings?.hideCompletedColors ?? false;
  }

  /** Sets the `hideCompletedColors` boolean in the `userSettings` to a value.
   * @param {boolean} value - The value to set the boolean to
   * @since 0.85.27
   */
  async setHideCompletedColors(value) {
    this.userSettings.hideCompletedColors = value;
    await this.storeUserSettings();
  }

  /** A utility to check if memory-saving mode is on.
   * @returns {boolean}
   * @since 0.85.27
   */
  isMemorySavingModeOn() {
    return this.userSettings?.memorySavingMode ?? false;
  }

  /** Sets the `memorySavingMode` boolean in the `userSettings` to a value.
   * @param {boolean} value - The value to set the boolean to
   * @since 0.85.33
   */
  async setMemorySavingMode(value) {
    this.userSettings.memorySavingMode = value;
    await this.storeUserSettings();
    if (value) {
      // unload template tiles in memory
      this.templatesArray.forEach( template => {
        if (!template?.chunked) return; // no bitmap
        const chunked = template.chunked;
        const temp = {};
        Object.entries(chunked).forEach(([key, value]) => {
          temp[key] = null;
          if (value === null) return;
          value.close();
        });
        template.chunked = temp;
      });
    }
  }

  /** A utility to get the current anchor.
   * @since 0.85.34
   * @returns {string}
   */
  getAnchor() {
    const temp = this.userSettings?.anchor ?? 'lt'; // top left
    if (this.isValidAnchor(temp)) return temp.toLowerCase();
    return 'lt';
  }


  /** A utility to check if the anchor is valid.
   * @param {string} value - The anchor
   * @returns {boolean}
   * @since 0.85.34
   */
  isValidAnchor(value) {
    if (value.length !== 2) return false;
    value = value.toLowerCase();
    return "lmr".includes(value[0]) && "tmb".includes(value[1]);
  }

  /** Sets the anchor to a value.
   * @param {string} value - The anchor
   * @since 0.85.34
   */
  async setAnchor(value) {
    if (!this.isValidAnchor(value)) return false;
    this.userSettings.anchor = value.toLowerCase();
    await this.storeUserSettings();
    return true;
  }

  /** A utility to check if events are enabled.
   * @returns {boolean}
   * @since 0.85.35
   */
  isEventEnabled() {
    return this.userSettings?.eventEnabled ?? false;
  }

  /** Sets the event enabled to a value.
   * @param {boolean} value - The value
   * @since 0.85.35
   */
  async setEventEnabled(value) {
    this.userSettings.eventEnabled = value;
    await this.storeUserSettings();
  }

  /** A utility to check if event claimed are shown.
   * @returns {boolean}
   * @since 0.85.35
   */
  isEventClaimedShown() {
    return this.userSettings?.eventClaimedShown ?? true;
  }

  /** Sets the event claimed shown to a value.
   * @param {boolean} value - The value
   * @since 0.85.35
   */
  async setEventClaimedShown(value) {
    this.userSettings.eventClaimedShown = value;
    await this.storeUserSettings();
  }

  /** A utility to check if event unavailable are shown.
   * @returns {boolean}
   * @since 0.85.35
   */
  isEventUnavailableShown() {
    return this.userSettings?.eventUnavailableShown ?? true;
  }

  /** Sets the event unavailable shown to a value.
   * @param {boolean} value - The value
   * @since 0.85.35
   */
  async setEventUnavailableShown(value) {
    this.userSettings.eventUnavailableShown = value;
    await this.storeUserSettings();
  }

  /** A utility to return the current event provider.
   * @returns {string}
   * @since 0.85.35
   */
  getEventProvider() {
    return this.userSettings?.eventProvider ?? "";
  }

  /** Sets the event provider to a value.
   * @param {string} value - The value
   * @since 0.85.35
   */
  async setEventProvider(value) {
    this.userSettings.eventProvider = value;
    await this.storeUserSettings();
  }

  /** A utility to check if only the currently selected color is shown.
   * @returns {boolean}
   * @since 0.85.37
   */
  isOnlyCurrentColorShown() {
    return this.userSettings?.onlyCurrentColorShown ?? false;
  }

  /** Sets the onlyCurrentColorShown to a value.
   * @param {boolean} value - The value
   * @since 0.85.37
   */
  async setOnlyCurrentColorShown(value) {
    this.userSettings.onlyCurrentColorShown = value;
    await this.storeUserSettings();
  }

  /** A utility to check if the theme is overridden.
   * @returns {boolean}
   * @since 0.85.40
   */
  isThemeOverridden() {
    return this.userSettings?.themeOverridden ?? false;
  }

  /** Sets the themeOverridden to a value.
   * @param {boolean} value - The value
   * @since 0.85.40
   */
  async setThemeOverridden(value) {
    this.userSettings.themeOverridden = value;
    await this.storeUserSettings();
  }

  /** A utility to return the current theme.
   * @returns {string}
   * @since 0.85.40
   */
  getCurrentTheme() {
    const temp = (this.userSettings?.currentTheme ?? Object.keys(themeList)[0]).toLowerCase();
    if (themeList[temp]) return temp;
    return Object.keys(themeList)[0];
  }

  /** Sets the current theme to a value.
   * @param {string} value - The value
   * @returns {boolean}
   * @since 0.85.40
   */
  async setCurrentTheme(value) {
    value = value.toLowerCase();
    if (!themeList[value]) return false;
    this.userSettings.currentTheme = value;
    await this.storeUserSettings();
    return true;
  }

  /** A utility to check if the status textbox is hidden.
   * @returns {boolean}
   * @since 0.85.41
   */
  isStatusHidden() {
    return this.userSettings?.hideStatus ?? false;
  }

  /** Sets the hideStatus to a value.
   * @param {boolean} value - The value
   * @since 0.85.41
   */
  async setStatusHidden(value) {
    this.userSettings.hideStatus = value;
    await this.storeUserSettings();
  }

  /** A utility to check if it uses the 3x3 template display
   * @returns {boolean}
   * @since 0.85.46
   */
  isLegacyDisplay() {
    return this.userSettings?.legacyDisplay ?? false;
  }

  /** Sets the legacyDisplay to a value.
   * @param {boolean} value - The value
   * @since 0.85.46
   */
  async setLegacyDisplay(value) {
    this.userSettings.legacyDisplay = value;
    await this.storeUserSettings();
  }

  /** A utility to check if it uses the 3x3 template display
   * @returns {boolean}
   * @since 0.85.46
   */
  isErrorMapShown() {
    return this.userSettings?.showErrorMap ?? false;
  }

  /** Sets the legacyDisplay to a value.
   * @param {boolean} value - The value
   * @since 0.85.46
   */
  async setErrorMapShown(value) {
    this.userSettings.showErrorMap = value;
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
   * @returns {boolean}
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
    // may improve: only delete those tiles that are no longer involved in other templates
    template.tilePrefixes.forEach(prefix => {
      this.tileProgress.delete(prefix);
      // this.tileOverlay.delete(prefix);
    })
  }
}
