export function isMapTilerLoaded() {
  const myLocationButton = document.querySelector(".right-3>button");
  if ( myLocationButton === null ) {
    return false;
  }
  if (myLocationButton["__click"] !== undefined) {
    return (
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
    return result;
  }
}

/** Wplace like breaking things
 * @since 0.85.43
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
  if (isWplaceDoingBadThing()) {
    throw new Error("Wplace sucks. It disables maptiler access.");
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

/** Remove Template from Maptiler's Source
 * @since 0.85.27
 */
export function addTemplate(sortID, tileName, base64, drawMult) {
  const dataURL = `data:image/png;base64,${base64}`;
  const sourceID = `source-${sortID}-${tileName}`;
  const tileCoords = tileName.split(',').map(Number);
  const base64Decode = atob(base64);
  const tileWidth = (base64Decode.charCodeAt(18) * 256 + base64Decode.charCodeAt(19)) / drawMult;
  const tileHeight = (base64Decode.charCodeAt(22) * 256 + base64Decode.charCodeAt(23)) / drawMult;
  const geoCoords1 = coordsTileToGeoCoords(
    [tileCoords[0], tileCoords[1]],
    [tileCoords[2], tileCoords[3]]
  )
  const geoCoords2 = coordsTileToGeoCoords(
    [tileCoords[0], tileCoords[1]],
    [tileCoords[2] + tileWidth, tileCoords[3] + tileHeight]
  )

  return controlMapTiler((map, sourceID, dataURL, geoCoords1, geoCoords2) => {
    if (map.getSource(sourceID)) {
      map["removeLayer"](sourceID);
      map["removeSource"](sourceID);
    };
    map["addSource"](sourceID, {
      "type": "image",
      "url": dataURL,
      "coordinates": [
        [ geoCoords1[0], geoCoords1[1] ],
        [ geoCoords2[0], geoCoords1[1] ],
        [ geoCoords2[0], geoCoords2[1] ],
        [ geoCoords1[0], geoCoords2[1] ],
      ],
    });
    map["addLayer"]({
      "id": sourceID,
      "source": sourceID,
      "type": "raster"
    });
  }, sourceID, dataURL, geoCoords1, geoCoords2);
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
  return controlMapTiler((map, themeName) => {
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
        const layers = map["getLayersOrder"]();
        if (layers && layers.length > 0 && layers[layers.length - 1] !== hoverLayerName) {
          // move to the end (i.e. top of other layers)
          map["moveLayer"](hoverLayerName);
        };
      };
    }
    restoreLayers.name = "restoreLayers";
    if ((map["_listeners"]["styledata"] ?? []).every(listener => listener.name !== restoreLayers.name)) { // only need to register once
      // map.once would not work, since there may be race condition stealing the event before pixel-data is removed
      map["on"]("styledata", restoreLayers);
    };
    map["setStyle"]("https://maps.wplace.live/styles/" + themeName, {});
    return null;
  }, themeName);
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

  if (!isWplaceDoingBadThing()) {
    const funcName = smooth ? "flyTo" : "jumpTo";
    controlMapTiler((map, lat, lng, funcName) => {
      map[funcName]({'center': [lng, lat], 'zoom': 16});
    }, lat, lng, funcName);
    const allianceButton = document.querySelector(".flex>.btn.btn-square.relative.shadow-md");
    if (allianceButton) {
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
      overrideRandom["data"] = coordsGeoToTileCoords(lat, lng, false);
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
  const geoCoords = coordsTileToGeoCoords(coordsTile, coordsPixel);
  await teleportToGeoCoords(geoCoords[0], geoCoords[1]);
}

/** Returns the real World coordinates
 * @param {number[]} coordsTile
 * @param {number[]} coordsPixel
 * @returns {number[]} [latitude, longitude]
 * @since 0.85.4
 */
export function coordsTileToGeoCoords(coordsTile, coordsPixel) {
  const relX = (coordsTile[0] * 1000 + coordsPixel[0] + 0.5) / (2048 * 1000); // Relative X
  const relY = 1 - (coordsTile[1] * 1000 + coordsPixel[1] + 0.5) / (2048 * 1000); // Relative Y
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
export function coordsGeoToTileCoords(latitude, longitude, truncate = true) {
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