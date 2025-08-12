

/** Sanitizes HTML to display as plain-text.
 * This prevents some Cross Site Scripting (XSS).
 * This is handy when you are displaying user-made data, and you *must* use innerHTML.
 * @param {string} text - The text to sanitize
 * @returns {string} HTML escaped string
 * @since 0.44.2
 * @example
 * const paragraph = document.createElement('p');
 * paragraph.innerHTML = escapeHTML('<u>Foobar.</u>');
 * // Output:
 * // (Does not include the paragraph element)
 * // (Output is not HTML formatted)
 * <p>
 *   "<u>Foobar.</u>"
 * </p>
 */
export function escapeHTML(text) {
  const div = document.createElement('div'); // Creates a div
  div.textContent = text; // Puts the text in a PLAIN-TEXT property
  return div.innerHTML; // Returns the HTML property of the div
}

/** Converts the server tile-pixel coordinate system to the displayed tile-pixel coordinate system.
 * @param {string[]} tile - The tile to convert (as an array like ["12", "124"])
 * @param {string[]} pixel - The pixel to convert (as an array like ["12", "124"])
 * @returns {number[]} [tile, pixel]
 * @since 0.42.4
 * @example
 * console.log(serverTPtoDisplayTP(['12', '123'], ['34', '567'])); // [34, 3567]
 */
export function serverTPtoDisplayTP(tile, pixel) {
  return [((parseInt(tile[0]) % 4) * 1000) + parseInt(pixel[0]), ((parseInt(tile[1]) % 4) * 1000) + parseInt(pixel[1])];
}

/** Negative-Safe Modulo. You can pass negative numbers into this.
 * @param {number} a - The first number
 * @param {number} b - The second number
 * @returns {number} Result
 * @author osuplace
 * @since 0.55.8
 */
export function negativeSafeModulo(a, b) {
  return (a % b + b) % b;
}

/** Bypasses terser's stripping of console function calls.
 * This is so the non-obfuscated code will contain debugging console calls, but the distributed version won't.
 * However, the distributed version needs to call the console somehow, so this wrapper function is how.
 * This is the same as `console.log()`.
 * @param {...any} args - Arguments to be passed into the `log()` function of the Console
 * @since 0.58.9
 */
export function consoleLog(...args) {((consoleLog) => consoleLog(...args))(console.log);}

/** Bypasses terser's stripping of console function calls.
 * This is so the non-obfuscated code will contain debugging console calls, but the distributed version won't.
 * However, the distributed version needs to call the console somehow, so this wrapper function is how.
 * This is the same as `console.error()`.
 * @param {...any} args - Arguments to be passed into the `error()` function of the Console
 * @since 0.58.13
 */
export function consoleError(...args) {((consoleError) => consoleError(...args))(console.error);}

/** Bypasses terser's stripping of console function calls.
 * This is so the non-obfuscated code will contain debugging console calls, but the distributed version won't.
 * However, the distributed version needs to call the console somehow, so this wrapper function is how.
 * This is the same as `console.warn()`.
 * @param {...any} args - Arguments to be passed into the `warn()` function of the Console
 * @since 0.58.13
 */
export function consoleWarn(...args) {((consoleWarn) => consoleWarn(...args))(console.warn);}

/** Encodes a number into a custom encoded string.
 * @param {number} number - The number to encode
 * @param {string} encoding - The characters to use when encoding
 * @since 0.65.2
 * @returns {string} Encoded string
 * @example
 * const encode = '012abcABC'; // Base 9
 * console.log(numberToEncoded(0, encode)); // 0
 * console.log(numberToEncoded(5, encode)); // c
 * console.log(numberToEncoded(15, encode)); // 1A
 * console.log(numberToEncoded(12345, encode)); // 1BCaA
 */
export function numberToEncoded(number, encoding) {

  if (number === 0) return encoding[0]; // End quickly if number equals 0. No special calculation needed

  let result = ''; // The encoded string
  const base = encoding.length; // The number of characters used, which determines the base

  // Base conversion algorithm
  while (number > 0) {
    result = encoding[number % base] + result; // Find's the character's encoded value determined by the modulo of the base
    number = Math.floor(number / base); // Divides the number by the base so the next iteration can find the next modulo character
  }

  return result; // The final encoded string
}

/** Converts a Uint8 array to base64 using the browser's built-in binary to ASCII function
 * @param {Uint8Array} uint8 - The Uint8Array to convert
 * @returns {Uint8Array} The base64 encoded Uint8Array
 * @since 0.72.9
 */
export function uint8ToBase64(uint8) {
  let binary = '';
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary); // Binary to ASCII
}

/** Decodes a base 64 encoded Uint8 array using the browser's built-in ASCII to binary function
 * @param {Uint8Array} base64 - The base 64 encoded Uint8Array to convert
 * @returns {Uint8Array} The decoded Uint8Array
 * @since 0.72.9
 */
export function base64ToUint8(base64) {
  const binary = atob(base64); // ASCII to Binary
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return array;
}

/** The color palette used by wplace.live
 * @since 0.78.0
 * @examples
 * import utils from 'src/utils.js';
 * console.log(utils[5]?.name); // "White"
 * console.log(utils[5]?.rgb); // [255, 255, 255]
 */
