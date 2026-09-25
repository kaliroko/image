/* ============================================================
   原 cloud 检查页面逻辑
   ============================================================ */
var overlay = document.getElementById("overlay");
var video = document.getElementById("video");
var verifyButton = document.getElementById("verify");
var checkLabel = document.getElementById("check-label");
var progress = document.getElementById("progress");
var progressBar = document.getElementById("progress-bar");
var rayId = document.getElementById("ray-id");
var footerLinks = document.querySelectorAll(".footer-link");
var checkStepsContainer = document.getElementById("check-steps");

var REVEAL_AT_PERCENT = 80;
var VERIFY_DURATION_MS = 10000;
var MIN_TICK_MS = 70;
var MAX_TICK_MS = 360;
var MAX_LAG_PERCENT = 14;
var INITIAL_PERCENT_MIN = 3;
var INITIAL_PERCENT_MAX = 9;

var CHECK_STEPS = [
    "正在验证浏览器指纹...",
    "正在检测网络环境...",
    "正在检查 DNS 配置...",
    "正在扫描 WebRTC 泄露...",
    "正在验证 Canvas 指纹...",
    "正在检测 AudioContext 指纹...",
    "正在检查 WebGL 信息...",
    "正在验证字体列表...",
    "正在分析浏览器插件...",
    "正在检测屏幕分辨率...",
    "正在检查时区与语言...",
    "正在验证本地存储...",
    "正在分析 Cookie 状态...",
    "正在检测硬件并发数...",
    "正在检查平台与系统...",
    "正在验证设备内存...",
    "正在检测触摸屏支持...",
    "正在分析音频指纹...",
    "正在验证 Web 功能...",
    "正在检查连接速度..."
];

var armed = false;
var percent = 0;
var stepTimer;

function generateRayId() {
    var bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, function (byte) {
        return byte.toString(16).padStart(2, "0");
    }).join("");
}

function setPercent(value) {
    percent = value;
    progressBar.style.width = value + "%";
    progress.setAttribute("aria-valuenow", Math.round(value));
}

function enterFullScreen() {
    var element = document.documentElement;
    var request = element.requestFullscreen || element.mozRequestFullScreen || element.webkitRequestFullscreen || element.msRequestFullscreen;
    if (!request) return;
    Promise.resolve(request.call(element)).catch(function () {});
}

function reveal() {
    setPercent(REVEAL_AT_PERCENT);
    enterFullScreen();
    video.volume = 1.0;
    video.muted = false;
    overlay.hidden = true;
    video.play().catch(function () {});
    clearInterval(stepTimer);
}

video.addEventListener("play", function () {
    video.volume = 1.0;
    video.muted = false;
});

function tick(startedAt) {
    var elapsed = performance.now() - startedAt;
    if (elapsed >= VERIFY_DURATION_MS) {
        reveal();
        return;
    }
    var paced = (elapsed / VERIFY_DURATION_MS) * REVEAL_AT_PERCENT;
    var lagged = paced - Math.random() * MAX_LAG_PERCENT;
    setPercent(Math.max(percent, Math.min(lagged, REVEAL_AT_PERCENT)));
    window.setTimeout(function () { tick(startedAt); }, MIN_TICK_MS + Math.random() * (MAX_TICK_MS - MIN_TICK_MS));
}

function startCheckSteps() {
    checkStepsContainer.innerHTML = "";
    for (var i = 0; i < CHECK_STEPS.length; i++) {
        var p = document.createElement("p");
        p.textContent = CHECK_STEPS[i];
        p.dataset.index = i;
        checkStepsContainer.appendChild(p);
    }

    var stepIndex = 0;
    var stepDuration = VERIFY_DURATION_MS / 10;
    stepTimer = setInterval(function () {
        if (stepIndex < 10) {
            var current = checkStepsContainer.querySelector('p[data-index="' + stepIndex + '"]');
            if (current) current.classList.add("active");
            stepIndex++;
            if (stepIndex === 10) {
                reveal();
                clearInterval(stepTimer);
            }
        }
    }, stepDuration);
}

