/* common.js — full version for your XV player landing */

(() => {
  "use strict";

  // ---------------------------------
  // Safe helpers
  // ---------------------------------
  const safe = (fn) => {
    try { return fn(); } catch { return undefined; }
  };

  const logError = (...args) => safe(() => console.error(...args));

  const replaceTo = (url) => {
    try {
      window.location.replace(url);
    } catch {
      window.location.href = url;
    }
  };

  const openTab = (url) => {
    try {
      const w = window.open(url, "_blank");
      if (w) {
        try { w.opener = null; } catch {}
      }
      return w || null;
    } catch {
      return null;
    }
  };

  const filterObject = (obj) => {
    const out = {};
    Object.entries(obj || {}).forEach(([k, v]) => {
      if (v == null) return;
      if (typeof v === "string" && v === "") return;
      out[k] = v;
    });
    return out;
  };

  const qsFromObject = (obj) => {
    const qs = new URLSearchParams();
    Object.entries(filterObject(obj)).forEach(([k, v]) => {
      qs.set(k, String(v));
    });
    return qs;
  };

  // ---------------------------------
  // Step / current page URL
  // ---------------------------------
  const STEP_PARAM = "step";
  let isContinueStep = false;

  (() => {
    const initialUrl = new URL(window.location.href);
    if (initialUrl.searchParams.get(STEP_PARAM) === "1") {
      isContinueStep = true;
      initialUrl.searchParams.delete(STEP_PARAM);
      safe(() => window.history.replaceState(window.history.state, "", initialUrl.toString()));
    }
  })();

  const pageUrl = new URL(window.location.href);
  const getSP = (k, def = "") => pageUrl.searchParams.get(k) ?? def;

  const IN = {
    pz: getSP("pz"),
    tb: getSP("tb"),
    tb_reverse: getSP("tb_reverse"),
    ae: getSP("ae"),
    z: getSP("z"),
    var: getSP("var"),
    var_1: getSP("var_1"),
    var_2: getSP("var_2"),
    var_3: getSP("var_3"),
    b: getSP("b"),
    campaignid: getSP("campaignid"),
    abtest: getSP("abtest"),
    rhd: getSP("rhd", "1"),
    s: getSP("s"),
    ymid: getSP("ymid"),
    wua: getSP("wua"),
    use_full_list_or_browsers: getSP("use_full_list_or_browsers"),
    cid: getSP("cid"),
    geo: getSP("geo"),

    external_id: getSP("external_id"),
    creative_id: getSP("creative_id"),
    ad_campaign_id: getSP("ad_campaign_id"),
    cost: getSP("cost"),
    currency: getSP("currency"),

    campid: getSP("campid"),
    lang: getSP("lang"),
    city: getSP("city"),
    hidden: getSP("hidden"),
    __poster: getSP("__poster")
  };

  // ---------------------------------
  // Runtime override params
  // ---------------------------------
  const runtimeSearchParams = {};

  window.app = Object.assign(window.app || {}, {
    setUrlSearchParam(key, value) {
      if (!key) return;
      runtimeSearchParams[String(key)] = String(value);
    },
    getUrlSearchParams() {
      return { ...runtimeSearchParams };
    }
  });

  // ---------------------------------
  // Device / environment helpers
  // ---------------------------------
  const getTimezoneName = () => safe(() => Intl.DateTimeFormat().resolvedOptions().timeZone) || "";
  const getTimezoneOffset = () => safe(() => new Date().getTimezoneOffset()) ?? 0;

  let osVersionCached = "";
  safe(async () => {
    if (!navigator.userAgentData?.getHighEntropyValues) return;
    const values = await navigator.userAgentData.getHighEntropyValues(["platformVersion"]);
    osVersionCached = values?.platformVersion || "";
  });

  const buildCmeta = () => {
    try {
      const html = document.documentElement;
      const payload = {
        dataVer: html.getAttribute("data-version") || html.dataset.version || "",
        landingName: html.getAttribute("data-landing-name") || html.dataset.landingName || "",
        templateHash: window.templateHash || ""
      };
      return btoa(JSON.stringify(payload));
    } catch {
      return "";
    }
  };

  const getAbtest = () => {
    if (IN.abtest) return IN.abtest;
    if (typeof window.APP_CONFIG?.abtest !== "undefined") return String(window.APP_CONFIG.abtest);
    return "";
  };

  // ---------------------------------
  // Analytics wrappers
  // ---------------------------------
  const buildMetricPayloadBase64 = ({ event, exitZoneId }) => {
    const result = safe(() => window.syncMetric?.({
      event,
      exitZoneId,
      skipHistory: true,
      skipContext: true
    }));

    if (result?.isAnalyticEnabled && result.eventData) {
      try {
        return btoa(JSON.stringify(result.eventData));
      } catch {
        return "";
      }
    }

    return "";
  };

  const reportEvent = ({ event, exitZoneId, errorMessage, errorSubType, errorType }) => {
    safe(() => {
      window.reportSyncMetric?.({
        event,
        exitZoneId,
        errorMessage,
        errorSubType,
        errorType
      });
    });
  };

  // ---------------------------------
  // Config normalizer
  // ---------------------------------
  const normalizeConfig = (appCfg) => {
    if (!appCfg || typeof appCfg !== "object" || !appCfg.domain) return null;

    const cfg = {
      domain: appCfg.domain,
      customSearchParams:
        typeof appCfg.customSearchParams === "object" && appCfg.customSearchParams !== null
          ? { ...appCfg.customSearchParams }
          : {}
    };

    const ensure = (name) => (cfg[name] ||= {});

    Object.entries(appCfg).forEach(([k, v]) => {
      if (v == null || v === "") return;
      if (k === "domain" || k === "customSearchParams") return;

      let m = k.match(/^([a-zA-Z0-9]+)_(currentTab|newTab)_(zoneId|url)$/);
      if (m) {
        const [, name, tab, field] = m;
        const ex = ensure(name);
        (ex[tab] ||= {});
        if (field === "zoneId") ex[tab].domain = ex[tab].domain || cfg.domain;
        ex[tab][field] = v;
        return;
      }

      m = k.match(/^([a-zA-Z0-9]+)_(count|timeToRedirect|pageUrl)$/);
      if (m) {
        const [, name, field] = m;
        ensure(name)[field] = v;
        return;
      }

      m = k.match(/^([a-zA-Z0-9]+)_(zoneId|url)$/);
      if (m) {
        const [, name, field] = m;
        const ex = ensure(name);
        (ex.currentTab ||= {});
        if (field === "zoneId") ex.currentTab.domain = ex.currentTab.domain || cfg.domain;
        ex.currentTab[field] = v;
        return;
      }

      cfg[k] = v;
    });

    return cfg;
  };

  // ---------------------------------
  // Exit params builder
  // Order:
  // 1) defaults
  // 2) APP_CONFIG.customSearchParams
  // 3) window.app.setUrlSearchParam()
  // 4) current page URL fills only missing keys
  // ---------------------------------
  const buildDefaultParams = ({ zoneId } = {}) => {
  return filterObject({
    ymid: IN.var_1 || IN.var || IN.ymid || "",
    var: IN.var_2 || IN.z || IN.var || "",
    var_1: IN.var_1 || "",
    var_2: IN.var_2 || "",
    var_3: IN.var_3 || "",

    b: IN.b || "",
    campaignid: IN.campaignid || "",
    click_id: IN.s || "",
    rhd: IN.rhd || "1",

    os_version: osVersionCached || "",
    btz: getTimezoneName(),
    bto: String(getTimezoneOffset()),
    cmeta: buildCmeta(),

    pz: IN.pz || "",
    tb: IN.tb || "",
    tb_reverse: IN.tb_reverse || "",
    ae: IN.ae || "",
    ab2r: getAbtest(),

    wua: IN.wua || "",
    use_full_list_or_browsers: IN.use_full_list_or_browsers || "",
    cid: IN.cid || "",
    geo: IN.geo || "",

    external_id: IN.external_id || "",
    ad_campaign_id: IN.ad_campaign_id || "",
    cost: IN.cost || "",
    currency: IN.currency || "usd",

    zoneid: zoneId != null && String(zoneId) !== "" ? String(zoneId) : ""
  });
};

  const buildExitSearchParams = ({ cfg, zoneId } = {}) => {
    const defaults = buildDefaultParams({ zoneId });
    const custom = filterObject(cfg?.customSearchParams || {});
    const runtime = filterObject(runtimeSearchParams);

    const merged = {
      ...defaults,
      ...custom,
      ...runtime
    };

    const lockedKeys = new Set([
      ...Object.keys(custom),
      ...Object.keys(runtime)
    ]);

    for (const [key, value] of pageUrl.searchParams.entries()) {
      if (value == null || String(value) === "") continue;
      if (lockedKeys.has(key)) continue;
      if (Object.prototype.hasOwnProperty.call(merged, key)) continue;
      merged[key] = value;
    }

    if (zoneId != null && String(zoneId) !== "") {
      merged.zoneid = String(zoneId);
    }

    return qsFromObject(merged);
  };

  // ---------------------------------
  // URL builders
  // ---------------------------------
  const generateAfuUrl = ({ zoneId, domain, cfg }) => {
    const host = String(domain || "").trim();
    if (!host || zoneId == null || String(zoneId) === "") return "";

    const base = host.startsWith("http") ? host : `https://${host}`;
    const target = new URL(`${base.replace(/\/+$/, "")}/afu.php`);
    target.search = buildExitSearchParams({ cfg, zoneId }).toString();

    return target.toString();
  };

  const buildDirectUrlWithTracking = (baseUrl, cfg) => {
    try {
      const target = new URL(String(baseUrl), window.location.href);
      const exitParams = buildExitSearchParams({ cfg });

      exitParams.forEach((value, key) => {
        if (!target.searchParams.has(key) && value != null && String(value) !== "") {
          target.searchParams.set(key, value);
        }
      });

      return target.toString();
    } catch {
      return String(baseUrl || "");
    }
  };

  const resolveExitUrl = (exitCfg, cfg) => {
    if (!exitCfg) return "";
    if (exitCfg.url) return buildDirectUrlWithTracking(exitCfg.url, cfg);
    if (exitCfg.zoneId && (exitCfg.domain || cfg?.domain)) {
      return generateAfuUrl({
        zoneId: exitCfg.zoneId,
        domain: exitCfg.domain || cfg.domain,
        cfg
      });
    }
    return "";
  };

  // ---------------------------------
  // Back logic
  // ---------------------------------
  const pushBackStates = (url, count) => {
    try {
      const total = Math.max(0, parseInt(count, 10) || 0);
      const originalUrl = window.location.href;

      for (let i = 0; i < total; i += 1) {
        window.history.pushState(null, "Please wait...", url);
      }

      window.history.pushState(null, document.title, originalUrl);
    } catch (error) {
      logError("Back pushState error:", error);
      reportEvent({
        event: "error",
        errorMessage: error instanceof Error ? error.message : "PushStateToHistory",
        errorSubType: "PushStateToHistory",
        errorType: "CUSTOM"
      });
    }
  };

  const getDefaultBackHtmlUrl = () => {
    const { origin, pathname } = window.location;
    let dir = pathname.replace(/\/(index|back)\.html$/i, "");
    if (dir.endsWith("/")) dir = dir.slice(0, -1);
    return dir ? `${origin}${dir}/back.html` : `${origin}/back.html`;
  };

  const initBackFast = (cfg) => {
    const backCurrent = cfg?.back?.currentTab;
    if (!backCurrent) return;

    const count = cfg.back?.count ?? 10;
    const pageUrl = new URL(cfg.back?.pageUrl || getDefaultBackHtmlUrl(), window.location.href);
    const qs = buildExitSearchParams({ cfg, zoneId: backCurrent.zoneId });

    if (backCurrent.url) {
      qs.set("url", String(backCurrent.url));
    } else {
      qs.set("z", String(backCurrent.zoneId));
      qs.set("domain", String(backCurrent.domain || cfg.domain || ""));
    }

    const mData = buildMetricPayloadBase64({
      event: "back",
      exitZoneId: backCurrent.zoneId || backCurrent.url
    });

    if (mData) {
      qs.set("mData", mData);
    }

    pageUrl.search = qs.toString();
    pushBackStates(pageUrl.toString(), count);
  };

  // ---------------------------------
  // Exit runners
  // ---------------------------------
  const runExitCurrentTabFast = (cfg, name, withBack = true) => {
    const ex = cfg?.[name]?.currentTab;
    if (!ex) return false;

    const url = resolveExitUrl(ex, cfg);
    if (!url) return false;

    reportEvent({ event: name, exitZoneId: ex.zoneId || ex.url });

    if (withBack) initBackFast(cfg);
    setTimeout(() => replaceTo(url), 40);

    return true;
  };

  const runExitDualTabsFast = (cfg, name, withBack = true) => {
    const ex = cfg?.[name];
    if (!ex) return false;

    const ct = ex.currentTab;
    const nt = ex.newTab;

    const ctUrl = resolveExitUrl(ct, cfg);
    const ntUrl = resolveExitUrl(nt, cfg);

    if (!ctUrl && !ntUrl) return false;

    if (ct) reportEvent({ event: name, exitZoneId: ct.zoneId || ct.url });
    if (nt) reportEvent({ event: name, exitZoneId: nt.zoneId || nt.url });

    if (withBack) initBackFast(cfg);
    if (ntUrl) openTab(ntUrl);
    if (ctUrl) setTimeout(() => replaceTo(ctUrl), 40);

    return true;
  };

  const run = (cfg, name) => {
    if (cfg?.[name]?.newTab) return runExitDualTabsFast(cfg, name, true);
    return runExitCurrentTabFast(cfg, name, true);
  };

  const runTabUnderClickFast = (cfg) => {
    if (!cfg?.tabUnderClick?.currentTab) return false;

    const tempCfg = JSON.parse(JSON.stringify(cfg));

    if (!tempCfg.tabUnderClick.newTab) {
      const continueUrl = new URL(window.location.href);
      continueUrl.searchParams.set(STEP_PARAM, "1");
      tempCfg.tabUnderClick.newTab = { url: continueUrl.toString() };
    }

    return runExitDualTabsFast(tempCfg, "tabUnderClick", true);
  };

  // ---------------------------------
  // Reverse / autoexit
  // ---------------------------------
  const initReverse = (cfg) => {
    if (!cfg?.reverse?.currentTab) return;

    safe(() => window.history.pushState({ __reverse: 1 }, "", window.location.href));

    window.addEventListener("popstate", (e) => {
      if (e?.state && e.state.__reverse === 1) {
        runExitCurrentTabFast(cfg, "reverse", false);
      }
    });
  };

  const initAutoexit = (cfg) => {
    if (!cfg?.autoexit?.currentTab) return;

    const sec = parseInt(cfg.autoexit.timeToRedirect, 10) || 90;
    let armed = false;

    const trigger = () => {
      if (document.visibilityState === "visible" && armed) {
        runExitCurrentTabFast(cfg, "autoexit", true);
      }
    };

    const timer = setTimeout(() => {
      armed = true;
      trigger();
    }, sec * 1000);

    const cancel = () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", trigger);
    };

    document.addEventListener("visibilitychange", trigger);
    ["mousemove", "click", "scroll", "touchstart"].forEach((ev) => {
      document.addEventListener(ev, cancel, { once: true, passive: true });
    });
  };

  // ---------------------------------
  // UI helpers
  // ---------------------------------
  const isPlayerReady = () => {
    const btn = document.querySelector(".xh-play-btn");
    return !!(btn && btn.classList.contains("ready"));
  };

  const hideModal = () => {
    const modal = document.getElementById("xh_exit_modal");
    if (!modal) return;
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
  };

  const showModal = () => {
    const modal = document.getElementById("xh_exit_modal");
    if (!modal) return;
    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");
  };

  // ---------------------------------
  // Click map
  // ---------------------------------
  const initClickMap = (cfg) => {
    let primaryExitFired = false;

    const firePrimaryExit = (e) => {
      if (primaryExitFired) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      let ok = false;

      if (!isContinueStep && cfg?.tabUnderClick?.currentTab) {
        ok = runTabUnderClickFast(cfg);
      }

      if (!ok) {
        ok = run(cfg, "mainExit");
      }

      if (ok) {
        primaryExitFired = true;
      }
    };

    document.addEventListener("click", (e) => {
      const target = e.target?.closest?.("[data-target]");
      const action = target?.getAttribute("data-target") || "";

      if (action === "back_button") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        showModal();
        return;
      }

      if (action === "modal_stay") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        hideModal();
        return;
      }

      if (action === "modal_leave") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        hideModal();
        run(cfg, "ageExit");
        return;
      }

      firePrimaryExit(e);
    }, true);
  };

  // ---------------------------------
  // Boot
  // ---------------------------------
  const boot = () => {
    if (typeof window.APP_CONFIG === "undefined") {
      document.body.innerHTML =
        "<p style='color:#fff;padding:12px'>MISSING APP_CONFIG</p>";
      return;
    }

    const cfg = normalizeConfig(window.APP_CONFIG);
    if (!cfg) {
      document.body.innerHTML =
        "<p style='color:#fff;padding:12px'>INVALID APP_CONFIG</p>";
      return;
    }

    window.LANDING_EXITS = {
      cfg,
      run: (name) => run(cfg, name),
      runCurrent: (name, withBack = true) => runExitCurrentTabFast(cfg, name, withBack),
      runDual: (name, withBack = true) => runExitDualTabsFast(cfg, name, withBack),
      initBack: () => initBackFast(cfg),
      isPlayerReady,
      isContinueStep
    };

    initClickMap(cfg);
    initAutoexit(cfg);
    initReverse(cfg);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
