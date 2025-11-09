/** @file The main file. Everything in the userscript is executed from here.
 * @since 0.0.0
 */
import "./polyfill.js";
import Overlay from './Overlay.js';
// import Observers from './observers.js';
import ApiManager from './apiManager.js';
import TemplateManager from './templateManager.js';
import { consoleLog, consoleWarn, selectAllCoordinateInputs, teleportToTileCoords, teleportToGeoCoords, rgbToMeta, getOverlayCoords, coordsTileToGeoCoords, coordsGeoToTileCoords, sortByOptions, getCurrentColor } from './utils.js';
import { getCenterGeoCoords, getPixelPerWplacePixel, forceRefreshTiles, themeList, setTheme, isMapTilerLoaded } from './utilsMaptiler.js';
// import { getCenterGeoCoords, addTemplate } from './utilsMaptiler.js';

const name = GM_info.script.name.toString(); // Name of userscript
const version = GM_info.script.version.toString(); // Version of userscript
const consoleStyle = 'color: cornflowerblue;'; // The styling for the console logs
// const CSS_BM_File = "https://raw.githubusercontent.com/t-wy/Wplace-BlueMarble-Userscripts/refs/heads/custom-improve/dist/BlueMarble.user.css";

/** Injects code into the client
 * This code will execute outside of TamperMonkey's sandbox
 * @param {*} callback - The code to execute
 * @since 0.11.15
 */
function inject(callback) {
    const script = document.createElement('script');
    script.setAttribute('bm-name', name); // Passes in the name value
    script.setAttribute('bm-cStyle', consoleStyle); // Passes in the console style value
    script.textContent = `(${callback})();`;
    document.documentElement?.appendChild(script);
    script.remove();
}

/** What code to execute instantly in the client (webpage) to spy on fetch calls.
 * This code will execute outside of TamperMonkey's sandbox.
 * @since 0.11.15
 */
inject(() => {

  const script = document.currentScript; // Gets the current script HTML Script Element
  const name = script?.getAttribute('bm-name') || 'Blue Marble'; // Gets the name value that was passed in. Defaults to "Blue Marble" if nothing was found
  const consoleStyle = script?.getAttribute('bm-cStyle') || ''; // Gets the console style value that was passed in. Defaults to no styling if nothing was found
  const fetchedBlobQueue = new Map(); // Blobs being processed

  // intercept 
  // const originalBroadcastChannel_onmessage = window.BroadcastChannel.prototype.onmessage;
  // function wrapped(...args) {
  //   console.log("BroadcastChannel onmessage", args);
  //   return originalBroadcastChannel_onmessage.apply(this, args);
  // }
  // window.BroadcastChannel.prototype.onmessage = wrapped;

  window.addEventListener('message', (event) => {
    const { source, endpoint, blobID, blobData, blink } = event.data;

    const elapsed = Date.now() - blink;

    // Since this code does not run in the userscript, we can't use consoleLog().
    console.groupCollapsed(`%c${name}%c: ${fetchedBlobQueue.size} Recieved IMAGE message about blob "${blobID}"`, consoleStyle, '');
    console.log(`Blob fetch took %c${String(Math.floor(elapsed/60000)).padStart(2,'0')}:${String(Math.floor(elapsed/1000) % 60).padStart(2,'0')}.${String(elapsed % 1000).padStart(3,'0')}%c MM:SS.mmm`, consoleStyle, '');
    console.log(fetchedBlobQueue);
    console.groupEnd();

    // The modified blob won't have an endpoint, so we ignore any message without one.
    if ((source == 'blue-marble') && !!blobID && !!blobData && !endpoint) {

      const callback = fetchedBlobQueue.get(blobID); // Retrieves the blob based on the UUID

      // If the blobID is a valid function...
      if (typeof callback === 'function') {

        callback(blobData); // ...Retrieve the blob data from the blobID function
      } else {
        // ...else the blobID is unexpected. We don't know what it is, but we know for sure it is not a blob. This means we ignore it.

        consoleWarn(`%c${name}%c: Attempted to retrieve a blob (%s) from queue, but the blobID was not a function! Skipping...`, consoleStyle, '', blobID);
      }

      fetchedBlobQueue.delete(blobID); // Delete the blob from the queue, because we don't need to process it again
    }
  });

  // Spys on "spontaneous" fetch requests made by the client
  const originalFetch = window.fetch; // Saves a copy of the original fetch

  // Overrides fetch
  window.fetch = async function(...args) {

    const response = await originalFetch.apply(this, args); // Sends a fetch
    const cloned = response.clone(); // Makes a copy of the response

    // Retrieves the endpoint name. Unknown endpoint = "ignore"
    const endpointName = ((args[0] instanceof Request) ? args[0]?.url : args[0]) || 'ignore';

    // Check Content-Type to only process JSON
    const contentType = cloned.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const blink = Date.now(); // Current time

      // Since this code does not run in the userscript, we can't use consoleLog().
      console.log(`%c${name}%c: Sending JSON message about endpoint "${endpointName}"`, consoleStyle, '');
      cloned.json()
        .then(jsonData => {
          window.postMessage({
            source: 'blue-marble',
            endpoint: endpointName,
            jsonData: jsonData,
            blink: blink
          }, '*');
        })
        .catch(err => {
          console.error(`%c${name}%c: Failed to parse JSON: `, consoleStyle, '', err);
        });
    } else if (contentType.includes('image/') && (!endpointName.includes('openfreemap') && !endpointName.includes('maps'))) {
      // Fetch custom for all images but opensourcemap

      const blink = Date.now(); // Current time

      const blob = await cloned.blob(); // The original blob

      // Since this code does not run in the userscript, we can't use consoleLog().
      console.log(`%c${name}%c: ${fetchedBlobQueue.size} Sending IMAGE message about endpoint "${endpointName}"`, consoleStyle, '');

      // Returns the manipulated blob
      return new Promise((resolve) => {
        const blobUUID = crypto.randomUUID(); // Generates a random UUID

        // Store the blob while we wait for processing
        fetchedBlobQueue.set(blobUUID, (blobProcessed) => {
          // The response that triggers when the blob is finished processing

          // Creates a new response
          const newResponse = new Response(blobProcessed, {
            headers: cloned.headers,
            status: cloned.status,
            statusText: cloned.statusText
          });
          if (blobProcessed instanceof ImageBitmap) {
            // https://wplace.live/_app/immutable/nodes/4.DJNG-JQm.js
            // It somehow supports the usage of ImageBitmap
            // ae.data instanceof HTMLImageElement || s.b(ae.data) ? D(ae) : ae.data && ...
            // s.b: return typeof ImageBitmap < "u" && n instanceof ImageBitmap
            newResponse.arrayBuffer = () => {
              return blobProcessed;
            };
          }
          resolve(newResponse);

          // Since this code does not run in the userscript, we can't use consoleLog().
          console.log(`%c${name}%c: ${fetchedBlobQueue.size} Processed blob "${blobUUID}"`, consoleStyle, '');
        });

        window.postMessage({
          source: 'blue-marble',
          endpoint: endpointName,
          lastModified: cloned.headers.get("Last-Modified"),
          blobID: blobUUID,
          blobData: blob,
          blink: blink
        });
      }).catch(exception => {
        const elapsed = Date.now();
        console.error(`%c${name}%c: Failed to Promise blob!`, consoleStyle, '');
        console.groupCollapsed(`%c${name}%c: Details of failed blob Promise:`, consoleStyle, '');
        console.log(`Endpoint: ${endpointName}\nThere are ${fetchedBlobQueue.size} blobs processing...\nBlink: ${blink.toLocaleString()}\nTime Since Blink: ${String(Math.floor(elapsed/60000)).padStart(2,'0')}:${String(Math.floor(elapsed/1000) % 60).padStart(2,'0')}.${String(elapsed % 1000).padStart(3,'0')} MM:SS.mmm`);
        console.error(`Exception stack:`, exception);
        console.groupEnd();
      });
    }

    return response; // Returns the original response
  };
});

// Imports the CSS file from dist folder on github
// fetch(CSS_BM_File).then(cssOverlay => cssOverlay.text()).then(GM.addStyle);
GM.addStyle("<placeholder CSS>");

// CONSTRUCTORS
const overlayMain = new Overlay(name, version); // Constructs a new Overlay object for the main overlay
const templateManager = new TemplateManager(name, version, overlayMain); // Constructs a new TemplateManager object
const apiManager = new ApiManager(templateManager); // Constructs a new ApiManager object

overlayMain.setApiManager(apiManager); // Sets the API manager

