(function () {
    fetch("https://raw.githubusercontent.com/t-wy/Wplace-BlueMarble-Userscripts/custom-improve/dist/BlueMarble.user.js").then(function (response) {
        return response.text();
    }).then(function (content) {
        const GM = {
            "addStyle": function(css) {
                'use strict';
                let head = document.getElementsByTagName('head')[0];
                if (head) {
                    let style = document.createElement('style');
                    style.setAttribute('type', 'text/css');
                    style.textContent = css;
                    head.appendChild(style);
                    return style;
                }
                return null;
            },
            "getValue": function(name, _default) {
                return new Promise(function (resolve, reject) {
                    try {
                        const value = window.localStorage.getItem("bm-" + name);
                        if (value === null) { 
                            resolve(_default);
                        } else {
                            resolve(value);
                        }
                    } catch {
                        reject();
                    }
                })
            },
            "setValue": function(name, value) {
                return new Promise(function (resolve, reject) {
                    try {
                        window.localStorage.setItem("bm-" + name, value);
                        resolve();
                    } catch {
                        reject();
                    }
                })
            }
        };
        const GM_string = "{addStyle: " + GM.addStyle + ", getValue: " + GM.getValue + ", setValue: " + GM.setValue + "}";
        const GM_info = {
            "script": {
                "name": "Blue Marble",
                "version": content.match(/@version\s+([\d.]+)/)[1],
            }
        };
        const script = document.createElement('script');
        script.textContent = "(function (GM, GM_info) {\n" + content + "\n})(" + GM_string + ", " + JSON.stringify(GM_info) + ");";
        document.documentElement.appendChild(script);
        script.remove();
    })
})();