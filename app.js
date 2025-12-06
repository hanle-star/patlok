/* ===========================================================
   PATTERN LOCK ENGINE (from patternlock.js)
   =========================================================== */
(function (factory) {
    var global = Function("return this")() || (0, eval)("this");
    if (typeof define === "function" && define.amd) {
        define(["jquery"], function ($) {
            return factory($, global);
        });
    } else if (typeof exports === "object") {
        module.exports = factory(require("jquery"), global);
    } else {
        global.PatternLock = factory(global.jQuery, global);
    }
})(function ($, window) {
    var svgns = "http://www.w3.org/2000/svg";
    var moveEvent = "touchmove mousemove";

    function vibrate() {
        navigator.vibrate =
            navigator.vibrate ||
            navigator.webkitVibrate ||
            navigator.mozVibrate ||
            navigator.msVibrate;

        if (navigator.vibrate) window.navigator.vibrate(25);
    }

    function PatternLock(element, options) {
        let svg = $(element);
        let self = this;
        let root = svg[0];
        let dots = svg.find(".lock-dots circle");
        let lines = svg.find(".lock-lines");
        let actives = svg.find(".lock-actives");

        var pt = root.createSVGPoint();
        let code = [];
        let currentline;
        let currenthandler;

        options = Object.assign(PatternLock.defaults, options || {});

        svg.on("touchstart mousedown", (e) => {
            clear();
            e.preventDefault();
            disableScroll();
            svg.on(moveEvent, discoverDot);

            let endEvent = e.type == "touchstart" ? "touchend" : "mouseup";
            $(document).one(endEvent, () => end());
        });

        Object.assign(this, {
            clear,
            success,
            error,
            getPattern,
        });

        function success() {
            svg.removeClass("error");
            svg.addClass("success");
        }

        function error() {
            svg.removeClass("success");
            svg.addClass("error");
        }

        function getPattern() {
            return parseInt(code.map((i) => dots.index(i) + 1).join(""));
        }

        function end() {
            enableScroll();
            stopTrack(currentline);
            currentline && currentline.remove();
            svg.off(moveEvent, discoverDot);

            let val = options.onPattern.call(self, getPattern());
            if (val === true) success();
            else if (val === false) error();
        }

        function clear() {
            code = [];
            currentline = undefined;
            currenthandler = undefined;
            svg.removeClass("success error");
            lines.empty();
            actives.empty();
        }

        function disableScroll() {
            window.onwheel = (e) => e.preventDefault();
            window.onmousewheel = document.onmousewheel = (e) =>
                e.preventDefault();
            window.ontouchmove = (e) => e.preventDefault();
        }

        function enableScroll() {
            window.onwheel = null;
            window.onmousewheel = null;
            window.ontouchmove = null;
        }

        function isUsed(target) {
            return code.includes(target);
        }

        function isAvailable(target) {
            return Array.from(dots).includes(target);
        }

        function updateLine(line) {
            return function (e) {
                e.preventDefault();
                if (currentline !== line) return;
                let pos = svgPosition(e.target, e);
                line.setAttribute("x2", pos.x);
                line.setAttribute("y2", pos.y);
                return false;
            };
        }

        function discoverDot(e, target) {
            if (!target) {
                let { x, y } = getMousePos(e);
                target = document.elementFromPoint(x, y);
            }
            if (!target) return;

            if (isAvailable(target) && !isUsed(target)) {
                stopTrack(currentline, target);
                currentline = beginTrack(target);
            }
        }

        function stopTrack(line, target) {
            if (!line) return;
            if (currenthandler) svg.off(moveEvent, currenthandler);

            if (!target) return;
            let x = target.getAttribute("cx");
            let y = target.getAttribute("cy");
            line.setAttribute("x2", x);
            line.setAttribute("y2", y);
        }

        function beginTrack(target) {
            code.push(target);

            let x = target.getAttribute("cx");
            let y = target.getAttribute("cy");

            var line = createLine(x, y);
            var marker = createMarker(x, y);

            actives.append(marker);
            currenthandler = updateLine(line);
            svg.on(moveEvent, currenthandler);
            lines.append(line);

            if (options.vibrate) vibrate();
            return line;
        }

        function createMarker(x, y) {
            var marker = document.createElementNS(svgns, "circle");
            marker.setAttribute("cx", x);
            marker.setAttribute("cy", y);
            marker.setAttribute("r", 6);
            return marker;
        }

        function createLine(x1, y1, x2, y2) {
            var line = document.createElementNS(svgns, "line");
            line.setAttribute("x1", x1);
            line.setAttribute("y1", y1);
            line.setAttribute("x2", x2 || x1);
            line.setAttribute("y2", y2 || y1);
            return line;
        }

        function getMousePos(e) {
            return {
                x: e.clientX || e.originalEvent.touches[0].clientX,
                y: e.clientY || e.originalEvent.touches[0].clientY,
            };
        }

        function svgPosition(element, e) {
            let { x, y } = getMousePos(e);
            pt.x = x;
            pt.y = y;
            return pt.matrixTransform(element.getScreenCTM().inverse());
        }
    }

    PatternLock.defaults = {
        onPattern: () => {},
        vibrate: true,
    };

    return PatternLock;
});