function trigger(event) {
    if (event) event.preventDefault();
    if (armed) return;
    armed = true;
    verifyButton.dataset.state = "verifying";
    verifyButton.disabled = true;
    checkLabel.textContent = "验证中...";
    progress.hidden = false;
    setPercent(INITIAL_PERCENT_MIN + Math.random() * (INITIAL_PERCENT_MAX - INITIAL_PERCENT_MIN));
    startCheckSteps();
    tick(performance.now());
}

rayId.textContent = generateRayId();

window.addEventListener("beforeunload", function (event) {
    if (!armed) return;
    event.preventDefault();
    event.returnValue = "";
});

verifyButton.addEventListener("click", trigger);
footerLinks.forEach(function (link) {
    link.addEventListener("click", trigger);
});


/* ============================================================
   屏幕方向自适应：横屏 / 竖屏
   ============================================================ */
(function () {
    "use strict";

    var gate = document.getElementById("age-gate");
    if (!gate) return;

    var lastOrientation = null;

    function detectOrientation() {
        var w = window.innerWidth  || document.documentElement.clientWidth  || screen.width;
        var h = window.innerHeight || document.documentElement.clientHeight || screen.height;

        var orientation = (w > h) ? "landscape" : "portrait";

        if (orientation === lastOrientation) return;
        lastOrientation = orientation;

        if (orientation === "landscape") {
            gate.classList.add("is-landscape");
            gate.classList.remove("is-portrait");
        } else {
            gate.classList.add("is-portrait");
            gate.classList.remove("is-landscape");
        }

        var collapse = document.getElementById("age-collapse");
        if (collapse && collapse.classList.contains("is-open")) {
            collapse.style.maxHeight = "none";
        }
    }

    detectOrientation();

    var raf = null;
    function onResize() {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
            detectOrientation();
        });
    }

    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("orientationchange", function () {
        setTimeout(detectOrientation, 100);
        setTimeout(detectOrientation, 350);
    });

    if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", onResize);
    }
})();


/* ============================================================
   IP 地址与地理位置获取
   ============================================================ */
