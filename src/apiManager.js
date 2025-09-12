/** ApiManager class for handling API requests, responses, and interactions.
 * Note: Fetch spying is done in main.js, not here.
 * @class ApiManager
 * @since 0.11.1
 */

import TemplateManager from "./templateManager.js";
import { consoleError, escapeHTML, numberToEncoded, serverTPtoDisplayTP, colorpalette, coordsTileToGeoCoords } from "./utils.js";

export default class ApiManager {

  /** Constructor for ApiManager class
   * @param {TemplateManager} templateManager 
   * @since 0.11.34
   */
  constructor(templateManager) {
    this.templateManager = templateManager;
    this.disableAll = false; // Should the entire userscript be disabled?
    this.coordsTilePixel = []; // Contains the last detected tile/pixel coordinate pair requested
    this.templateCoordsTilePixel = []; // Contains the last "enabled" template coords
    this.charges = null;
    this.chargesUpdated = null;
    this.chargeInterval = null;
    this.tileCache = {};
    this.fallbackMe = null; // Interval for updating from the fallback "me"
    this.#setFallbackMe();
  }

  getCurrentCharges() {
    const currentTime = Date.now();
    const timeDiff = currentTime - this.chargesUpdated;
    const chargesDelta = timeDiff / this.charges["cooldownMs"];
    const currentCharges = this.charges["count"] + chargesDelta;
    const trueMax = this.charges["count"] > this.charges["max"] ? this.charges["count"] : this.charges["max"];
    if (currentCharges > trueMax) {
      return trueMax;
    }
    return currentCharges;
  }

  getFullRemainingTimeMs() {
    const currentCharges = this.getCurrentCharges();
    if (currentCharges >= this.charges["max"]) {
      return 0;
    }
    return (this.charges["max"] - currentCharges) * this.charges["cooldownMs"];
  }

  getFullRemainingTimeFormatted() {
    const remainingTimeMs = this.getFullRemainingTimeMs();
    if (remainingTimeMs === 0) {
      return "FULL";
    }
    const remainingTimeSeconds = Math.floor(remainingTimeMs / 1000);
    const hours = Math.floor(remainingTimeSeconds / 3600);
    const minutes = Math.floor((remainingTimeSeconds % 3600) / 60);
    const seconds = remainingTimeSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
    if (minutes > 0) return `${minutes}m ${seconds}s`
    return `${seconds}s`;
  }