GM.getValue('bmTemplates', '{}').then(async storageTemplatesValue => {
  const userSettingsValue = await GM.getValue('bmUserSettings', '{}');
  let userSettings;
  try {
    userSettings = JSON.parse(userSettingsValue);
  } catch {
    userSettings = {};
  }
  console.log(userSettings);
  console.log(Object.keys(userSettings).length);
  if (Object.keys(userSettings).length == 0) {
    const uuid = crypto.randomUUID(); // Generates a random UUID
    console.log(uuid);
    templateManager.setUserSettings({
      'uuid': uuid,
      'hideLockedColors': false,
      'progressBarEnabled': true,
      'hideCompletedColors': false,
      'sortBy': 'total-desc',
      'anchor': 'lt', // Top left
      'smartPlace': false,
      'memorySavingMode': false,
      'eventEnabled': false,
      'eventProvider': '',
      'eventClaimedShown': true,
      'eventUnavailableShown': true,
      'onlyCurrentColorShown': false,
      'themeOverridden': false,
      'currentTheme': '',
      'hideStatus': false,
    });
    templateManager.storeUserSettings();
  } else {
    templateManager.setUserSettings(userSettings);
  }

  // load templates after user settings
  let storageTemplates;
  try {
    storageTemplates = JSON.parse(storageTemplatesValue);
  } catch {
    storageTemplates = {};
  }

  console.log(storageTemplates);
  templateManager.importJSON(storageTemplates); // Loads the templates

  await buildOverlayMain(); // Builds the main overlay

  overlayMain.handleDrag('#bm-overlay', '#bm-bar-drag'); // Creates dragging capability on the drag bar for dragging the overlay


  apiManager.spontaneousResponseListener(overlayMain); // Reads spontaneous fetch responces

  observeBlack(); // Observes the black palette color

  consoleLog(`%c${name}%c (${version}) userscript has loaded!`, 'color: cornflowerblue;', '');
});

/** Observe the black color, and add the "Move" button.
 * @since 0.66.3
 */