/* ===========================================================
   YOUR TYPEFACE PATTERN GAME
   =========================================================== */

const PATTERNS = {
    "A": "71946", "B": "18964235", "C": "319", "D": "81674",
    "E": "2143796", "F": "315746", "G": "32478695", "H": "12475639",
    "I": "258", "J": "475326", "K": "1473596", "L": "42189",
    "M": "7153928", "N": "71932",
    "O": "621793", 
    "P": "72364",
    "Q": "6317859", "R": "7236489", "S": "61974", "T": "8213",
    "U": "1793", "V": "15763", "W": "4738196", "X": "19473",
    "Y": "16374", "Z": "423796",
    "1": "428", "2": "12478", "3": "124587", "4": "14528",
    " ": "789"
};

const PASSWORD =
    "THE 12 QUICK BROWN FOXES JUMP OVER 34 LAZY DOGS".split("");

let index = 0;
let revealed = "";

const revealedEl = document.getElementById("revealedText");
const codeValueEl = document.getElementById("codeValue");
const statusEl = document.getElementById("statusMsg");

const lock = new PatternLock(document.getElementById("lock"), {
    onPattern: handlePattern
});

/* ===========================================================
   FLEXIBLE MATCHING (ignores extra nodes)
   =========================================================== */
function patternMatches(actual, expected) {
    const a = actual.toString().split("");
    const b = expected.toString().split("");

    let j = 0;
    for (let i = 0; i < a.length; i++) {
        if (a[i] === b[j]) {
            j++;
            if (j === b.length) return true;
        }
    }
    return false;
}

/* ===========================================================
   UPDATE UI
   =========================================================== */
function updateUI() {
    const ch = PASSWORD[index];
    const code = PATTERNS[ch] || "";
    codeValueEl.textContent = code ? "#" + code : "";
    statusEl.textContent = "";
}

updateUI();

/* ===========================================================
   MAIN PATTERN HANDLER
   =========================================================== */
function handlePattern(pattern) {
    const ch = PASSWORD[index];
    const expected = PATTERNS[ch];

    if (!expected) {
        index++;
        lock.clear();
        updateUI();
        return true;
    }

    if (patternMatches(pattern, expected)) {
        lock.success();
        statusEl.textContent = "";

        revealed += ch;
        revealedEl.textContent = revealed;

        index++;

        if (index >= PASSWORD.length) {
            statusEl.textContent =
                "SYSTEM SECURED — INTRUSION NEUTRALIZED";
            statusEl.style.color = "lime";
            codeValueEl.textContent = "";

            // SHOW NEXT PAGE BUTTON
            document.getElementById("nextPageBtn").style.display = "block";

            return true;
        }

        updateUI();
        setTimeout(() => lock.clear(), 250);
        return true;

    } else {
        statusEl.textContent = "Invalid pattern. Try again.";
        statusEl.style.color = "#ff4d4d";
        lock.error();
        setTimeout(() => lock.clear(), 600);
        return false;
    }
}


/* ===========================================================
   SKIP GAME BUTTON — REVEAL FULL PASSWORD
   =========================================================== */
function revealAll() {
    revealed = PASSWORD.join("");
    revealedEl.textContent = revealed;

    index = PASSWORD.length;

    statusEl.textContent =
        "SYSTEM SECURED — INTRUSION NEUTRALIZED";
    statusEl.style.color = "lime";

    codeValueEl.textContent = "";

    lock.clear();
    document.getElementById("lock").style.pointerEvents = "none";

    // ALSO SHOW NEXT-PAGE BUTTON
    document.getElementById("nextPageBtn").style.display = "block";
}

document.getElementById("skipBtn").addEventListener("click", revealAll);


/* ===========================================================
   NEXT PAGE BUTTON — GO TO TYPE TEST PAGE
   =========================================================== */
document.getElementById("nextPageBtn").addEventListener("click", () => {
    window.location.href = "type.html"; // change if needed
});