  #updateCharges(overlay) {
    const currentCharges = Math.floor(this.getCurrentCharges());
    const maxCharges = this.charges["max"];
    const currentChargesStr = new Intl.NumberFormat().format(currentCharges);
    const maxChargesStr = new Intl.NumberFormat().format(maxCharges);
    const chargeText = `<span style="color: lightgray; font-size: 0.8em;">(${currentChargesStr} / ${maxChargesStr})</span>`;
    const countDown = `<b style="color: orange">${this.getFullRemainingTimeFormatted()}</b>`;
    overlay.updateInnerHTML(
      'bm-user-charges', `Full Charges in ${countDown} ${chargeText}`
    ); // Updates the text content of the charges field
  }

  #setUpTimeout(overlay) {
    this.#updateCharges(overlay);
    if (this.chargeInterval) {
      clearInterval(this.chargeInterval);
    }
    this.chargeInterval = setInterval(() => {
      this.#updateCharges(overlay);
    }, 1000);
  }

  #setFallbackMe() {
    this.fallbackMe = setInterval(() => {
      const logoutButton = document.querySelector(".relative>.dropdown>.dropdown-content>section>button.btn");
      const jsonData = (logoutButton === null || logoutButton["__click"] === undefined) ? {
        "status": 401,
        "error": "Unauthorized"
      } : JSON.parse(JSON.stringify(logoutButton["__click"][2]["user"]["data"]));
      jsonData["fallback"] = true;
      window.postMessage({
        source: 'blue-marble',
        endpoint: "https://backend.wplace.live/me",
        jsonData: jsonData
      }, '*');
    }, 1000);
  }

  /** Determines if the spontaneously received response is something we want.
   * Otherwise, we can ignore it.
   * Note: Due to aggressive compression, make your calls like `data['jsonData']['name']` instead of `data.jsonData.name`
   * 
   * @param {Overlay} overlay - The Overlay class instance
   * @since 0.11.1
  */
  spontaneousResponseListener(overlay) {

    // Triggers whenever a message is sent
    window.addEventListener('message', async (event) => {

      const data = event.data; // The data of the message
      const dataJSON = data['jsonData']; // The JSON response, if any

      // Kills itself if the message was not intended for Blue Marble
      if (!(data && data['source'] === 'blue-marble')) {return;}

      // Kills itself if the message has no endpoint (intended for Blue Marble, but not this function)
      if (!data['endpoint']) {return;}

      // Trims endpoint to the second to last non-number, non-null directoy.
      // E.g. "wplace.live/api/pixel/0/0?payload" -> "pixel"
      // E.g. "wplace.live/api/files/s0/tiles/0/0/0.png" -> "tiles"
      const endpointText = data['endpoint']?.split('?')[0].split('/').filter(s => s && isNaN(Number(s))).filter(s => s && !s.includes('.')).pop();

      console.log(`%cBlue Marble%c: Recieved message about "%s"`, 'color: cornflowerblue;', '', endpointText);

      // Each case is something that Blue Marble can use from the fetch.
      // For instance, if the fetch was for "me", we can update the overlay stats
      switch (endpointText) {

        case 'me': // Request to retrieve user data

          if (!(dataJSON['fallback'] ?? false)) clearInterval(this.fallbackMe);

          // If the game can not retrieve the userdata...
          if (dataJSON['status'] && dataJSON['status']?.toString()[0] != '2') {
            // The server is probably down (NOT a 2xx status)
            
            overlay.handleDisplayError(`You are not logged in!\nCould not fetch userdata.`);
            return; // Kills itself before attempting to display null userdata
          }

          const nextLevelPixels = Math.ceil(Math.pow(Math.floor(dataJSON['level']) * Math.pow(30, 0.65), (1/0.65)) - dataJSON['pixelsPainted']); // Calculates pixels to the next level

          console.log(dataJSON['id']);
          if (!!dataJSON['id'] || dataJSON['id'] === 0) {
            console.log(numberToEncoded(
              dataJSON['id'],
              '!#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~'
            ));
          }
          this.templateManager.userID = dataJSON['id'];
          this.charges = dataJSON['charges'];
          this.chargesUpdated = Date.now();
          
          overlay.updateInnerHTML('bm-user-name', `Username: <b>${escapeHTML(dataJSON['name'])}</b>`); // Updates the text content of the username field
          this.#setUpTimeout(overlay);
          overlay.updateInnerHTML('bm-user-droplets', `Droplets: <b>${new Intl.NumberFormat().format(dataJSON['droplets'])}</b>`); // Updates the text content of the droplets field
          overlay.updateInnerHTML('bm-user-nextlevel', `<b>${new Intl.NumberFormat().format(nextLevelPixels)}</b> pixel${nextLevelPixels == 1 ? '' : 's'} to Lv. ${Math.floor(dataJSON['level']) + 1}`); // Updates the text content of the next level field
          break;

        case 'pixel': // Request to retrieve pixel data
          const coordsTile = data['endpoint'].split('?')[0].split('/').filter(s => s && !isNaN(Number(s))).map(s => Number(s)); // Retrieves the tile coords as [x, y]
          const payloadExtractor = new URLSearchParams(data['endpoint'].split('?')[1]); // Declares a new payload deconstructor and passes in the fetch request payload
          const coordsPixel = [+payloadExtractor.get('x'), +payloadExtractor.get('y')]; // Retrieves the deconstructed pixel coords from the payload
          
          // Don't save the coords if there are previous coords that could be used
          if (this.coordsTilePixel.length && (!coordsTile.length || !coordsPixel.length)) {
            overlay.handleDisplayError(`Coordinates are malformed!\nDid you try clicking the canvas first?`);
            return; // Kills itself
          }
          
          this.coordsTilePixel = [...coordsTile, ...coordsPixel]; // Combines the two arrays such that [x, y, x, y]
          const displayTP = serverTPtoDisplayTP(coordsTile, coordsPixel);
          
          const spanElements = document.querySelectorAll('span'); // Retrieves all span elements

          // For every span element, find the one we want (pixel numbers when canvas clicked)
          for (const element of spanElements) {
            if (element.textContent.trim().includes(`${displayTP[0]}, ${displayTP[1]}`)) {

              let displayCoords = document.querySelector('#bm-display-coords'); // Find the additional pixel coords span
              let displayCoords2 = document.querySelector('#bm-display-coords2'); // Find the additional pixel coords span

              const geoCoords = coordsTileToGeoCoords(coordsTile, coordsPixel);
              const text = `(Tl X: ${coordsTile[0]}, Tl Y: ${coordsTile[1]}, Px X: ${coordsPixel[0]}, Px Y: ${coordsPixel[1]})`;
              const text2 = `(${geoCoords[0].toFixed(5)}, ${geoCoords[1].toFixed(5)})`;
              
              // If we could not find the addition coord span, we make it then update the textContent with the new coords
              if (!displayCoords) {
                displayCoords = document.createElement('span');
                displayCoords.id = 'bm-display-coords';
                displayCoords.textContent = text;
                displayCoords.style = 'margin-left: calc(var(--spacing)*3); font-size: small;';
                element.parentNode.parentNode.parentNode.insertAdjacentElement('afterend', displayCoords);
                
                const br = document.createElement('br');
                displayCoords.insertAdjacentElement('afterend', br);

                displayCoords2 = document.createElement('span');
                displayCoords2.id = 'bm-display-coords2';
                displayCoords2.textContent = text2;
                displayCoords2.style = 'margin-left: calc(var(--spacing)*3); font-size: small;';
                br.insertAdjacentElement('afterend', displayCoords2);
              } else {
                displayCoords.textContent = text;
                displayCoords2.textContent = text2;
              }
            }
          }
          break;
        
        case 'tiles':

          // Runs only if the tile has the template
          let tileCoordsTile = data['endpoint'].split('/');
          tileCoordsTile = [parseInt(tileCoordsTile[tileCoordsTile.length - 2]), parseInt(tileCoordsTile[tileCoordsTile.length - 1].replace('.png', ''))];
          
          const blobUUID = data['blobID'];
          const blobData = data['blobData'];
          const tileKey = tileCoordsTile[0].toString().padStart(4, '0') + ',' + tileCoordsTile[1].toString().padStart(4, '0');
          const lastModified = data["lastModified"];
          const activeTemplate = this.templateManager.templatesArray?.[0]; // Get the first template
          const palette = activeTemplate?.colorPalette || {}; // Obtain the color palette of the template
          const paletteKey = Object.keys(palette).filter(key => palette[key]?.enabled !== false).sort().join('|');
          const templateKey = Object.keys(activeTemplate?.chunked || {}).sort().join('|');

          let templateBlob = null;
          if (this.tileCache[tileKey]) {
            if (
              this.tileCache[tileKey][0] === lastModified &&
              this.tileCache[tileKey][1] === paletteKey &&
              this.tileCache[tileKey][2] === templateKey
            ) {
              console.log(`Unchanged tile: "${tileKey}"`);
              templateBlob = this.tileCache[tileKey][3];
            }
          }
          
          if (templateBlob === null) {
            templateBlob = await this.templateManager.drawTemplateOnTile(blobData, tileCoordsTile);
            if (
              this.templateManager.templatesShouldBeDrawn &&
              this.templateManager.templatesArray.some(t => {
                if (!t?.chunked) { return false; }
                // Fast path via recorded tile prefixes if available
                if (t.tilePrefixes && t.tilePrefixes.size > 0) {
                  return t.tilePrefixes.has(tileKey);
                }
                // Fallback: scan chunked keys
                return Object.keys(t.chunked).some(k => k.startsWith(tileKey));
              })
            ) {
              this.tileCache[tileKey] = [ lastModified, paletteKey, templateKey, templateBlob ];
            }
          }

          window.postMessage({
            source: 'blue-marble',
            blobID: blobUUID,
            blobData: templateBlob,
            blink: data['blink']
          });
          break;

        // case 'today': // Request to retrieve alliance information
        //   const blobUUID_ = data['blobID'];

        //   const activeTemplate_ = this.templateManager.templatesArray?.[0]; // Get the first template
        //   const palette_ = activeTemplate_?.colorPalette || {}; // Obtain the color palette of the template
        //   const combinedPalette = {};
        //   for (const stats of this.templateManager.tileProgress.values()) {
        //     Object.entries(stats.palette).forEach(([colorKey, content]) => {
        //       if (combinedPalette[colorKey] === undefined) {
        //         combinedPalette[colorKey] = content;
        //         combinedPalette[colorKey]["examples"] = content["examples"].slice();
        //       } else {
        //         combinedPalette[colorKey]["missing"] += content["missing"];
        //         combinedPalette[colorKey]["examples"].push(...content["examples"]);
        //       }
        //     })
        //   }

        //   const colorpaletteRev = Object.fromEntries(colorpalette.map(color => {
        //     const [r, g, b] = color.rgb;
        //     return [`${r},${g},${b}`, color];
        //   }))

        //   const jsonData = Object.keys(palette_).filter(
        //     colorKey => combinedPalette[colorKey] !== undefined
        //   ).map(colorKey => {
        //     const entry = combinedPalette[colorKey];
        //     const exampleIndex = Math.floor(Math.random() * entry["examples"].length);
        //     const geoCoords = coordsTileToGeoCoords(entry["examples"][exampleIndex][0], entry["examples"][exampleIndex][1]);
        //     return {
        //       "userId": -(colorpaletteRev[colorKey]?.id ?? 999),
        //       "name": colorpaletteRev[colorKey]?.name ?? colorKey,
        //       "equippedFlag": 0,
        //       "pixelsPainted": -entry.missing,
        //       "lastLatitude": geoCoords[0],
        //       "lastLongitude": geoCoords[1],
        //       // "discord": ""
        //     };
        //   }).sort((a, b) => a.pixelsPainted - b.pixelsPainted);

        //   window.postMessage({
        //     source: 'blue-marble',
        //     blobID: blobUUID_,
        //     blobData: JSON.stringify(jsonData),
        //     blink: data['blink']
        //   });
        //   break;

        case 'robots': // Request to retrieve what script types are allowed
          this.disableAll = dataJSON['userscript']?.toString().toLowerCase() == 'false'; // Disables Blue Marble if site owner wants userscripts disabled
          break;
      }
    });
  }
}
