import { coordsTileToGeoCoords } from './utils.js';

function isMapTilerLoaded() {
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