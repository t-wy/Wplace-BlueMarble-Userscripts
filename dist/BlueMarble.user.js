// ==UserScript==
// @name         Blue Marble
// @namespace    https://github.com/SwingTheVine/
// @version      0.85.33
// @description  A userscript to automate and/or enhance the user experience on Wplace.live. Make sure to comply with the site's Terms of Service, and rules! This script is not affiliated with Wplace.live in any way, use at your own risk. This script is not affiliated with TamperMonkey. The author of this userscript is not responsible for any damages, issues, loss of data, or punishment that may occur as a result of using this script. This script is provided "as is" under the MPL-2.0 license. The "Blue Marble" icon is licensed under CC0 1.0 Universal (CC0 1.0) Public Domain Dedication. The image is owned by NASA.
// @author       SwingTheVine / TWY
// @license      MPL-2.0
// @supportURL   https://discord.gg/tpeBPy46hf
// @homepageURL  https://bluemarble.camilledaguin.fr/
// @icon         https://raw.githubusercontent.com/t-wy/Wplace-BlueMarble-Userscripts/9aa8fece846c9d48b452e43a1fa33303ca0e5386/dist/assets/Favicon.png
// @updateURL    https://raw.githubusercontent.com/t-wy/Wplace-BlueMarble-Userscripts/custom-improve/dist/BlueMarble.user.js
// @downloadURL  https://raw.githubusercontent.com/t-wy/Wplace-BlueMarble-Userscripts/custom-improve/dist/BlueMarble.user.js
// @match        https://wplace.live/*
// @run-at       document-start
// @grant        GM.addStyle
// @grant        GM.setValue
// @grant        GM.getValue
// ==/UserScript==

// Wplace  --> https://wplace.live
// License --> https://www.mozilla.org/en-US/MPL/2.0/

