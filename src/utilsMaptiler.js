export function isMapTilerLoaded() {
  if (isMapFound) return true;
  const myLocationButton = document.querySelector(".right-3>button");
  if ( myLocationButton === null ) {
    return false;
  }
  if (myLocationButton["__click"] !== undefined) {
    isMapFound = (
      typeof myLocationButton["__click"] === "object" && // not a function yet
      myLocationButton["__click"][3] !== undefined &&
      myLocationButton["__click"][3]["v"] !== undefined &&
      myLocationButton["__click"][3]["v"]["addSource"] !== undefined
    ) || document.head.__bmmap !== undefined;
  } else {
    const injector = () => {
      const script = document.currentScript;
      if (document.head.__bmmap) {
        script.setAttribute('bm-result', 'true');
        return;
      }
      try {
        const mapAddSource = document.querySelector(".right-3>button")["__click"][3]["v"]["addSource"];
        if (mapAddSource !== undefined) {
          script.setAttribute('bm-result', 'true');
        } else {
          script.setAttribute('bm-result', 'false');
        }
      } catch (e) {
        if (e instanceof TypeError) {
          script.setAttribute('bm-result', 'false');
        }
      }
    }
    const script = document.createElement('script');
    script.textContent = `(${injector})();`;
    document.documentElement?.appendChild(script);
    const result = script.getAttribute('bm-result') === 'true';
    script.remove();
    isMapFound = result;
  }
  if (isMapFound) {
    mapFoundHandlers.forEach(handler => handler());
  }
  return isMapFound;
}

/** Wplace like breaking things
 * @since 0.85.43
 * @deprecated Not in use since 0.86.1
 */
export function isWplaceDoingBadThing() {
  const myLocationButton = document.querySelector(".right-3>button");
  if ( myLocationButton === null ) {
    return false;
  }
  if (myLocationButton["__click"] !== undefined) {
    return (
      typeof myLocationButton["__click"] !== "object"
    ) && document.head.__bmmap === undefined;
  } else {
    const injector = () => {
      const script = document.currentScript;
      if (document.head.__bmmap) {
        script.setAttribute('bm-result', 'false');
        return;
      }
      try {
        const myLocationButton = document.querySelector(".right-3>button");
        if (myLocationButton !== undefined && myLocationButton["__click"] !== "object") {
          script.setAttribute('bm-result', 'true');
        } else {
          script.setAttribute('bm-result', 'false');
        }
      } catch (e) {
        if (e instanceof TypeError) {
          script.setAttribute('bm-result', 'false');
        }
      }
    }
    const script = document.createElement('script');
    script.textContent = `(${injector})();`;
    document.documentElement?.appendChild(script);
    const result = script.getAttribute('bm-result') === 'true';
    script.remove();
    return result;
  }
}

/** Remove Template from Maptiler's Source
 * @since 0.85.27
 */
function controlMapTiler(func, ...args) {
  if (!isMapTilerLoaded()) {
    doAfterMapFound(() => controlMapTiler(func, ...args));
    return;
  };
  const myLocationButton = document.querySelector(".right-3>button");
  if (document.head.__bmmap) {
    const map = document.head.__bmmap;
    return func(map, ...args);
  } else if ( myLocationButton !== null ) {
    if (myLocationButton["__click"]) {
      const map = myLocationButton["__click"][3]["v"];
      return func(map, ...args);
    } else {
      const getMap = () => {
          return document.head.__bmmap || document.querySelector(".right-3>button")["__click"][3]["v"];
      };
      const injector = result => {
          const script = document.currentScript;
          script.setAttribute('bm-result', JSON.stringify(result ?? null));
      }
      const passArgs = args.map(arg => JSON.stringify(arg)).join(',');
      const script = document.createElement('script');
      script.textContent = `(${injector})((${func})((${getMap})(), ${passArgs}));`;
      document.documentElement?.appendChild(script);
      const result = JSON.parse(script.getAttribute('bm-result'));
      script.remove();
      return result;
    }
  } else {
    throw new Error("Could not find the \"My location\" button.");
  }
}


/** Get coordinates from the map center
 * @returns {number[]} [latitude, longitude]
 * @since 0.85.20
 */
export function getCenterGeoCoords() {
  return controlMapTiler(map => {
    const center = map["transform"]["center"];
    return [center['lat'], center['lng']];
  })
}

/** Get the displacement in pixels per wplace pixel
 * @returns {number}
 * @since 0.85.37
 */
