import { coordsTileToGeoCoords } from './utils.js';

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
    )
  } else {
    const injector = () => {
      const script = document.currentScript;
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

/** Remove Template from Maptiler's Source
 * @since 0.85.27
 */
function controlMapTiler(func, ...args) {
  const myLocationButton = document.querySelector(".right-3>button");
  if ( myLocationButton !== null ) {
    if (myLocationButton["__click"] !== undefined) {
      const map = myLocationButton["__click"][3]["v"];
      return func(map, ...args);
    } else {
      const getMap = () => {
          return document.querySelector(".right-3>button")["__click"][3]["v"];
      };
      const injector = result => {
          const script = document.currentScript;
          script.setAttribute('bm-result', JSON.stringify(result));
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

/** Force the on-screen tiles to be refreshed
 * @since 0.85.37
 */
export function forceRefreshTiles() {
  return controlMapTiler(map => {
    return map["refreshTiles"]("pixel-art-layer");
  });
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