(() => {
  var __typeError = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
  var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);

  // src/polyfill.js
  if (!window.OffscreenCanvas) {
    window.OffscreenCanvas = function(width, height) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.convertToBlob = function({ type, quality } = {}) {
        return new Promise((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("toBlob() returned null"));
          }, type, quality);
        });
      };
      return canvas;
    };
  }

  // src/Overlay.js
  var _Overlay_instances, createElement_fn;
  var Overlay = class {
    /** Constructor for the Overlay class.
     * @param {string} name - The name of the userscript
     * @param {string} version - The version of the userscript
     * @since 0.0.2
     * @see {@link Overlay}
     */
    constructor(name2, version2) {
      __privateAdd(this, _Overlay_instances);
      this.name = name2;
      this.version = version2;
      this.apiManager = null;
      this.outputStatusId = "bm-output-status";
      this.overlay = null;
      this.currentParent = null;
      this.parentStack = [];
    }
    /** Populates the apiManager variable with the apiManager class.
     * @param {apiManager} apiManager - The apiManager class instance
     * @since 0.41.4
     */
    setApiManager(apiManager2) {
      this.apiManager = apiManager2;
    }
    /** Finishes building an element.
     * Call this after you are finished adding children.
     * If the element will have no children, call it anyways.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.43.2
     * @example
     * overlay
     *   .addDiv()
     *     .addHeader(1).buildElement() // Breaks out of the <h1>
     *     .addP().buildElement() // Breaks out of the <p>
     *   .buildElement() // Breaks out of the <div>
     *   .addHr() // Since there are no more elements, calling buildElement() is optional
     * .buildOverlay(document.body);
     */
    buildElement() {
      if (this.parentStack.length > 0) {
        this.currentParent = this.parentStack.pop();
      }
      return this;
    }
    /** Finishes building the overlay and displays it.
     * Call this when you are done chaining methods.
     * @param {HTMLElement} parent - The parent HTMLElement this overlay should be appended to as a child.
     * @since 0.43.2
     * @example
     * overlay
     *   .addDiv()
     *     .addP().buildElement()
     *   .buildElement()
     * .buildOverlay(document.body); // Adds DOM structure to document body
     * // <div><p></p></div>
     */
    buildOverlay(parent) {
      parent?.appendChild(this.overlay);
      this.overlay = null;
      this.currentParent = null;
      this.parentStack = [];
    }
    /** Adds a `div` to the overlay.
     * This `div` element will have properties shared between all `div` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `div` that are NOT shared between all overlay `div` elements. These should be camelCase.
     * @param {function(Overlay, HTMLDivElement):void} [callback=()=>{}] - Additional JS modification to the `div`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.43.2
     * @example
     * // Assume all <div> elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addDiv({'id': 'foo'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <div id="foo" class="bar"></div>
     * </body>
     */
    addDiv(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const div = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "div", properties, additionalProperties);
      callback(this, div);
      return this;
    }
    /** Adds a `p` to the overlay.
     * This `p` element will have properties shared between all `p` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `p` that are NOT shared between all overlay `p` elements. These should be camelCase.
     * @param {function(Overlay, HTMLParagraphElement):void} [callback=()=>{}] - Additional JS modification to the `p`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.43.2
     * @example
     * // Assume all <p> elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addP({'id': 'foo', 'textContent': 'Foobar.'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <p id="foo" class="bar">Foobar.</p>
     * </body>
     */
    addP(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const p = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "p", properties, additionalProperties);
      callback(this, p);
      return this;
    }
    /** Similar to addP, but adds a `span` instead.
     * @since 0.85.27
     */
    addSpan(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const span = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "span", properties, additionalProperties);
      callback(this, span);
      return this;
    }
    /** Similar to addSpan, but adds a `b` instead.
     * @since 0.85.27
     */
    addB(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const b = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "b", properties, additionalProperties);
      callback(this, b);
      return this;
    }
    /** Adds plain text to the overlay
     * No .buildElement() is required
     * @since 0.43.27
     */
    addText(textContent) {
      if (!this.overlay) return this;
      const textNode = document.createTextNode(textContent);
      this.currentParent?.appendChild(textNode);
      return this;
    }
    /** Adds a `small` to the overlay.
     * This `small` element will have properties shared between all `small` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `small` that are NOT shared between all overlay `small` elements. These should be camelCase.
     * @param {function(Overlay, HTMLParagraphElement):void} [callback=()=>{}] - Additional JS modification to the `small`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.55.8
     * @example
     * // Assume all <small> elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addSmall({'id': 'foo', 'textContent': 'Foobar.'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <small id="foo" class="bar">Foobar.</small>
     * </body>
     */
    addSmall(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const small = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "small", properties, additionalProperties);
      callback(this, small);
      return this;
    }
    /** Adds a `img` to the overlay.
     * This `img` element will have properties shared between all `img` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `img` that are NOT shared between all overlay `img` elements. These should be camelCase.
     * @param {function(Overlay, HTMLImageElement):void} [callback=()=>{}] - Additional JS modification to the `img`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.43.2
     * @example
     * // Assume all <img> elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addimg({'id': 'foo', 'src': './img.png'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <img id="foo" src="./img.png" class="bar">
     * </body>
     */
    addImg(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const img = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "img", properties, additionalProperties);
      callback(this, img);
      return this;
    }
    /** Adds a header to the overlay.
     * This header element will have properties shared between all header elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {number} level - The header level. Must be between 1 and 6 (inclusive)
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the header that are NOT shared between all overlay header elements. These should be camelCase.
     * @param {function(Overlay, HTMLHeadingElement):void} [callback=()=>{}] - Additional JS modification to the header.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.43.7
     * @example
     * // Assume all header elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addHeader(6, {'id': 'foo', 'textContent': 'Foobar.'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <h6 id="foo" class="bar">Foobar.</h6>
     * </body>
     */
    addHeader(level, additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const header = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "h" + level, properties, additionalProperties);
      callback(this, header);
      return this;
    }
    /** Adds a `hr` to the overlay.
     * This `hr` element will have properties shared between all `hr` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `hr` that are NOT shared between all overlay `hr` elements. These should be camelCase.
     * @param {function(Overlay, HTMLHRElement):void} [callback=()=>{}] - Additional JS modification to the `hr`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.43.7
     * @example
     * // Assume all <hr> elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addhr({'id': 'foo'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <hr id="foo" class="bar">
     * </body>
     */
    addHr(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const hr = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "hr", properties, additionalProperties);
      callback(this, hr);
      return this;
    }
    /** Adds a `br` to the overlay.
     * This `br` element will have properties shared between all `br` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `br` that are NOT shared between all overlay `br` elements. These should be camelCase.
     * @param {function(Overlay, HTMLBRElement):void} [callback=()=>{}] - Additional JS modification to the `br`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.43.11
     * @example
     * // Assume all <br> elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addbr({'id': 'foo'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <br id="foo" class="bar">
     * </body>
     */
    addBr(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const br = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "br", properties, additionalProperties);
      callback(this, br);
      return this;
    }
    /** Adds a checkbox to the overlay.
     * This checkbox element will have properties shared between all checkbox elements in the overlay.
     * You can override the shared properties by using a callback. Note: the checkbox element is inside a label element.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the checkbox that are NOT shared between all overlay checkbox elements. These should be camelCase.
     * @param {function(Overlay, HTMLLabelElement, HTMLInputElement):void} [callback=()=>{}] - Additional JS modification to the checkbox.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.43.10
     * @example
     * // Assume all checkbox elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addCheckbox({'id': 'foo', 'textContent': 'Foobar.'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <label>
     *     <input type="checkbox" id="foo" class="bar">
     *     "Foobar."
     *   </label>
     * </body>
     */
    addCheckbox(additionalProperties = {}, callback = () => {
    }) {
      const properties = { "type": "checkbox" };
      const label = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "label", { "textContent": additionalProperties["textContent"] ?? "" });
      delete additionalProperties["textContent"];
      const checkbox = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "input", properties, additionalProperties);
      label.insertBefore(checkbox, label.firstChild);
      this.buildElement();
      callback(this, label, checkbox);
      return this;
    }
    /** Adds a `button` to the overlay.
     * This `button` element will have properties shared between all `button` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `button` that are NOT shared between all overlay `button` elements. These should be camelCase.
     * @param {function(Overlay, HTMLButtonElement):void} [callback=()=>{}] - Additional JS modification to the `button`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.43.12
     * @example
     * // Assume all <button> elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addButton({'id': 'foo', 'textContent': 'Foobar.'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <button id="foo" class="bar">Foobar.</button>
     * </body>
     */
    addButton(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const button = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "button", properties, additionalProperties);
      callback(this, button);
      return this;
    }
    /** Adds a help button to the overlay. It will have a "?" icon unless overridden in callback.
     * On click, the button will attempt to output the title to the output element (ID defined in Overlay constructor).
     * This `button` element will have properties shared between all `button` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `button` that are NOT shared between all overlay `button` elements. These should be camelCase.
     * @param {function(Overlay, HTMLButtonElement):void} [callback=()=>{}] - Additional JS modification to the `button`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.43.12
     * @example
     * // Assume all help button elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addButtonHelp({'id': 'foo', 'title': 'Foobar.'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <button id="foo" class="bar" title="Help: Foobar.">?</button>
     * </body>
     * @example
     * // Assume all help button elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addButtonHelp({'id': 'foo', 'textContent': 'Foobar.'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <button id="foo" class="bar" title="Help: Foobar.">?</button>
     * </body>
     */
    addButtonHelp(additionalProperties = {}, callback = () => {
    }) {
      const tooltip = additionalProperties["title"] ?? additionalProperties["textContent"] ?? "Help: No info";
      delete additionalProperties["textContent"];
      additionalProperties["title"] = `Help: ${tooltip}`;
      const properties = {
        "textContent": "?",
        "className": "bm-help",
        "onclick": () => {
          this.updateInnerHTML(this.outputStatusId, tooltip);
        }
      };
      const help = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "button", properties, additionalProperties);
      callback(this, help);
      return this;
    }
    /** Adds a select to the overlay.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the checkbox that are NOT shared between all overlay checkbox elements. These should be camelCase.
     * @param {function(Overlay, HTMLSelectElement):void} [callback=()=>{}] - Additional JS modification to the checkbox.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.85.23
     */
    addSelect(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const select = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "select", properties, additionalProperties);
      callback(this, select);
      return this;
    }
    /** Adds a `input` to the overlay.
     * This `input` element will have properties shared between all `input` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `input` that are NOT shared between all overlay `input` elements. These should be camelCase.
     * @param {function(Overlay, HTMLInputElement):void} [callback=()=>{}] - Additional JS modification to the `input`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.43.13
     * @example
     * // Assume all <input> elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addInput({'id': 'foo', 'textContent': 'Foobar.'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <input id="foo" class="bar">Foobar.</input>
     * </body>
     */
    addInput(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const input = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "input", properties, additionalProperties);
      callback(this, input);
      return this;
    }
    /** Adds a file input to the overlay with enhanced visibility controls.
     * This input element will have properties shared between all file input elements in the overlay.
     * Uses multiple hiding methods to prevent browser native text from appearing during minimize/maximize.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the file input that are NOT shared between all overlay file input elements. These should be camelCase.
     * @param {function(Overlay, HTMLDivElement, HTMLInputElement, HTMLButtonElement):void} [callback=()=>{}] - Additional JS modification to the file input.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.43.17
     * @example
     * // Assume all file input elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addInputFile({'id': 'foo', 'textContent': 'Foobar.'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <div>
     *     <input type="file" id="foo" class="bar" style="display: none"></input>
     *     <button>Foobar.</button>
     *   </div>
     * </body>
     */
    addInputFile(additionalProperties = {}, callback = () => {
    }) {
      const properties = {
        "type": "file",
        "style": "display: none !important; visibility: hidden !important; position: absolute !important; left: -9999px !important; width: 0 !important; height: 0 !important; opacity: 0 !important;"
      };
      const text = additionalProperties["textContent"] ?? "";
      delete additionalProperties["textContent"];
      const container = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "span");
      const input = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "input", properties, additionalProperties);
      this.buildElement();
      const button = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "button", { "textContent": text });
      this.buildElement();
      this.buildElement();
      input.setAttribute("tabindex", "-1");
      input.setAttribute("aria-hidden", "true");
      button.addEventListener("click", () => {
        input.click();
      });
      input.addEventListener("change", () => {
        button.style.maxWidth = `${button.offsetWidth}px`;
        if (input.files.length > 0) {
          button.textContent = input.files[0].name;
        } else {
          button.textContent = text;
        }
      });
      callback(this, container, input, button);
      return this;
    }
    /** Adds a `textarea` to the overlay.
     * This `textarea` element will have properties shared between all `textarea` elements in the overlay.
     * You can override the shared properties by using a callback.
     * @param {Object.<string, any>} [additionalProperties={}] - The DOM properties of the `textarea` that are NOT shared between all overlay `textarea` elements. These should be camelCase.
     * @param {function(Overlay, HTMLTextAreaElement):void} [callback=()=>{}] - Additional JS modification to the `textarea`.
     * @returns {Overlay} Overlay class instance (this)
     * @since 0.43.13
     * @example
     * // Assume all <textarea> elements have a shared class (e.g. {'className': 'bar'})
     * overlay.addTextarea({'id': 'foo', 'textContent': 'Foobar.'}).buildOverlay(document.body);
     * // Output:
     * // (Assume <body> already exists in the webpage)
     * <body>
     *   <textarea id="foo" class="bar">Foobar.</textarea>
     * </body>
     */
    addTextarea(additionalProperties = {}, callback = () => {
    }) {
      const properties = {};
      const textarea = __privateMethod(this, _Overlay_instances, createElement_fn).call(this, "textarea", properties, additionalProperties);
      callback(this, textarea);
      return this;
    }
    /** Updates the inner HTML of the element.
     * The element is discovered by it's id.
     * If the element is an `input`, it will modify the value attribute instead.
     * @param {string} id - The ID of the element to change
     * @param {string} html - The HTML/text to update with
     * @param {boolean} [doSafe] - (Optional) Should `textContent` be used instead of `innerHTML` to avoid XSS? False by default
     * @since 0.24.2
     */
    updateInnerHTML(id, html, doSafe = false) {
      const element = document.getElementById(id.replace(/^#/, ""));
      if (!element) {
        return;
      }
      if (element instanceof HTMLInputElement) {
        element.value = html;
        return;
      }
      if (doSafe) {
        element.textContent = html;
      } else {
        element.innerHTML = html;
      }
    }
    /** Handles dragging of the overlay.
     * Uses requestAnimationFrame for smooth animations and GPU-accelerated transforms.
     * @param {string} moveMe - The ID of the element to be moved
     * @param {string} iMoveThings - The ID of the drag handle element
     * @since 0.8.2
    */
    handleDrag(moveMe, iMoveThings) {
      let isDragging = false;
      let offsetX, offsetY = 0;
      let animationFrame = null;
      let currentX = 0;
      let currentY = 0;
      let targetX = 0;
      let targetY = 0;
      moveMe = document.querySelector(moveMe?.[0] == "#" ? moveMe : "#" + moveMe);
      iMoveThings = document.querySelector(iMoveThings?.[0] == "#" ? iMoveThings : "#" + iMoveThings);
      if (!moveMe || !iMoveThings) {
        this.handleDisplayError(`Can not drag! ${!moveMe ? "moveMe" : ""} ${!moveMe && !iMoveThings ? "and " : ""}${!iMoveThings ? "iMoveThings " : ""}was not found!`);
        return;
      }
      const updatePosition = () => {
        if (isDragging) {
          const deltaX = Math.abs(currentX - targetX);
          const deltaY = Math.abs(currentY - targetY);
          if (deltaX > 0.5 || deltaY > 0.5) {
            currentX = targetX;
            currentY = targetY;
            moveMe.style.transform = `translate(${currentX}px, ${currentY}px)`;
            moveMe.style.left = "0px";
            moveMe.style.top = "0px";
            moveMe.style.right = "";
          }
          animationFrame = requestAnimationFrame(updatePosition);
        }
      };
      let initialRect = null;
      const startDrag = (clientX, clientY) => {
        isDragging = true;
        initialRect = moveMe.getBoundingClientRect();
        offsetX = clientX - initialRect.left;
        offsetY = clientY - initialRect.top;
        const computedStyle = window.getComputedStyle(moveMe);
        const transform = computedStyle.transform;
        if (transform && transform !== "none") {
          const matrix = new DOMMatrix(transform);
          currentX = matrix.m41;
          currentY = matrix.m42;
        } else {
          currentX = initialRect.left;
          currentY = initialRect.top;
        }
        targetX = currentX;
        targetY = currentY;
        document.body.style.userSelect = "none";
        iMoveThings.classList.add("dragging");
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
        }
        updatePosition();
      };
      const endDrag = () => {
        isDragging = false;
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
          animationFrame = null;
        }
        document.body.style.userSelect = "";
        iMoveThings.classList.remove("dragging");
      };
      iMoveThings.addEventListener("mousedown", function(event) {
        event.preventDefault();
        startDrag(event.clientX, event.clientY);
      });
      iMoveThings.addEventListener("touchstart", function(event) {
        const touch = event?.touches?.[0];
        if (!touch) {
          return;
        }
        startDrag(touch.clientX, touch.clientY);
        event.preventDefault();
      }, { passive: false });
      document.addEventListener("mousemove", function(event) {
        if (isDragging && initialRect) {
          targetX = event.clientX - offsetX;
          targetY = event.clientY - offsetY;
        }
      }, { passive: true });
      document.addEventListener("touchmove", function(event) {
        if (isDragging && initialRect) {
          const touch = event?.touches?.[0];
          if (!touch) {
            return;
          }
          targetX = touch.clientX - offsetX;
          targetY = touch.clientY - offsetY;
          event.preventDefault();
        }
      }, { passive: false });
      document.addEventListener("mouseup", endDrag);
      document.addEventListener("touchend", endDrag);
      document.addEventListener("touchcancel", endDrag);
    }
    /** Handles status display.
     * This will output plain text into the output Status box.
     * Additionally, this will output an info message to the console.
     * @param {string} text - The status text to display.
     * @since 0.58.4
     */
    handleDisplayStatus(text) {
      const consoleInfo = console.info;
      consoleInfo(`${this.name}: ${text}`);
      this.updateInnerHTML(this.outputStatusId, "Status: " + text, true);
    }
    /** Handles error display.
     * This will output plain text into the output Status box.
     * Additionally, this will output an error to the console.
     * @param {string} text - The error text to display.
     * @since 0.41.6
     */
    handleDisplayError(text) {
      const consoleError2 = console.error;
      consoleError2(`${this.name}: ${text}`);
      this.updateInnerHTML(this.outputStatusId, "Error: " + text, true);
    }
  };
  _Overlay_instances = new WeakSet();
  /** Creates an element.
   * For **internal use** of the {@link Overlay} class.
   * @param {string} tag - The tag name as a string.
   * @param {Object.<string, any>} [properties={}] - The DOM properties of the element.
   * @returns {HTMLElement} HTML Element
   * @since 0.43.2
   */
  createElement_fn = function(tag, properties = {}, additionalProperties = {}) {
    const element = document.createElement(tag);
    if (!this.overlay) {
      this.overlay = element;
      this.currentParent = element;
    } else {
      this.currentParent?.appendChild(element);
      this.parentStack.push(this.currentParent);
      this.currentParent = element;
    }
    for (const [property, value] of Object.entries(properties)) {
      element[property] = value;
    }
    for (const [property, value] of Object.entries(additionalProperties)) {
      element[property] = value;
    }
    return element;
  };

  // src/utils.js
  function serverTPtoDisplayTP(tile, pixel) {
    return [parseInt(tile[0]) % 4 * 1e3 + parseInt(pixel[0]), parseInt(tile[1]) % 4 * 1e3 + parseInt(pixel[1])];
  }
  function consoleLog(...args) {
    ((consoleLog2) => consoleLog2(...args))(console.log);
  }
  function consoleWarn(...args) {
    ((consoleWarn2) => consoleWarn2(...args))(console.warn);
  }
  function numberToEncoded(number, encoding) {
    if (number === 0) return encoding[0];
    let result = "";
    const base = encoding.length;
    while (number > 0) {
      result = encoding[number % base] + result;
      number = Math.floor(number / base);
    }
    return result;
  }
  function uint8ToBase64(uint8) {
    let binary = "";
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    return btoa(binary);
  }
  function base64ToUint8(base64) {
    const binary = atob(base64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return array;
  }
  function selectAllCoordinateInputs(document2) {
    coords = [];
    coords.push(document2.querySelector("#bm-input-tx"));
    coords.push(document2.querySelector("#bm-input-ty"));
    coords.push(document2.querySelector("#bm-input-px"));
    coords.push(document2.querySelector("#bm-input-py"));
    return coords;
  }
  var colorpalette = [
    { "id": 0, "premium": false, "name": "Transparent", "rgb": [0, 0, 0] },
    { "id": 1, "premium": false, "name": "Black", "rgb": [0, 0, 0] },
    { "id": 2, "premium": false, "name": "Dark Gray", "rgb": [60, 60, 60] },
    { "id": 3, "premium": false, "name": "Gray", "rgb": [120, 120, 120] },
    { "id": 4, "premium": false, "name": "Light Gray", "rgb": [210, 210, 210] },
    { "id": 5, "premium": false, "name": "White", "rgb": [255, 255, 255] },
    { "id": 6, "premium": false, "name": "Deep Red", "rgb": [96, 0, 24] },
    { "id": 7, "premium": false, "name": "Red", "rgb": [237, 28, 36] },
    { "id": 8, "premium": false, "name": "Orange", "rgb": [255, 127, 39] },
    { "id": 9, "premium": false, "name": "Gold", "rgb": [246, 170, 9] },
    { "id": 10, "premium": false, "name": "Yellow", "rgb": [249, 221, 59] },
    { "id": 11, "premium": false, "name": "Light Yellow", "rgb": [255, 250, 188] },
    { "id": 12, "premium": false, "name": "Dark Green", "rgb": [14, 185, 104] },
    { "id": 13, "premium": false, "name": "Green", "rgb": [19, 230, 123] },
    { "id": 14, "premium": false, "name": "Light Green", "rgb": [135, 255, 94] },
    { "id": 15, "premium": false, "name": "Dark Teal", "rgb": [12, 129, 110] },
    { "id": 16, "premium": false, "name": "Teal", "rgb": [16, 174, 166] },
    { "id": 17, "premium": false, "name": "Light Teal", "rgb": [19, 225, 190] },
    { "id": 18, "premium": false, "name": "Dark Blue", "rgb": [40, 80, 158] },
    { "id": 19, "premium": false, "name": "Blue", "rgb": [64, 147, 228] },
    { "id": 20, "premium": false, "name": "Cyan", "rgb": [96, 247, 242] },
    { "id": 21, "premium": false, "name": "Indigo", "rgb": [107, 80, 246] },
    { "id": 22, "premium": false, "name": "Light Indigo", "rgb": [153, 177, 251] },
    { "id": 23, "premium": false, "name": "Dark Purple", "rgb": [120, 12, 153] },
    { "id": 24, "premium": false, "name": "Purple", "rgb": [170, 56, 185] },
    { "id": 25, "premium": false, "name": "Light Purple", "rgb": [224, 159, 249] },
    { "id": 26, "premium": false, "name": "Dark Pink", "rgb": [203, 0, 122] },
    { "id": 27, "premium": false, "name": "Pink", "rgb": [236, 31, 128] },
    { "id": 28, "premium": false, "name": "Light Pink", "rgb": [243, 141, 169] },
    { "id": 29, "premium": false, "name": "Dark Brown", "rgb": [104, 70, 52] },
    { "id": 30, "premium": false, "name": "Brown", "rgb": [149, 104, 42] },
    { "id": 31, "premium": false, "name": "Beige", "rgb": [248, 178, 119] },
    { "id": 32, "premium": true, "name": "Medium Gray", "rgb": [170, 170, 170] },
    { "id": 33, "premium": true, "name": "Dark Red", "rgb": [165, 14, 30] },
    { "id": 34, "premium": true, "name": "Light Red", "rgb": [250, 128, 114] },
    { "id": 35, "premium": true, "name": "Dark Orange", "rgb": [228, 92, 26] },
    { "id": 36, "premium": true, "name": "Light Tan", "rgb": [214, 181, 148] },
    { "id": 37, "premium": true, "name": "Dark Goldenrod", "rgb": [156, 132, 49] },
    { "id": 38, "premium": true, "name": "Goldenrod", "rgb": [197, 173, 49] },
    { "id": 39, "premium": true, "name": "Light Goldenrod", "rgb": [232, 212, 95] },
    { "id": 40, "premium": true, "name": "Dark Olive", "rgb": [74, 107, 58] },
    { "id": 41, "premium": true, "name": "Olive", "rgb": [90, 148, 74] },
    { "id": 42, "premium": true, "name": "Light Olive", "rgb": [132, 197, 115] },
    { "id": 43, "premium": true, "name": "Dark Cyan", "rgb": [15, 121, 159] },
    { "id": 44, "premium": true, "name": "Light Cyan", "rgb": [187, 250, 242] },
    { "id": 45, "premium": true, "name": "Light Blue", "rgb": [125, 199, 255] },
    { "id": 46, "premium": true, "name": "Dark Indigo", "rgb": [77, 49, 184] },
    { "id": 47, "premium": true, "name": "Dark Slate Blue", "rgb": [74, 66, 132] },
    { "id": 48, "premium": true, "name": "Slate Blue", "rgb": [122, 113, 196] },
    { "id": 49, "premium": true, "name": "Light Slate Blue", "rgb": [181, 174, 241] },
    { "id": 50, "premium": true, "name": "Light Brown", "rgb": [219, 164, 99] },
    { "id": 51, "premium": true, "name": "Dark Beige", "rgb": [209, 128, 81] },
    { "id": 52, "premium": true, "name": "Light Beige", "rgb": [255, 197, 165] },
    { "id": 53, "premium": true, "name": "Dark Peach", "rgb": [155, 82, 73] },
    { "id": 54, "premium": true, "name": "Peach", "rgb": [209, 128, 120] },
    { "id": 55, "premium": true, "name": "Light Peach", "rgb": [250, 182, 164] },
    { "id": 56, "premium": true, "name": "Dark Tan", "rgb": [123, 99, 82] },
    { "id": 57, "premium": true, "name": "Tan", "rgb": [156, 132, 107] },
    { "id": 58, "premium": true, "name": "Dark Slate", "rgb": [51, 57, 65] },
    { "id": 59, "premium": true, "name": "Slate", "rgb": [109, 117, 141] },
    { "id": 60, "premium": true, "name": "Light Slate", "rgb": [179, 185, 209] },
    { "id": 61, "premium": true, "name": "Dark Stone", "rgb": [109, 100, 63] },
    { "id": 62, "premium": true, "name": "Stone", "rgb": [148, 140, 107] },
    { "id": 63, "premium": true, "name": "Light Stone", "rgb": [205, 197, 158] }
  ];
  var rgbToMeta = new Map(
    colorpalette.filter((color) => Array.isArray(color?.rgb)).map((color) => [`${color.rgb[0]},${color.rgb[1]},${color.rgb[2]}`, { id: color.id, premium: !!color.premium, name: color.name }])
  );
  var defaceKey = "222,250,206";
  try {
    const transparent = colorpalette.find((color) => (color?.name || "").toLowerCase() === "transparent");
    if (transparent && Array.isArray(transparent.rgb)) {
      rgbToMeta.set(defaceKey, { id: transparent.id, premium: !!transparent.premium, name: transparent.name });
    }
  } catch (ignored) {
  }
  var keyOther = "other";
  try {
    rgbToMeta.set(keyOther, { id: "other", premium: false, name: "Other" });
  } catch (ignored) {
  }
  function coordsTileToGeoCoords(coordsTile, coordsPixel) {
    const relX = (coordsTile[0] * 1e3 + coordsPixel[0] + 0.5) / (2048 * 1e3);
    const relY = 1 - (coordsTile[1] * 1e3 + coordsPixel[1] + 0.5) / (2048 * 1e3);
    return [
      360 * Math.atan(Math.exp((relY * 2 - 1) * Math.PI)) / Math.PI - 90,
      relX * 360 - 180
    ];
  }
  function coordsGeoToTileCoords(latitude, longitude) {
    const relX = (longitude + 180) / 360;
    const relY = (Math.log(Math.tan((90 + latitude) * Math.PI / 360)) / Math.PI + 1) / 2;
    const tileX = Math.floor(relX * 2048 * 1e3);
    const tileY = Math.floor((1 - relY) * 2048 * 1e3);
    return [
      [
        Math.floor(tileX / 1e3),
        Math.floor(tileY / 1e3)
      ],
      [
        tileX % 1e3,
        tileY % 1e3
      ]
    ];
  }
  function cleanUpCanvas(canvas) {
    canvas.width = 0;
    canvas.height = 0;
    if (canvas.constructor === HTMLCanvasElement) canvas.remove();
    canvas = null;
  }
  function teleportToGeoCoords(lat, lng, smooth = true) {
    const allianceButton = document.querySelector(".flex>.btn.btn-square.relative.shadow-md");
    let teleportFunc = null;
    if (allianceButton !== null && smooth) {
      if (allianceButton["__click"] !== void 0) {
        const lastPixelFunc = allianceButton === null ? null : allianceButton["__click"][1]["reactions"][0]["ctx"]["s"]["onlastpixelclick"];
        teleportFunc = (lat2, lng2) => lastPixelFunc({ "lat": lat2, "lng": lng2 });
      } else {
        teleportFunc = (lat2, lng2) => {
          const injectedFunc = () => {
            const script2 = document.currentScript;
            const lat3 = +script2.getAttribute("bm-lat");
            const lng3 = +script2.getAttribute("bm-lng");
            document.querySelector(".flex>.btn.btn-square.relative.shadow-md")["__click"][1]["reactions"][0]["ctx"]["s"]["onlastpixelclick"]({ "lat": lat3, "lng": lng3 });
          };
          const script = document.createElement("script");
          script.setAttribute("bm-lat", lat2);
          script.setAttribute("bm-lng", lng2);
          script.textContent = `(${injectedFunc})();`;
          document.documentElement?.appendChild(script);
          script.remove();
        };
      }
    } else {
      const myLocationButton = document.querySelector(".right-3>button");
      const funcName = smooth ? "flyTo" : "jumpTo";
      if (myLocationButton !== null) {
        if (myLocationButton["__click"] !== void 0) {
          const map = myLocationButton["__click"][3]["v"];
          if (map !== null && typeof map["version"] == "string") {
            teleportFunc = (lat2, lng2) => map[funcName]({ "center": [lng2, lat2], "zoom": 16 });
          }
        } else {
          teleportFunc = (lat2, lng2) => {
            const injectedFunc = () => {
              const script2 = document.currentScript;
              const lat3 = +script2.getAttribute("bm-lat");
              const lng3 = +script2.getAttribute("bm-lng");
              const funcName2 = script2.getAttribute("bm-funcName");
              document.querySelector(".right-3>button")["__click"][3]["v"][funcName2]({ "center": [lng3, lat3], "zoom": 16 });
            };
            const script = document.createElement("script");
            script.setAttribute("bm-lat", lat2);
            script.setAttribute("bm-lng", lng2);
            script.setAttribute("bm-funcName", funcName);
            script.textContent = `(${injectedFunc})();`;
            document.documentElement?.appendChild(script);
            script.remove();
          };
        }
      }
    }
    if (teleportFunc !== null) {
      teleportFunc(lat, lng);
    } else {
      const url = `https://wplace.live/?lat=${lat}&lng=${lng}&zoom=14`;
      window.location.href = url;
    }
  }
  function teleportToTileCoords(coordsTile, coordsPixel, smooth = true) {
    const geoCoords = coordsTileToGeoCoords(coordsTile, coordsPixel);
    teleportToGeoCoords(geoCoords[0], geoCoords[1], smooth);
  }
  function getOverlayCoordsRaw() {
    const tx = document.querySelector("#bm-input-tx")?.value || "";
    const ty = document.querySelector("#bm-input-ty")?.value || "";
    const px = document.querySelector("#bm-input-px")?.value || "";
    const py = document.querySelector("#bm-input-py")?.value || "";
    return [[tx, ty], [px, py]];
  }
  function getOverlayCoords() {
    const rawCoords = getOverlayCoordsRaw();
    const tx = Number(rawCoords[0][0]);
    const ty = Number(rawCoords[0][1]);
    const px = Number(rawCoords[1][0]);
    const py = Number(rawCoords[1][1]);
    return [[tx, ty], [px, py]];
  }
  function areOverlayCoordsFilledAndValid() {
    const rawCoords = getOverlayCoordsRaw();
    const parsedCoords = getOverlayCoords();
    if (rawCoords.some(
      (coords2) => coords2.some(
        (coord) => coord === ""
      )
    )) return false;
    if (parsedCoords.some(
      (coords2) => coords2.some(
        (coord) => isNaN(coord) || coord < 0
      )
    )) return false;
    if (parsedCoords[0][0] > 2048) return false;
    if (parsedCoords[0][1] > 2048) return false;
    if (parsedCoords[1][0] > 1e3) return false;
    if (parsedCoords[1][1] > 1e3) return false;
    return true;
  }
  var sortByOptions = {
    "total": ([rgb, paintedCount, totalCount]) => totalCount,
    "painted": ([rgb, paintedCount, totalCount]) => paintedCount,
    "remaining": ([rgb, paintedCount, totalCount]) => totalCount - paintedCount,
    "painted%": ([rgb, paintedCount, totalCount]) => paintedCount / (totalCount === 0 ? 1 : totalCount),
    "hue": ([rgb, paintedCount, totalCount]) => {
      if (rgb === "other") return 361;
      if (rgb === "#deface") return -1;
      const [r, g, b] = rgb.split(",").map(Number);
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const delta = max - min;
      if (delta === 0) return 361 + r;
      if (max === r) {
        return ((g - b) / delta + 6) % 6 * 60;
      } else if (max === g) {
        return ((b - r) / delta + 2) * 60;
      } else {
        return ((r - g) / delta + 4) * 60;
      }
    },
    "luminance": ([rgb, paintedCount, totalCount]) => {
      if (rgb === "other") return 2;
      if (rgb === "#deface") return 0;
      const [r, g, b] = rgb.split(",").map(Number);
      return (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
    }
  };
  function copyToClipboard(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(text);
    } else {
      var temp = document.createElement("textArea");
      temp.innerHTML = text;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand("copy");
      document.body.removeChild(temp);
    }
  }
  function calculateTopLeftAndSize(coords1, coords2) {
    const xs = [
      coords1[0][0] % 2048 * 1e3 + coords1[1][0] % 1e3,
      coords2[0][0] % 2048 * 1e3 + coords2[1][0] % 1e3
    ];
    const ys = [
      coords1[0][1] % 2048 * 1e3 + coords1[1][1] % 1e3,
      coords2[0][1] % 2048 * 1e3 + coords2[1][1] % 1e3
    ];
    const top = Math.min(ys[0], ys[1]);
    const height = Math.abs(ys[0] - ys[1]) + 1;
    const rawWidth = Math.abs(xs[0] - xs[1]) + 1;
    const earthWrap = rawWidth * 2 > 2048 * 1e3;
    const left = earthWrap ? Math.max(xs[0], xs[1]) : Math.min(xs[0], xs[1]);
    const width = earthWrap ? 2048 * 1e3 - rawWidth + 2 : rawWidth;
    return [[left, top], [width, height]];
  }
  function testCanvasSize(width, height) {
    let canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d");
    context.fillRect(width - 1, height - 1, 1, 1);
    const result = context.getImageData(width - 1, height - 1, 1, 1).data[3] !== 0;
    cleanUpCanvas(canvas);
    canvas = null;
    return result;
  }
  function downloadTile(tx, ty) {
    const remoteURL = "https://backend.wplace.live/files/s0/tiles/" + tx % 2048 + "/" + ty + ".png";
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = function() {
        resolve(img);
      };
      img.onerror = function(error) {
        reject(error);
      };
      img.src = remoteURL;
    });
  }

  // src/Template.js
  var Template = class {
    /** The constructor for the {@link Template} class with enhanced pixel tracking.
     * @param {Object} [params={}] - Object containing all optional parameters
     * @param {string} [params.displayName='My template'] - The display name of the template
     * @param {number} [params.sortID=0] - The sort number of the template for rendering priority
     * @param {string} [params.authorID=''] - The user ID of the person who exported the template (prevents sort ID collisions)
     * @param {string} [params.url=''] - The URL to the source image
     * @param {File} [params.file=null] - The template file (pre-processed File or processed bitmap)
     * @param {Array<number>} [params.coords=null] - The coordinates of the top left corner as (tileX, tileY, pixelX, pixelY)
     * @param {Object} [params.chunked=null] - The affected chunks of the template, and their template for each chunk
     * @param {number} [params.tileSize=1000] - The size of a tile in pixels (assumes square tiles)
     * @param {number} [params.pixelCount=0] - Total number of pixels in the template (calculated automatically during processing)
     * @since 0.65.2
     */
    constructor({
      displayName = "My template",
      sortID = 0,
      authorID = "",
      url = "",
      file = null,
      coords: coords2 = null,
      chunked = null,
      chunkedBuffer = null,
      tileSize = 1e3
    } = {}) {
      this.displayName = displayName;
      this.sortID = sortID;
      this.authorID = authorID;
      this.url = url;
      this.file = file;
      this.coords = coords2;
      this.chunked = chunked;
      this.chunkedBuffer = chunkedBuffer;
      this.tileSize = tileSize;
      this.enabled = true;
      this.pixelCount = 0;
      this.requiredPixelCount = 0;
      this.defacePixelCount = 0;
      this.colorPalette = {};
      this.tilePrefixes = /* @__PURE__ */ new Set();
      this.storageKey = null;
      this.storageTimeString = Date.now().toString();
      console.log("Allowed colors for template:", new Set(rgbToMeta.keys()));
      this.shreadSize = null;
    }
    customMask(x, y, shreadSize) {
      const center = shreadSize - 1 >> 1;
      return (x % shreadSize == center || y % shreadSize == center) && (x % shreadSize >= center - 1 && x % shreadSize <= center + 1 && y % shreadSize >= center - 1 && y % shreadSize <= center + 1);
    }
    customMaskPoints(shreadSize) {
      const result = [];
      for (let offsetY = 0; offsetY < shreadSize; offsetY++) {
        for (let offsetX = 0; offsetX < shreadSize; offsetX++) {
          if (this.customMask(offsetX, offsetY, shreadSize)) {
            result.push([offsetX, offsetY]);
          }
        }
      }
      return result;
    }
    testCanvasSize() {
      let canvas = new OffscreenCanvas(5e3, 5e3);
      const context = canvas.getContext("2d");
      context.fillRect(4999, 4999, 1, 1);
      const result = context.getImageData(4999, 4999, 1, 1).data[3] !== 0;
      cleanUpCanvas(canvas);
      canvas = null;
      return result;
    }
    /** Creates chunks of the template for each tile.
     * 
     * @returns {Object} Collection of template bitmaps & buffers organized by tile coordinates
     * @since 0.65.4
     */
    async createTemplateTiles() {
      console.log("Template coordinates:", this.coords);
      if (this.shreadSize === null) {
        this.shreadSize = this.testCanvasSize() ? 5 : 4;
      }
      const shreadSize = this.shreadSize;
      const bitmap = await createImageBitmap(this.file, { "colorSpaceConversion": "none" });
      const imageWidth = bitmap.width;
      const imageHeight = bitmap.height;
      const totalPixels = imageWidth * imageHeight;
      console.log(`Template pixel analysis - Dimensions: ${imageWidth}\xD7${imageHeight} = ${totalPixels.toLocaleString()} pixels`);
      this.pixelCount = totalPixels;
      try {
        let inspectCanvas = new OffscreenCanvas(imageWidth, imageHeight);
        const inspectCtx = inspectCanvas.getContext("2d", { willReadFrequently: true });
        inspectCtx.imageSmoothingEnabled = false;
        inspectCtx.clearRect(0, 0, imageWidth, imageHeight);
        inspectCtx.drawImage(bitmap, 0, 0);
        const inspectData = inspectCtx.getImageData(0, 0, imageWidth, imageHeight).data;
        cleanUpCanvas(inspectCanvas);
        inspectCanvas = null;
        let required = 0;
        let deface = 0;
        const paletteMap = /* @__PURE__ */ new Map();
        for (let y = 0; y < imageHeight; y++) {
          for (let x = 0; x < imageWidth; x++) {
            const idx = (y * imageWidth + x) * 4;
            const r = inspectData[idx];
            const g = inspectData[idx + 1];
            const b = inspectData[idx + 2];
            const a = inspectData[idx + 3];
            if (a === 0) {
              continue;
            }
            if (r === 222 && g === 250 && b === 206) {
              deface++;
            }
            const key = rgbToMeta.has(`${r},${g},${b}`) ? `${r},${g},${b}` : "other";
            required++;
            paletteMap.set(key, (paletteMap.get(key) || 0) + 1);
          }
        }
        this.requiredPixelCount = required;
        this.defacePixelCount = deface;
        const paletteObj = {};
        for (const [key, count] of paletteMap.entries()) {
          paletteObj[key] = { count, enabled: true };
        }
        this.colorPalette = paletteObj;
      } catch (err) {
        this.requiredPixelCount = Math.max(0, this.pixelCount);
        this.defacePixelCount = 0;
        console.warn("Failed to compute required/deface counts. Falling back to total pixels.", err);
      }
      const templateTiles = {};
      const templateTilesBuffers = {};
      let canvas = new OffscreenCanvas(this.tileSize, this.tileSize);
      const context = canvas.getContext("2d", { willReadFrequently: true });
      for (let pixelY = this.coords[3]; pixelY < imageHeight + this.coords[3]; ) {
        const drawSizeY = Math.min(
          this.tileSize - pixelY % this.tileSize,
          // remaining y in this tile
          imageHeight + this.coords[3] - pixelY
          // bottom y
        );
        console.log(`Math.min(${this.tileSize} - (${pixelY} % ${this.tileSize}), ${imageHeight} - (${pixelY - this.coords[3]}))`);
        for (let pixelX = this.coords[2]; pixelX < imageWidth + this.coords[2]; ) {
          console.log(`Pixel X: ${pixelX}
Pixel Y: ${pixelY}`);
          const drawSizeX = Math.min(
            this.tileSize - pixelX % this.tileSize,
            // remaining x in this tile
            imageWidth + this.coords[2] - pixelX
            // right x
          );
          console.log(`Math.min(${this.tileSize} - (${pixelX} % ${this.tileSize}), ${imageWidth} - (${pixelX - this.coords[2]}))`);
          console.log(`Draw Size X: ${drawSizeX}
Draw Size Y: ${drawSizeY}`);
          const canvasWidth = drawSizeX * shreadSize;
          const canvasHeight = drawSizeY * shreadSize;
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;
          console.log(`Draw X: ${drawSizeX}
Draw Y: ${drawSizeY}
Canvas Width: ${canvasWidth}
Canvas Height: ${canvasHeight}`);
          context.imageSmoothingEnabled = false;
          console.log(`Getting X ${pixelX}-${pixelX + drawSizeX}
Getting Y ${pixelY}-${pixelY + drawSizeY}`);
          context.clearRect(0, 0, canvasWidth, canvasHeight);
          context.drawImage(
            bitmap,
            // Bitmap image to draw
            pixelX - this.coords[2],
            // Coordinate X to draw from
            pixelY - this.coords[3],
            // Coordinate Y to draw from
            drawSizeX,
            // X width to draw from
            drawSizeY,
            // Y height to draw from
            0,
            // Coordinate X to draw at
            0,
            // Coordinate Y to draw at
            drawSizeX * shreadSize,
            // X width to draw at
            drawSizeY * shreadSize
            // Y height to draw at
          );
          const imageData = context.getImageData(0, 0, canvasWidth, canvasHeight);
          for (let y = 0; y < canvasHeight; y++) {
            for (let x = 0; x < canvasWidth; x++) {
              const pixelIndex = (y * canvasWidth + x) * 4;
              if (imageData.data[pixelIndex] === 222 && imageData.data[pixelIndex + 1] === 250 && imageData.data[pixelIndex + 2] === 206) {
                if ((x + y) % 2 === 0) {
                  imageData.data[pixelIndex] = 0;
                  imageData.data[pixelIndex + 1] = 0;
                  imageData.data[pixelIndex + 2] = 0;
                } else {
                  imageData.data[pixelIndex] = 255;
                  imageData.data[pixelIndex + 1] = 255;
                  imageData.data[pixelIndex + 2] = 255;
                }
                imageData.data[pixelIndex + 3] = 32;
              } else if (!this.customMask(x, y, shreadSize)) {
                imageData.data[pixelIndex + 3] = 0;
              }
            }
          }
          console.log(`Shreaded pixels for ${pixelX}, ${pixelY}`, imageData);
          context.putImageData(imageData, 0, 0);
          const templateTileName = `${(this.coords[0] + Math.floor(pixelX / 1e3)).toString().padStart(4, "0")},${(this.coords[1] + Math.floor(pixelY / 1e3)).toString().padStart(4, "0")},${(pixelX % 1e3).toString().padStart(3, "0")},${(pixelY % 1e3).toString().padStart(3, "0")}`;
          templateTiles[templateTileName] = await createImageBitmap(canvas);
          this.tilePrefixes.add(templateTileName.split(",").slice(0, 2).join(","));
          const canvasBlob = await canvas.convertToBlob();
          const canvasBuffer = await canvasBlob.arrayBuffer();
          const canvasBufferBytes = Array.from(new Uint8Array(canvasBuffer));
          templateTilesBuffers[templateTileName] = uint8ToBase64(canvasBufferBytes);
          console.log(templateTiles);
          pixelX += drawSizeX;
        }
        pixelY += drawSizeY;
      }
      bitmap.close();
      cleanUpCanvas(canvas);
      canvas = null;
      console.log("Template Tiles: ", templateTiles);
      console.log("Template Tiles Buffers: ", templateTilesBuffers);
      return { templateTiles, templateTilesBuffers };
    }
    /** Get the bitmap for a tile key. Supporting memory-saving mode
     * @param {string} tileKey - The tile key
     * @param {boolean} memorySaving - Whether to store the bitmap in memory
     * @since 0.85.33
     */
    async getChunked(tileKey, memorySaving = false) {
      if (this.chunked[tileKey] === void 0) {
        return void 0;
      }
      if (this.chunked[tileKey] !== null) {
        return this.chunked[tileKey];
      }
      const templateBlob = new Blob([this.chunkedBuffer[tileKey]], { type: "image/png" });
      const templateBitmap = await createImageBitmap(templateBlob);
      if (memorySaving === false) {
        this.chunked[tileKey] = templateBitmap;
      }
      ;
      return templateBitmap;
    }
  };

  // src/templateManager.js
  var _TemplateManager_instances, loadTemplate_fn, parseBlueMarble_fn, parseOSU_fn;
  var TemplateManager = class {
    /** The constructor for the {@link TemplateManager} class.
     * @since 0.55.8
     */
    constructor(name2, version2, overlay) {
      __privateAdd(this, _TemplateManager_instances);
      this.name = name2;
      this.version = version2;
      this.overlay = overlay;
      this.templatesVersion = "1.0.0";
      this.userID = null;
      this.encodingBase = "!#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~";
      this.tileSize = 1e3;
      this.drawMult = testCanvasSize(5e3, 5e3) ? 5 : 4;
      this.drawMultCenter = this.drawMult - 1 >> 1;
      this.canvasTemplate = null;
      this.canvasTemplateZoomed = null;
      this.canvasTemplateID = "bm-canvas";
      this.canvasMainID = "div#map canvas.maplibregl-canvas";
      this.template = null;
      this.templatesArray = [];
      this.templatesJSON = null;
      this.tileProgress = /* @__PURE__ */ new Map();
      this.extraColorsBitmap = 0;
      this.userSettings = {};
      this.hideLockedColors = false;
      this.largestSeenSortID = 0;
    }
    /** Retrieves the pixel art canvas.
     * If the canvas has been updated/replaced, it retrieves the new one.
     * @param {string} selector - The CSS selector to use to find the canvas.
     * @returns {HTMLCanvasElement|null} The canvas as an HTML Canvas Element, or null if the canvas does not exist
     * @since 0.58.3
     * @deprecated Not in use since 0.63.25
     */
    getCanvas() {
      if (document.body.contains(this.canvasTemplate)) {
        return this.canvasTemplate;
      }
      document.getElementById(this.canvasTemplateID)?.remove();
      const canvasMain = document.querySelector(this.canvasMainID);
      const canvasTemplateNew = document.createElement("canvas");
      canvasTemplateNew.id = this.canvasTemplateID;
      canvasTemplateNew.className = "maplibregl-canvas";
      canvasTemplateNew.style.position = "absolute";
      canvasTemplateNew.style.top = "0";
      canvasTemplateNew.style.left = "0";
      canvasTemplateNew.style.height = `${canvasMain?.clientHeight * (window.devicePixelRatio || 1)}px`;
      canvasTemplateNew.style.width = `${canvasMain?.clientWidth * (window.devicePixelRatio || 1)}px`;
      canvasTemplateNew.height = canvasMain?.clientHeight * (window.devicePixelRatio || 1);
      canvasTemplateNew.width = canvasMain?.clientWidth * (window.devicePixelRatio || 1);
      canvasTemplateNew.style.zIndex = "8999";
      canvasTemplateNew.style.pointerEvents = "none";
      canvasMain?.parentElement?.appendChild(canvasTemplateNew);
      this.canvasTemplate = canvasTemplateNew;
      window.addEventListener("move", this.onMove);
      window.addEventListener("zoom", this.onZoom);
      window.addEventListener("resize", this.onResize);
      return this.canvasTemplate;
    }
    /** Creates the JSON object to store templates in
     * @returns {{ whoami: string, scriptVersion: string, schemaVersion: string, templates: Object }} The JSON object
     * @since 0.65.4
     */
    async createJSON() {
      return {
        "whoami": this.name.replace(" ", ""),
        // Name of userscript without spaces
        "scriptVersion": this.version,
        // Version of userscript
        "schemaVersion": this.templatesVersion,
        // Version of JSON schema
        "templates": {}
        // The templates
      };
    }
    /** Creates the template from the inputed file blob
     * @param {File} blob - The file blob to create a template from
     * @param {string} name - The display name of the template
     * @param {Array<number, number, number, number>} coords - The coordinates of the top left corner of the template
     * @since 0.65.77
     */
    async createTemplate(blob, name2, coords2) {
      if (!this.templatesJSON) {
        this.templatesJSON = await this.createJSON();
        console.log(`Creating JSON...`);
      }
      this.overlay.handleDisplayStatus(`Creating template at ${coords2.join(", ")}...`);
      const authorID = numberToEncoded(this.userID || 0, this.encodingBase);
      const template = new Template({
        displayName: name2,
        sortID: this.largestSeenSortID + 1,
        // Uncomment this to enable multiple templates (1/2)
        authorID,
        file: blob,
        coords: coords2
      });
      this.largestSeenSortID++;
      template.shreadSize = this.drawMult;
      const { templateTiles, templateTilesBuffers } = await template.createTemplateTiles(this.tileSize);
      const toggleStatus = this.getPaletteToggledStatus();
      for (const key of Object.keys(template.colorPalette)) {
        if (toggleStatus[key] !== void 0) {
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
        template.chunked = templateTiles;
      }
      template.chunkedBuffer = Object.fromEntries(Object.entries(
        templateTilesBuffers
      ).map(([key, value]) => [key, base64ToUint8(value)]));
      const storageKey = `${template.sortID} ${template.authorID}`;
      template.storageKey = storageKey;
      this.templatesJSON.templates[storageKey] = {
        "name": template.displayName,
        // Display name of template
        "coords": coords2.join(", "),
        // The coords of the template
        "enabled": true,
        "tiles": templateTilesBuffers,
        // Stores the chunked tile buffers
        "palette": template.colorPalette
        // Persist palette and enabled flags
      };
      this.templatesArray.push(template);
      this.clearTileProgress(template);
      const pixelCountFormatted = new Intl.NumberFormat().format(template.pixelCount);
      this.overlay.handleDisplayStatus(`Template created at ${coords2.join(", ")}! Total pixels: ${pixelCountFormatted}`);
      this.requestListRebuild();
      console.log(Object.keys(this.templatesJSON.templates).length);
      console.log(this.templatesJSON);
      console.log(this.templatesArray);
      console.log(JSON.stringify(this.templatesJSON));
      await this.storeTemplates();
    }
    requestListRebuild() {
      try {
        const colorUI = document.querySelector("#bm-contain-colorfilter");
        if (colorUI) {
          colorUI.style.display = "";
        }
        window.postMessage({ source: "blue-marble", bmEvent: "bm-rebuild-color-list" }, "*");
      } catch (_) {
      }
      try {
        const templateUI = document.querySelector("#bm-contain-templatefilter");
        if (templateUI) {
          templateUI.style.display = "";
        }
        window.postMessage({ source: "blue-marble", bmEvent: "bm-rebuild-template-list" }, "*");
      } catch (_) {
      }
    }
    /** Stores the JSON object of the loaded templates into TamperMonkey (GreaseMonkey) storage.
     * @since 0.72.7
     */
    async storeTemplates() {
      await GM.setValue("bmTemplates", JSON.stringify(this.templatesJSON));
    }
    /** Deletes a template from the JSON object.
     * Also delete's the corrosponding {@link Template} class instance
     */
    async deleteTemplate(storageKey) {
      const targetTemplate = this.templatesArray.find((template) => template.storageKey === storageKey);
      if (targetTemplate === void 0) return;
      const removeIndex = this.templatesArray.indexOf(targetTemplate);
      this.templatesArray.splice(removeIndex, 1);
      const templates = this.templatesJSON?.templates;
      if (templates && templates?.[storageKey]) {
        delete templates[storageKey];
      }
      this.clearTileProgress(targetTemplate);
      this.overlay.handleDisplayStatus(`Template ${targetTemplate.displayName} is deleted!`);
      await this.storeTemplates();
      this.requestListRebuild();
    }
    /** Disables the template from view
     */
    async disableTemplate() {
      if (!this.templatesJSON) {
        this.templatesJSON = await this.createJSON();
        console.log(`Creating JSON...`);
      }
    }
    /** Draws all templates on the specified tile.
     * This method handles the rendering of template overlays on individual tiles.
     * @param {File} tileBlob - The pixels that are placed on a tile
     * @param {Array<number>} tileCoords - The tile coordinates [x, y]
     * @since 0.65.77
     */
    async drawTemplateOnTile(tileBlob, tileCoords) {
      const timeStart = performance.now();
      const tileCoordsPadded = tileCoords[0].toString().padStart(4, "0") + "," + tileCoords[1].toString().padStart(4, "0");
      console.log(`Start checking touching templates...`, performance.now() - timeStart + " ms");
      const involvedTemplates = this.getInvolvedTemplates(tileCoords);
      if (involvedTemplates.length === 0) {
        return tileBlob;
      }
      const currentMemorySavingMode = this.isMemorySavingModeOn();
      const templatesTilesToDraw = involvedTemplates.map((template) => {
        const matchingTiles = Object.keys(template.chunked).filter(
          (tile) => tile.startsWith(tileCoordsPadded)
        );
        if (matchingTiles.length === 0) return null;
        const tileKey = matchingTiles[0];
        const coords2 = tileKey.split(",");
        return {
          template,
          tileKey,
          tileCoords: [+coords2[0], +coords2[1]],
          pixelCoords: [+coords2[2], +coords2[3]]
        };
      }).filter(Boolean);
      console.log(templatesTilesToDraw, performance.now() - timeStart + " ms");
      const templateCount = templatesTilesToDraw?.length || 0;
      console.log(`templateCount = ${templateCount}`);
      const enabledTemplateCount = this.templatesArray.filter((t) => t.enabled).length;
      let paintedCount = 0;
      let wrongCount = 0;
      let requiredCount = 0;
      let paletteStats = {};
      let templateStats = {};
      const tileBitmap = await createImageBitmap(tileBlob);
      const toggleStatus = this.getPaletteToggledStatus();
      const displayedColors = this.getDisplayedColorsSorted();
      const displayedColorSet = new Set(displayedColors);
      const hasColorDisabled = displayedColors.length !== Object(toggleStatus).length;
      const allColorsDisabled = displayedColors.length === 0;
      const allTemplatesDisabled = templatesTilesToDraw.length === 0;
      const needOverlay = !allTemplatesDisabled && !allColorsDisabled;
      const drawSize = this.tileSize * this.drawMult;
      let canvas = new OffscreenCanvas(drawSize, drawSize);
      const context = canvas.getContext("2d");
      context.imageSmoothingEnabled = false;
      context.beginPath();
      context.rect(0, 0, drawSize, drawSize);
      context.clip();
      context.clearRect(0, 0, drawSize, drawSize);
      context.drawImage(tileBitmap, 0, 0, drawSize, drawSize);
      tileBitmap.close();
      let tilePixels = null;
      try {
        tilePixels = context.getImageData(0, 0, drawSize, drawSize).data;
      } catch (_) {
      }
      for (const templateTile of templatesTilesToDraw) {
        const templateKey = templateTile.template.storageKey;
        const templateTileBitmap = await templateTile.template.getChunked(templateTile.tileKey, currentMemorySavingMode);
        console.log(`Template:`);
        console.log(templateTile);
        console.log(performance.now() - timeStart + " ms");
        if (tilePixels) {
          try {
            const tempWidth = templateTileBitmap.width;
            const tempHeight = templateTileBitmap.height;
            let tempCanvas = new OffscreenCanvas(tempWidth, tempHeight);
            const tempContext = tempCanvas.getContext("2d", { willReadFrequently: true });
            tempContext.imageSmoothingEnabled = false;
            tempContext.clearRect(0, 0, tempWidth, tempHeight);
            tempContext.drawImage(templateTileBitmap, 0, 0);
            const tImg = tempContext.getImageData(0, 0, tempWidth, tempHeight);
            const tData = tImg.data;
            cleanUpCanvas(tempCanvas);
            tempCanvas = null;
            const offsetX = templateTile.pixelCoords[0] * this.drawMult;
            const offsetY = templateTile.pixelCoords[1] * this.drawMult;
            for (let y = this.drawMultCenter; y < tempHeight; y += this.drawMult) {
              for (let x = this.drawMultCenter; x < tempWidth; x += this.drawMult) {
                const gx = x + offsetX;
                const gy = y + offsetY;
                if (gx < 0 || gy < 0 || gx >= drawSize || gy >= drawSize) {
                  continue;
                }
                const templatePixelCenter = (y * tempWidth + x) * 4;
                const templatePixelCenterRed = tData[templatePixelCenter];
                const templatePixelCenterGreen = tData[templatePixelCenter + 1];
                const templatePixelCenterBlue = tData[templatePixelCenter + 2];
                const templatePixelCenterAlpha = tData[templatePixelCenter + 3];
                if (templatePixelCenterAlpha < 64) {
                  try {
                    const tileIdx = (gy * drawSize + gx) * 4;
                    const pr = tilePixels[tileIdx];
                    const pg = tilePixels[tileIdx + 1];
                    const pb = tilePixels[tileIdx + 2];
                    const pa = tilePixels[tileIdx + 3];
                    const key = rgbToMeta.has(`${pr},${pg},${pb}`) ? `${pr},${pg},${pb}` : "other";
                    if (pa >= 64) {
                      wrongCount++;
                    }
                  } catch (ignored) {
                  }
                  continue;
                }
                requiredCount++;
                const realPixelCenter = (gy * drawSize + gx) * 4;
                const realPixelRed = tilePixels[realPixelCenter];
                const realPixelCenterGreen = tilePixels[realPixelCenter + 1];
                const realPixelCenterBlue = tilePixels[realPixelCenter + 2];
                const realPixelCenterAlpha = tilePixels[realPixelCenter + 3];
                let isPainted = false;
                if (realPixelCenterAlpha < 64) {
                } else if (realPixelRed === templatePixelCenterRed && realPixelCenterGreen === templatePixelCenterGreen && realPixelCenterBlue === templatePixelCenterBlue) {
                  paintedCount++;
                  isPainted = true;
                  let colorKey = `${templatePixelCenterRed},${templatePixelCenterGreen},${templatePixelCenterBlue}`;
                  if (!rgbToMeta.has(colorKey)) colorKey = "other";
                  if (paletteStats[colorKey] === void 0) {
                    paletteStats[colorKey] = {
                      painted: 1,
                      paintedAndEnabled: +(templateTile.template.enabled ?? true),
                      missing: 0,
                      examples: [],
                      examplesEnabled: []
                    };
                  } else {
                    paletteStats[colorKey].painted++;
                    if (templateTile.template.enabled ?? true) {
                      paletteStats[colorKey].paintedAndEnabled++;
                    }
                  }
                  if (templateStats[templateKey] === void 0) {
                    templateStats[templateKey] = {
                      painted: 1
                    };
                  } else {
                    templateStats[templateKey].painted++;
                  }
                } else {
                  wrongCount++;
                }
                if (!isPainted) {
                  let key = `${templatePixelCenterRed},${templatePixelCenterGreen},${templatePixelCenterBlue}`;
                  if (!rgbToMeta.has(key)) key = "other";
                  const example = [
                    // use this tile as example
                    tileCoords,
                    [
                      Math.floor(gx / this.drawMult),
                      Math.floor(gy / this.drawMult)
                    ]
                  ];
                  if (paletteStats[key] === void 0) {
                    paletteStats[key] = {
                      painted: 0,
                      paintedAndEnabled: 0,
                      missing: 1,
                      examples: [example],
                      examplesEnabled: []
                    };
                    if (templateTile.template.enabled ?? true) {
                      paletteStats[key].examplesEnabled.push(example);
                    }
                  } else {
                    const exampleMax = this.userSettings?.smartPlace ?? false ? 1 << 20 : 100;
                    paletteStats[key].missing++;
                    if (paletteStats[key].examples.length < exampleMax) {
                      paletteStats[key].examples.push(example);
                    } else if (Math.random() * paletteStats[key].examples.length < exampleMax) {
                      const replaceIndex = Math.floor(Math.random() * exampleMax);
                      paletteStats[key].examples[replaceIndex] = example;
                    }
                    if (templateTile.template.enabled ?? true) {
                      if (paletteStats[key].examplesEnabled.length < exampleMax) {
                        paletteStats[key].examplesEnabled.push(example);
                      } else if (Math.random() * paletteStats[key].examplesEnabled.length < exampleMax) {
                        const replaceIndex = Math.floor(Math.random() * exampleMax);
                        paletteStats[key].examplesEnabled[replaceIndex] = example;
                      }
                    }
                  }
                }
              }
            }
          } catch (exception) {
            console.warn("Failed to compute per-tile painted/wrong stats:", exception);
          }
        }
        if (templateTile.template.enabled ?? true) {
          const offsetX = templateTile.pixelCoords[0] * this.drawMult;
          const offsetY = templateTile.pixelCoords[1] * this.drawMult;
          try {
            if (!hasColorDisabled) {
              context.drawImage(templateTileBitmap, offsetX, offsetY);
            } else {
              if (!allColorsDisabled) {
                console.log("Applying color filter...", performance.now() - timeStart + " ms");
                const tempW = templateTileBitmap.width;
                const tempH = templateTileBitmap.height;
                let filterCanvas = new OffscreenCanvas(tempW, tempH);
                const filterCtx = filterCanvas.getContext("2d", { willReadFrequently: true });
                filterCtx.imageSmoothingEnabled = false;
                filterCtx.clearRect(0, 0, tempW, tempH);
                filterCtx.drawImage(templateTileBitmap, 0, 0);
                const img = filterCtx.getImageData(0, 0, tempW, tempH);
                const data = img.data;
                for (const [offsetX2, offsetY2] of templateTile.template.customMaskPoints(this.drawMult)) {
                  for (let y = offsetY2; y < tempH; y += this.drawMult) {
                    for (let x = offsetX2; x < tempW; x += this.drawMult) {
                      const idx = (y * tempW + x) * 4;
                      const r = data[idx];
                      const g = data[idx + 1];
                      const b = data[idx + 2];
                      const a = data[idx + 3];
                      if (a < 1) {
                        continue;
                      }
                      let key = `${r},${g},${b}`;
                      if (!rgbToMeta.has(`${r},${g},${b}`)) key = "other";
                      if (!displayedColorSet.has(key)) {
                        data[idx + 3] = 0;
                      }
                    }
                  }
                }
                filterCtx.putImageData(img, 0, 0);
                context.drawImage(filterCanvas, offsetX, offsetY);
                cleanUpCanvas(filterCanvas);
                filterCanvas = null;
              }
            }
          } catch (exception) {
            console.warn("Failed to apply color filter:", exception);
            context.drawImage(templateTileBitmap, offsetX, offsetY);
          }
        }
        if (currentMemorySavingMode) {
          templateTileBitmap.close();
        }
      }
      console.log("Saving per-tile stats...", performance.now() - timeStart + " ms");
      if (templateCount === 0) {
        if (this.tileProgress.has(tileCoordsPadded)) {
          this.tileProgress.delete(tileCoordsPadded);
        }
      } else {
        this.tileProgress.set(tileCoordsPadded, {
          painted: paintedCount,
          required: requiredCount,
          wrong: wrongCount,
          palette: paletteStats,
          template: templateStats
        });
      }
      let aggPainted = 0;
      let aggRequiredTiles = 0;
      let aggWrong = 0;
      for (const stats of this.tileProgress.values()) {
        aggPainted += stats.painted || 0;
        aggRequiredTiles += stats.required || 0;
        aggWrong += stats.wrong || 0;
      }
      const totalRequiredTemplates = this.templatesArray.reduce((sum, t) => sum + (t.requiredPixelCount || t.pixelCount || 0), 0);
      const totalRequired = totalRequiredTemplates > 0 ? totalRequiredTemplates : aggRequiredTiles;
      const paintedStr = new Intl.NumberFormat().format(aggPainted);
      const requiredStr = new Intl.NumberFormat().format(totalRequired);
      const wrongStr = new Intl.NumberFormat().format(totalRequired - aggPainted);
      this.overlay.handleDisplayStatus(
        `Displaying ${enabledTemplateCount} template${enabledTemplateCount == 1 ? "" : "s"}.
Painted ${paintedStr} / ${requiredStr} \u2022 Wrong ${wrongStr}`
      );
      console.log("Exporting tile overlay...", performance.now() - timeStart + " ms");
      const resultBlob = needOverlay ? await canvas.convertToBlob({ type: "image/png" }) : tileBlob;
      cleanUpCanvas(canvas);
      console.log("Cleaning up...", performance.now() - timeStart + " ms");
      window.buildColorFilterList();
      window.buildTemplateFilterList();
      console.log("Finish...", performance.now() - timeStart + " ms");
      return resultBlob;
    }
    /** Imports the JSON object, and appends it to any JSON object already loaded
     * @param {string} json - The JSON string to parse
     */
    importJSON(json) {
      console.log(`Importing JSON...`);
      console.log(json);
      if (json?.whoami == "BlueMarble") {
        this.templatesJSON = json;
        __privateMethod(this, _TemplateManager_instances, parseBlueMarble_fn).call(this, json);
      }
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
          if (status[rgb]) {
            continue;
          }
          ;
          status[rgb] = meta.enabled;
        }
      }
      return status;
    }
    /** Gets the list of displayed colors, sorted by rgb
     * does not hide completed colors as that may become incomplete over time
     * @since 0.85.30
     */
    getDisplayedColorsSorted() {
      const toggledStatus = this.getPaletteToggledStatus();
      const hideLocked = this.areLockedColorsHidden();
      const colors = [];
      Object.entries(toggledStatus).forEach(([rgb, enabled]) => {
        if (!enabled) return;
        if (hideLocked && !this.isColorUnlocked(rgbToMeta.get(rgb).id)) return;
        colors.push(rgb);
      });
      return colors.sort();
    }
    /** Gets the list of involved templates, sorted by sortID
     * @param {number[]} tileCoords
     * @returns {Template[]}
     * @since 0.85.30
     */
    getInvolvedTemplates(tileCoords) {
      const tileCoordsPadded = tileCoords[0].toString().padStart(4, "0") + "," + tileCoords[1].toString().padStart(4, "0");
      return this.templatesArray.filter((template) => {
        if (!template?.chunked) return false;
        if (template.tilePrefixes && template.tilePrefixes.size > 0) {
          return template.tilePrefixes.has(tileCoordsPadded);
        }
        return Object.keys(template.chunked).some((k) => k.startsWith(tileCoordsPadded));
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
      return displayedColors.join(";") + "||" + involvedTemplates.map((t) => t.storageKey + "," + t.storageTimeString + "," + +(t.enabled ?? true)).join(";");
    }
    /** Stores the JSON object of the user settings into TamperMonkey (GreaseMonkey) storage.
     * @since 0.85.17
     */
    async storeUserSettings() {
      await GM.setValue("bmUserSettings", JSON.stringify(this.userSettings));
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
      const temp = this.userSettings?.sortBy ?? "total-desc";
      if (this.isValidSortBy(temp)) return temp;
      return "total-desc";
    }
    /** A utility to check if the sort criteria is valid.
     * @param {string} value - The sort criteria
     * @returns {boolean}
     * @since 0.85.23
     */
    isValidSortBy(value) {
      const parts = value.toLowerCase().split("-");
      if (parts.length !== 2) return false;
      if (sortByOptions[parts[0]] === void 0) return false;
      if (!["desc", "asc"].includes(parts[1])) return false;
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
      if (!value) {
        this.templatesArray.forEach((template) => {
          if (!template?.chunked) return;
          const chunked = template.chunked;
          const temp = {};
          Object.entries(chunked).forEach(([key, value2]) => {
            temp[key] = null;
            if (value2 === null) return;
            value2.close();
          });
          template.chunked = temp;
        });
      }
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
      const mask = 1 << color - 32;
      return (this.extraColorsBitmap & mask) !== 0;
    }
    /** A utility clear all the tiles related to a template
     * @param {Template} template
     * @since 0.85.19
     */
    clearTileProgress(template) {
      template.tilePrefixes.forEach((prefix) => {
        this.tileProgress.delete(prefix);
      });
    }
  };
  _TemplateManager_instances = new WeakSet();
  /** Generates a {@link Template} class instance from the JSON object template
   */
  loadTemplate_fn = function() {
  };
  parseBlueMarble_fn = async function(json) {
    console.log(`Parsing BlueMarble...`);
    const templates = json.templates;
    console.log(`BlueMarble length: ${Object.keys(templates).length}`);
    const currentMemorySavingMode = this.isMemorySavingModeOn();
    if (Object.keys(templates).length > 0) {
      for (const template in templates) {
        const templateKey = template;
        const templateValue = templates[template];
        console.log(templateKey);
        const templateCoords = templateValue.coords.split(",").map(Number);
        if (templates.hasOwnProperty(template)) {
          const templateKeyArray = templateKey.split(" ");
          const sortID = Number(templateKeyArray?.[0]);
          const authorID = templateKeyArray?.[1] || "0";
          const displayName = templateValue.name || `Template ${sortID || ""}`;
          const tilesbase64 = templateValue.tiles;
          const templateTiles = {};
          const templateTilesBuffer = {};
          let requiredPixelCount = 0;
          const paletteMap = /* @__PURE__ */ new Map();
          for (const tile in tilesbase64) {
            console.log(tile);
            if (tilesbase64.hasOwnProperty(tile)) {
              const encodedTemplateBase64 = tilesbase64[tile];
              const templateUint8Array = base64ToUint8(encodedTemplateBase64);
              const templateBlob = new Blob([templateUint8Array], { type: "image/png" });
              const templateBitmap = await createImageBitmap(templateBlob);
              if (currentMemorySavingMode) {
                templateTiles[tile] = null;
              } else {
                templateTiles[tile] = templateBitmap;
              }
              templateTilesBuffer[tile] = templateUint8Array;
              try {
                const w = templateBitmap.width;
                const h = templateBitmap.height;
                let c = new OffscreenCanvas(w, h);
                const cx = c.getContext("2d", { willReadFrequently: true });
                cx.imageSmoothingEnabled = false;
                cx.clearRect(0, 0, w, h);
                cx.drawImage(templateBitmap, 0, 0);
                const data = cx.getImageData(0, 0, w, h).data;
                cleanUpCanvas(c);
                c = null;
                for (let y = this.drawMultCenter; y < h; y += this.drawMult) {
                  for (let x = this.drawMultCenter; x < w; x += this.drawMult) {
                    const idx = (y * w + x) * 4;
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];
                    const a = data[idx + 3];
                    if (a < 64) {
                      continue;
                    }
                    if (r === 222 && g === 250 && b === 206) {
                      continue;
                    }
                    requiredPixelCount++;
                    const key = Object.hasOwn(templates[templateKey].palette, `${r},${g},${b}`) ? `${r},${g},${b}` : "other";
                    paletteMap.set(key, (paletteMap.get(key) || 0) + 1);
                  }
                }
              } catch (e) {
                console.warn("Failed to count required pixels for imported tile", e);
              }
              if (currentMemorySavingMode) {
                templateBitmap.close();
              }
            }
          }
          const template2 = new Template({
            displayName,
            sortID: sortID || this.largestSeenSortID + 1 || 0,
            authorID: authorID || "",
            coords: templateCoords
          });
          if (template2.sortID > this.largestSeenSortID) {
            this.largestSeenSortID = template2.sortID;
          }
          template2.shreadSize = this.drawMult;
          template2.chunked = templateTiles;
          template2.chunkedBuffer = templateTilesBuffer;
          template2.requiredPixelCount = requiredPixelCount;
          template2.enabled = templateValue.enabled ?? true;
          const paletteObj = {};
          for (const [key, count] of paletteMap.entries()) {
            paletteObj[key] = { count, enabled: true };
          }
          template2.colorPalette = paletteObj;
          try {
            Object.keys(templateTiles).forEach((k) => {
              template2.tilePrefixes?.add(k.split(",").slice(0, 2).join(","));
            });
          } catch (_) {
          }
          try {
            const persisted = templates?.[templateKey]?.palette;
            if (persisted) {
              for (const [rgb, meta] of Object.entries(persisted)) {
                if (!template2.colorPalette[rgb]) {
                  template2.colorPalette[rgb] = { count: meta?.count || 0, enabled: !!meta?.enabled };
                } else {
                  template2.colorPalette[rgb].enabled = !!meta?.enabled;
                }
              }
            }
          } catch (_) {
          }
          template2.storageKey = templateKey;
          this.templatesArray.push(template2);
          console.log(this.templatesArray);
          console.log(`^^^ This ^^^`);
        }
      }
      try {
        const colorUI = document.querySelector("#bm-contain-colorfilter");
        if (colorUI) {
          colorUI.style.display = "";
        }
        window.postMessage({ source: "blue-marble", bmEvent: "bm-rebuild-color-list" }, "*");
      } catch (_) {
      }
      try {
        const templateUI = document.querySelector("#bm-contain-templatefilter");
        if (templateUI) {
          templateUI.style.display = "";
        }
        window.postMessage({ source: "blue-marble", bmEvent: "bm-rebuild-template-list" }, "*");
      } catch (_) {
      }
    }
  };
  /** Parses the OSU! Place JSON object
   */
  parseOSU_fn = function() {
  };

  // src/apiManager.js
  var _ApiManager_instances, setUpTimeout_fn, updateCharges_fn, updateUserFromLocal_fn, applyUserData_fn;
  var ApiManager = class {
    /** Constructor for ApiManager class
     * @param {TemplateManager} templateManager 
     * @since 0.11.34
     */
    constructor(templateManager2) {
      __privateAdd(this, _ApiManager_instances);
      this.templateManager = templateManager2;
      this.disableAll = false;
      this.coordsTilePixel = [];
      this.templateCoordsTilePixel = [];
      this.charges = null;
      this.chargesUpdated = null;
      this.chargeInterval = null;
      this.tileCache = {};
    }
    getCurrentCharges() {
      if (this.charges === null) {
        __privateMethod(this, _ApiManager_instances, updateUserFromLocal_fn).call(this);
        if (this.charges === null) {
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
      const remainingTimeSeconds = Math.floor(remainingTimeMs / 1e3);
      const hours = Math.floor(remainingTimeSeconds / 3600);
      const minutes = Math.floor(remainingTimeSeconds % 3600 / 60).toString().padStart(2, "0");
      const seconds = (remainingTimeSeconds % 60).toString().padStart(2, "0");
      if (hours > 0) return `${hours}:${minutes}:${seconds}`;
      return `${minutes}:${seconds}`;
    }
    /** Update the texts and related functions shown on the pixel info overlay
     * 
     * @since 0.85.28
    */
    updateDisplayCoords() {
      const coordsTile = [this.coordsTilePixel[0], this.coordsTilePixel[1]];
      const coordsPixel = [this.coordsTilePixel[2], this.coordsTilePixel[3]];
      const displayTP = serverTPtoDisplayTP(coordsTile, coordsPixel);
      const spanElements = document.querySelectorAll("span");
      for (const element of spanElements) {
        if (element.textContent.trim().includes(`${displayTP[0]}, ${displayTP[1]}`)) {
          let displayCoords1 = document.getElementById("bm-display-coords1");
          let displayCoords2 = document.getElementById("bm-display-coords2");
          let displayCoords1Copy = document.getElementById("bm-display-coords1-copy");
          let displayCoords2Copy = document.getElementById("bm-display-coords2-copy");
          const geoCoords = coordsTileToGeoCoords(coordsTile, coordsPixel);
          const text1 = `(Tl X: ${coordsTile[0]}, Tl Y: ${coordsTile[1]}, Px X: ${coordsPixel[0]}, Px Y: ${coordsPixel[1]})`;
          const text2 = `(${geoCoords[0].toFixed(5)}, ${geoCoords[1].toFixed(5)})`;
          if (!displayCoords1) {
            displayCoords1 = document.createElement("span");
            displayCoords1.id = "bm-display-coords1";
            displayCoords1.textContent = text1;
            displayCoords1.style = "margin-left: calc(var(--spacing)*3); font-size: small;";
            element.parentNode.parentNode.parentNode.insertAdjacentElement("afterend", displayCoords1);
            const buttonCopy = function() {
              const content = this.dataset.text;
              copyToClipboard(content);
              alert("Copied to clipboard: " + content);
            };
            displayCoords1Copy = document.createElement("a");
            displayCoords1Copy.href = "#";
            displayCoords1Copy.id = "bm-display-coords1-copy";
            displayCoords1Copy.textContent = "Copy";
            displayCoords1Copy.style = "font-size: small; text-decoration: underline;";
            displayCoords1Copy.className = "text-nowrap";
            displayCoords1Copy.addEventListener("click", buttonCopy);
            displayCoords1.insertAdjacentElement("afterend", displayCoords1Copy);
            displayCoords1.insertAdjacentText("afterend", " ");
            const br = document.createElement("br");
            displayCoords1Copy.insertAdjacentElement("afterend", br);
            displayCoords2 = document.createElement("span");
            displayCoords2.id = "bm-display-coords2";
            displayCoords2.textContent = text2;
            displayCoords2.style = "margin-left: calc(var(--spacing)*3); font-size: small;";
            br.insertAdjacentElement("afterend", displayCoords2);
            displayCoords2Copy = document.createElement("a");
            displayCoords2Copy.href = "#";
            displayCoords2Copy.id = "bm-display-coords2-copy";
            displayCoords2Copy.textContent = "Copy";
            displayCoords2Copy.style = "font-size: small; text-decoration: underline;";
            displayCoords2Copy.className = "text-nowrap";
            displayCoords2Copy.addEventListener("click", buttonCopy);
            displayCoords2.insertAdjacentElement("afterend", displayCoords2Copy);
            displayCoords2.insertAdjacentText("afterend", " ");
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
      const coordsTile = [this.coordsTilePixel[0], this.coordsTilePixel[1]];
      const coordsPixel = [this.coordsTilePixel[2], this.coordsTilePixel[3]];
      const models = document.querySelectorAll("dialog.modal > div");
      for (const element of models) {
        if (element.querySelector("input[readonly]") === null) continue;
        let downloadBtn = document.querySelector("#bm-download-coords");
        let downloadBtnDim = document.querySelector("#bm-download-coords-dim");
        let progress = document.querySelector("#bm-download-progress");
        let progressText = document.querySelector("#bm-download-progress-text");
        if (!downloadBtn) {
          const container = document.createElement("div");
          element.appendChild(container);
          const h3 = document.createElement("h3");
          h3.innerText = "Download as Template";
          h3.className = "mb-1 mt-5 flex items-center gap-1 text-xl font-semibold";
          container.appendChild(h3);
          const instruction = document.createElement("div");
          instruction.className = `bg-base-200 border-base-content/10 rounded-xl border-2 p-3`;
          instruction.style.fontSize = "small";
          instruction.innerText = [
            "Instruction to mark the rectangular range for downloading:",
            '1. Pick the first reference point (e.g. the Top Left Corner) and use the "Pin" icon to record the coordinates.',
            '2. Pick the second reference point, i.e. the opposite corner (e.g. the Bottom Right Corner), and click the "Share" button.'
          ].join("\n");
          container.appendChild(instruction);
          downloadBtnDim = document.createElement("span");
          downloadBtnDim.id = "bm-download-coords-dim";
          downloadBtnDim.style.fontSize = "small";
          container.appendChild(downloadBtnDim);
          container.appendChild(document.createElement("br"));
          const btnContainer = document.createElement("div");
          btnContainer.className = "mt-3 flex items-end justify-end gap-2";
          progress = document.createElement("progress");
          progress.id = "bm-download-progress";
          progress.max = "100";
          progress.value = "0";
          progress.hidden = true;
          btnContainer.appendChild(progress);
          progressText = document.createElement("span");
          progressText.id = "bm-download-progress-text";
          progressText.hidden = true;
          progressText.textContent = "0 / 0";
          btnContainer.appendChild(progressText);
          downloadBtn = document.createElement("button");
          downloadBtn.id = "bm-download-coords";
          downloadBtn.className = "btn btn-primary";
          const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
          svg.setAttribute("viewBox", "0 -960 960 960");
          svg.setAttribute("fill", "currentColor");
          svg.setAttribute("class", "size-5");
          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          path.setAttribute("d", "M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z");
          svg.appendChild(path);
          downloadBtn.appendChild(svg);
          downloadBtn.appendChild(document.createTextNode(" Download"));
          const that = this;
          downloadBtn.addEventListener("click", async function() {
            this.disabled = true;
            const coordsTile2 = [that.coordsTilePixel[0], that.coordsTilePixel[1]];
            const coordsPixel2 = [that.coordsTilePixel[2], that.coordsTilePixel[3]];
            if (!areOverlayCoordsFilledAndValid()) {
              alert(`Some coordinates textboxes are empty or invalid!`);
              return;
            }
            const overlayCoords = getOverlayCoords();
            const [[left, top], [width, height]] = calculateTopLeftAndSize(
              [coordsTile2, coordsPixel2],
              overlayCoords
            );
            const tx1 = Math.floor(left / 1e3);
            const ty1 = Math.floor(top / 1e3);
            const px1 = left % 1e3;
            const py1 = top % 1e3;
            const tx2 = Math.floor((left + width - 1) / 1e3);
            const ty2 = Math.floor((top + height - 1) / 1e3);
            const tw = tx2 - tx1 + 1;
            const th = ty2 - ty1 + 1;
            progress.max = tw * th;
            progress.value = 0;
            progress.hidden = false;
            progressText.textContent = `0 / ${progress.max}`;
            progressText.hidden = false;
            try {
              const resultCanvas = new OffscreenCanvas(width, height);
              const context = resultCanvas.getContext("2d");
              context.clearRect(0, 0, width, height);
              for (let ty = ty1; ty <= ty2; ty++) {
                for (let tx = tx1; tx <= tx2; tx++) {
                  const image = await downloadTile(tx % 2048, ty);
                  context.drawImage(
                    image,
                    tx * 1e3 - left,
                    ty * 1e3 - top
                  );
                  progress.value++;
                  progressText.textContent = `${progress.value} / ${progress.max}`;
                }
              }
              ;
              const blob = await resultCanvas.convertToBlob({ type: "image/png" });
              var a = document.createElement("a");
              a.href = URL.createObjectURL(blob, { type: "image/png" });
              a.setAttribute("download", `template_${tx1}_${ty1}_${px1}_${py1}_${(/* @__PURE__ */ new Date()).toISOString()}.png`);
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
          const tx1 = Math.floor(left / 1e3);
          const ty1 = Math.floor(top / 1e3);
          const px1 = left % 1e3;
          const py1 = top % 1e3;
          const right = (left + width - 1) % (2048 * 1e3);
          const bottom = top + height - 1;
          const tx2 = Math.floor(right / 1e3);
          const ty2 = Math.floor(bottom / 1e3);
          const px2 = right % 1e3;
          const py2 = bottom % 1e3;
          buttonLines.push(`Top Left: (Tl X: ${tx1}, Tl Y: ${ty1}, Px X: ${px1}, Px Y: ${py1})`);
          buttonLines.push(`Bottom Right: (Tl X: ${tx2}, Tl Y: ${ty2}, Px X: ${px2}, Px Y: ${py2})`);
          buttonLines.push(`Image Size: ${width}\xD7${height}`);
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
        downloadBtnDim.innerText = buttonLines.join("\n");
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
      __privateMethod(this, _ApiManager_instances, setUpTimeout_fn).call(this);
      window.addEventListener("message", async (event) => {
        const data = event.data;
        const dataJSON = data["jsonData"];
        if (!(data && data["source"] === "blue-marble")) {
          return;
        }
        if (!data["endpoint"]) {
          return;
        }
        const endpointText = data["endpoint"]?.split("?")[0].split("/").filter((s) => s && isNaN(Number(s))).filter((s) => s && !s.includes(".")).pop();
        console.log(`%cBlue Marble%c: Recieved message about "%s"`, "color: cornflowerblue;", "", endpointText);
        switch (endpointText) {
          case "me":
            if (dataJSON["status"] && dataJSON["status"]?.toString()[0] != "2") {
              if (!(dataJSON["fallback"] ?? false)) {
                overlay.handleDisplayError(`You are not logged in!
Could not fetch userdata.`);
              }
              return;
            }
            __privateMethod(this, _ApiManager_instances, applyUserData_fn).call(this, dataJSON, Date.now());
            break;
          case "pixel":
            const coordsTile = data["endpoint"].split("?")[0].split("/").filter((s) => s && !isNaN(Number(s))).map((s) => Number(s));
            const payloadExtractor = new URLSearchParams(data["endpoint"].split("?")[1]);
            const coordsPixel = [+payloadExtractor.get("x"), +payloadExtractor.get("y")];
            if (this.coordsTilePixel.length && (!coordsTile.length || !coordsPixel.length)) {
              overlay.handleDisplayError(`Coordinates are malformed!
Did you try clicking the canvas first?`);
              return;
            }
            this.coordsTilePixel = [...coordsTile, ...coordsPixel];
            this.updateDisplayCoords();
            this.updateDownloadButton();
            break;
          case "tiles":
            let tileCoordsTile = data["endpoint"].split("/");
            tileCoordsTile = [parseInt(tileCoordsTile[tileCoordsTile.length - 2]), parseInt(tileCoordsTile[tileCoordsTile.length - 1].replace(".png", ""))];
            const blobUUID = data["blobID"];
            const blobData = data["blobData"];
            const tileKey = tileCoordsTile[0].toString().padStart(4, "0") + "," + tileCoordsTile[1].toString().padStart(4, "0");
            const lastModified = data["lastModified"];
            const fullKey = this.templateManager.getTileCacheKey(tileCoordsTile);
            let templateBlob = null;
            if (this.tileCache[tileKey]) {
              if (this.tileCache[tileKey]["lastModified"] === lastModified && this.tileCache[tileKey]["fullKey"] === fullKey) {
                console.log(`Unchanged tile: "${tileKey}"`);
                templateBlob = this.tileCache[tileKey]["templateBlob"];
              }
            }
            if (templateBlob === null) {
              const involvedTemplates = this.templateManager.getInvolvedTemplates(tileCoordsTile);
              if (involvedTemplates.length > 0) {
                templateBlob = await this.templateManager.drawTemplateOnTile(blobData, tileCoordsTile);
                this.tileCache[tileKey] = { lastModified, fullKey, templateBlob };
              } else {
                templateBlob = blobData;
              }
            }
            window.postMessage({
              source: "blue-marble",
              blobID: blobUUID,
              blobData: templateBlob,
              blink: data["blink"]
            });
            break;
          case "robots":
            this.disableAll = dataJSON["userscript"]?.toString().toLowerCase() == "false";
            break;
        }
      });
    }
  };
  _ApiManager_instances = new WeakSet();
  setUpTimeout_fn = function() {
    __privateMethod(this, _ApiManager_instances, updateCharges_fn).call(this);
    this.chargeInterval = setInterval(() => {
      __privateMethod(this, _ApiManager_instances, updateCharges_fn).call(this);
    }, 1e3);
  };
  updateCharges_fn = function() {
    if (this.charges === null) {
      __privateMethod(this, _ApiManager_instances, updateUserFromLocal_fn).call(this);
      if (this.charges === null) {
        return;
      }
    }
    const currentCharges = Math.floor(this.getCurrentCharges());
    const maxCharges = this.charges["max"];
    const currentChargesStr = new Intl.NumberFormat().format(currentCharges);
    const maxChargesStr = new Intl.NumberFormat().format(maxCharges);
    const container = document.getElementById("bm-user-charges");
    const countdownElement = container?.querySelector('[data-role="countdown"]');
    const countElement = container?.querySelector('[data-role="charge-count"]');
    if (!container || !countdownElement || !countElement) {
      return;
    }
    countdownElement.textContent = this.getFullRemainingTimeFormatted();
    countElement.textContent = `(${currentChargesStr} / ${maxChargesStr})`;
  };
  updateUserFromLocal_fn = function() {
    const logoutButton = document.querySelector(".relative>.dropdown>.dropdown-content>section>button.btn");
    if (logoutButton === null) return null;
    if (logoutButton["__click"] !== void 0 && logoutButton["__click"][2] !== void 0) {
      const user = logoutButton["__click"][2]?.["user"];
      const result = JSON.parse(JSON.stringify(user?.["data"] ?? null));
      const lastFetch = user?.lastFetch ?? null;
      __privateMethod(this, _ApiManager_instances, applyUserData_fn).call(this, result ?? null, lastFetch ? +lastFetch : null);
    } else {
      const injectedFunc = () => {
        const script2 = document.currentScript;
        const logoutButton2 = document.querySelector(".relative>.dropdown>.dropdown-content>section>button.btn");
        const user = logoutButton2["__click"]?.[2]?.["user"];
        script2.setAttribute("bm-result", JSON.stringify(user?.["data"] ?? null));
        script2.setAttribute("bm-lastFetch", JSON.stringify(user?.["lastFetch"] ?? null));
      };
      const script = document.createElement("script");
      script.textContent = `(${injectedFunc})();`;
      document.documentElement?.appendChild(script);
      const result = JSON.parse(script.getAttribute("bm-result"));
      const lastFetch = JSON.parse(script.getAttribute("bm-lastFetch"));
      script.remove();
      __privateMethod(this, _ApiManager_instances, applyUserData_fn).call(this, result ?? null, lastFetch ? +lastFetch : null);
    }
    ;
  };
  applyUserData_fn = function(dataJSON, fetchTime) {
    if (dataJSON === null) return;
    const nextLevelPixels = Math.ceil(Math.pow(Math.floor(dataJSON["level"]) * Math.pow(30, 0.65), 1 / 0.65) - dataJSON["pixelsPainted"]);
    console.log(dataJSON["id"]);
    if (!!dataJSON["id"] || dataJSON["id"] === 0) {
      console.log(numberToEncoded(
        dataJSON["id"],
        "!#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~"
      ));
    }
    this.templateManager.userID = dataJSON["id"];
    this.charges = dataJSON["charges"];
    this.chargesUpdated = fetchTime;
    this.templateManager.updateExtraColorsBitmap(dataJSON["extraColorsBitmap"] ?? 0);
    const userNameElement = document.getElementById("bm-user-name");
    if (userNameElement) {
      userNameElement.textContent = dataJSON["name"];
    }
    const userDropletsElement = document.getElementById("bm-user-droplets");
    if (userDropletsElement) {
      userDropletsElement.textContent = new Intl.NumberFormat().format(dataJSON["droplets"]);
    }
    const nextPixelElement = document.getElementById("bm-user-nextpixel");
    const nextPixelPluralElement = document.getElementById("bm-user-nextpixel-plural");
    if (nextPixelElement && nextPixelPluralElement) {
      nextPixelElement.textContent = new Intl.NumberFormat().format(nextLevelPixels);
      nextPixelPluralElement.textContent = nextLevelPixels == 1 ? "" : "s";
    }
    const nextLevelElement = document.getElementById("bm-user-nextlevel");
    if (nextLevelElement) {
      nextLevelElement.textContent = Math.floor(dataJSON["level"]) + 1;
    }
  };

  // src/utilsMaptiler.js
  function controlMapTiler(func, ...args) {
    const myLocationButton = document.querySelector(".right-3>button");
    if (myLocationButton !== null) {
      if (myLocationButton["__click"] !== void 0) {
        const map = myLocationButton["__click"][3]["v"];
        return func(map, ...args);
      } else {
        const getMap = () => {
          return document.querySelector(".right-3>button")["__click"][3]["v"];
        };
        const injector = (result2) => {
          const script2 = document.currentScript;
          script2.setAttribute("bm-result", JSON.stringify(result2));
        };
        const passArgs = args.map((arg) => JSON.stringify(arg)).join(",");
        const script = document.createElement("script");
        script.textContent = `(${injector})((${func})((${getMap})(), ${passArgs}));`;
        document.documentElement?.appendChild(script);
        const result = JSON.parse(script.getAttribute("bm-result"));
        script.remove();
        return result;
      }
    } else {
      throw new Error('Could not find the "My location" button.');
    }
  }
  function getCenterGeoCoords() {
    return controlMapTiler((map) => {
      const center = map["transform"]["center"];
      return [center["lat"], center["lng"]];
    });
  }

  // src/main.js
  var name = GM_info.script.name.toString();
  var version = GM_info.script.version.toString();
  var consoleStyle = "color: cornflowerblue;";
  function inject(callback) {
    const script = document.createElement("script");
    script.setAttribute("bm-name", name);
    script.setAttribute("bm-cStyle", consoleStyle);
    script.textContent = `(${callback})();`;
    document.documentElement?.appendChild(script);
    script.remove();
  }
  inject(() => {
    const script = document.currentScript;
    const name2 = script?.getAttribute("bm-name") || "Blue Marble";
    const consoleStyle2 = script?.getAttribute("bm-cStyle") || "";
    const fetchedBlobQueue = /* @__PURE__ */ new Map();
    window.addEventListener("message", (event) => {
      const { source, endpoint, blobID, blobData, blink } = event.data;
      const elapsed = Date.now() - blink;
      console.groupCollapsed(`%c${name2}%c: ${fetchedBlobQueue.size} Recieved IMAGE message about blob "${blobID}"`, consoleStyle2, "");
      console.log(`Blob fetch took %c${String(Math.floor(elapsed / 6e4)).padStart(2, "0")}:${String(Math.floor(elapsed / 1e3) % 60).padStart(2, "0")}.${String(elapsed % 1e3).padStart(3, "0")}%c MM:SS.mmm`, consoleStyle2, "");
      console.log(fetchedBlobQueue);
      console.groupEnd();
      if (source == "blue-marble" && !!blobID && !!blobData && !endpoint) {
        const callback = fetchedBlobQueue.get(blobID);
        if (typeof callback === "function") {
          callback(blobData);
        } else {
          consoleWarn(`%c${name2}%c: Attempted to retrieve a blob (%s) from queue, but the blobID was not a function! Skipping...`, consoleStyle2, "", blobID);
        }
        fetchedBlobQueue.delete(blobID);
      }
    });
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const response = await originalFetch.apply(this, args);
      const cloned = response.clone();
      const endpointName = (args[0] instanceof Request ? args[0]?.url : args[0]) || "ignore";
      const contentType = cloned.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const blink = Date.now();
        console.log(`%c${name2}%c: Sending JSON message about endpoint "${endpointName}"`, consoleStyle2, "");
        cloned.json().then((jsonData) => {
          window.postMessage({
            source: "blue-marble",
            endpoint: endpointName,
            jsonData,
            blink
          }, "*");
        }).catch((err) => {
          console.error(`%c${name2}%c: Failed to parse JSON: `, consoleStyle2, "", err);
        });
      } else if (contentType.includes("image/") && (!endpointName.includes("openfreemap") && !endpointName.includes("maps"))) {
        const blink = Date.now();
        const blob = await cloned.blob();
        console.log(`%c${name2}%c: ${fetchedBlobQueue.size} Sending IMAGE message about endpoint "${endpointName}"`, consoleStyle2, "");
        return new Promise((resolve) => {
          const blobUUID = crypto.randomUUID();
          fetchedBlobQueue.set(blobUUID, (blobProcessed) => {
            const newResponse = new Response(blobProcessed, {
              headers: cloned.headers,
              status: cloned.status,
              statusText: cloned.statusText
            });
            if (blobProcessed instanceof ImageBitmap) {
              newResponse.arrayBuffer = () => {
                return blobProcessed;
              };
            }
            resolve(newResponse);
            console.log(`%c${name2}%c: ${fetchedBlobQueue.size} Processed blob "${blobUUID}"`, consoleStyle2, "");
          });
          window.postMessage({
            source: "blue-marble",
            endpoint: endpointName,
            lastModified: cloned.headers.get("Last-Modified"),
            blobID: blobUUID,
            blobData: blob,
            blink
          });
        }).catch((exception) => {
          const elapsed = Date.now();
          console.error(`%c${name2}%c: Failed to Promise blob!`, consoleStyle2, "");
          console.groupCollapsed(`%c${name2}%c: Details of failed blob Promise:`, consoleStyle2, "");
          console.log(`Endpoint: ${endpointName}
There are ${fetchedBlobQueue.size} blobs processing...
Blink: ${blink.toLocaleString()}
Time Since Blink: ${String(Math.floor(elapsed / 6e4)).padStart(2, "0")}:${String(Math.floor(elapsed / 1e3) % 60).padStart(2, "0")}.${String(elapsed % 1e3).padStart(3, "0")} MM:SS.mmm`);
          console.error(`Exception stack:`, exception);
          console.groupEnd();
        });
      }
      return response;
    };
  });
  GM.addStyle("#bm-overlay{position:fixed;background-color:#153063cc;color:#fff;padding:10px;border-radius:8px;z-index:9000;transition:all .3s ease,transform 0s;max-width:300px;width:auto;will-change:transform;backface-visibility:hidden;-webkit-backface-visibility:hidden;transform-style:preserve-3d;-webkit-transform-style:preserve-3d}#bm-contain-userinfo,#bm-overlay hr,#bm-contain-automation,#bm-contain-buttons-action{transition:opacity .2s ease,height .2s ease}div#bm-overlay{font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Monaco,DejaVu Sans,sans-serif;letter-spacing:.05em}#bm-bar-drag{margin-bottom:.5em;background:url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"5\" height=\"5\"><circle cx=\"3\" cy=\"3\" r=\"1.5\" fill=\"CornflowerBlue\" /></svg>') repeat;cursor:grab;width:100%;height:1em}#bm-bar-drag.dragging{cursor:grabbing}#bm-overlay:has(#bm-bar-drag.dragging){pointer-events:none;user-select:none;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none}#bm-bar-drag.dragging{pointer-events:auto}#bm-contain-header{margin-bottom:.5em}#bm-contain-header[style*=\"text-align: center\"]{display:flex;flex-direction:column;align-items:center;justify-content:center}#bm-overlay[style*=\"padding: 5px\"]{width:auto!important;max-width:300px;min-width:200px}#bm-overlay img{display:inline-block;height:2.5em;margin-right:1ch;vertical-align:middle;transition:opacity .2s ease}#bm-contain-header[style*=\"text-align: center\"] img{display:block;margin:0 auto}#bm-bar-drag{transition:margin-bottom .2s ease}#bm-overlay h1{display:inline-block;font-size:x-large;font-weight:700;vertical-align:middle}#bm-contain-automation input[type=checkbox]{vertical-align:middle}#bm-contain-automation label>input[type=checkbox]{margin-right:.5ch}#bm-contain-automation label{margin-right:.5ch}.bm-help{border:white 1px solid;height:1.5em;width:1.5em;margin-top:2px;text-align:center;line-height:1em;padding:0!important}#bm-button-coords{vertical-align:middle}#bm-button-coords svg{width:50%;margin:0 auto;fill:#111}div:has(>#bm-button-teleport){display:flex;gap:.5ch}#bm-button-favorite svg,#bm-button-template svg{height:1em;margin:2px auto 0;text-align:center;line-height:1em;vertical-align:bottom}#bm-contain-coords input[type=number]{appearance:auto;-moz-appearance:textfield;width:5.5ch;margin-left:1ch;background-color:#0003;padding:0 .5ch;font-size:small}#bm-contain-coords input[type=number]::-webkit-outer-spin-button,#bm-contain-coords input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}#bm-contain-buttons-template,#bm-button-colors-container{display:flex;flex-direction:row;flex-wrap:wrap;align-content:center;justify-content:center;align-items:center;gap:1ch}div:has(>#bm-input-file-template)>button{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#bm-input-file-template,input[type=file][id*=template]{display:none!important;visibility:hidden!important;position:absolute!important;left:-9999px!important;top:-9999px!important;width:0!important;height:0!important;opacity:0!important;z-index:-9999!important;pointer-events:none!important}#bm-output-status{font-size:small;background-color:#0003;padding:0 .5ch;height:3.75em;width:100%}#bm-contain-buttons-action{display:flex;justify-content:space-between}#bm-overlay small{font-size:x-small;color:#d3d3d3}#bm-contain-userinfo,#bm-contain-automation,#bm-contain-coords,#bm-contain-buttons-template,#bm-button-colors-container,#bm-output-status{margin-top:.5em}#bm-user-charges{display:flex;align-items:baseline;gap:.5ch;white-space:nowrap;min-height:1.4em}#bm-user-charges .bm-charge-countdown{color:orange;font-weight:700;font-variant-numeric:tabular-nums;font-feature-settings:\"tnum\"}#bm-user-charges .bm-charge-count{color:#d3d3d3;font-size:.8em}#bm-overlay button{background-color:#144eb9;border-radius:1em;padding:0 .75ch;font-size:small}#bm-overlay span:has(>input[type=file]+button){font-size:small}#bm-overlay select{border-width:1px;border-radius:1em;padding:0 .75ch;font-size:small}#bm-overlay select option{background-color:#153063cc}#bm-overlay button:hover,#bm-overlay button:focus-visible{background-color:#1061e5}#bm-overlay button:active #bm-overlay button:disabled{background-color:#2e97ff}#bm-overlay button:disabled{text-decoration:line-through}\n");
  var overlayMain = new Overlay(name, version);
  var templateManager = new TemplateManager(name, version, overlayMain);
  var apiManager = new ApiManager(templateManager);
  overlayMain.setApiManager(apiManager);
  GM.getValue("bmTemplates", "{}").then(async (storageTemplatesValue) => {
    const userSettingsValue = await GM.getValue("bmUserSettings", "{}");
    let userSettings;
    try {
      userSettings = JSON.parse(userSettingsValue);
    } catch {
      userSettings = {};
    }
    console.log(userSettings);
    console.log(Object.keys(userSettings).length);
    if (Object.keys(userSettings).length == 0) {
      const uuid = crypto.randomUUID();
      console.log(uuid);
      templateManager.setUserSettings({
        "uuid": uuid,
        "hideLockedColors": false,
        "progressBarEnabled": true,
        "hideCompletedColors": false,
        "sortBy": "total-desc",
        "smartPlace": false,
        "memorySavingMode": false
      });
      templateManager.storeUserSettings();
    } else {
      templateManager.setUserSettings(userSettings);
    }
    let storageTemplates;
    try {
      storageTemplates = JSON.parse(storageTemplatesValue);
    } catch {
      storageTemplates = {};
    }
    console.log(storageTemplates);
    templateManager.importJSON(storageTemplates);
    await buildOverlayMain();
    overlayMain.handleDrag("#bm-overlay", "#bm-bar-drag");
    apiManager.spontaneousResponseListener(overlayMain);
    observeBlack();
    consoleLog(`%c${name}%c (${version}) userscript has loaded!`, "color: cornflowerblue;", "");
  });
  function observeBlack() {
    const observer = new MutationObserver((mutations, observer2) => {
      const black = document.querySelector("#color-1");
      if (!black) {
        return;
      }
      let move = document.querySelector("#bm-button-move");
      if (!move) {
        move = document.createElement("button");
        move.id = "bm-button-move";
        move.textContent = "Move \u2191";
        move.className = "btn btn-soft";
        move.onclick = function() {
          const roundedBox = this.parentNode.parentNode.parentNode.parentNode;
          const shouldMoveUp = this.textContent == "Move \u2191";
          roundedBox.parentNode.className = roundedBox.parentNode.className.replace(shouldMoveUp ? "bottom" : "top", shouldMoveUp ? "top" : "bottom");
          roundedBox.style.borderTopLeftRadius = shouldMoveUp ? "0px" : "var(--radius-box)";
          roundedBox.style.borderTopRightRadius = shouldMoveUp ? "0px" : "var(--radius-box)";
          roundedBox.style.borderBottomLeftRadius = shouldMoveUp ? "var(--radius-box)" : "0px";
          roundedBox.style.borderBottomRightRadius = shouldMoveUp ? "var(--radius-box)" : "0px";
          this.textContent = shouldMoveUp ? "Move \u2193" : "Move \u2191";
        };
        const paintPixel = black.parentNode.parentNode.parentNode.parentNode.querySelector("h2");
        paintPixel.parentNode?.appendChild(move);
      }
      if (templateManager.userSettings?.smartPlace ?? false) {
        let paint = document.querySelector("#bm-button-paint");
        if (!paint) {
          paint = document.createElement("button");
          paint.id = "bm-button-paint";
          paint.textContent = "Paint";
          paint.className = "btn btn-soft";
          paint.onclick = function() {
            const currentCharges = Math.floor(apiManager.getCurrentCharges());
            let examples = [];
            const toggleStatus = templateManager.getPaletteToggledStatus();
            for (const stats of templateManager.tileProgress.values()) {
              Object.entries(stats.palette).forEach(([colorKey, content]) => {
                if (!rgbToMeta.has(colorKey)) return;
                if (!toggleStatus?.[colorKey]) return;
                const colorId = rgbToMeta.get(colorKey).id;
                if (!templateManager.isColorUnlocked(colorId)) return;
                examples.push(...content.examplesEnabled.map((example) => [colorId, example]));
              });
            }
            ;
            let exampleCoord;
            if (examples.length === 0) return;
            try {
              const geoCoords = getCenterGeoCoords();
              const tileCoords = coordsGeoToTileCoords(geoCoords[0], geoCoords[1]);
              exampleCoord = [
                tileCoords[0][0] * templateManager.tileSize + tileCoords[1][0],
                tileCoords[0][1] * templateManager.tileSize + tileCoords[1][1]
              ];
            } catch {
              const example = examples[Math.floor(Math.random() * examples.length)][1];
              exampleCoord = [
                example[0][0] * templateManager.tileSize + example[1][0],
                example[0][1] * templateManager.tileSize + example[1][1]
              ];
            }
            ;
            if (examples.length <= currentCharges) {
            } else if (examples.length < 5e3) {
              examples = examples.sort(([color1, coord1], [color2, coord2]) => {
                const _coord1 = [
                  coord1[0][0] * templateManager.tileSize + coord1[1][0],
                  coord1[0][1] * templateManager.tileSize + coord1[1][1]
                ];
                const _coord2 = [
                  coord2[0][0] * templateManager.tileSize + coord2[1][0],
                  coord2[0][1] * templateManager.tileSize + coord2[1][1]
                ];
                const dist1 = Math.sqrt(Math.pow(_coord1[0] - exampleCoord[0], 2) + Math.pow(_coord1[1] - exampleCoord[1], 2)) * (1 + Math.random() * 0.2);
                const dist2 = Math.sqrt(Math.pow(_coord2[0] - exampleCoord[0], 2) + Math.pow(_coord2[1] - exampleCoord[1], 2)) * (1 + Math.random() * 0.2);
                return dist1 - dist2;
              }).slice(0, currentCharges);
            } else {
              const buckets = {};
              const resultExamples = [];
              examples.forEach(([color1, coord1]) => {
                const _coord1 = [
                  coord1[0][0] * templateManager.tileSize + coord1[1][0],
                  coord1[0][1] * templateManager.tileSize + coord1[1][1]
                ];
                const dist1 = Math.floor(Math.sqrt(Math.pow(_coord1[0] - exampleCoord[0], 2) + Math.pow(_coord1[1] - exampleCoord[1], 2)) * (1 + Math.random() * 0.2));
                if (buckets[dist1] === void 0) {
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
            for (let i = 0; i < examples.length; i++) {
              const [colorId, example] = examples[i];
              document.getElementById("color-" + colorId).click();
              teleportToTileCoords(example[0], example[1], false);
              const ev = new MouseEvent("click", {
                "bubbles": true,
                "cancelable": true,
                "clientX": canvas.offsetWidth / 2,
                "clientY": canvas.offsetHeight / 2,
                "button": 0
              });
              canvas.dispatchEvent(ev);
            }
            teleportToTileCoords(examples[0][1][0], examples[0][1][1], false);
          };
          const paintPixel = black.parentNode.parentNode.parentNode.parentNode.querySelector("h2");
          paintPixel.parentNode?.appendChild(paint);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
  var persistCoords = () => {
    try {
      const [[tx, ty], [px, py]] = getOverlayCoords();
      const data = { tx, ty, px, py };
      GM.setValue("bmCoords", JSON.stringify(data));
    } catch (_) {
    }
  };
  var teleportCoords = () => {
    try {
      const [[tx, ty], [px, py]] = getOverlayCoords();
      teleportToTileCoords([tx, ty], [px, py]);
    } catch (_) {
    }
  };
  async function buildOverlayMain() {
    let isMinimized = false;
    let savedCoords = {};
    const savedCoordsValue = await GM.getValue("bmCoords", "{}");
    try {
      savedCoords = JSON.parse(savedCoordsValue) || {};
    } catch {
      savedCoords = {};
    }
    overlayMain.addDiv({ "id": "bm-overlay", "style": "top: 10px; right: 75px;" }).addDiv({ "id": "bm-contain-header" }).addDiv({ "id": "bm-bar-drag" }).buildElement().addImg(
      { "alt": "Blue Marble Icon - Click to minimize/maximize", "src": "https://raw.githubusercontent.com/SwingTheVine/Wplace-BlueMarble/main/dist/assets/Favicon.png", "style": "cursor: pointer;" },
      (instance, img) => {
        img.addEventListener("click", () => {
          isMinimized = !isMinimized;
          const overlay = document.querySelector("#bm-overlay");
          const header = document.querySelector("#bm-contain-header");
          const dragBar = document.querySelector("#bm-bar-drag");
          const coordsContainer = document.querySelector("#bm-contain-coords");
          const coordsButton = document.querySelector("#bm-button-coords");
          const createButton = document.querySelector("#bm-button-create");
          const enableButton = document.querySelector("#bm-button-enable");
          const disableButton = document.querySelector("#bm-button-disable");
          const coordInputs = document.querySelectorAll("#bm-contain-coords input");
          if (!isMinimized) {
            overlay.style.width = "auto";
            overlay.style.maxWidth = "300px";
            overlay.style.minWidth = "200px";
            overlay.style.padding = "10px";
          }
          const elementsToToggle = [
            "#bm-overlay h1",
            // Main title "Blue Marble"
            "#bm-contain-userinfo",
            // User information section (username, droplets, level)
            "#bm-overlay hr",
            // Visual separator lines
            "#bm-contain-automation > *:not(#bm-contain-coords)",
            // Automation section excluding coordinates
            "#bm-contain-buttons-action",
            // Action buttons container
            `#${instance.outputStatusId}`,
            // Status log textarea for user feedback
            "#bm-checkbox-container",
            // Hide locked Colors checkbox
            "#bm-contain-colorfilter",
            // Color filter UI
            "#bm-contain-templatefilter"
            // Template filter UI
            // '#bm-footer'                         // Footer credit text
          ];
          elementsToToggle.forEach((selector) => {
            const elements = document.querySelectorAll(selector);
            elements.forEach((element) => {
              element.style.display = isMinimized ? "none" : "";
            });
          });
          if (isMinimized) {
            if (coordsContainer) {
              coordsContainer.style.display = "none";
            }
            if (coordsButton) {
              coordsButton.style.display = "none";
            }
            if (createButton) {
              createButton.style.display = "none";
            }
            if (enableButton) {
              enableButton.style.display = "none";
            }
            if (disableButton) {
              disableButton.style.display = "none";
            }
            coordInputs.forEach((input) => {
              input.style.display = "none";
            });
            overlay.style.width = "60px";
            overlay.style.height = "76px";
            overlay.style.maxWidth = "60px";
            overlay.style.minWidth = "60px";
            overlay.style.padding = "8px";
            img.style.marginLeft = "3px";
            header.style.textAlign = "center";
            header.style.margin = "0";
            header.style.marginBottom = "0";
            if (dragBar) {
              dragBar.style.display = "";
              dragBar.style.marginBottom = "0.25em";
            }
          } else {
            if (coordsContainer) {
              coordsContainer.style.display = "";
              coordsContainer.style.flexDirection = "";
              coordsContainer.style.justifyContent = "";
              coordsContainer.style.alignItems = "";
              coordsContainer.style.gap = "";
              coordsContainer.style.textAlign = "";
              coordsContainer.style.margin = "";
            }
            if (coordsButton) {
              coordsButton.style.display = "";
            }
            if (createButton) {
              createButton.style.display = "";
              createButton.style.marginTop = "";
            }
            if (enableButton) {
              enableButton.style.display = "";
              enableButton.style.marginTop = "";
            }
            if (disableButton) {
              disableButton.style.display = "";
              disableButton.style.marginTop = "";
            }
            coordInputs.forEach((input) => {
              input.style.display = "";
            });
            img.style.marginLeft = "";
            overlay.style.padding = "10px";
            header.style.textAlign = "";
            header.style.margin = "";
            header.style.marginBottom = "";
            if (dragBar) {
              dragBar.style.marginBottom = "0.5em";
            }
            overlay.style.width = "";
            overlay.style.height = "";
          }
          img.alt = isMinimized ? "Blue Marble Icon - Minimized (Click to maximize)" : "Blue Marble Icon - Maximized (Click to minimize)";
        });
      }
    ).buildElement().addHeader(1, { "textContent": name }).addSmall({ "textContent": ` v${version}` }).buildElement().buildElement().buildElement().addHr().buildElement().addDiv({ "id": "bm-contain-userinfo" }).addP({ "textContent": "Username: " }).addB({ "id": "bm-user-name" }).buildElement().buildElement().addP({ "id": "bm-user-charges" }, (_, element) => {
      element.setAttribute("aria-live", "polite");
    }).addText("Full Charges in ").addSpan({ "className": "bm-charge-countdown", "textContent": "--:--" }, (_, element) => {
      element.dataset.role = "countdown";
    }).buildElement().addText(" ").addSpan({ "className": "bm-charge-count", "textContent": "(0 / 0)" }, (_, element) => {
      element.dataset.role = "charge-count";
    }).buildElement().buildElement().addP({ "textContent": "Droplets: " }).addB({ "id": "bm-user-droplets" }).buildElement().buildElement().addP().addB({ "id": "bm-user-nextpixel", "textContent": "--" }).buildElement().addText(" more pixel").addSpan({ "id": "bm-user-nextpixel-plural", "textContent": "s" }).buildElement().addText(" to Lv. ").addB({ "id": "bm-user-nextlevel", "textContent": "--" }).buildElement().buildElement().buildElement().addHr().buildElement().addDiv({ "id": "bm-contain-automation" }).addDiv({ "id": "bm-contain-coords" }).addButton(
      { "id": "bm-button-coords", "className": "bm-help", "style": "margin-top: 0;", "innerHTML": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 6"><circle cx="2" cy="2" r="2"></circle><path d="M2 6 L3.7 3 L0.3 3 Z"></path><circle cx="2" cy="2" r="0.7" fill="white"></circle></svg></svg>' },
      (instance, button) => {
        button.onclick = () => {
          const coords2 = instance.apiManager?.coordsTilePixel;
          if (!coords2?.[0]) {
            instance.handleDisplayError("Coordinates are malformed! Did you try clicking on the canvas first?");
            return;
          }
          instance.updateInnerHTML("bm-input-tx", coords2?.[0] || "");
          instance.updateInnerHTML("bm-input-ty", coords2?.[1] || "");
          instance.updateInnerHTML("bm-input-px", coords2?.[2] || "");
          instance.updateInnerHTML("bm-input-py", coords2?.[3] || "");
          apiManager.updateDownloadButton();
          persistCoords();
        };
      }
    ).buildElement().addInput({ "type": "number", "id": "bm-input-tx", "placeholder": "Tl X", "min": 0, "max": 2047, "step": 1, "required": true, "value": savedCoords.tx ?? "" }, (instance, input) => {
      input.addEventListener("paste", (event) => {
        const clipboardText = (event.clipboardData || window.clipboardData).getData("text");
        const matchResult = [
          /^\s*(\d{1,4}),\s*(\d{1,4}),\s*(\d{1,4}),\s*(\d{1,4})\s*$/,
          // comma-separated
          /^\s*(\d{1,4})\s+(\d{1,4})\s+(\d{1,4})\s+(\d{1,4})\s*$/,
          // space-separated
          /^\s*\(?Tl X: (\d{1,4}), Tl Y: (\d{1,4}), Px X: (\d{1,4}), Px Y: (\d{1,4})\)?\s*$/
          // display format
        ].map((r) => r.exec(clipboardText)).filter((r) => r).pop();
        if (matchResult === void 0) {
          return;
        }
        let splitText = matchResult.slice(1).map(Number);
        let coords2 = selectAllCoordinateInputs(document);
        for (let i = 0; i < coords2.length; i++) {
          coords2[i].value = splitText[i];
        }
        apiManager.updateDownloadButton();
        event.preventDefault();
      });
      const handler = () => (apiManager.updateDownloadButton(), persistCoords());
      input.addEventListener("input", handler);
      input.addEventListener("change", handler);
    }).buildElement().addInput({ "type": "number", "id": "bm-input-ty", "placeholder": "Tl Y", "min": 0, "max": 2047, "step": 1, "required": true, "value": savedCoords.ty ?? "" }, (instance, input) => {
      const handler = () => (apiManager.updateDownloadButton(), persistCoords());
      input.addEventListener("input", handler);
      input.addEventListener("change", handler);
    }).buildElement().addInput({ "type": "number", "id": "bm-input-px", "placeholder": "Px X", "min": 0, "max": 2047, "step": 1, "required": true, "value": savedCoords.px ?? "" }, (instance, input) => {
      const handler = () => (apiManager.updateDownloadButton(), persistCoords());
      input.addEventListener("input", handler);
      input.addEventListener("change", handler);
    }).buildElement().addInput({ "type": "number", "id": "bm-input-py", "placeholder": "Px Y", "min": 0, "max": 2047, "step": 1, "required": true, "value": savedCoords.py ?? "" }, (instance, input) => {
      const handler = () => (apiManager.updateDownloadButton(), persistCoords());
      input.addEventListener("input", handler);
      input.addEventListener("change", handler);
    }).buildElement().addButton(
      { "id": "bm-button-teleport", "className": "bm-help", "style": "margin-top: 0;", "innerHTML": "\u2708\uFE0F", "title": "Teleport" },
      (instance, button) => {
        button.onclick = () => {
          teleportCoords();
        };
      }
    ).buildElement().buildElement().addP({ "textContent": "Sort Colors by ", "style": "font-size: small; margin-top: 3px; margin-left: 5px;" }).addSelect({ "id": "bm-color-sort" }, (instance, select) => {
      const order = [
        "Asc",
        "Desc"
      ];
      const currentSortBy = templateManager.getSortBy();
      Object.keys(sortByOptions).forEach((o) => {
        order.forEach((o2) => {
          const option = document.createElement("option");
          option.value = `${o.toLowerCase()}-${o2.toLowerCase()}`;
          option.textContent = `${o[0].toUpperCase() + o.slice(1).toLowerCase()} (${o2}.)`;
          if (option.value === currentSortBy) {
            option.selected = true;
          }
          select.appendChild(option);
        });
      });
      select.addEventListener("change", () => {
        templateManager.setSortBy(select.value);
        buildColorFilterList();
        const parts = select.value.split("-");
        instance.handleDisplayStatus(`Changed the sort criteria to "${parts[0][0].toUpperCase() + parts[0].slice(1).toLowerCase()}" in ${parts[1]}ending order.`);
      });
    }).buildElement().buildElement().addDiv({ "id": "bm-button-colors-container", "style": "display: flex; gap: 6px; margin-top: 3px; margin-bottom: 0px;" }).addButton({ "id": "bm-button-colors-enable-all", "textContent": "Enable All" }, (instance, button) => {
      button.onclick = () => {
        templateManager.templatesArray.forEach((t) => {
          if (!t?.colorPalette) {
            return;
          }
          Object.values(t.colorPalette).forEach((v) => v.enabled = true);
        });
        syncToggleList();
        buildColorFilterList();
        instance.handleDisplayStatus("Enabled all colors");
      };
    }).buildElement().addButton({ "id": "bm-button-colors-disable-all", "textContent": "Disable All" }, (instance, button) => {
      button.onclick = () => {
        templateManager.templatesArray.forEach((t) => {
          if (!t?.colorPalette) {
            return;
          }
          Object.values(t.colorPalette).forEach((v) => v.enabled = false);
        });
        syncToggleList();
        buildColorFilterList();
        instance.handleDisplayStatus("Disabled all colors");
      };
    }).buildElement().buildElement().addDiv({ "id": "bm-checkbox-container", "style": "max-width: 100%; white-space: nowrap; overflow-x: scroll; border: 1px solid rgba(255,255,255,0.1); padding: 4px; border-radius: 4px; display: flex; gap: 5px;" }).addCheckbox({ "id": "bm-checkbox-colors-unlocked", "textContent": "Hide Locked Colors", "checked": templateManager.areLockedColorsHidden() }, (instance, label, checkbox) => {
      label.style.fontSize = "12px";
      checkbox.addEventListener("change", () => {
        templateManager.setHideLockedColors(checkbox.checked);
        buildColorFilterList();
        if (checkbox.checked) {
          instance.handleDisplayStatus("Hidden all locked colors.");
        } else {
          instance.handleDisplayStatus("Restored all colors.");
        }
      });
    }).buildElement().addCheckbox({ "id": "bm-checkbox-colors-completed", "textContent": "Hide Completed Colors", "checked": templateManager.areCompletedColorsHidden() }, (instance, label, checkbox) => {
      label.style.fontSize = "12px";
      checkbox.addEventListener("change", () => {
        templateManager.setHideCompletedColors(checkbox.checked);
        buildColorFilterList();
        if (checkbox.checked) {
          instance.handleDisplayStatus("Hidden all completed colors.");
        } else {
          instance.handleDisplayStatus("Restored all colors.");
        }
      });
    }).buildElement().addCheckbox({ "id": "bm-progress-bar-enabled", "textContent": "Show Progress Bar", "checked": templateManager.isProgressBarEnabled() }, (instance, label, checkbox) => {
      label.style.fontSize = "12px";
      checkbox.addEventListener("change", () => {
        templateManager.setProgressBarEnabled(checkbox.checked);
        buildColorFilterList();
        if (checkbox.checked) {
          instance.handleDisplayStatus("Progress Bar Enabled.");
        } else {
          instance.handleDisplayStatus("Progress Bar Disabled.");
        }
      });
    }).buildElement().addCheckbox({ "id": "bm-memory-saving-enabled", "textContent": "Memory-Saving Mode", "checked": templateManager.isMemorySavingModeOn() }, (instance, label, checkbox) => {
      label.style.fontSize = "12px";
      checkbox.addEventListener("change", () => {
        templateManager.setMemorySavingMode(checkbox.checked);
        buildColorFilterList();
        if (checkbox.checked) {
          instance.handleDisplayStatus("Memory Saving Mode Enabled. The Effect will be Fully Active After a Page Refresh.");
        } else {
          instance.handleDisplayStatus("Memory Saving Mode Disabled. The Effect will be Fully Active After a Page Refresh.");
        }
      });
    }).buildElement().buildElement().addDiv({ "id": "bm-contain-colorfilter", "style": "max-height: 125px; overflow: auto; border: 1px solid rgba(255,255,255,0.1); padding: 4px; border-radius: 4px; display: none; resize: vertical;" }).addDiv({ "id": "bm-colorfilter-list" }).buildElement().buildElement().addDiv({ "id": "bm-contain-buttons-template" }).addInputFile({ "id": "bm-input-file-template", "textContent": "Select Image", "accept": "image/png, image/jpeg, image/webp, image/bmp, image/gif" }).addButton({ "id": "bm-button-create", "textContent": "Create Template" }, (instance, button) => {
      button.onclick = async () => {
        const input = document.querySelector("#bm-input-file-template");
        const coordTlX = document.querySelector("#bm-input-tx");
        if (!coordTlX.checkValidity()) {
          coordTlX.reportValidity();
          instance.handleDisplayError("Coordinates are malformed! Did you try clicking on the canvas first?");
          return;
        }
        const coordTlY = document.querySelector("#bm-input-ty");
        if (!coordTlY.checkValidity()) {
          coordTlY.reportValidity();
          instance.handleDisplayError("Coordinates are malformed! Did you try clicking on the canvas first?");
          return;
        }
        const coordPxX = document.querySelector("#bm-input-px");
        if (!coordPxX.checkValidity()) {
          coordPxX.reportValidity();
          instance.handleDisplayError("Coordinates are malformed! Did you try clicking on the canvas first?");
          return;
        }
        const coordPxY = document.querySelector("#bm-input-py");
        if (!coordPxY.checkValidity()) {
          coordPxY.reportValidity();
          instance.handleDisplayError("Coordinates are malformed! Did you try clicking on the canvas first?");
          return;
        }
        if (!input?.files[0]) {
          instance.handleDisplayError(`No file selected!`);
          return;
        }
        await templateManager.createTemplate(input.files[0], input.files[0]?.name.replace(/\.[^/.]+$/, ""), [Number(coordTlX.value), Number(coordTlY.value), Number(coordPxX.value), Number(coordPxY.value)]);
        instance.handleDisplayStatus(`Drew to canvas!`);
      };
    }).buildElement().buildElement().addDiv({ "id": "bm-contain-templatefilter", "style": "max-height: 125px; overflow: auto; border: 1px solid rgba(255,255,255,0.1); padding: 4px; border-radius: 4px; display: none; resize: vertical;" }).addDiv({ "id": "bm-templatefilter-list" }).buildElement().buildElement().addTextarea({ "id": overlayMain.outputStatusId, "placeholder": `Status: Sleeping...
Version: ${version}`, "readOnly": true }).buildElement().addDiv({ "id": "bm-contain-buttons-action" }).addDiv().addButton(
      { "id": "bm-button-convert", "className": "bm-help", "innerHTML": "\u{1F3A8}", "title": "Template Color Converter" },
      (instance, button) => {
        button.addEventListener("click", () => {
          window.open("https://pepoafonso.github.io/color_converter_wplace/", "_blank", "noopener noreferrer");
        });
      }
    ).buildElement().addButton(
      { "id": "bm-button-website", "className": "bm-help", "innerHTML": "\u{1F310}", "title": "Official Blue Marble Website" },
      (instance, button) => {
        button.addEventListener("click", () => {
          window.open("https://bluemarble.camilledaguin.fr/", "_blank", "noopener noreferrer");
        });
      }
    ).buildElement().buildElement().addDiv({ "id": "bm-footer" }).addSmall({ "textContent": `by SwingTheVine | Forked by TWY`, "style": "margin-top: auto;" }).buildElement().buildElement().buildElement().buildElement().buildOverlay(document.body);
    window.syncToggleList = function syncToggleList2() {
      try {
        (templateManager.templatesArray ?? []).forEach((t) => {
          const key = t.storageKey;
          if (key && templateManager.templatesJSON?.templates?.[key]) {
            const templateJSON = templateManager.templatesJSON.templates[key];
            templateJSON.enabled = t.enabled;
            templateJSON.palette = t.colorPalette;
          }
        });
        templateManager.storeTemplates();
      } catch (_) {
      }
      ;
    };
    window.buildColorFilterList = function buildColorFilterList2() {
      const listContainer = document.querySelector("#bm-colorfilter-list");
      const toggleStatus = templateManager.getPaletteToggledStatus();
      const hideCompleted = templateManager.areCompletedColorsHidden();
      const hideLocked = templateManager.areLockedColorsHidden();
      listContainer.innerHTML = "";
      let hasColorPalette = false;
      const paletteSum = {};
      (templateManager.templatesArray ?? []).forEach((t) => {
        if (!t.enabled) return;
        if (!t?.colorPalette) return;
        hasColorPalette = true;
        for (const [rgb, meta] of Object.entries(t.colorPalette)) {
          paletteSum[rgb] = (paletteSum[rgb] ?? 0) + meta.count;
        }
      });
      if (!listContainer || !hasColorPalette) {
        if (listContainer) {
          listContainer.innerHTML = "<small>No template colors to display.</small>";
        }
        return;
      }
      const combinedProgress = {};
      for (const stats of templateManager.tileProgress.values()) {
        Object.entries(stats.palette).forEach(([colorKey, content]) => {
          if (combinedProgress[colorKey] === void 0) {
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
        });
      }
      ;
      const sortBy = templateManager.getSortBy();
      const sortByParts = sortBy.split("-");
      const keyFunction = sortByOptions[sortByParts[0]];
      const compareFunction = sortByParts[1] === "asc" ? (a, b) => keyFunction(a) - keyFunction(b) : (a, b) => keyFunction(b) - keyFunction(a);
      const paletteSumSorted = Object.entries(paletteSum).map(([rgb, count]) => [rgb, combinedProgress[rgb]?.paintedAndEnabled ?? 0, count]).sort(compareFunction);
      let hasColors = false;
      for (const [rgb, paintedCount, totalCount] of paletteSumSorted) {
        if (hideLocked && rgb === "other") continue;
        if (hideCompleted && paintedCount === totalCount) continue;
        let row = document.createElement("div");
        row.style.display = "flex";
        row.style.alignItems = "center";
        row.style.gap = "6px";
        row.style.margin = "4px 0";
        let swatch = document.createElement("div");
        swatch.style.width = "14px";
        swatch.style.height = "14px";
        swatch.style.border = "1px solid rgba(255,255,255,0.5)";
        let colorName = "";
        let colorKey = "";
        if (rgb === "other") {
          swatch.style.background = "#888";
          colorName = "Other";
          colorKey = "other";
        } else if (rgb === "#deface") {
          swatch.style.background = "#deface";
          colorName = "Transparent";
          colorKey = "transparent";
        } else {
          const [r, g, b] = rgb.split(",").map(Number);
          swatch.style.background = `rgb(${r},${g},${b})`;
          try {
            const tMeta = rgbToMeta.get(rgb);
            if (tMeta && typeof tMeta.id === "number") {
              if (hideLocked && !templateManager.isColorUnlocked(tMeta.id)) continue;
              const displayName = tMeta?.name || `rgb(${r},${g},${b})`;
              if (tMeta.premium) {
                swatch.style.borderColor = "gold";
                swatch.style.boxShadow = "0 0 2px yellow";
              }
              colorName = `#${tMeta.id} ${displayName}`;
              colorKey = `${r},${g},${b}`;
            }
          } catch (ignored) {
          }
        }
        let label = document.createElement("span");
        label.style.fontSize = "12px";
        if (sortByParts[0] === "remaining" || hideCompleted && sortByParts[0] !== "painted") {
          const remainingLabelText = (totalCount - paintedCount).toLocaleString();
          label.textContent = `${colorName} \u2022 ${remainingLabelText} Left`;
        } else {
          const labelText = totalCount.toLocaleString();
          const paintedLabelText = paintedCount.toLocaleString();
          label.textContent = `${colorName} \u2022 ${paintedLabelText} / ${labelText}`;
        }
        if (templateManager.isProgressBarEnabled()) {
          const percentageProgress = paintedCount / (totalCount === 0 ? 1 : totalCount) * 100;
          row.style.background = `linear-gradient(to right, rgb(0, 128, 0, 0.8) 0%, rgb(0, 128, 0, 0.8) ${percentageProgress}%, transparent ${percentageProgress}%, transparent 100%)`;
        }
        const paletteEntry = combinedProgress[colorKey];
        let currentIndex = 0;
        swatch.addEventListener("click", () => {
          if ((paletteEntry?.examplesEnabled?.length ?? 0) > 0) {
            const examples = paletteEntry.examplesEnabled;
            const exampleIndex = currentIndex % examples.length;
            teleportToTileCoords(examples[exampleIndex][0], examples[exampleIndex][1]);
            ++currentIndex;
          }
        });
        if ((paletteEntry?.examplesEnabled?.length ?? 0) > 0) {
          swatch.style["cursor"] = "pointer";
        }
        ;
        const toggle = document.createElement("input");
        toggle.type = "checkbox";
        toggle.checked = toggleStatus[rgb] ?? true;
        toggle.addEventListener("change", () => {
          (templateManager.templatesArray ?? []).forEach((t) => {
            if (!t?.colorPalette) return;
            if (t.colorPalette[rgb] !== void 0) {
              t.colorPalette[rgb].enabled = toggle.checked;
            }
          });
          overlayMain.handleDisplayStatus(`${toggle.checked ? "Enabled" : "Disabled"} ${rgb}`);
          syncToggleList();
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
            listContainer.innerHTML = "<small>All owned colors have been completed.</small>";
          } else {
            listContainer.innerHTML = "<small>Remaining colors are all locked.</small>";
          }
        } else {
          listContainer.innerHTML = "<small>All colors have been completed.</small>";
        }
      }
    };
    window.buildTemplateFilterList = function buildTemplateFilterList2() {
      const listContainer = document.querySelector("#bm-templatefilter-list");
      consoleLog(templateManager);
      if (templateManager.templatesArray?.length === 0) {
        if (listContainer) {
          listContainer.innerHTML = "<small>No templates to display.</small>";
        }
        return;
      }
      listContainer.innerHTML = "";
      const entries = templateManager.templatesArray;
      const combinedTemplate = {};
      for (const stats of templateManager.tileProgress.values()) {
        Object.entries(stats.template).forEach(([storageKey, content]) => {
          if (combinedTemplate[storageKey] === void 0) {
            combinedTemplate[storageKey] = Object.fromEntries(Object.entries(content));
          } else {
            combinedTemplate[storageKey].painted += content.painted;
          }
        });
      }
      ;
      for (const template of entries) {
        let row = document.createElement("div");
        row.style.display = "flex";
        row.style.alignItems = "center";
        row.style.gap = "8px";
        row.style.margin = "4px 0";
        let removeButton = document.createElement("a");
        removeButton.title = "Remove template";
        removeButton.textContent = "\u{1F5D1}\uFE0F";
        removeButton.style.fontSize = "12px";
        removeButton.onclick = () => {
          if (confirm(`Remove template ${template?.displayName}?`)) {
            templateManager.deleteTemplate(template?.storageKey);
          }
        };
        let teleportButton = document.createElement("a");
        teleportButton.title = "Teleport to template";
        teleportButton.textContent = "\u2708\uFE0F";
        teleportButton.style.fontSize = "12px";
        teleportButton.onclick = () => {
          teleportToTileCoords(template.coords.slice(0, 2), template.coords.slice(2, 4));
        };
        let label = document.createElement("span");
        label.style.fontSize = "12px";
        const labelText = `${template.requiredPixelCount.toLocaleString()}`;
        const templateName = template["displayName"];
        const filledCount = combinedTemplate[template.storageKey]?.painted ?? 0;
        const filledLabelText = `${filledCount.toLocaleString()}`;
        label.textContent = `${templateName} \u2022 ${filledLabelText} / ${labelText}`;
        const toggle = document.createElement("input");
        toggle.type = "checkbox";
        toggle.checked = template.enabled;
        toggle.addEventListener("change", () => {
          template.enabled = toggle.checked;
          overlayMain.handleDisplayStatus(`${toggle.checked ? "Enabled" : "Disabled"} ${templateName}`);
          if (!toggle.checked) {
            templateManager.clearTileProgress(template);
          }
          syncToggleList();
        });
        row.appendChild(toggle);
        row.appendChild(removeButton);
        row.appendChild(label);
        row.appendChild(teleportButton);
        listContainer.appendChild(row);
      }
    };
    window.addEventListener("message", (event) => {
      if (event?.data?.bmEvent === "bm-rebuild-color-list") {
        try {
          buildColorFilterList();
        } catch (_) {
        }
      } else if (event?.data?.bmEvent === "bm-rebuild-template-list") {
        try {
          buildTemplateFilterList();
        } catch (_) {
        }
      }
    });
    setTimeout(() => {
      try {
        if (templateManager.templatesArray?.length > 0) {
          const colorUI = document.querySelector("#bm-contain-colorfilter");
          if (colorUI) {
            colorUI.style.display = "";
          }
          buildColorFilterList();
        }
        if (templateManager.templatesArray?.length > 0) {
          const templateUI = document.querySelector("#bm-contain-templatefilter");
          if (templateUI) {
            templateUI.style.display = "";
          }
          buildTemplateFilterList();
        }
      } catch (_) {
      }
    }, 0);
  }
})();