export function getPixelPerWplacePixel() {
  return controlMapTiler(map => {
    // scale: 1 means (tileSize = 512) pixel on canvas covers the full longitude (i.e. 2048000 wplace pixels)
    return map["transform"]["tileSize"] * map["transform"]["scale"] / 2048000;
  });
}

export var bmCanvas = {

}; // sourceID => coords

/** add Template to Maptiler's Source
 * @since 0.85.27
 */
export function addTemplateCanvas(sortID, tileName, templateSize, blob, usage) {
  // templateSize is for coordinate calculation only
  const tileCoords = tileName.split(',').map(Number);
  const [tileWidth, tileHeight] = templateSize;
  const geoCoords1 = coordsTileCoordsToGeoCoords(
    [tileCoords[0], tileCoords[1]],
    [tileCoords[2], tileCoords[3]],
    false
  );
  const geoCoords2 = coordsTileCoordsToGeoCoords(
    [tileCoords[0], tileCoords[1]],
    [tileCoords[2] + tileWidth, tileCoords[3] + tileHeight],
    false
  );
  if (!bmCanvas[usage]) {
    bmCanvas[usage] = {};
  };
  let prefix = "bm"; // avoid that mangleSelectors
  const sourceID = `${prefix}-${usage}-${tileName}-${sortID}`; // tileName before sortID so startsWith() works
  bmCanvas[usage][sourceID] = [geoCoords1, geoCoords2];
  const blobUrl = URL.createObjectURL(blob);

  return controlMapTiler(async (map, sourceID, tileName, templateSize, blobUrl, geoCoords1, geoCoords2, usage, bmCanvas) => {
    document.head.__bmCanvas = bmCanvas; // sync bmCanvas to document
    const overlayImg = document.createElement("img");
    overlayImg.src = blobUrl;
    await new Promise(resolve => overlayImg.addEventListener("load", () => resolve(overlayImg)));
    const currentCanvas = document.getElementById(sourceID);
    if (currentCanvas) {
      currentCanvas.width = 0;
      currentCanvas.height = 0;
      currentCanvas.remove();
    };
    const canvas = document.createElement("canvas");
    canvas.id = sourceID;
    canvas.style.display = "none";
    document.body.appendChild(canvas);
    canvas.width = overlayImg.naturalWidth,
    canvas.height = overlayImg.naturalHeight;
    const overlayContext = canvas.getContext("2d");
    overlayContext.drawImage(overlayImg, 0, 0);
    URL.revokeObjectURL(blobUrl);
    if (map["getLayer"](sourceID)) {
      map["removeLayer"](sourceID);
    };
    if (map["getSource"](sourceID)) {
      map["removeSource"](sourceID);
    };
    map["addSource"](sourceID, {
      "type": "canvas",
      "canvas": sourceID,
      "coordinates": [
        [ geoCoords1[1], geoCoords1[0] ],
        [ geoCoords2[1], geoCoords1[0] ],
        [ geoCoords2[1], geoCoords2[0] ],
        [ geoCoords1[1], geoCoords2[0] ],
      ],
    });
    map["addLayer"]({
      "id": sourceID,
      "source": sourceID,
      "type": "raster",
      "paint": {
          "raster-resampling": "nearest",
          "raster-opacity": 1
      }
    });
    const layers = map["getLayersOrder"]();
    const hoverLayerName = "pixel-hover";
    const prefix = "bm";
    const nextLayer = layers.find(layer => (
      (usage === "overlay" && layer.startsWith(prefix + "-error-")) ||
      layer === hoverLayerName + "-ghost"
    ));
    console.log("moveLayer", sourceID, nextLayer);
    map["moveLayer"](sourceID, nextLayer);
    // add ghost layer to prevent wplace inserting paint-preview and paint-crosshair right before the hover layer
    if (!map["getLayer"](hoverLayerName + "-ghost")) {
      map["addLayer"]({
        "id": hoverLayerName + "-ghost",
        "type": "raster",
        "source": hoverLayerName,
        "paint": {
            "raster-resampling": "nearest",
            "raster-opacity": 0.4
        }
      });
    } else {
      const layers = map["getLayersOrder"]();
      if (layers && layers.length && layers[layers.length - 1] !== hoverLayerName + "-ghost") {
        console.log("moveLayer", hoverLayerName + "-ghost");
        map["moveLayer"](hoverLayerName + "-ghost"); // move to top
      }
    }
  }, sourceID, tileName, templateSize, blobUrl, geoCoords1, geoCoords2, usage, bmCanvas);
}

/** remove layers from a specified template from Maptiler's Source
 * @param {string?} usage
 * @param {string?} sortID
 * @since 0.86.1
 */