export const colorpalette = [
  {
    "name": "Transparent",
    "rgb": [0, 0, 0]
  },
  {
    "name": "Black",
    "rgb": [0, 0, 0]
  },
  {
    "name": "Dark Gray",
    "rgb": [60, 60, 60]
  },
  {
    "name": "Gray",
    "rgb": [120, 120, 120]
  },
  {
    "name": "Light Gray",
    "rgb": [210, 210, 210]
  },
  {
    "name": "White",
    "rgb": [255, 255, 255]
  },
  {
    "name": "Deep Red",
    "rgb": [96, 0, 24]
  },
  {
    "name": "Red",
    "rgb": [237, 28, 36]
  },
  {
    "name": "Orange",
    "rgb": [255, 127, 39]
  },
  {
    "name": "Gold",
    "rgb": [246, 170, 9]
  },
  {
    "name": "Yellow",
    "rgb": [249, 221, 59]
  },
  {
    "name": "Light Yellow",
    "rgb": [255, 250, 188]
  },
  {
    "name": "Dark Green",
    "rgb": [14, 185, 104]
  },
  {
    "name": "Green",
    "rgb": [19, 230, 123]
  },
  {
    "name": "Light Green",
    "rgb": [135, 255, 94]
  },
  {
    "name": "Dark Teal",
    "rgb": [12, 129, 110]
  },
  {
    "name": "Teal",
    "rgb": [16, 174, 166]
  },
  {
    "name": "Light Teal",
    "rgb": [19, 225, 190]
  },
  {
    "name": "Dark Blue",
    "rgb": [40, 80, 158]
  },
  {
    "name": "Blue",
    "rgb": [64, 147, 228]
  },
  {
    "name": "Cyan",
    "rgb": [96, 247, 242]
  },
  {
    "name": "Indigo",
    "rgb": [107, 80, 246]
  },
  {
    "name": "Light Indigo",
    "rgb": [153, 177, 251]
  },
  {
    "name": "Dark Purple",
    "rgb": [120, 12, 153]
  },
  {
    "name": "Purple",
    "rgb": [170, 56, 185]
  },
  {
    "name": "Light Purple",
    "rgb": [224, 159, 249]
  },
  {
    "name": "Dark Pink",
    "rgb": [203, 0, 122]
  },
  {
    "name": "Pink",
    "rgb": [236, 31, 128]
  },
  {
    "name": "Light Pink",
    "rgb": [243, 141, 169]
  },
  {
    "name": "Dark Brown",
    "rgb": [104, 70, 52]
  },
  {
    "name": "Brown",
    "rgb": [149, 104, 42]
  },
  {
    "name": "Beige",
    "rgb": [248, 178, 119]
  },
  {
    "name": "Medium Gray",
    "rgb": [170, 170, 170]
  },
  {
    "name": "Dark Red",
    "rgb": [165, 14, 30]
  },
  {
    "name": "Light Red",
    "rgb": [250, 128, 114]
  },
  {
    "name": "Dark Orange",
    "rgb": [228, 92, 26]
  },
  {
    "name": "Light Tan",
    "rgb": [214, 181, 148]
  },
  {
    "name": "Dark Goldenrod",
    "rgb": [156, 132, 49]
  },
  {
    "name": "Goldenrod",
    "rgb": [197, 173, 49]
  },
  {
    "name": "Light Goldenrod",
    "rgb": [232, 212, 95]
  },
  {
    "name": "Dark Olive",
    "rgb": [74, 107, 58]
  },
  {
    "name": "Olive",
    "rgb": [90, 148, 74]
  },
  {
    "name": "Light Olive",
    "rgb": [132, 197, 115]
  },
  {
    "name": "Dark Cyan",
    "rgb": [15, 121, 159]
  },
  {
    "name": "Light Cyan",
    "rgb": [187, 250, 242]
  },
  {
    "name": "Light Blue",
    "rgb": [125, 199, 255]
  },
  {
    "name": "Dark Indigo",
    "rgb": [77, 49, 184]
  },
  {
    "name": "Dark Slate Blue",
    "rgb": [74, 66, 132]
  },
  {
    "name": "Slate Blue",
    "rgb": [122, 113, 196]
  },
  {
    "name": "Light Slate Blue",
    "rgb": [181, 174, 241]
  },
  {
    "name": "Light Brown",
    "rgb": [219, 164, 99]
  },
  {
    "name": "Dark Beige",
    "rgb": [209, 128, 81]
  },
  {
    "name": "Light Beige",
    "rgb": [255, 197, 165]
  },
  {
    "name": "Dark Peach",
    "rgb": [155, 82, 73]
  },
  {
    "name": "Peach",
    "rgb": [209, 128, 120]
  },
  {
    "name": "Light Peach",
    "rgb": [250, 182, 164]
  },
  {
    "name": "Dark Tan",
    "rgb": [123, 99, 82]
  },
  {
    "name": "Tan",
    "rgb": [156, 132, 107]
  },
  {
    "name": "Dark Slate",
    "rgb": [51, 57, 65]
  },
  {
    "name": "Slate",
    "rgb": [109, 117, 141]
  },
  {
    "name": "Light Slate",
    "rgb": [179, 185, 209]
  },
  {
    "name": "Dark Stone",
    "rgb": [109, 100, 63]
  },
  {
    "name": "Stone",
    "rgb": [148, 140, 107]
  },
  {
    "name": "Light Stone",
    "rgb": [205, 197, 158]
  }
];