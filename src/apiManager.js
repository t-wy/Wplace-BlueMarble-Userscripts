/** ApiManager class for handling API requests, responses, and interactions.
 * Note: Fetch spying is done in main.js, not here.
 * @class ApiManager
 * @since 0.11.1
 */

import TemplateManager from "./templateManager.js";
import { consoleError, escapeHTML, numberToEncoded, serverTPtoDisplayTP, coordsTileToGeoCoords, cleanUpCanvas, copyToClipboard, getOverlayCoords, areOverlayCoordsFilledAndValid, calculateTopLeftAndSize, downloadTile, testCanvasSize } from "./utils.js";

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
  }

  getCurrentCharges() {
    if (this.charges === null) {
      this.#updateUserFromLocal();
      if (this.charges === null) { // still not exist, maybe logged out
        return 0;
      }
    }
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
      return "00:00";
    }
    const remainingTimeSeconds = Math.floor(remainingTimeMs / 1000);
    const hours = Math.floor(remainingTimeSeconds / 3600);
    const minutes = (Math.floor((remainingTimeSeconds % 3600) / 60)).toString().padStart(2, '0');
    const seconds = (remainingTimeSeconds % 60).toString().padStart(2, '0');
    // if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
    // if (minutes > 0) return `${minutes}m ${seconds}s`
    // return `${seconds}s`;
    if (hours > 0) return `${hours}:${minutes}:${seconds}`
    return `${minutes}:${seconds}`
  }

  #setUpTimeout() {
    this.#updateCharges();
    this.chargeInterval = setInterval(() => {
      this.#updateCharges();
    }, 1000);
  }

  #updateCharges() {
    // Can check https://wplace.live/_app/immutable/chunks/OJISNkFj.js for the real implementation
    if (this.charges === null) {
      this.#updateUserFromLocal();
      if (this.charges === null) { // still not exist, maybe logged out
        return;
      }
    }
    const currentCharges = Math.floor(this.getCurrentCharges());
    const maxCharges = this.charges["max"];
    const currentChargesStr = new Intl.NumberFormat().format(currentCharges);
    const maxChargesStr = new Intl.NumberFormat().format(maxCharges);

    const container = document.getElementById('bm-user-charges');
    const countdownElement = container?.querySelector('[data-role="countdown"]');
    const countElement = container?.querySelector('[data-role="charge-count"]');

    if (!container || !countdownElement || !countElement) {return;}

    countdownElement.textContent = this.getFullRemainingTimeFormatted();
    countElement.textContent = `(${currentChargesStr} / ${maxChargesStr})`;
  }

  #updateUserFromLocal() {
    const logoutButton = document.querySelector(".relative>.dropdown>.dropdown-content>section>button.btn");
    if (logoutButton === null) return null;
    if (
      logoutButton["__click"] !== undefined &&
      logoutButton["__click"][2] !== undefined
    ) {
      const user = logoutButton["__click"][2]?.["user"];
      const result = JSON.parse(JSON.stringify(user?.["data"] ?? null));
      const lastFetch = user?.lastFetch ?? null;
      this.#applyUserData(
        result ?? null,
        lastFetch ? +lastFetch : null
      );
    } else {
      const injectedFunc = () => {
        const script = document.currentScript;
        const logoutButton = document.querySelector(".relative>.dropdown>.dropdown-content>section>button.btn");
        const user = logoutButton["__click"]?.[2]?.["user"];
        script.setAttribute('bm-result', JSON.stringify(user?.["data"] ?? null));
        script.setAttribute('bm-lastFetch', JSON.stringify(user?.["lastFetch"] ?? null));
      };
      const script = document.createElement('script');
      script.textContent = `(${injectedFunc})();`;
      document.documentElement?.appendChild(script);
      const result = JSON.parse(script.getAttribute('bm-result'));
      const lastFetch = JSON.parse(script.getAttribute('bm-lastFetch'));
      script.remove();
      this.#applyUserData(
        result ?? null,
        lastFetch ? +lastFetch : null
      );
    };
  }

  #applyUserData(dataJSON, fetchTime) {
    if (dataJSON === null) return;
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
    this.chargesUpdated = fetchTime;
    this.templateManager.updateExtraColorsBitmap(dataJSON['extraColorsBitmap'] ?? 0);
    
    const userNameElement = document.getElementById('bm-user-name');
    if (userNameElement) {
      userNameElement.textContent = dataJSON['name'];
    }
    const userDropletsElement = document.getElementById('bm-user-droplets');
    if (userDropletsElement) {
      userDropletsElement.textContent = new Intl.NumberFormat().format(dataJSON['droplets']);
    }
    // Updates the text content of the next level field
    const nextPixelElement = document.getElementById('bm-user-nextpixel');
    const nextPixelPluralElement = document.getElementById('bm-user-nextpixel-plural');
    if (nextPixelElement && nextPixelPluralElement) {
      nextPixelElement.textContent = new Intl.NumberFormat().format(nextLevelPixels);
      nextPixelPluralElement.textContent = nextLevelPixels == 1 ? '' : 's';
    }
    const nextLevelElement = document.getElementById('bm-user-nextlevel');
    if (nextLevelElement) {
      nextLevelElement.textContent = Math.floor(dataJSON['level']) + 1;
    }
  }

  /** Update the texts and related functions shown on the pixel info overlay
   * 
   * @since 0.85.28
  */
  updateDisplayCoords() {
    const coordsTile = [ this.coordsTilePixel[0], this.coordsTilePixel[1] ];
    const coordsPixel = [ this.coordsTilePixel[2], this.coordsTilePixel[3] ];
    const displayTP = serverTPtoDisplayTP(coordsTile, coordsPixel);
    
    const spanElements = document.querySelectorAll('span'); // Retrieves all span elements

    // For every span element, find the one we want (pixel numbers when canvas clicked)
    for (const element of spanElements) {
      if (element.textContent.trim().includes(`${displayTP[0]}, ${displayTP[1]}`)) {
        // Find the additional pixel coords span
        let displayCoords1 = document.getElementById('bm-display-coords1');
        let displayCoords2 = document.getElementById('bm-display-coords2');
        let displayCoords1Copy = document.getElementById('bm-display-coords1-copy');
        let displayCoords2Copy = document.getElementById('bm-display-coords2-copy');

        const geoCoords = coordsTileToGeoCoords(coordsTile, coordsPixel);
        const text1 = `(Tl X: ${coordsTile[0]}, Tl Y: ${coordsTile[1]}, Px X: ${coordsPixel[0]}, Px Y: ${coordsPixel[1]})`;
        const text2 = `(${geoCoords[0].toFixed(5)}, ${geoCoords[1].toFixed(5)})`;
        
        // If we could not find the addition coord span, we make it then update the textContent with the new coords
        if (!displayCoords1) {
          displayCoords1 = document.createElement('span');
          displayCoords1.id = 'bm-display-coords1';
          displayCoords1.textContent = text1;
          displayCoords1.style = 'margin-left: calc(var(--spacing)*3); font-size: small;';
          element.parentNode.parentNode.parentNode.insertAdjacentElement('afterend', displayCoords1);

          const buttonCopy = function () {
            const content = this.dataset.text;
            copyToClipboard(content);
            alert('Copied to clipboard: ' + content);
          }

          displayCoords1Copy = document.createElement('a');
          displayCoords1Copy.href = '#';
          displayCoords1Copy.id = 'bm-display-coords1-copy';
          displayCoords1Copy.textContent = 'Copy';
          displayCoords1Copy.style = 'font-size: small; text-decoration: underline;';
          displayCoords1Copy.className = "text-nowrap";
          displayCoords1Copy.addEventListener('click', buttonCopy);
          displayCoords1.insertAdjacentElement('afterend', displayCoords1Copy);

          // Space between coords and copy
          displayCoords1.insertAdjacentText('afterend', ' ');
          
          const br = document.createElement('br');
          displayCoords1Copy.insertAdjacentElement('afterend', br);

          displayCoords2 = document.createElement('span');
          displayCoords2.id = 'bm-display-coords2';
          displayCoords2.textContent = text2;
          displayCoords2.style = 'margin-left: calc(var(--spacing)*3); font-size: small;';
          br.insertAdjacentElement('afterend', displayCoords2);

          displayCoords2Copy = document.createElement('a');
          displayCoords2Copy.href = '#';
          displayCoords2Copy.id = 'bm-display-coords2-copy';
          displayCoords2Copy.textContent = 'Copy';
          displayCoords2Copy.style = 'font-size: small; text-decoration: underline;';
          displayCoords2Copy.className = "text-nowrap";
          displayCoords2Copy.addEventListener('click', buttonCopy);
          displayCoords2.insertAdjacentElement('afterend', displayCoords2Copy);

          // Space between coords and copy
          displayCoords2.insertAdjacentText('afterend', ' ');
        } else {
          displayCoords1.textContent = text1;
          displayCoords2.textContent = text2;
        }
        displayCoords1Copy.dataset.text = text1;
        displayCoords2Copy.dataset.text = text2;
      }
    }
  }

  /** Update the download button in share dialog
   * 
   * @since 0.85.28
  */
  updateDownloadButton() {
    if (this.coordsTilePixel.length !== 4) return;
    const coordsTile = [ this.coordsTilePixel[0], this.coordsTilePixel[1] ];
    const coordsPixel = [ this.coordsTilePixel[2], this.coordsTilePixel[3] ];
    const models = document.querySelectorAll('dialog.modal > div'); // Retrieves all dialog elements
    for (const element of models) {
      if (element.querySelector('input[readonly]') === null) continue;
      let downloadBtn = document.querySelector('#bm-download-coords');
      let downloadBtnDim = document.querySelector('#bm-download-coords-dim');
      let progress = document.querySelector('#bm-download-progress');
      let progressText = document.querySelector('#bm-download-progress-text');
      if (!downloadBtn) {
        const container = document.createElement('div');
        element.appendChild(container);

        const h3 = document.createElement('h3');
        h3.innerText = 'Download as Template';
        h3.className = "mb-1 mt-5 flex items-center gap-1 text-xl font-semibold";
        container.appendChild(h3);

        const instruction = document.createElement('div');
        instruction.className = `bg-base-200 border-base-content/10 rounded-xl border-2 p-3`;
        instruction.style.fontSize = "small";
        instruction.innerText = [
          'Instruction to mark the rectangular range for downloading:',
          '1. Pick the first reference point (e.g. the Top Left Corner) and use the "Pin" icon to record the coordinates.',
          '2. Pick the second reference point, i.e. the opposite corner (e.g. the Bottom Right Corner), and click the "Share" button.'
        ].join("\n");
        container.appendChild(instruction);

        downloadBtnDim = document.createElement('span');
        downloadBtnDim.id = 'bm-download-coords-dim';
        downloadBtnDim.style.fontSize = "small";
        container.appendChild(downloadBtnDim);

        container.appendChild(document.createElement('br'));

        const btnContainer = document.createElement('div');
        btnContainer.className = "mt-3 flex items-end justify-end gap-2";

        progress = document.createElement('progress');
        progress.id = 'bm-download-progress';
        progress.max = '100';
        progress.value = '0';
        progress.hidden = true;
        btnContainer.appendChild(progress);

        progressText = document.createElement('span');
        progressText.id = 'bm-download-progress-text';
        progressText.hidden = true;
        progressText.textContent = '0 / 0';
        btnContainer.appendChild(progressText);

        downloadBtn = document.createElement('button');
        downloadBtn.id = 'bm-download-coords';
        downloadBtn.className = 'btn btn-primary';

        const svg = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svg.setAttribute('viewBox', '0 -960 960 960');
        svg.setAttribute('fill', 'currentColor');
        svg.setAttribute('class', 'size-5');
        const path = document.createElementNS("http://www.w3.org/2000/svg", 'path');
        path.setAttribute('d', "M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z");
        svg.appendChild(path);
        downloadBtn.appendChild(svg);

        downloadBtn.appendChild(document.createTextNode(' Download'));

        const that = this;
        downloadBtn.addEventListener('click', async function () {
          this.disabled = true;
          const coordsTile = [ that.coordsTilePixel[0], that.coordsTilePixel[1] ];
          const coordsPixel = [ that.coordsTilePixel[2], that.coordsTilePixel[3] ];
          if (!areOverlayCoordsFilledAndValid()) {
            alert(`Some coordinates textboxes are empty or invalid!`);
            return;
          }
          const overlayCoords = getOverlayCoords();
          const [[left, top], [width, height]] = calculateTopLeftAndSize(
            [coordsTile, coordsPixel],
            overlayCoords
          );
          const tx1 = Math.floor(left / 1000);
          const ty1 = Math.floor(top / 1000);
          const px1 = left % 1000;
          const py1 = top % 1000;
          const tx2 = Math.floor((left + width - 1) / 1000);
          const ty2 = Math.floor((top + height - 1) / 1000);
          const tw = tx2 - tx1 + 1;
          const th = ty2 - ty1 + 1;
          progress.max = tw * th;
          progress.value = 0;
          progress.hidden = false;
          progressText.textContent = `0 / ${progress.max}`;
          progressText.hidden = false;
          try {
            const resultCanvas = new OffscreenCanvas(width, height);
            const context = resultCanvas.getContext('2d');
            context.clearRect(0, 0, width, height);
            for (let ty = ty1; ty <= ty2; ty++) {
              for (let tx = tx1; tx <= tx2; tx++) {
                const image = await downloadTile(tx % 2048, ty);
                context.drawImage(
                  image,
                  tx * 1000 - left,
                  ty * 1000 - top
                );
                progress.value++;
                progressText.textContent = `${progress.value} / ${progress.max}`;
              }
            };
            const blob = await resultCanvas.convertToBlob({ type: "image/png" });
            var a = document.createElement("a");
            a.href = URL.createObjectURL(blob, { type: "image/png" });
            a.setAttribute("download", `template_${tx1}_${ty1}_${px1}_${py1}_${new Date().toISOString()}.png`);
            a.click();
            URL.revokeObjectURL(a.href);
          } catch (e) {
            alert(`Download Failed!`);
            throw e;
          } finally {
            progress.hidden = true;
            progressText.hidden = true;
            this.disabled = false;
          }
        });
        btnContainer.appendChild(downloadBtn);
        container.appendChild(btnContainer);
      }
      const buttonLines = [];
      if (areOverlayCoordsFilledAndValid()) {
        const overlayCoords = getOverlayCoords();
        const [[left, top], [width, height]] = calculateTopLeftAndSize(
          [coordsTile, coordsPixel],
          overlayCoords
        );
        const tx1 = Math.floor(left / 1000);
        const ty1 = Math.floor(top / 1000);
        const px1 = left % 1000;
        const py1 = top % 1000;
        const right = (left + width - 1) % (2048 * 1000);
        const bottom = top + height - 1;
        const tx2 = Math.floor(right / 1000);
        const ty2 = Math.floor(bottom / 1000);
        const px2 = right % 1000;
        const py2 = bottom % 1000;
        buttonLines.push(`Top Left: (Tl X: ${tx1}, Tl Y: ${ty1}, Px X: ${px1}, Px Y: ${py1})`);
        buttonLines.push(`Bottom Right: (Tl X: ${tx2}, Tl Y: ${ty2}, Px X: ${px2}, Px Y: ${py2})`);
        buttonLines.push(`Image Size: ${width}×${height}`);
        if (testCanvasSize(width, height)) {
          downloadBtn.disabled = false;
        } else {
          downloadBtn.disabled = true;
          buttonLines.push(`Too large for the browser to export.`);
        }
      } else {
        buttonLines.push(`Some coordinates textboxes are empty or invalid.`);
        downloadBtn.disabled = true;
      }
      downloadBtnDim.innerText = buttonLines.join('\n');
    }
  }

  /** Determines if the spontaneously received response is something we want.
   * Otherwise, we can ignore it.
   * Note: Due to aggressive compression, make your calls like `data['jsonData']['name']` instead of `data.jsonData.name`
   * 
   * @param {Overlay} overlay - The Overlay class instance
   * @since 0.11.1
  */
  spontaneousResponseListener(overlay) {

    this.#setUpTimeout();

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

          // If the game can not retrieve the userdata...
          if (dataJSON['status'] && dataJSON['status']?.toString()[0] != '2') {
            // The server is probably down (NOT a 2xx status)
            
            if (!(dataJSON['fallback'] ?? false)) {
              overlay.handleDisplayError(`You are not logged in!\nCould not fetch userdata.`);
            }
            return; // Kills itself before attempting to display null userdata
          }

          this.#applyUserData(dataJSON, Date.now());

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
          this.updateDisplayCoords();
          this.updateDownloadButton();
          break;
        
        case 'tiles':

          // Runs only if the tile has the template
          let tileCoordsTile = data['endpoint'].split('/');
          tileCoordsTile = [parseInt(tileCoordsTile[tileCoordsTile.length - 2]), parseInt(tileCoordsTile[tileCoordsTile.length - 1].replace('.png', ''))];
          
          const blobUUID = data['blobID'];
          const blobData = data['blobData'];
          const tileKey = tileCoordsTile[0].toString().padStart(4, '0') + ',' + tileCoordsTile[1].toString().padStart(4, '0');
          const lastModified = data["lastModified"];
          const fullKey = this.templateManager.getTileCacheKey(tileCoordsTile);
          // TODO: Simplify the key to only use (enabled templates, enabled colors)

          let templateBlob = null;
          if (this.tileCache[tileKey]) {
            if (
              this.tileCache[tileKey]["lastModified"] === lastModified &&
              this.tileCache[tileKey]["fullKey"] === fullKey
            ) {
              console.log(`Unchanged tile: "${tileKey}"`);
              templateBlob = this.tileCache[tileKey]["templateBlob"];
            }
          }
          
          if (templateBlob === null) {
            const involvedTemplates = this.templateManager.getInvolvedTemplates(tileCoordsTile);
            if ( involvedTemplates.length > 0 ) {
              templateBlob = await this.templateManager.drawTemplateOnTile(blobData, tileCoordsTile);
              // if (
              //   typeof ImageBitmap !== "undefined" &&
              //   this.tileCache[tileKey] &&
              //   this.tileCache[tileKey]["templateBlob"] instanceof ImageBitmap
              // ) {
              //   this.tileCache[tileKey]["templateBlob"].close();
              // };
              // if (
              //   (templateBlob instanceof HTMLCanvasElement || templateBlob instanceof OffscreenCanvas) &&
              //   templateBlob.convertToBlob !== undefined
              // ) {
                // Don't know why, the tile loading system may fail
                // const templateCanvas = templateBlob;
                // if (typeof ImageBitmap !== 'undefined' && navigator.deviceMemory === 8) { // Only Test This if we have at least 8GiB of RAM
                //   templateBlob = await createImageBitmap(templateCanvas);  // Wplace seems to accept ImageBitmap so we can save expensive conversion to blob
                //   templateCanvas.convertToBlob({ type: 'image/png' }).then(blob => {
                //     this.tileCache[tileKey] = { lastModified, fullKey, blob };
                //     cleanUpCanvas(templateCanvas);
                //   })
                // } else {
                  // templateBlob = await templateCanvas.convertToBlob({ type: 'image/png' });
                this.tileCache[tileKey] = { lastModified, fullKey, templateBlob };
                  // cleanUpCanvas(templateCanvas);
                // }
              // }
            } else {
              templateBlob = blobData;
            }
          }

          window.postMessage({
            source: 'blue-marble',
            blobID: blobUUID,
            blobData: templateBlob,
            blink: data['blink']
          });
          break;

        case 'robots': // Request to retrieve what script types are allowed
          this.disableAll = dataJSON['userscript']?.toString().toLowerCase() == 'false'; // Disables Blue Marble if site owner wants userscripts disabled
          break;
      }
    });
  }
}