export function removeLayer(usage = null, sortID = null) {
  // sourceID = null: remove all
  const matchSuffix = sortID ? "-" + sortID : "";
  const toRemove = [];
  const removeUsages = usage ? [usage] : ["overlay", "error"];
  removeUsages.forEach(usage => {
    Object.keys(bmCanvas[usage] ?? {}).forEach(sourceID => {
      if (sourceID.endsWith(matchSuffix)) {
        delete bmCanvas[usage][sourceID];
        toRemove.push(sourceID);
      }
    });
  })
  return controlMapTiler((map, toRemove, bmCanvas) => {
    document.head.__bmCanvas = bmCanvas; // sync bmCanvas to document
    toRemove.forEach(sourceID => {
      if (map["getLayer"](sourceID)) {
        map["removeLayer"](sourceID);
      };
      if (map["getSource"](sourceID)) {
        map["removeSource"](sourceID);
      };
      const canvas = document.getElementById(sourceID);
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
        canvas.remove();
      };
    })
  }, toRemove, bmCanvas);
}

/** Try to force the on-screen tiles to be refreshed
 * @since 0.85.37
 */
export function forceRefreshTiles() {
  try {
    return controlMapTiler(map => {
      return map["refreshTiles"]("pixel-art-layer");
    });
  } catch (ignored) {};
}

/** The theme list used by wplace.live
 * Format: themeName: [label, darkUI]
 * @since 0.85.40
 */
export const themeList = {
  "liberty": ["Liberty (Default)", false],
  "bright": ["Bright", false],
  "positron": ["Positron", false],
  "dark": ["Dark", true],
  "fiord": ["Fiord (Halloween)", true],
};

/** Override the map theme
 * @since 0.85.40
 */