function observeBlack() {
  const observer = new MutationObserver((mutations, observer) => {

    const black = document.querySelector('#color-1'); // Attempt to retrieve the black color element for anchoring

    if (!black) {return;} // Black color does not exist yet. Kills iteself

    let move = document.querySelector('#bm-button-move'); // Tries to find the move button

    // If the move button does not exist, we make a new one
    if (!move) {
      move = document.createElement('button');
      move.id = 'bm-button-move';
      move.textContent = 'Move ↑';
      move.className = 'btn btn-soft';
      move.onclick = function() {
        const roundedBox = this.parentNode.parentNode.parentNode.parentNode; // Obtains the rounded box
        const shouldMoveUp = (this.textContent == 'Move ↑');
        roundedBox.parentNode.className = roundedBox.parentNode.className.replace(shouldMoveUp ? 'bottom' : 'top', shouldMoveUp ? 'top' : 'bottom'); // Moves the rounded box to the top
        roundedBox.style.borderTopLeftRadius = shouldMoveUp ? '0px' : 'var(--radius-box)';
        roundedBox.style.borderTopRightRadius = shouldMoveUp ? '0px' : 'var(--radius-box)';
        roundedBox.style.borderBottomLeftRadius = shouldMoveUp ? 'var(--radius-box)' : '0px';
        roundedBox.style.borderBottomRightRadius = shouldMoveUp ? 'var(--radius-box)' : '0px';
        this.textContent = shouldMoveUp ? 'Move ↓' : 'Move ↑';
      }

      // Attempts to find the "Paint Pixel" element for anchoring
      const paintPixel = black.parentNode.parentNode.parentNode.parentNode.querySelector('h2');

      paintPixel.parentNode?.appendChild(move); // Adds the move button
    }

    // should not be enabled on its own as it would break the wplace rules
    // just here for a proof-of-work, there's no way to enable it directly via the UI
    if (templateManager.userSettings?.smartPlace ?? false) {
      let paint = document.querySelector('#bm-button-paint'); // Tries to find the paint button

      // If the move button does not exist, we make a new one
      if (!paint) {
        paint = document.createElement('button');
        paint.id = 'bm-button-paint';
        paint.textContent = 'Paint';
        paint.className = 'btn btn-soft';
        paint.onclick = function() {
          const currentCharges = Math.floor(apiManager.getCurrentCharges());
          let examples = [];
          const toggleStatus = new Set(templateManager.getDisplayedColorsSorted());
          for (const stats of templateManager.tileProgress.values()) {
            Object.entries(stats.palette).forEach(([colorKey, content]) => {
              if (!toggleStatus.has(colorKey)) return;
              const colorId = rgbToMeta.get(colorKey).id;
              if (!templateManager.isColorUnlocked(colorId)) return; // color not owned, need to disable no matter if enabled or not
              
              examples.push(...content.examplesEnabled.map(example => [colorId, example]));
            })
          };
          let exampleCoord;
          if (examples.length === 0) return;
          // if ([
          //   "bm-input-tx",
          //   "bm-input-ty",
          //   "bm-input-px",
          //   "bm-input-py",
          // ].every(elementId => document.getElementById(elementId)?.value !== "")) {
          //   const [[tx, ty], [px, py]] = getOverlayCoords();
          //   exampleCoord = [
          //     tx * templateManager.tileSize + px,
          //     ty * templateManager.tileSize + py,
          //   ];
          // } else {
          try {
            const geoCoords = getCenterGeoCoords();
            const tileCoords = coordsGeoToTileCoords(geoCoords[0], geoCoords[1]);
            exampleCoord = [
              tileCoords[0][0] * templateManager.tileSize + tileCoords[1][0],
              tileCoords[0][1] * templateManager.tileSize + tileCoords[1][1],
            ];
          } catch {
            const example = examples[Math.floor(Math.random() * examples.length)][1];
            exampleCoord = [
              example[0][0] * templateManager.tileSize + example[1][0],
              example[0][1] * templateManager.tileSize + example[1][1],
            ];
          };
          // }
          if (examples.length <= currentCharges) {
            // do nothing as all are going to be painted anyway
          } else if (examples.length < 5000) { // performance is close at about 5000 ~ 10000
             examples = examples.sort(([color1, coord1], [color2, coord2]) => {
              const _coord1 = [
                coord1[0][0] * templateManager.tileSize + coord1[1][0],
                coord1[0][1] * templateManager.tileSize + coord1[1][1],
              ];
              const _coord2 = [
                coord2[0][0] * templateManager.tileSize + coord2[1][0],
                coord2[0][1] * templateManager.tileSize + coord2[1][1],
              ];
              const dist1 = Math.sqrt(Math.pow(_coord1[0] - exampleCoord[0], 2) + Math.pow(_coord1[1] - exampleCoord[1], 2)) * (1 + Math.random() * 0.2);
              const dist2 = Math.sqrt(Math.pow(_coord2[0] - exampleCoord[0], 2) + Math.pow(_coord2[1] - exampleCoord[1], 2)) * (1 + Math.random() * 0.2);
              return dist1 - dist2;
            }).slice(0, currentCharges);
          } else {
            // we don't want to fully sort the array
            const buckets = {};
            const resultExamples = [];
            examples.forEach(([color1, coord1]) => {
              const _coord1 = [
                coord1[0][0] * templateManager.tileSize + coord1[1][0],
                coord1[0][1] * templateManager.tileSize + coord1[1][1],
              ];
              const dist1 = Math.floor(Math.sqrt(Math.pow(_coord1[0] - exampleCoord[0], 2) + Math.pow(_coord1[1] - exampleCoord[1], 2)) * (1 + Math.random() * 0.2));
              if (buckets[dist1] === undefined) {
                buckets[dist1] = [
                  [color1, coord1]
                ];
              } else {
                buckets[dist1].push(
                  [color1, coord1]
                );
              }
            });
            const sortedDist = Object.keys(buckets).sort((a, b) => a - b);
            for (const dist of sortedDist) {
              resultExamples.push(...buckets[dist]);
              if (resultExamples.length >= currentCharges) break;
            }
            examples = resultExamples.slice(0, currentCharges);
          }
          const canvas = document.querySelector("canvas.maplibregl-canvas");
          // for (let i = 0; i < examples.length; i++) {
          //   const [colorId, example] = examples[i];
          //   document.getElementById("color-" + colorId).click();
          //   teleportToTileCoords(example[0], example[1], false);
          //   const ev = new MouseEvent("click", {
          //     "bubbles": true, "cancelable": true, "clientX": canvas.offsetWidth / 2, "clientY": canvas.offsetHeight / 2, "button": 0
          //   });
          //   canvas.dispatchEvent(ev);
          // }
          // Get back to the first point to show where the painted pixels are based on
          teleportToTileCoords(examples[0][1][0], examples[0][1][1], false);
          let currentColorId = examples[0][0];
          document.getElementById("color-" + currentColorId).click();

          const refW = [
            examples[0][1][0][0] * templateManager.tileSize + examples[0][1][1][0],
            examples[0][1][0][1] * templateManager.tileSize + examples[0][1][1][1],
          ]; // reference Wplace coord
          const cliC = [canvas.offsetWidth / 2, canvas.offsetHeight / 2]; // reference canvas coord
          const pxPerW = getPixelPerWplacePixel();
          for (let i = 0; i < examples.length; i++) {
            const [colorId, example] = examples[i];
            if (currentColorId !== colorId) {
              currentColorId = colorId;
              document.getElementById("color-" + colorId).click();
            };
            const exW = [
              example[0][0] * templateManager.tileSize + example[1][0],
              example[0][1] * templateManager.tileSize + example[1][1],
            ]
            const ev = new MouseEvent("click", {
              "bubbles": true, "cancelable": true,
              "clientX": cliC[0] + (exW[0] - refW[0]) * pxPerW,
              "clientY": cliC[1] + (exW[1] - refW[1]) * pxPerW,
              "button": 0
            });
            canvas.dispatchEvent(ev);
          }
        }

        // Attempts to find the "Paint Pixel" element for anchoring
        const paintPixel = black.parentNode.parentNode.parentNode.parentNode.querySelector('h2');

        paintPixel.parentNode?.appendChild(paint); // Adds the paint button
      }
    };

    // Hook color change to force refresh
    Array.from(black.parentNode.parentNode.getElementsByTagName('button')).forEach((button) => {
      if (button.classList.contains("bm-hooked")) {
        return;
      }
      button.addEventListener('click', () => {
        if (templateManager.isOnlyCurrentColorShown()) {
          forceRefreshTiles();
        };
      });
      button.classList.add("bm-hooked");
    })
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

const persistCoords = () => {
  try {
    const [[tx, ty], [px, py]] = getOverlayCoords();
    const data = { tx, ty, px, py };
    GM.setValue('bmCoords', JSON.stringify(data));
  } catch (_) {}
};

const teleportCoords = () => {
  try {
    const [[tx, ty], [px, py]] = getOverlayCoords();
    teleportToTileCoords([tx, ty], [px, py]);
  } catch (_) {}
};

/** Deploys the overlay to the page with minimize/maximize functionality.
 * Creates a responsive overlay UI that can toggle between full-featured and minimized states.
 * 
 * Parent/child relationships in the DOM structure below are indicated by indentation.
 * @since 0.58.3
 * Changed to async since 0.85.17
 */
async function buildOverlayMain() {
  let isMinimized = false; // Overlay state tracker (false = maximized, true = minimized)
  // Load last saved coordinates (if any)
  let savedCoords = {};
  const savedCoordsValue = await GM.getValue('bmCoords', '{}');
  try {
    savedCoords = JSON.parse(savedCoordsValue) || {};
  } catch {
    savedCoords = {};
  }
  
  overlayMain.addDiv({'id': 'bm-overlay', 'style': 'top: 10px; right: 75px;'})
    .addDiv({'id': 'bm-contain-header'})
      .addDiv({'id': 'bm-bar-drag'}).buildElement()
      .addImg({'alt': 'Blue Marble Icon - Click to minimize/maximize', 'src': 'https://raw.githubusercontent.com/SwingTheVine/Wplace-BlueMarble/main/dist/assets/Favicon.png', 'style': 'cursor: pointer;'}, 
        (instance, img) => {
          /** Click event handler for overlay minimize/maximize functionality.
           * 
           * Toggles between two distinct UI states:
           * 1. MINIMIZED STATE (60×76px):
           *    - Shows only the Blue Marble icon and drag bar
           *    - Hides all input fields, buttons, and status information
           *    - Applies fixed dimensions for consistent appearance
           *    - Repositions icon with 3px right offset for visual centering
           * 
           * 2. MAXIMIZED STATE (responsive):
           *    - Restores full functionality with all UI elements
           *    - Removes fixed dimensions to allow responsive behavior
           *    - Resets icon positioning to default alignment
           *    - Shows success message when returning to maximized state
           * 
           * @param {Event} event - The click event object (implicit)
           */
          img.addEventListener('click', () => {
            isMinimized = !isMinimized; // Toggle the current state

            const overlay = document.querySelector('#bm-overlay');
            const header = document.querySelector('#bm-contain-header');
            const dragBar = document.querySelector('#bm-bar-drag');
            const coordsContainer = document.querySelector('#bm-contain-coords');
            const coordsButton = document.querySelector('#bm-button-coords');
            const createButton = document.querySelector('#bm-button-create');
            const enableButton = document.querySelector('#bm-button-enable');
            const disableButton = document.querySelector('#bm-button-disable');
            const eventContainer = document.querySelector('#bm-contain-eventitem');
            const coordInputs = document.querySelectorAll('#bm-contain-coords input');
            const statusTextbox = document.getElementById(instance.outputStatusId); // Status log textarea for user feedback
            
            // Pre-restore original dimensions when switching to maximized state
            // This ensures smooth transition and prevents layout issues
            if (!isMinimized) {
              overlay.style.width = "auto";
              overlay.style.maxWidth = "300px";
              overlay.style.minWidth = "200px";
              overlay.style.padding = "10px";
            }
            
            // Define elements that should be hidden/shown during state transitions
            // Each element is documented with its purpose for maintainability
            const elementsToToggle = [
              '#bm-overlay h1',                    // Main title "Blue Marble"
              '#bm-contain-userinfo',              // User information section (username, droplets, level)
              '#bm-overlay hr',                    // Visual separator lines
              '#bm-contain-automation > *:not(#bm-contain-coords)', // Automation section excluding coordinates
              '#bm-contain-buttons-action',        // Action buttons container
            ];
            
            // Apply visibility changes to all toggleable elements
            elementsToToggle.forEach(selector => {
              const elements = document.querySelectorAll(selector);
              elements.forEach(element => {
                element.style.display = isMinimized ? 'none' : '';
              });
            });
            // Handle coordinate container and button visibility based on state
            if (isMinimized) {
              // ==================== MINIMIZED STATE CONFIGURATION ====================
              // In minimized state, we hide ALL interactive elements except the icon and drag bar
              // This creates a clean, unobtrusive interface that maintains only essential functionality
              
              // Hide coordinate input container completely
              if (coordsContainer) {
                coordsContainer.style.display = 'none';
              }
              
              // Hide coordinate button (pin icon)
              if (coordsButton) {
                coordsButton.style.display = 'none';
              }
              
              // Hide create template button
              if (createButton) {
                createButton.style.display = 'none';
              }

              // Hide enable templates button
              if (enableButton) {
                enableButton.style.display = 'none';
              }

              // Hide disable templates button
              if (disableButton) {
                disableButton.style.display = 'none';
              }

              // Hide bm-contain-eventitem
              if (templateManager.isEventEnabled()) {
                eventContainer.style.display = 'none';
              }
              
              // Hide status textarea
              if (!templateManager.isStatusHidden()) {
                statusTextbox.style.display = 'none';
              }

              // Hide all coordinate input fields individually (failsafe)
              coordInputs.forEach(input => {
                input.style.display = 'none';
              });
              
              // Apply fixed dimensions for consistent minimized appearance
              // These dimensions were chosen to accommodate the icon while remaining compact
              overlay.style.width = '60px';    // Fixed width for consistency
              overlay.style.height = '76px';   // Fixed height (60px + 16px for better proportions)
              overlay.style.maxWidth = '60px';  // Prevent expansion
              overlay.style.minWidth = '60px';  // Prevent shrinking
              overlay.style.padding = '8px';    // Comfortable padding around icon
              
              // Apply icon positioning for better visual centering in minimized state
              // The 3px offset compensates for visual weight distribution
              img.style.marginLeft = '3px';
              
              // Configure header layout for minimized state
              header.style.textAlign = 'center';
              header.style.margin = '0';
              header.style.marginBottom = '0';
              
              // Ensure drag bar remains visible and properly spaced
              if (dragBar) {
                dragBar.style.display = '';
                dragBar.style.marginBottom = '0.25em';
              }
            } else {
              // ==================== MAXIMIZED STATE RESTORATION ====================
              // In maximized state, we restore all elements to their default functionality
              // This involves clearing all style overrides applied during minimization
              
              // Restore coordinate container to default state
              if (coordsContainer) {
                coordsContainer.style.display = '';           // Show container
                coordsContainer.style.flexDirection = '';     // Reset flex layout
                coordsContainer.style.justifyContent = '';    // Reset alignment
                coordsContainer.style.alignItems = '';        // Reset alignment
                coordsContainer.style.gap = '';               // Reset spacing
                coordsContainer.style.textAlign = '';         // Reset text alignment
                coordsContainer.style.margin = '';            // Reset margins
              }
              
              // Restore coordinate button visibility
              if (coordsButton) {
                coordsButton.style.display = '';
              }
              
              // Restore create button visibility and reset positioning
              if (createButton) {
                createButton.style.display = '';
                createButton.style.marginTop = '';
              }

              // Restore enable button visibility and reset positioning
              if (enableButton) {
                enableButton.style.display = '';
                enableButton.style.marginTop = '';
              }

              // Restore disable button visibility and reset positioning
              if (disableButton) {
                disableButton.style.display = '';
                disableButton.style.marginTop = '';
              }

              // Restore bm-contain-eventitem
              if (templateManager.isEventEnabled()) {
                eventContainer.style.display = '';
              } else {
                eventContainer.style.display = 'none'; // eventManager itself matches #bm-contain-automation > *:not(#bm-contain-coords)
              }
              
              // Restore status textarea
              if (!templateManager.isStatusHidden()) {
                statusTextbox.style.display = '';
              } else {
                statusTextbox.style.display = 'none'; // statusTextbox itself matches #bm-contain-automation > *:not(#bm-contain-coords)
              }
              
              // Restore all coordinate input fields
              coordInputs.forEach(input => {
                input.style.display = '';
              });
              
              // Reset icon positioning to default (remove minimized state offset)
              img.style.marginLeft = '';
              
              // Restore overlay to responsive dimensions
              overlay.style.padding = '10px';
              
              // Reset header styling to defaults
              header.style.textAlign = '';
              header.style.margin = '';
              header.style.marginBottom = '';
              
              // Reset drag bar spacing
              if (dragBar) {
                dragBar.style.marginBottom = '0.5em';
              }
              
              // Remove all fixed dimensions to allow responsive behavior
              // This ensures the overlay can adapt to content changes
              overlay.style.width = '';
              overlay.style.height = '';
            }
            
            // ==================== ACCESSIBILITY AND USER FEEDBACK ====================
            // Update accessibility information for screen readers and tooltips
            
            // Update alt text to reflect current state for screen readers and tooltips
            img.alt = isMinimized ? 
              'Blue Marble Icon - Minimized (Click to maximize)' : 
              'Blue Marble Icon - Maximized (Click to minimize)';
            
            // No status message needed - state change is visually obvious to users
          });
        }
      ).buildElement()
      .addHeader(1, {'textContent': name})
        .addSmall({'textContent': ` v${version}`}).buildElement()
      .buildElement()
    .buildElement()

    .addHr().buildElement()

    .addDiv({'id': 'bm-contain-userinfo'})
      .addP({'textContent': 'Username: '})
        .addB({'id': 'bm-user-name'}).buildElement()
      .buildElement()
      .addP({'id': 'bm-user-charges'}, (_, element) => {
        element.setAttribute('aria-live', 'polite');
      })
        .addText('Full Charges in ')
        .addSpan({'className': 'bm-charge-countdown', 'textContent': '--:--'}, (_, element) => {
          element.dataset.role = 'countdown';
        }).buildElement()
        .addText(' ')
        .addSpan({'className': 'bm-charge-count', 'textContent': '(0 / 0)'}, (_, element) => {
          element.dataset.role = 'charge-count';
        }).buildElement()
      .buildElement()
      .addP({'textContent': 'Droplets: '})
        .addB({'id': 'bm-user-droplets'}).buildElement()
      .buildElement()
      .addP()
        .addB({'id': 'bm-user-nextpixel', 'textContent': '--'}).buildElement()
        .addText(' more pixel')
        .addSpan({'id': 'bm-user-nextpixel-plural', 'textContent': 's'}).buildElement()
        .addText(' to Lv. ')
        .addB({'id': 'bm-user-nextlevel', 'textContent': '--'}).buildElement()
      .buildElement()
    .buildElement()

    .addHr().buildElement()

    .addDiv({'id': 'bm-contain-automation'})
      // .addCheckbox({'id': 'bm-input-stealth', 'textContent': 'Stealth', 'checked': true}).buildElement()
      // .addButtonHelp({'title': 'Waits for the website to make requests, instead of sending requests.'}).buildElement()
      // .addBr().buildElement()
      // .addCheckbox({'id': 'bm-input-possessed', 'textContent': 'Possessed', 'checked': true}).buildElement()
      // .addButtonHelp({'title': 'Controls the website as if it were possessed.'}).buildElement()
      // .addBr().buildElement()
      .addDiv({'id': 'bm-contain-coords'})
        .addButton({'id': 'bm-button-coords', 'className': 'bm-help', 'style': 'margin-top: 0;', 'innerHTML': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 6"><circle cx="2" cy="2" r="2"></circle><path d="M2 6 L3.7 3 L0.3 3 Z"></path><circle cx="2" cy="2" r="0.7" fill="white"></circle></svg></svg>'},
          (instance, button) => {
            button.onclick = () => {
              const coords = instance.apiManager?.coordsTilePixel; // Retrieves the coords from the API manager
              if (!coords?.[0]) {
                instance.handleDisplayError('Coordinates are malformed! Did you try clicking on the canvas first?');
                return;
              }
              instance.updateInnerHTML('bm-input-tx', coords?.[0] || '');
              instance.updateInnerHTML('bm-input-ty', coords?.[1] || '');
              instance.updateInnerHTML('bm-input-px', coords?.[2] || '');
              instance.updateInnerHTML('bm-input-py', coords?.[3] || '');
              apiManager.updateDownloadButton();
              persistCoords();
            }
          }
        ).buildElement()
        .addInput({'type': 'number', 'id': 'bm-input-tx', 'placeholder': 'Tl X', 'min': 0, 'max': 2047, 'step': 1, 'required': true, 'value': (savedCoords.tx ?? '')}, (instance, input) => {
          //if a paste happens on tx, split and format it into other coordinates if possible
          input.addEventListener("paste", (event) => {
            const clipboardText = (event.clipboardData || window.clipboardData).getData("text");

            const matchResult = [
              /^\s*([012]?\d{1,3}),\s*([012]?\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\s*$/, // comma-separated
              /^\s*([012]?\d{1,3})\s+([012]?\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s*$/, // space-separated
              /^\s*\(?Tl X: ([012]?\d{1,3}), Tl Y: ([012]?\d{1,3}), Px X: (\d{1,3}), Px Y: (\d{1,3})\)?\s*$/, // display format
            ].map(r => r.exec(clipboardText)).filter(r => r).pop(); //find the regex that matches the clipboard text

            if (matchResult === undefined) { // If we don't have 4 clean coordinates, end the function.
              return;
            }
            // let splitText = clipboardText.split(" ").filter(n => n).map(Number).filter(n => !isNaN(n)); //split and filter all Non Numbers

            // if (splitText.length !== 4 ) { // If we don't have 4 clean coordinates, end the function.
            //   return;
            // }

            let splitText = matchResult.slice(1).map(Number);

            let coords = selectAllCoordinateInputs(document); 

            for (let i = 0; i < coords.length; i++) { 
              coords[i].value = splitText[i]; //add the split vales
            }

            apiManager.updateDownloadButton();

            event.preventDefault(); //prevent the pasting of the original paste that would overide the split value
          })
          const handler = () => (apiManager.updateDownloadButton(), persistCoords());
          input.addEventListener('input', handler);
          input.addEventListener('change', handler);
        }).buildElement()
        .addInput({'type': 'number', 'id': 'bm-input-ty', 'placeholder': 'Tl Y', 'min': 0, 'max': 2047, 'step': 1, 'required': true, 'value': (savedCoords.ty ?? '')}, (instance, input) => {
          const handler = () => (apiManager.updateDownloadButton(), persistCoords());
          input.addEventListener('input', handler);
          input.addEventListener('change', handler);
        }).buildElement()
        .addInput({'type': 'number', 'id': 'bm-input-px', 'placeholder': 'Px X', 'min': 0, 'max': 2047, 'step': 1, 'required': true, 'value': (savedCoords.px ?? '')}, (instance, input) => {
          const handler = () => (apiManager.updateDownloadButton(), persistCoords());
          input.addEventListener('input', handler);
          input.addEventListener('change', handler);
        }).buildElement()
        .addInput({'type': 'number', 'id': 'bm-input-py', 'placeholder': 'Px Y', 'min': 0, 'max': 2047, 'step': 1, 'required': true, 'value': (savedCoords.py ?? '')}, (instance, input) => {
          const handler = () => (apiManager.updateDownloadButton(), persistCoords());
          input.addEventListener('input', handler);
          input.addEventListener('change', handler);
        }).buildElement()
        .addButton({'id': 'bm-button-teleport', 'className': 'bm-help', 'style': 'margin-top: 0;', 'innerHTML': '✈️', 'title': 'Teleport'},
          (instance, button) => {
            button.onclick = () => {
              teleportCoords();
            }
          }
        ).buildElement()
      .buildElement()
      .addDetails({'id': 'bm-checkbox-container', 'textContent': 'User Settings', 'style': 'max-width: 100%; white-space: nowrap; border: 1px solid rgba(255,255,255,0.1); padding: 4px; border-radius: 4px; margin-top: 4px;'})
        // Color filter UI
        .addDiv({'style': 'display: flex; flex-direction: column; gap: 4px;'})
          .addCheckbox({'id': 'bm-checkbox-colors-unlocked', 'textContent': 'Hide Locked Colors', 'checked': templateManager.areLockedColorsHidden()}, (instance, label, checkbox) => {
            checkbox.addEventListener('change', () => {
              templateManager.setHideLockedColors(checkbox.checked);
              buildColorFilterList();
              if (checkbox.checked) {
                instance.handleDisplayStatus("Hidden all locked colors.");
              } else {
                instance.handleDisplayStatus("Restored all colors.");
              }
            });
          }).buildElement()
          .addCheckbox({'id': 'bm-checkbox-colors-completed', 'textContent': 'Hide Completed Colors', 'checked': templateManager.areCompletedColorsHidden()}, (instance, label, checkbox) => {
            checkbox.addEventListener('change', () => {
              templateManager.setHideCompletedColors(checkbox.checked);
              buildColorFilterList();
              if (checkbox.checked) {
                instance.handleDisplayStatus("Hidden all completed colors.");
              } else {
                instance.handleDisplayStatus("Restored all colors.");
              }
            });
          }).buildElement()
          .addCheckbox({'id': 'bm-progress-bar-enabled', 'textContent': 'Show Progress Bar', 'checked': templateManager.isProgressBarEnabled()}, (instance, label, checkbox) => {
            checkbox.addEventListener('change', () => {
              templateManager.setProgressBarEnabled(checkbox.checked);
              buildColorFilterList();
              if (checkbox.checked) {
                instance.handleDisplayStatus("Progress Bar Enabled.");
              } else {
                instance.handleDisplayStatus("Progress Bar Disabled.");
              }
            });
          }).buildElement()
          .addCheckbox({'id': 'bm-memory-saving-enabled', 'textContent': 'Memory-Saving Mode', 'checked': templateManager.isMemorySavingModeOn()}, (instance, label, checkbox) => {
            checkbox.addEventListener('change', () => {
              templateManager.setMemorySavingMode(checkbox.checked);
              buildColorFilterList();
              if (checkbox.checked) {
                instance.handleDisplayStatus("Memory Saving Mode Enabled. The Effect will be Fully Active After a Page Refresh.");
              } else {
                instance.handleDisplayStatus("Memory Saving Mode Disabled. The Effect will be Fully Active After a Page Refresh.");
              }
            });
          }).buildElement()
          .addCheckbox({'id': 'bm-event-enabled', 'textContent': 'Enable Event', 'checked': templateManager.isEventEnabled()}, (instance, label, checkbox) => {
            checkbox.addEventListener('change', () => {
              templateManager.setEventEnabled(checkbox.checked);
              if (checkbox.checked) {
                instance.handleDisplayStatus("Event Mode Enabled.");
                document.getElementById('bm-contain-eventitem').style.display = '';
                document.getElementById('bm-event-hide-claimed').parentElement.style.display = ''; // the label containing not the checkbox
                document.getElementById('bm-event-hide-unavailable').parentElement.style.display = ''; // the label containing not the checkbox
                buildEventList();
              } else {
                instance.handleDisplayStatus("Event Mode Disabled.");
                document.getElementById('bm-contain-eventitem').style.display = 'none';
                document.getElementById('bm-event-hide-claimed').parentElement.style.display = 'none'; // the label containing not the checkbox
                document.getElementById('bm-event-hide-unavailable').parentElement.style.display = 'none'; // the label containing not the checkbox
              }
            });
          }).buildElement()
          .addCheckbox({'id': 'bm-event-hide-claimed', 'textContent': 'Hide Claimed Event Items', 'checked': !templateManager.isEventClaimedShown()}, (instance, label, checkbox) => {
            if (templateManager.isEventEnabled()) {
              label.style.display = '';
            } else {
              label.style.display = 'none';
            }
            checkbox.addEventListener('change', () => {
              templateManager.setEventClaimedShown(!checkbox.checked);
              if (checkbox.checked) {
                instance.handleDisplayStatus("Hidden All Event Claimed Items.");
              } else {
                instance.handleDisplayStatus("Restored All Event Claimed Items.");
              }
              buildEventList();
            });
          }).buildElement()
          .addCheckbox({'id': 'bm-event-hide-unavailable', 'textContent': 'Hide Unavailable Event Items', 'checked': !templateManager.isEventUnavailableShown()}, (instance, label, checkbox) => {
            if (templateManager.isEventEnabled()) {
              label.style.display = '';
            } else {
              label.style.display = 'none';
            }
            checkbox.addEventListener('change', () => {
              templateManager.setEventUnavailableShown(!checkbox.checked);
              if (checkbox.checked) {
                instance.handleDisplayStatus("Hidden All Unavailable Event Items.");
              } else {
                instance.handleDisplayStatus("Restored All Unavailable Event Items.");
              }
              buildEventList();
            });
          }).buildElement()
          .addCheckbox({'id': 'bm-only-current-color-enabled', 'textContent': 'Show Current Color Only', 'checked': templateManager.isOnlyCurrentColorShown()}, (instance, label, checkbox) => {
            checkbox.addEventListener('change', () => {
              templateManager.setOnlyCurrentColorShown(checkbox.checked);
              if (checkbox.checked) {
                instance.handleDisplayStatus("Only the currently selected color will be shown.");
                buildColorFilterList();
              } else {
                instance.handleDisplayStatus("Color filter is restored.");
                buildColorFilterList();
              };
              forceRefreshTiles();
            });
          }).buildElement()
          .addCheckbox({'id': 'bm-theme-override-enabled', 'textContent': 'Theme Override: ', 'checked': templateManager.isThemeOverridden()}, (instance, label, checkbox) => {
            checkbox.addEventListener('change', async () => {
              await templateManager.setThemeOverridden(checkbox.checked);
              const select = document.getElementById('bm-theme-setting');
              select.disabled = !checkbox.checked;
              forceUpdateTheme();
            });
          })
            .addSelect({'id': 'bm-theme-setting'}, (instance, select) => {
              select.disabled = !templateManager.isThemeOverridden();
              const currentTheme = templateManager.getCurrentTheme();
              Object.entries(themeList).forEach(([themeValue, [displayText, isDark]]) => {
                const option = document.createElement('option');
                option.value = themeValue;
                option.textContent = displayText;
                if (themeValue === currentTheme) { option.selected = true; }
                select.appendChild(option);
              });
              select.addEventListener('change', async () => {
                await templateManager.setCurrentTheme(select.value);
                instance.handleDisplayStatus(`Changed the theme to "${themeList[select.value][0]}".`);
                forceUpdateTheme();
              })
            }).buildElement()
          .buildElement()
          .addCheckbox({'id': 'bm-status-hidden', 'textContent': 'Hide Status Display', 'checked': templateManager.isStatusHidden()}, (instance, label, checkbox) => {
            checkbox.addEventListener('change', () => {
              templateManager.setStatusHidden(checkbox.checked);
              if (checkbox.checked) {
                instance.handleDisplayStatus("Status Display Hidden.");
                document.getElementById(overlayMain.outputStatusId).style.display = 'none';
              } else {
                instance.handleDisplayStatus("Status Display Restored.");
                document.getElementById(overlayMain.outputStatusId).style.display = '';
              }
            });
          }).buildElement()
        .buildElement()
      .buildElement()
      .addDetails({'id': 'bm-contain-colorfilter', 'textContent': 'Colors', 'style': 'border: 1px solid rgba(255,255,255,0.1); padding: 4px; border-radius: 4px; margin-top: 4px;'}, (instance, summary, details) => {
        details.open = true;
      })
        // Color sorting
        .addP({'textContent': 'Sort Colors by ', 'style': 'font-size: small; margin-top: 3px; margin-left: 5px;'})
          // Sorting UI
          .addSelect({'id': 'bm-color-sort'}, (instance, select) => {
            const order = [
              "Asc", "Desc"
            ]
            const currentSortBy = templateManager.getSortBy();
            Object.keys(sortByOptions).forEach(o => {
              order.forEach(o2 => {
                const option = document.createElement('option');
                option.value = `${o.toLowerCase()}-${o2.toLowerCase()}`;
                option.textContent = `${o[0].toUpperCase() + o.slice(1).toLowerCase()} (${o2}.)`;
                if (option.value === currentSortBy) { option.selected = true; }
                select.appendChild(option);
              })
            });
            select.addEventListener('change', () => {
              templateManager.setSortBy(select.value);
              buildColorFilterList();
              const parts = select.value.split('-');
              instance.handleDisplayStatus(`Changed the sort criteria to "${parts[0][0].toUpperCase() + parts[0].slice(1).toLowerCase()}" in ${parts[1]}ending order.`);
            })
          }).buildElement()
        .buildElement()
        // Color buttons
        .addDiv({'id': 'bm-button-colors-container', 'style': 'display: flex; gap: 6px; margin-top: 3px; margin-bottom: 0px;'})
          .addButton({'id': 'bm-button-colors-enable-all', 'textContent': 'Enable All'}, (instance, button) => {
            button.onclick = () => {
              templateManager.templatesArray.forEach(t => {
                if (!t?.colorPalette) { return; }
                Object.values(t.colorPalette).forEach(v => v.enabled = true);
              })
              syncToggleList();
              buildColorFilterList();
              instance.handleDisplayStatus('Enabled all colors');
              forceRefreshTiles();
            };
          }).buildElement()
          .addButton({'id': 'bm-button-colors-disable-all', 'textContent': 'Disable All'}, (instance, button) => {
            button.onclick = () => {
              templateManager.templatesArray.forEach(t => {
                if (!t?.colorPalette) { return; }
                Object.values(t.colorPalette).forEach(v => v.enabled = false);
              })
              syncToggleList();
              buildColorFilterList();
              instance.handleDisplayStatus('Disabled all colors');
              forceRefreshTiles();
            };
          }).buildElement()
        .buildElement()
        .addDiv({'id': 'bm-colorfilter-list', 'style': 'max-height: 125px; overflow: auto; display: flex; flex-direction: column; gap: 4px;'}).buildElement()
      .buildElement()
      // Template filter UI
      .addDetails({'id': 'bm-contain-templatefilter', 'textContent': 'Templates', 'style': 'border: 1px solid rgba(255,255,255,0.1); padding: 4px; border-radius: 4px; margin-top: 4px;'}, (instance, summary, details) => {
        details.open = true;
      })
        // Template buttons
        .addDiv({'id': 'bm-contain-buttons-template'})
          .addInputFile({'id': 'bm-input-file-template', 'textContent': 'Select Image', 'accept': 'image/png, image/jpeg, image/webp, image/bmp, image/gif'}) // .buildElement()
          .addButton({'id': 'bm-button-create', 'textContent': 'Create Template', 'style': 'margin: 0 1ch;'}, (instance, button) => {
            button.onclick = async () => {
              const input = document.querySelector('#bm-input-file-template');

              const coordTlX = document.querySelector('#bm-input-tx');
              if (!coordTlX.checkValidity()) {coordTlX.reportValidity(); instance.handleDisplayError('Coordinates are malformed! Did you try clicking on the canvas first?'); return;}
              const coordTlY = document.querySelector('#bm-input-ty');
              if (!coordTlY.checkValidity()) {coordTlY.reportValidity(); instance.handleDisplayError('Coordinates are malformed! Did you try clicking on the canvas first?'); return;}
              const coordPxX = document.querySelector('#bm-input-px');
              if (!coordPxX.checkValidity()) {coordPxX.reportValidity(); instance.handleDisplayError('Coordinates are malformed! Did you try clicking on the canvas first?'); return;}
              const coordPxY = document.querySelector('#bm-input-py');
              if (!coordPxY.checkValidity()) {coordPxY.reportValidity(); instance.handleDisplayError('Coordinates are malformed! Did you try clicking on the canvas first?'); return;}

              // Kills itself if there is no file
              if (!input?.files[0]) {instance.handleDisplayError(`No file selected!`); return;}

              await templateManager.createTemplate(input.files[0], input.files[0]?.name.replace(/\.[^/.]+$/, ''), [Number(coordTlX.value), Number(coordTlY.value), Number(coordPxX.value), Number(coordPxY.value)]);

              // console.log(`TCoords: ${apiManager.templateCoordsTilePixel}\nCoords: ${apiManager.coordsTilePixel}`);
              // apiManager.templateCoordsTilePixel = apiManager.coordsTilePixel; // Update template coords
              // console.log(`TCoords: ${apiManager.templateCoordsTilePixel}\nCoords: ${apiManager.coordsTilePixel}`);
              // templateManager.setTemplateImage(input.files[0]);

              instance.handleDisplayStatus(`Drew to canvas!`);
            }
          }).buildElement()
          .addSelect({'id': 'bm-template-anchor'}, (instance, select) => {
            const anchors = {
              "lt": "⟔",
              "mt": "⨪",
              "rt": "ᒬ",
              "lm": "꜏",
              "mm": "⊡",
              "rm": "꜊",
              "lb": "Ŀ",
              "mb": "∸",
              "rb": "⟓",
            };
            const anchorTextX = {
              "l": "Left",
              "m": "Center",
              "r": "Right",
            };
            const anchorTextY = {
              "t": "Top",
              "m": "Middle",
              "b": "Bottom",
            };
            const currentAnchor = templateManager.getAnchor();
            Object.entries(anchors).forEach(([anchor, displayText]) => {
              const option = document.createElement('option');
              option.value = anchor;
              option.textContent = displayText;
              if (anchor === currentAnchor) { option.selected = true; }
              select.appendChild(option);
            });
            select.addEventListener('change', () => {
              templateManager.setAnchor(select.value);
              instance.handleDisplayStatus(`Changed the default template anchor to "${anchorTextY[select.value[1]]} ${anchorTextX[select.value[0]]}".`);
            })
          }).buildElement()
        .buildElement()
        .addDiv({'id': 'bm-templatefilter-list', 'style': 'max-height: 125px; overflow: auto; display: flex; flex-direction: column; gap: 4px;'}).buildElement()
      .buildElement()
      // Event UI
      .addDetails({'id': 'bm-contain-eventitem', 'textContent': 'Event', 'style': 'border: 1px solid rgba(255,255,255,0.1); padding: 4px; border-radius: 4px; display: none; margin-top: 4px;'}, (instance, summary, details) => {
        if (templateManager.isEventEnabled()) {
          details.style.display = '';
        }
        details.open = true;
      })
        .addButton({'id': 'bm-button-set-eventprovider', 'textContent': 'Set Data Provider', 'style': 'margin: 0 1ch;'}, (instance, button) => {
          button.onclick = () => {
            const currentProvider = templateManager.getEventProvider();
            const providerURL = prompt('Enter the event data provider JSON URL:', currentProvider === "" ? "https://wplace.samuelscheit.com/tiles/pumpkin.json" : currentProvider);
            if (!providerURL) { return; }
            const isUrl = (content => {
              try { return Boolean(new URL(content)); }
              catch(e){ return false; }
            })(providerURL);
            if (!isUrl) {
              alert("The URL you entered is not valid!");
              return;
            }
            templateManager.setEventProvider(providerURL);
            buildEventList();
          };
        }).buildElement()
        .addButton({'id': 'bm-button-refresh-event', 'textContent': 'Refresh Data', 'style': 'margin: 0 1ch;'}, (instance, button) => {
          button.onclick = () => buildEventList();
        }).buildElement()
        .addDiv({'id': 'bm-eventitem-list', 'style': 'max-height: 125px; overflow: auto; display: flex; flex-direction: column; gap: 4px;'}).buildElement()
      .buildElement()
      // Status
      .addTextarea({'id': overlayMain.outputStatusId, 'placeholder': `Status: Sleeping...\nVersion: ${version}`, 'readOnly': true}, (instance, textarea) => {
        if (templateManager.isStatusHidden()) {
          textarea.style.display = 'none';
        }
      }).buildElement()
      .addDiv({'id': 'bm-contain-buttons-action'})
        .addDiv()
          // .addButton({'id': 'bm-button-teleport', 'className': 'bm-help', 'textContent': '✈'}).buildElement()
          // .addButton({'id': 'bm-button-favorite', 'className': 'bm-help', 'innerHTML': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><polygon points="10,2 12,7.5 18,7.5 13.5,11.5 15.5,18 10,14 4.5,18 6.5,11.5 2,7.5 8,7.5" fill="white"></polygon></svg>'}).buildElement()
          // .addButton({'id': 'bm-button-templates', 'className': 'bm-help', 'innerHTML': '🖌'}).buildElement()
          .addButton({'id': 'bm-button-convert', 'className': 'bm-help', 'innerHTML': '🎨', 'title': 'Template Color Converter'}, 
            (instance, button) => {
            button.addEventListener('click', () => {
              window.open('https://pepoafonso.github.io/color_converter_wplace/', '_blank', 'noopener noreferrer');
            });
          }).buildElement()
          .addButton({'id': 'bm-button-website', 'className': 'bm-help', 'innerHTML': '🌐', 'title': 'Official Blue Marble Website'}, 
            (instance, button) => {
            button.addEventListener('click', () => {
              window.open('https://bluemarble.camilledaguin.fr/', '_blank', 'noopener noreferrer');
            });
          }).buildElement()
        .buildElement()
        .addDiv({'id': 'bm-footer'})
          .addSmall({'textContent': `by SwingTheVine | Forked by TWY`, 'style': 'margin-top: auto;'}).buildElement()
        .buildElement()
      .buildElement()
    .buildElement()
  .buildOverlay(document.body);

  // ------- Helper: Build the color filter list -------
  window.syncToggleList = function syncToggleList() {
    try {
      (templateManager.templatesArray ?? []).forEach(t => {
        const key = t.storageKey;
        if (key && templateManager.templatesJSON?.templates?.[key]) {
          const templateJSON = templateManager.templatesJSON.templates[key]
          templateJSON.enabled = t.enabled;
          templateJSON.palette = t.colorPalette;
        }
      })
      // persist immediately
      templateManager.storeTemplates();
    } catch (_) {};
  }

  window.buildColorFilterList = function buildColorFilterList() {
    const listContainer = document.querySelector('#bm-colorfilter-list');
    const toggleStatus = templateManager.getPaletteToggledStatus();
    const hideCompleted = templateManager.areCompletedColorsHidden();
    const hideLocked = templateManager.areLockedColorsHidden();
    listContainer.innerHTML = '';
    let hasColorPalette = false;
    const paletteSum = {};
    (templateManager.templatesArray ?? []).forEach(t => {
      if (!t.enabled) return; // only count enabled templates
      if (!t?.colorPalette) return;
      hasColorPalette = true;
      for (const [rgb, meta] of Object.entries(t.colorPalette)) {
        paletteSum[rgb] = (paletteSum[rgb] ?? 0) + meta.count;
      }
    })
    if (!listContainer || !hasColorPalette) {
      if (listContainer) { listContainer.innerHTML = '<small>No template colors to display.</small>'; }
      return;
    }

    const combinedProgress = {};
    for (const stats of templateManager.tileProgress.values()) {
      Object.entries(stats.palette).forEach(([colorKey, content]) => {
        if (combinedProgress[colorKey] === undefined) {
          combinedProgress[colorKey] = Object.fromEntries(Object.entries(content));
          combinedProgress[colorKey].examples = content.examples.slice();
          combinedProgress[colorKey].examplesEnabled = content.examplesEnabled.slice();
        } else {
          combinedProgress[colorKey].painted += content.painted;
          combinedProgress[colorKey].paintedAndEnabled += content.paintedAndEnabled;
          combinedProgress[colorKey].missing += content.missing;
          combinedProgress[colorKey].examples.push(...content.examples);
          combinedProgress[colorKey].examplesEnabled.push(...content.examplesEnabled);
        }
      })
    };

    const sortBy = templateManager.getSortBy();
    const sortByParts = sortBy.split('-');
    const keyFunction = sortByOptions[sortByParts[0]];

    const compareFunction = (
      sortByParts[1] === "asc" ?
        (a,b) => keyFunction(a) - keyFunction(b) :
        (a,b) => keyFunction(b) - keyFunction(a)
    );

    const paletteSumSorted = Object.entries(paletteSum)
      .map(([rgb, count]) => [rgb, combinedProgress[rgb]?.paintedAndEnabled ?? 0, count])
      .sort(compareFunction); // sort by frequency desc

    let hasColors = false;
    for (const [rgb, paintedCount, totalCount] of paletteSumSorted) {
      if (hideLocked && rgb === 'other') continue;
      if (hideCompleted && paintedCount === totalCount) continue;
      let row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '6px';

      let swatch = document.createElement('div');
      swatch.style.width = '14px';
      swatch.style.height = '14px';
      swatch.style.border = '1px solid rgba(255,255,255,0.5)';

      let colorName = '';
      let colorKey = '';
      const tMeta = rgbToMeta.get(rgb);
      // Special handling for "other" and "transparent"
      if (rgb === 'other') {
        swatch.style.background = '#888'; // Neutral color for "Other"
        colorName = "Other";
        colorKey = "other";
      } else if (rgb === '#deface') {
        swatch.style.background = '#deface';
        colorName = "Transparent";
        colorKey = "transparent";
      } else {
        const [r, g, b] = rgb.split(',').map(Number);
        swatch.style.background = `rgb(${r},${g},${b})`;
        try {
          if (tMeta && typeof tMeta.id === 'number') {
            if (hideLocked && !templateManager.isColorUnlocked(tMeta.id)) continue;
            const displayName = tMeta?.name || `rgb(${r},${g},${b})`;
            // const starLeft = tMeta.premium ? '★ ' : '';
            // colorName = `#${tMeta.id} ${starLeft}${displayName}`;
            if (tMeta.premium) {
              swatch.style.borderColor = "gold";
              swatch.style.boxShadow = "0 0 2px yellow";
            }
            colorName = `#${tMeta.id} ${displayName}`;
            colorKey = `${r},${g},${b}`;
          }
        } catch (ignored) {}
      }

      let label = document.createElement('span');
      label.style.fontSize = '12px';

      if (sortByParts[0] === "remaining" || (hideCompleted && sortByParts[0] !== "painted")) {
        const remainingLabelText = (totalCount - paintedCount).toLocaleString();
        label.textContent = `${colorName} • ${remainingLabelText} Left`;
      } else {
        const labelText = totalCount.toLocaleString();
        const paintedLabelText = paintedCount.toLocaleString();
        label.textContent = `${colorName} • ${paintedLabelText} / ${labelText}`;
      }

      if (templateManager.isProgressBarEnabled()) {
        const percentageProgress = paintedCount / (totalCount === 0 ? 1 : totalCount) * 100;
        row.style.background = `linear-gradient(to right, rgb(0, 128, 0, 0.8) 0%, rgb(0, 128, 0, 0.8) ${percentageProgress}%, transparent ${percentageProgress}%, transparent 100%)`;
      }

      const paletteEntry = combinedProgress[colorKey];
      let currentIndex = 0;
      swatch.addEventListener('click', () => {
        // if ((paletteEntry?.examples?.length ?? 0) > 0) {
        if ((paletteEntry?.examplesEnabled?.length ?? 0) > 0) {
          // const examples = paletteEntry.examples;
          const examples = paletteEntry.examplesEnabled;
          // const exampleIndex = Math.floor(Math.random() * examples.length);
          const exampleIndex = currentIndex % examples.length;
          teleportToTileCoords(examples[exampleIndex][0], examples[exampleIndex][1]);
          ++currentIndex;
        }
      });
      // if ((paletteEntry?.examples?.length ?? 0) > 0) {
      if ((paletteEntry?.examplesEnabled?.length ?? 0) > 0) {
        swatch.style["cursor"] = "pointer";
      };

      const toggle = document.createElement('input');
      toggle.type = 'checkbox';
      if (templateManager.isOnlyCurrentColorShown()) {
        toggle.checked = tMeta?.id === getCurrentColor();
        toggle.disabled = true;
      } else {
        toggle.checked = toggleStatus[rgb] ?? true;
      }
      toggle.addEventListener('change', () => {
        (templateManager.templatesArray ?? []).forEach(t => {
          if (!t?.colorPalette) return;
          if (t.colorPalette[rgb] !== undefined) {
            t.colorPalette[rgb].enabled = toggle.checked;
          }
        })
        overlayMain.handleDisplayStatus(`${toggle.checked ? 'Enabled' : 'Disabled'} ${rgb}`);
        syncToggleList();
        forceRefreshTiles();
      });

      row.appendChild(toggle);
      row.appendChild(swatch);
      row.appendChild(label);
      listContainer.appendChild(row);
      hasColors = true;
    }
    if (!hasColors && listContainer) {
      if (hideLocked) {
        if (hideCompleted) {
          listContainer.innerHTML = '<small>All owned colors have been completed.</small>';
        } else {
          listContainer.innerHTML = '<small>Remaining colors are all locked.</small>';
        }
      } else { // hideCompleted
        listContainer.innerHTML = '<small>All colors have been completed.</small>';
      }
    }
  };

  window.buildTemplateFilterList = function buildTemplateFilterList() {
    const listContainer = document.querySelector('#bm-templatefilter-list');
    consoleLog(templateManager);
    if (templateManager.templatesArray?.length === 0) {
      if (listContainer) { listContainer.innerHTML = '<small>No templates to display.</small>'; }
      return;
    }

    listContainer.innerHTML = '';
    const entries = templateManager.templatesArray;

    const combinedTemplate = {};
    for (const stats of templateManager.tileProgress.values()) {
      Object.entries(stats.template).forEach(([storageKey, content]) => {
        if (combinedTemplate[storageKey] === undefined) {
          combinedTemplate[storageKey] = Object.fromEntries(Object.entries(content));
        } else {
          combinedTemplate[storageKey].painted += content.painted;
        }
      })
    };

    for (const template of entries) {
      let row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '6px';

      let removeButton = document.createElement('a');
      removeButton.title = "Remove template";
      removeButton.textContent = "🗑️";
      removeButton.style.fontSize = '12px';
      removeButton.onclick = () => {
        if (confirm(`Remove template ${template?.displayName}?`)) {
          templateManager.deleteTemplate(template?.storageKey);
        }
      }

      let teleportButton = document.createElement('a');
      teleportButton.title = "Teleport to template";
      teleportButton.textContent = "✈️";
      teleportButton.style.fontSize = '12px';
      teleportButton.onclick = () => {
        teleportToTileCoords(template.coords.slice(0, 2), template.coords.slice(2, 4));
      }

      let label = document.createElement('span');
      label.style.fontSize = '12px';
      const labelText = `${template.requiredPixelCount.toLocaleString()}`;

      const templateName = template["displayName"];
      const filledCount = combinedTemplate[template.storageKey]?.painted ?? 0;
      const filledLabelText = `${filledCount.toLocaleString()}`;
      label.textContent = `${templateName} • ${filledLabelText} / ${labelText}`;
      // label.textContent = `${templateName} • ${labelText}`;

      const toggle = document.createElement('input');
      toggle.type = 'checkbox';
      toggle.checked = template.enabled;
      toggle.addEventListener('change', () => {
        template.enabled = toggle.checked;
        overlayMain.handleDisplayStatus(`${toggle.checked ? 'Enabled' : 'Disabled'} ${templateName}`);
        if (!toggle.checked) {
          // reset related tiles if it is being toggled off
          // since the tile may not be involed in the template anymore
          templateManager.clearTileProgress(template);
        }
        syncToggleList();
        forceRefreshTiles();
      });

      row.appendChild(toggle);
      row.appendChild(removeButton);
      row.appendChild(label);
      row.appendChild(teleportButton);
      listContainer.appendChild(row);
    }
  };

  window.buildEventList = function buildEventList() {
    const listContainer = document.querySelector('#bm-eventitem-list');
    const showClaimed = templateManager.isEventClaimedShown();
    const showUnavailable = templateManager.isEventUnavailableShown();
    const provider = templateManager.getEventProvider();
    if (provider === null || provider == "") {
      listContainer.innerHTML = '<small>Event data provider is not set.</small>';
      return;
    };
    if (apiManager.eventClaimed === null) {
      listContainer.innerHTML = '<small>The event claimed items list is not loaded. Make sure you have clicked the ongoing Event button from the top left corner.</small>';
      return;
    };
    const eventClaimedList = new Set(apiManager.eventClaimed);
    consoleLog("eventClaimedList", eventClaimedList);
    // Format: e.g. https://wplace.samuelscheit.com/tiles/pumpkin.json
    fetch(provider).then(response => response.json()).then(data => {
      consoleLog("event Location data", data);
      if (typeof data !== 'object') {
        listContainer.innerHTML = '<small>The event data provider does not provide a known format.</small>';
        return;
      }
      listContainer.textContent = "";
      let hasEntries = false;
      Object.entries(data).forEach(([itemId, info]) => {
        itemId = Number(itemId);
        if (eventClaimedList.has(itemId) && !showClaimed) return;
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '6px';

        let coords = null;
        let coordStatus = "";
        if (typeof info === 'object') {
          if (info['lat'] !== undefined && info['lng'] !== undefined) {
            coords = [info['lat'], info['lng']];
          } else if (
            info['tileX'] !== undefined && info['offsetX'] !== undefined &&
            info['tileY'] !== undefined && info['offsetY'] !== undefined
          ) {
            coords = coordsTileToGeoCoords(
              [info['tileX'], info['tileY']],
              [info['offsetX'], info['offsetY']]
            )
          }
          // Check Time
          if (info['foundAt'] !== undefined) {
            const currentTimestamp = Date.now();
            const currentHour = currentTimestamp - (currentTimestamp % 3600000);
            const foundTimestamp = new Date(info['foundAt']).getTime();
            const foundHour = foundTimestamp - (foundTimestamp % 3600000);
            if (currentHour !== foundHour) {
              coordStatus = "Expired • ";
              if (!showUnavailable) return;
            }
          }
        }

        if (coords !== null) {
          let teleportButton = document.createElement('a');
          teleportButton.title = "Teleport to template";
          teleportButton.textContent = "✈️";
          teleportButton.style.fontSize = '12px';
          teleportButton.onclick = () => {
            teleportToGeoCoords(coords[0], coords[1], false);
          }
          row.appendChild(teleportButton);
        } else {
          coordStatus = "Unknown Coordinate Format • ";
        }

        let label = document.createElement('span');
        label.style.fontSize = '12px';
        label.textContent = `#${itemId} • ${coordStatus}${eventClaimedList.has(itemId) ? "Claimed" : "Unclaimed"}`;
        row.appendChild(label);
        listContainer.appendChild(row);
        hasEntries = true;
      });
      if (!hasEntries && listContainer) {
        listContainer.innerHTML = `<small>No ${showClaimed ? "" : "unclaimed "}items have ${showUnavailable ? "" : "recent "}data available.</small>`;
      }
    }).catch(err => {
      listContainer.innerHTML = '<small>Failed fetching the event item info from the event data provider. Make sure the provider URL is a valid JSON resource and can be accessed with appropriate CORS.</small>';
    });

  };

  window.forceUpdateTheme = function forceUpdateTheme() {
    if (!isMapTilerLoaded()) {
      setTimeout(forceUpdateTheme, 100);
      return;
    };
    if (templateManager.isThemeOverridden()) {
      setTheme(templateManager.getCurrentTheme());
    } else {
      setTheme(Object.keys(themeList)[0]);
    }
  };

  // Listen for template creation/import completion to (re)build palette list
  window.addEventListener('message', (event) => {
    if (event?.data?.bmEvent === 'bm-rebuild-color-list') {
      try { buildColorFilterList(); } catch (_) {}
    } else if (event?.data?.bmEvent === 'bm-rebuild-template-list') {
      try { buildTemplateFilterList(); } catch (_) {}
    } else if (event?.data?.bmEvent === 'bm-rebuild-event-list') {
      try { buildEventList(); } catch (_) {}
    }
  });

  // If a template was already loaded from storage, show the color UI and build list
  setTimeout(() => {
    try {
      if (templateManager.templatesArray?.length > 0) {
        // const colorUI = document.querySelector('#bm-contain-colorfilter');
        // if (colorUI) { colorUI.style.display = ''; }
        buildColorFilterList();
      }
      if (templateManager.templatesArray?.length > 0) {
        buildTemplateFilterList();
      }
    } catch (_) {}
    try {
      if (templateManager.isEventEnabled()) {
        buildEventList();
      }
    } catch (_) {}
    try {
      if (templateManager.isThemeOverridden()) {
        forceUpdateTheme();
      }
    } catch (_) {}
  }, 0);

}