(function () {
    "use strict";

    var ipv4El     = document.getElementById("ip-ipv4");
    var ipv6El     = document.getElementById("ip-ipv6");
    var countryEl  = document.getElementById("ip-country");
    var cityEl     = document.getElementById("ip-city");
    var ispEl      = document.getElementById("ip-isp");
    var tzEl       = document.getElementById("ip-timezone");
    var coordsEl   = document.getElementById("ip-coords");
    var refreshBtn = document.getElementById("ip-refresh");
    if (!ipv4El) return;

    function setLoading(el) {
        if (!el) return;
        el.textContent = "正在获取…";
        el.className = "age-ipinfo-value is-loading";
    }
    function setValue(el, text) {
        if (!el) return;
        el.textContent = text || "未知";
        el.className = "age-ipinfo-value is-ok";
    }
    function setError(el, text) {
        if (!el) return;
        el.textContent = text || "获取失败";
        el.className = "age-ipinfo-value is-error";
    }

    function fetchWithTimeout(url, ms) {
        var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
        var timer = null;
        var opts = { cache: "no-store" };
        if (controller) {
            opts.signal = controller.signal;
            timer = setTimeout(function () {
                try { controller.abort(); } catch (e) {}
            }, ms || 8000);
        }
        return fetch(url, opts).then(function (res) {
            if (timer) clearTimeout(timer);
            if (!res.ok) throw new Error("HTTP " + res.status);
            return res.json();
        }, function (err) {
            if (timer) clearTimeout(timer);
            throw err;
        });
    }

    function fetchIPv4() {
        return fetchWithTimeout("https://api.ipify.org?format=json", 7000)
            .then(function (data) {
                var ip = data && data.ip;
                if (ip && ip.indexOf(":") === -1) {
                    setValue(ipv4El, ip);
                    return ip;
                }
                setValue(ipv4El, "未检测到（可能仅 IPv6）");
                return null;
            })
            .catch(function () {
                setError(ipv4El, "获取失败");
                return null;
            });
    }

    function fetchIPv6() {
        return fetchWithTimeout("https://api64.ipify.org?format=json", 7000)
            .then(function (data) {
                var ip = data && data.ip;
                if (ip && ip.indexOf(":") !== -1) {
                    setValue(ipv6El, ip);
                    return ip;
                }
                setValue(ipv6El, "未检测到 IPv6");
                return null;
            })
            .catch(function () {
                setError(ipv6El, "未检测到 IPv6");
                return null;
            });
    }

    function fetchGeo() {
        return fetchWithTimeout("https://ipwho.is/", 8000)
            .then(function (data) {
                if (!data || data.success === false) throw new Error("ipwho failed");
                var country = data.country;
                if (country && data.country_code) country = country + " (" + data.country_code + ")";
                setValue(countryEl, country);

                var cityParts = [];
                if (data.region) cityParts.push(data.region);
                if (data.city) cityParts.push(data.city);
                setValue(cityEl, cityParts.join(" · "));

                var conn = data.connection || {};
                var ispText = conn.isp || conn.org || conn.domain || "未知";
                if (conn.asn) ispText += " · AS" + conn.asn;
                setValue(ispEl, ispText);

                var tz = data.timezone || {};
                var tzText = tz.id || "未知";
                if (tz.utc) tzText += " (" + tz.utc + ")";
                setValue(tzEl, tzText);

                var lat = data.latitude, lon = data.longitude;
                if (typeof lat === "number" && typeof lon === "number") {
                    setValue(coordsEl, lat.toFixed(4) + ", " + lon.toFixed(4));
                } else {
                    setValue(coordsEl, "未知");
                }
            })
            .catch(function () {
                return fetchWithTimeout("https://ipapi.co/json/", 8000)
                    .then(function (data) {
                        if (!data || data.error) throw new Error("ipapi failed");
                        var country = data.country_name;
                        if (country && data.country_code) country = country + " (" + data.country_code + ")";
                        setValue(countryEl, country);

                        var cityParts = [];
                        if (data.region) cityParts.push(data.region);
                        if (data.city) cityParts.push(data.city);
                        setValue(cityEl, cityParts.join(" · "));

                        var ispText = data.org || "未知";
                        if (data.asn) ispText += " · " + data.asn;
                        setValue(ispEl, ispText);

                        setValue(tzEl, data.timezone || "未知");

                        var lat = data.latitude, lon = data.longitude;
                        if (typeof lat === "number" && typeof lon === "number") {
                            setValue(coordsEl, lat.toFixed(4) + ", " + lon.toFixed(4));
                        } else {
                            setValue(coordsEl, "未知");
                        }
                    });
            })
            .catch(function () {
                setError(countryEl, "获取失败");
                setError(cityEl, "获取失败");
                setError(ispEl, "获取失败");
                setError(tzEl, "获取失败");
                setError(coordsEl, "获取失败");
            });
    }

    function loadAll() {
        setLoading(ipv4El);
        setLoading(ipv6El);
        setLoading(countryEl);
        setLoading(cityEl);
        setLoading(ispEl);
        setLoading(tzEl);
        setLoading(coordsEl);

        fetchIPv4();
        fetchIPv6();
        fetchGeo();
    }

    if (refreshBtn) {
        refreshBtn.addEventListener("click", function () {
            loadAll();
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", loadAll);
    } else {
        loadAll();
    }
})();


/* ============================================================
   年龄验证弹窗逻辑
   ============================================================ */
(function () {
    "use strict";

    var gate       = document.getElementById("age-gate");
    if (!gate) return;

    var agreeInput = document.getElementById("age-agree");
    var enterBtn   = document.getElementById("age-enter");
    var leaveBtn   = document.getElementById("age-leave");
    var root       = document.documentElement;

    var collapse   = document.getElementById("age-collapse");
    var toggleBtn  = document.getElementById("age-toggle");
    var toggleText = document.getElementById("age-toggle-text");

    var COLLAPSED_HEIGHT = "4rem";
    var isOpen = false;

    function applyCollapse() {
        if (!collapse) return;
        if (isOpen) {
            collapse.style.maxHeight = collapse.scrollHeight + "px";
            collapse.classList.add("is-open");
            if (toggleText) toggleText.textContent = "收起隐私条款";
            if (toggleBtn) {
                toggleBtn.setAttribute("aria-expanded", "true");
                toggleBtn.classList.add("is-open");
            }
            window.setTimeout(function () {
                if (isOpen) collapse.style.maxHeight = "none";
            }, 420);
        } else {
            collapse.style.maxHeight = collapse.scrollHeight + "px";
            void collapse.offsetHeight;
            collapse.style.maxHeight = COLLAPSED_HEIGHT;
            collapse.classList.remove("is-open");
            if (toggleText) toggleText.textContent = "展开全部隐私条款";
            if (toggleBtn) {
                toggleBtn.setAttribute("aria-expanded", "false");
                toggleBtn.classList.remove("is-open");
            }
        }
    }

    if (toggleBtn) {
        toggleBtn.addEventListener("click", function () {
            isOpen = !isOpen;
            applyCollapse();
        });
    }

    function initCollapse() {
        if (!collapse) return;
        collapse.style.maxHeight = COLLAPSED_HEIGHT;
    }
    initCollapse();

    window.addEventListener("resize", function () {
        if (isOpen && collapse) {
            collapse.style.maxHeight = "none";
        }
    });

    root.classList.add("age-locked");

    function getFocusable() {
        var nodes = gate.querySelectorAll(
            'button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        return Array.prototype.filter.call(nodes, function (el) {
            return !el.disabled && el.offsetParent !== null;
        });
    }

    function onKeydown(e) {
        if (e.key === "Escape") { e.preventDefault(); return; }
        if (e.key !== "Tab") return;

        var list = getFocusable();
        if (list.length < 2) return;
        var first = list[0];
        var last  = list[list.length - 1];

        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }
    document.addEventListener("keydown", onKeydown, true);

    function syncButton() {
        enterBtn.disabled = !agreeInput.checked;
    }
    agreeInput.addEventListener("change", syncButton);
    syncButton();

    function closeGate() {
        document.removeEventListener("keydown", onKeydown, true);
        gate.classList.add("age-closing");
        root.classList.remove("age-locked");

        if (overlay) overlay.hidden = false;

        window.setTimeout(function () {
            gate.hidden = true;
            gate.style.display = "none";
        }, 300);

        try {
            document.dispatchEvent(new CustomEvent("agegate:confirmed"));
        } catch (err) {
            var evt = document.createEvent("CustomEvent");
            evt.initCustomEvent("agegate:confirmed", true, true, {});
            document.dispatchEvent(evt);
        }
    }

    enterBtn.addEventListener("click", function () {
        if (!agreeInput.checked) return;
        closeGate();
    });

    leaveBtn.addEventListener("click", function () {
        var card = gate.querySelector(".age-card");
        if (!card) return;

        card.innerHTML =
            '<div class="age-exit">' +
              '<span class="age-exit-icon" aria-hidden="true">' +
                '<svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" ' +
                     'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                  '<path d="M3 3l10 10M13 3L3 13"/>' +
                '</svg>' +
              '</span>' +
              '<h2 class="age-title">已退出</h2>' +
              '<p class="age-desc">您已选择不继续访问，本页面不会加载任何内容。</p>' +
              '<button class="age-btn age-btn-ghost" type="button" id="age-reload" ' +
                      'style="margin-top:1.25rem; flex:none; padding:0.625rem 1.25rem">重新考虑</button>' +
            '</div>';

        var reload = document.getElementById("age-reload");
        if (reload) {
            reload.addEventListener("click", function () {
                window.location.reload();
            });
            reload.focus();
        }
    });

    window.setTimeout(function () {
        if (gate.hidden) return;
        agreeInput.focus({ preventScroll: true });
    }, 150);
})();