export function setTheme(themeName) {
  if (!themeList[themeName]) return;
  const isDark = themeList[themeName][1];
  document.documentElement.dataset["theme"] = isDark ? "dark" : "";
  return controlMapTiler((map, themeName, bmCanvas) => {
    document.head.__bmCanvas = bmCanvas; // sync bmCanvas to document
    // The default pixel-hover styledata callback only triggers once that we cannot reset
    // May try to somehow get the current source / layer as reference, but that is also not reliable enough.
    const artLayerName = "pixel-art-layer";
    const hoverLayerName = "pixel-hover";
    let hoverLayerSource = map["getSource"](hoverLayerName); // prevent recreation
    const restoreLayers = async () => { // one problem: pixel-hover may has a lower order than pixel-art-layer, need to make sure pixel-art-layer exists before recreating pixel-hover
      if (!map["getSource"](artLayerName)) {
        map["addSource"](artLayerName, {
          "type": "raster",
          "tiles": ['https://backend.wplace.live/files/s0/tiles/{x}/{y}.png'],
          "minzoom": 11,
          "maxzoom": 11,
          "tileSize": window.innerWidth > 640 ? 550 : 400
        });
      };
      if (!map["getLayer"](artLayerName)) {
        map["addLayer"]({
          "id": artLayerName,
          "type": "raster",
          "source": artLayerName,
          "paint": {
              "raster-resampling": "nearest",
              "raster-opacity": 1
          }
        });
      };
      if (!map["getSource"](hoverLayerName)) {
        if (hoverLayerSource) { 
          map["addSource"](hoverLayerName, {
            "type": "canvas",
            "canvas": hoverLayerSource.canvas,
            "coordinates": hoverLayerSource.coordinates
          });
        } else {
          const hoverCanvas = document.createElement("canvas");
          const hoverImg = document.createElement("img");
          hoverImg.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAAAAACoWZBhAAAAAXNSR0IArs4c6QAAACpJREFUeNpj+AsEZ86ASIa/DAwMZ84ACRDzDBigMs/AARITq1oUwxBWAADaREUdDMswKwAAAABJRU5ErkJggg==";
          await new Promise(resolve => hoverImg.addEventListener("load", () => resolve(hoverImg)));
          hoverCanvas.width = hoverImg.naturalWidth,
          hoverCanvas.height = hoverImg.naturalHeight;
          const hoverContext = hoverCanvas.getContext("2d");
          hoverContext.drawImage(hoverImg, 0, 0);
          const epsilon = 1e-5;
          const bounds = [
            [0, 0],
            [epsilon, 0],
            [epsilon, -epsilon],
            [0, -epsilon]
          ];
          
          hoverLayerSource = {
            "type": "canvas",
            "canvas": hoverCanvas,
            "coordinates": bounds
          };
          map["addSource"](hoverLayerName, hoverLayerSource);
        };
      };
      if (!map["getLayer"](hoverLayerName)) {
        map["addLayer"]({
          "id": hoverLayerName,
          "type": "raster",
          "source": hoverLayerName,
          "paint": {
              "raster-resampling": "nearest",
              "raster-opacity": 0.4
          }
        });
      } else {
        // check layer order
        let prefix = "bm"; // avoid that mangleSelectors
        const layers = map["getLayersOrder"]();
        const nextLayer = layers.find(layer => (
          layer.startsWith(prefix + "-overlay-") ||
          layer.startsWith(prefix + "-error-") ||
          layer === hoverLayerName + "-ghost"
        ));
        const thisIndex = layers.indexOf(hoverLayerName);
        const nextIndex = nextLayer === undefined ? layers.length : layers.indexOf(nextLayer);
        if (thisIndex + 1 !== nextIndex) {
          console.log("moveLayer", hoverLayerName, nextLayer);
          map["moveLayer"](hoverLayerName, nextLayer);
        }
      };
      // add ghost layer to prevent wplace inserting paint-preview and paint-crosshair right before the hover layer
      if (!map["getLayer"](hoverLayerName + "-ghost")) {
        map["addLayer"]({
          "id": hoverLayerName + "-ghost",
          "type": "raster",
          "source": hoverLayerName,
          "paint": {
              "raster-resampling": "nearest",
              "raster-opacity": 0.4
          }
        });
      } else {
        const layers = map["getLayersOrder"]();
        if (layers && layers.length && layers[layers.length - 1] !== hoverLayerName + "-ghost") {
          console.log("moveLayer", hoverLayerName + "-ghost");
          map["moveLayer"](hoverLayerName + "-ghost"); // move to top
        }
      }
      // fix layer order:
      // art-layer -> preview -> crosshair -> hover -> bm-overlay -> bm-error -> hover-ghost
      const bmCanvas = document.head.__bmCanvas;
      if (bmCanvas) {
        ["overlay", "error"].forEach(usage => {
          if (bmCanvas[usage]) {
            let prefix = "bm"; // avoid that mangleSelectors
            const layers = map["getLayersOrder"]();
            const nextLayer = layers.find(layer => (
              (usage === "overlay" && layer.startsWith(prefix + "-error-")) ||
              layer === hoverLayerName + "-ghost"
            ));
            console.log("nextLayer", nextLayer);
            Object.entries(bmCanvas[usage]).forEach(([sourceID, [geoCoords1, geoCoords2]]) => {
              if (!map["getSource"](sourceID)) {
                map["addSource"](sourceID, {
                  "type": "canvas",
                  "canvas": sourceID,
                  "coordinates": [
                    [ geoCoords1[1], geoCoords1[0] ],
                    [ geoCoords2[1], geoCoords1[0] ],
                    [ geoCoords2[1], geoCoords2[0] ],
                    [ geoCoords1[1], geoCoords2[0] ],
                  ],
                });
              };
              if (!map["getLayer"](sourceID)) {
                map["addLayer"]({
                  "id": sourceID,
                  "type": "raster",
                  "source": sourceID,
                  "paint": {
                      "raster-resampling": "nearest",
                      "raster-opacity": 1
                  }
                });
                // Notice that moveLayer itself also fires pixeldata event from _layerOrderChanged
                console.log("moveLayer", sourceID, nextLayer);
                map["moveLayer"](sourceID, nextLayer);
              };
            })
          };
        })
      }
    }
    const restoreLayersName = "restoreLayers";
    const existingRestoreLayers = (map["_listeners"]["styledata"] ?? []).find(listener => listener.name === restoreLayersName);
    if (!existingRestoreLayers) { // only need to register once
      // map.once would not work, since there may be race condition stealing the event before pixel-data is removed
      restoreLayers.name = restoreLayersName;
      map["on"]("styledata", restoreLayers);
    };
    const allianceOrRankingButton = document.querySelector(".flex>.btn.btn-square.relative.shadow-md");
    if (!allianceOrRankingButton) {
      // don't change style during drawing
      const closeButton = document.querySelector(".gap-1+.btn-circle");
      if (closeButton) {
        closeButton.click();
      }
    }
    map["setStyle"]("https://maps.wplace.live/styles/" + themeName, {});
    return null;
  }, themeName, bmCanvas);
}

export var overrideRandom = {
  "data": null
}; // The coordinates to override teleportation

/** Teleport user to coordinate
 * @param {*} lat - latitude
 * @param {*} lng - longitude
 * @param {boolean} smooth - smooth transition
 * @since 0.85.9
 */
export async function teleportToGeoCoords(lat, lng) {
  let smooth = false;

  if (isMapTilerLoaded()) {
    const funcName = smooth ? "flyTo" : "jumpTo";
    controlMapTiler((map, lat, lng, funcName) => {
      map[funcName]({'center': [lng, lat], 'zoom': 16});
    }, lat, lng, funcName);
    const allianceOrRankingButton = document.querySelector(".flex>.btn.btn-square.relative.shadow-md");
    if (allianceOrRankingButton) {
      // not in painting mode, click on center to show pixel info
      const canvas = document.querySelector("canvas.maplibregl-canvas");
      const ev = new MouseEvent("click", {
        "bubbles": true, "cancelable": true,
        "clientX": canvas.offsetWidth / 2,
        "clientY": canvas.offsetHeight / 2,
        "button": 0
      });
      canvas.dispatchEvent(ev);
    }
  } else {
    const randomTeleportBtn = document.querySelector(".mb-2>.btn-ghost");
    if (randomTeleportBtn !== undefined) {
      // Notice that it teleports to the .0 point instead of .5 (center) of the pixel, so we do not need to add an extra 0.5
      overrideRandom["data"] = coordsGeoCoordsToTileCoords(lat, lng, false);
      randomTeleportBtn.click();
    } else {
      // The final resort
      const url = `https://wplace.live/?lat=${lat}&lng=${lng}&zoom=16`;
      window.location.href = url;
    }
  }
}


/** Teleport user to coordinate
 * @param {number[]} coordsTile
 * @param {number[]} coordsPixel
 * @param {boolean} smooth - smooth transition (removed)
 * @since 0.85.9
 */
export async function teleportToTileCoords(coordsTile, coordsPixel) {
  const geoCoords = coordsTileCoordsToGeoCoords(coordsTile, coordsPixel);
  await teleportToGeoCoords(geoCoords[0], geoCoords[1]);
}

/** Returns the real World coordinates
 * @param {number[]} coordsTile
 * @param {number[]} coordsPixel
 * @param {boolean} center
 * @returns {number[]} [latitude, longitude]
 * @since 0.85.4
 */
export function coordsTileCoordsToGeoCoords(coordsTile, coordsPixel, center = true) {
  const offset = center ? 0.5 : 0;
  const relX = (coordsTile[0] * 1000 + coordsPixel[0] + offset) / (2048 * 1000); // Relative X
  const relY = 1 - (coordsTile[1] * 1000 + coordsPixel[1] + offset) / (2048 * 1000); // Relative Y
  return [
    360 * Math.atan(Math.exp((relY * 2 - 1) * Math.PI)) / Math.PI - 90,
    relX * 360 - 180
  ];
}

/** Returns the tile World coordinates
 * @param {number} latitude
 * @param {number} longitude
 * @param {boolean} truncate
 * @returns {number[][]} [coordsTile, coordsPixel]
 * @since 0.85.4
 */
export function coordsGeoCoordsToTileCoords(latitude, longitude, truncate = true) {
  const relX = (longitude + 180) / 360;
  const relY = (Math.log(Math.tan((90 + latitude) * Math.PI / 360)) / Math.PI + 1) / 2;
  const tileX = relX * 2048 * 1000;
  const tileY = (1 - relY) * 2048 * 1000;
  const coordsPixel = truncate ? [
    Math.floor(tileX % 1000),
    Math.floor(tileY % 1000)
  ] : [
    tileX % 1000,
    tileY % 1000
  ]
  return [
    [
      Math.floor(tileX / 1000),
      Math.floor(tileY / 1000)
    ], coordsPixel
  ];
}

/** Click the zoom in button
 * @since 0.85.43
 */
export function zoomIn() {
  document.querySelectorAll(".gap-1>.btn[title]")[0].click();
}

/** Click the zoom out button
 * @since 0.85.43
 */
export function zoomOut() {
  document.querySelectorAll(".gap-1>.btn[title]")[1].click();
}

var isMapFound = false;
var mapFoundHandlers = [];

/** Set up function to be called when map is found
 * @since 0.86.1
 */
export function doAfterMapFound(func) {
  if (isMapFound) return func();
  mapFoundHandlers.push(func);
}

/** Pan the map by a given offset
 * @param {number[]} offset - The offset to pan the map by, in pixels.
 * @since 0.86.0
 */
export function panMap(offset) {
  controlMapTiler(map => {
    map.panBy(offset, {
      duration: 0
    });
  });
}
