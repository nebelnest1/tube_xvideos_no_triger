(() => {
  "use strict";

  const localeModules = {
    "src/landings/player/locale/en.json"(module, exports) {
      module.exports = {
        no: "No",
        yes: "Yes",
        install_app_and_continue_watching: "Install {app_name} and continue watching content in Safe mode",
        notification: "(1) Notification",
        our_app: "our app"
      };
    }
  };

  let __localeCache;
  const loadFallbackLocale = () => {
    if (__localeCache) return __localeCache;
    const module = { exports: {} };
    localeModules[Object.keys(localeModules)[0]](module, module.exports);
    __localeCache = module.exports;
    return __localeCache;
  };

  const EVENTS_HISTORY_KEY = "events_history";

  const getEventsHistory = () => {
    try {
      const raw = sessionStorage.getItem(EVENTS_HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      if (error instanceof Error && window.syncMetric) {
        window.syncMetric({
          event: "error",
          errorMessage: error.message,
          errorType: "CUSTOM",
          errorSubType: "EventsHistoryGet"
        });
      }
      return [];
    }
  };

  const saveEventsHistory = (history) => {
    try {
      sessionStorage.setItem(EVENTS_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      if (error instanceof Error && window.syncMetric) {
        window.syncMetric({
          event: "error",
          errorMessage: error.message,
          errorType: "CUSTOM",
          errorSubType: "EventsHistorySave"
        });
      }
    }
  };

  const getLang = () => {
    const fromQuery = new URLSearchParams(window.location.search).get("lang");
    const browserLang = navigator.language.split("-")[0];
    return fromQuery || browserLang || "en";
  };

  const templateHashesContext = () => window.templateHashes ? JSON.stringify(window.templateHashes) : null;

  const pageUrl = new URL(window.location.href);
  const IN = {
    pz: pageUrl.searchParams.get("pz") ?? "",
    tb: pageUrl.searchParams.get("tb") ?? "",
    tb_reverse: pageUrl.searchParams.get("tb_reverse") ?? "",
    ae: pageUrl.searchParams.get("ae") ?? "",
    z: pageUrl.searchParams.get("z") ?? "",
    var: pageUrl.searchParams.get("var") ?? "",
    var_1: pageUrl.searchParams.get("var_1") ?? "",
    var_2: pageUrl.searchParams.get("var_2") ?? "",
    var_3: pageUrl.searchParams.get("var_3") ?? "",
    b: pageUrl.searchParams.get("b") ?? "",
    campaignid: pageUrl.searchParams.get("campaignid") ?? "",
    abtest: pageUrl.searchParams.get("abtest") ?? "",
    rhd: pageUrl.searchParams.get("rhd") ?? "1",
    s: pageUrl.searchParams.get("s") ?? "",
    ymid: pageUrl.searchParams.get("ymid") ?? "",
    wua: pageUrl.searchParams.get("wua") ?? "",
    use_full_list_or_browsers: pageUrl.searchParams.get("use_full_list_or_browsers") ?? "",
    cid: pageUrl.searchParams.get("cid") ?? "",
    geo: pageUrl.searchParams.get("geo") ?? ""
  };

  const JS_VERSION = "{%ssp_user_id_encoded%}";

  const EVENT_NAMES = {
    start: "start",
    ageExit: "age_exit",
    mainExit: "main_exit",
    push: "push",
    autoexit: "autoexit",
    back: "back",
    reverse: "reverse",
    tabUnderClick: "tab_under_click",
    error: "error",
    unhandledRejection: "unhandled_rejection",
    template_hash_ready: "template_hash_ready",
    template_hashes_ready: "template_hashes_ready"
  };

  const nowUtcSql = (() => {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}:${String(d.getUTCSeconds()).padStart(2, "0")}.${String(d.getUTCMilliseconds() * 1000).padStart(6, "0")} +00:00`;
  })();

  const getAb2r = () => IN.abtest || (APP_CONFIG.abtest ? String(APP_CONFIG.abtest) : undefined);

  const buildMetric = ({
    event,
    exitZoneId,
    errorMessage,
    errorSubType,
    errorType,
    skipHistory,
    skipContext
  }) => {
    const ds = document.querySelector("html")?.dataset;
    const landingName = ds?.landingName || "";
    const buildVersion = ds?.version || "";
    const env = ds?.env || "";
    const host = window.location.host;
    const mappedEvent = EVENT_NAMES[event] || event;
    const language = getLang();

    const nowTs = Date.now();
    const history = getEventsHistory();
    const prev = history[history.length - 1];
    const delta = prev ? nowTs - prev.currentTs : 0;

    if (!skipHistory) {
      history.push({ currentTs: nowTs, eventName: mappedEvent, delta });
      if (history.length >= 30) history.shift();
      saveEventsHistory(history);
    }

    const payload = [{
      app: "landings-constructor",
      event: mappedEvent,
      language,
      landing_name: landingName,
      build_version: buildVersion,
      landing_domain: host,
      landing_url: window.location.href,
      exit_zone_id: exitZoneId ? Number(exitZoneId) : undefined,
      template_hash: window.templateHash ?? "",
      request_var: IN.var_3,
      source_zone_id: Number.isNaN(Number(IN.var_2)) ? null : Number(IN.var_2),
      sub_id: IN.var_1,
      landing_load_date_time: nowUtcSql,
      error_message: errorMessage ?? "",
      ab2r: getAb2r(),
      event_history: JSON.stringify({ event_history: JSON.parse(JSON.stringify(getEventsHistory())) }) ?? null,
      context: skipContext ? undefined : JSON.stringify({ template_hashes: JSON.parse(templateHashesContext() ?? "{}") }),
      error_sub_type: errorSubType,
      error_type: errorType,
      env,
      js_version: JS_VERSION
    }];

    return {
      eventData: payload,
      isAnalyticEnabled: APP_CONFIG.isAnalyticEnabled ?? true
    };
  };

  const getOsVersion = async () => {
    const nav = navigator;
    if (!nav.userAgentData) return "";
    try {
      const values = await nav.userAgentData.getHighEntropyValues(["platformVersion"]);
      return values.platformVersion;
    } catch (error) {
      if (error instanceof Error && window.syncMetric) {
        window.syncMetric({
          event: "error",
          errorMessage: error.message,
          errorType: "CUSTOM",
          errorSubType: "FetchPlatformVersion"
        });
      }
      return "";
    }
  };

  const getTimezone = () => {
    if (typeof Intl !== "undefined" && typeof Intl.DateTimeFormat === "function") {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) return tz;
    }
    return "";
  };

  const getTimezoneOffset = () => new Date().getTimezoneOffset();

  const objectToSearchParams = (obj) => {
    const qs = new URLSearchParams();
    Object.keys(obj).forEach((key) => {
      if (obj[key]) qs.set(key, obj[key]);
    });
    return qs;
  };

  const applyPassParamToParams = ({ passParamToParams, searchParams, windowUrl }) => {
    passParamToParams.forEach((config) => {
      const { from, to, joinWith } = config;
      const value = Array.isArray(from)
        ? from.map((item) => windowUrl.searchParams.get(item) ?? "").filter(Boolean).join(joinWith ?? "")
        : (windowUrl.searchParams.get(from) ?? "");
      if (value) {
        to.forEach((target) => {
          searchParams.set(target, value);
        });
      }
    });
    return searchParams;
  };

  const runtimeSearchParams = {};
  if (typeof window !== "undefined") {
    window.app = Object.assign(window.app ?? {}, {
      setUrlSearchParam: (key, value) => {
        runtimeSearchParams[key] = String(value);
      }
    });
  }

  const truthyKeys = (obj) => Object.keys(obj).filter((k) => Boolean(obj[k]));

  const BLOCKED_PASSTHROUGH_KEYS = new Set([
    "creative_id",
    "__poster",
    "campid",
    "lang",
    "city",
    "hidden"
  ]);

  const buildExitSearchParams = async ({ zone, passParamToParams }) => {
    const timezone = getTimezone();
    const offset = getTimezoneOffset();

    const dataVer = document.querySelector("html")?.getAttribute("data-version") || "";
    const landingName = document.querySelector("html")?.getAttribute("data-landing-name") || "";
    const templateHash = window.templateHash ?? "";

    const cmeta = btoa(JSON.stringify({
      dataVer,
      landingName,
      templateHash
    }));

    const baseAnalytics = {
      pz: IN.pz,
      tb: IN.tb,
      tb_reverse: IN.tb_reverse,
      ae: IN.ae,
      ab2r: IN.abtest || String(APP_CONFIG.abtest || "")
    };

    let defaults = {
      ymid: IN.var_1 ?? IN.var,
      var: IN.var_2 ?? IN.z,
      var_3: IN.var_3,
      b: IN.b,
      campaignid: IN.campaignid,
      click_id: IN.s,
      rhd: IN.rhd,
      os_version: await getOsVersion(),
      btz: timezone.toString(),
      bto: offset.toString(),
      cmeta
    };

    if (zone) defaults.zoneid = zone;

    Object.entries(baseAnalytics).forEach(([k, v]) => {
      if (v) defaults[k] = v;
    });

    const customSearchParams =
      typeof APP_CONFIG?.customSearchParams === "object" && APP_CONFIG.customSearchParams !== null
        ? APP_CONFIG.customSearchParams
        : {};

    const merged = {
      ...Object.fromEntries(Object.entries(defaults).filter(([, v]) => Boolean(v))),
      ...customSearchParams,
      ...runtimeSearchParams
    };

    const lockedKeys = new Set([...truthyKeys(customSearchParams), ...truthyKeys(runtimeSearchParams)]);
    const currentParams = new URL(window.location.href).searchParams;

    for (const key of Object.keys(merged)) {
      if (lockedKeys.has(key)) continue;
      const value = currentParams.get(key);
      if (value && !BLOCKED_PASSTHROUGH_KEYS.has(key)) {
        merged[key] = value;
      }
    }

    // добираем только отсутствующие ключи, кроме заблокированных
    for (const [key, value] of currentParams.entries()) {
      if (!value) continue;
      if (BLOCKED_PASSTHROUGH_KEYS.has(key)) continue;
      if (key in merged) continue;
      merged[key] = value;
    }

    if (zone) merged.zoneid = zone;

    const qs = objectToSearchParams(merged);
    return passParamToParams
      ? applyPassParamToParams({
          passParamToParams,
          searchParams: qs,
          windowUrl: new URL(window.location.href)
        })
      : qs;
  };

  const pushBackStates = (url, count) => {
    try {
      for (let i = 0; i < count; i += 1) {
        window.history.pushState(null, "Please wait...", url);
      }
      const original = window.location.href;
      window.history.pushState(null, document.title, original);
      console.log(`Back initializated ${count} times with ${url}`);
    } catch (error) {
      if (error instanceof Error && window.syncMetric) {
        window.syncMetric({
          event: "error",
          errorMessage: error.message,
          errorType: "CUSTOM",
          errorSubType: "PushStateToHistory"
        });
      }
    }
  };

  const initBack = async (cfg) => {
    const back = cfg?.back;
    if (!back) return;

    const { currentTab, pageUrl } = back;
    if (!currentTab) return;

    const count = back.count ?? 10;
    const { origin, pathname } = window.location;

    let target = `${origin}${pathname}`;
    if (pageUrl) {
      target = pageUrl;
    } else {
      target = target.includes("index.html") ? target.split("/index.html")[0] : target;
      target = target.includes("back.html") ? target.split("/back.html")[0] : target;
      if (target.endsWith("/")) target = target.substring(0, target.length - 1);
      target += "/back.html";
    }

    const targetUrl = new URL(target);
    const qs = await buildExitSearchParams({ zone: currentTab.zoneId });

    let analyticsPayload = null;
    let analyticsEnabled = false;

    if (currentTab.url) {
      qs.set("url", currentTab.url);
    } else if (currentTab.domain && currentTab.zoneId) {
      qs.set("z", currentTab.zoneId);
      qs.set("domain", currentTab.domain);
    }

    if (window.syncMetric) {
      const metric = buildMetric({
        event: "back",
        exitZoneId: currentTab.zoneId,
        skipHistory: true,
        skipContext: true
      });
      analyticsPayload = metric.eventData;
      analyticsEnabled = metric.isAnalyticEnabled;
    }

    if (analyticsEnabled && analyticsPayload) {
      qs.set("mData", btoa(JSON.stringify(analyticsPayload)));
    }

    const finalBackUrl = decodeURIComponent(`${targetUrl.toString()}?${qs.toString()}`);
    pushBackStates(finalBackUrl, count);
  };

  const generateAfuUrl = async (zoneId, domain, passParamToParams) => {
    const host = domain.includes("http") ? domain : `https://${domain}`;
    const url = new URL(`${host}/afu.php`);
    const qs = await buildExitSearchParams({ zone: zoneId.toString(), passParamToParams });
    const finalUrl = decodeURIComponent(`${url.toString()}?${qs.toString()}`);
    console.log("URL generated:", finalUrl);
    return finalUrl;
  };

  const replaceTo = ({ url }) => {
    window.location.replace(url);
  };

  const reportMissingExit = (config, name) => {
    console.error(`${name || "Some exit"} was supposed to work, but some data about this type of exit was missed`, config);
  };

  const runCurrentTabExit = async (cfg, name, withBack = true) => {
    const currentTab = cfg[name].currentTab;
    if (!currentTab) {
      reportMissingExit(currentTab, name);
      return;
    }

    let url;
    if (currentTab.zoneId && currentTab.domain) {
      window.syncMetric?.({ event: name, exitZoneId: currentTab.zoneId });
      url = await generateAfuUrl(currentTab.zoneId, currentTab.domain);
      if (withBack) await initBack(cfg);
      replaceTo({ url });
      return;
    }

    if (currentTab.url) {
      window.syncMetric?.({ event: name, exitZoneId: currentTab.url });
      url = currentTab.url;
      if (withBack) await initBack(cfg);
      replaceTo({ url });
      return;
    }

    reportMissingExit(currentTab, name);
  };

  const runDualExit = async (cfg, name) => {
  const exit = cfg[name];
  if (!exit) {
    reportMissingExit(exit, name);
    return;
  }

  const { currentTab, newTab } = exit;
  const isInstantCtr =
    new URL(window.location.href).searchParams.get("ctr") === "instant";

  let currentTabUrl;
  if (currentTab) {
    if (currentTab.zoneId && currentTab.domain) {
      const currentTabZoneId = isInstantCtr ? 10751653 : currentTab.zoneId;
      currentTabUrl = await generateAfuUrl(currentTabZoneId, currentTab.domain);
      window.syncMetric?.({ event: name, exitZoneId: currentTabZoneId });
    } else if (currentTab.url) {
      currentTabUrl = currentTab.url;
    } else {
      reportMissingExit(exit, name);
    }
  }

  let newTabUrl;
  if (newTab) {
    if (newTab.zoneId && newTab.domain) {
      newTabUrl = await generateAfuUrl(newTab.zoneId, newTab.domain);
      window.syncMetric?.({ event: name, exitZoneId: newTab.zoneId });
    } else if (newTab.url) {
      newTabUrl = newTab.url;
    } else {
      reportMissingExit(exit, name);
    }
  }

  await initBack(cfg);

  const shouldMakeInstantRedirect = isInstantCtr;

  if (newTabUrl) {
    const popup = window.open(newTabUrl, "_blank");
    if (popup) {
      popup.opener = null;
      if (currentTabUrl) {
        if (shouldMakeInstantRedirect) {
          replaceTo({ url: currentTabUrl });
        } else {
          document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") {
              replaceTo({ url: currentTabUrl });
            }
          });
        }
      }
    } else if (currentTabUrl) {
      replaceTo({ url: currentTabUrl });
    }
  } else if (currentTabUrl) {
    replaceTo({ url: currentTabUrl });
  }

  };

  const hasAppConfig = () => {
    if (typeof APP_CONFIG !== "undefined") return true;
    document.body.innerHTML = `
      <p style="">LANDING CAN'T BE RENDERED. 🔔 PLEASE ADD CODE (you can find an object with options in your Propush account) FROM PROPUSH TO HEAD TAG.</p>
    `;
    return false;
  };

  const TAB_NAMES = ["currentTab", "newTab"];
  const EXIT_FIELDS = ["zoneId", "url"];

  const normalizeConfig = (appConfig) => {
    if (!hasAppConfig()) return null;

    const { domain, videoCount, prizeName, prizeImg, ...rest } = appConfig;

    return {
      videoCount,
      prizeName,
      prizeImg,
      ...Object.entries(rest).reduce((acc, [rawKey, value]) => {
        let [name, maybeTab, maybeField] = rawKey.split("_");
        if (!name) return acc;

        if (TAB_NAMES.includes(maybeTab)) {
          const tab = maybeTab;
          if (EXIT_FIELDS.includes(maybeField)) {
            acc[name] = {
              ...acc[name],
              [tab]: {
                domain: maybeField === "zoneId" ? domain : undefined,
                [maybeField]: value
              }
            };
          }
        } else if (EXIT_FIELDS.includes(maybeTab)) {
          const field = maybeTab;
          acc[name] = {
            ...acc[name],
            currentTab: {
              domain: field === "zoneId" ? domain : undefined,
              [field]: value
            }
          };
        } else {
          const field = maybeTab;
          acc[name] = {
            ...acc[name],
            [field]: value
          };
        }

        return acc;
      }, {})
    };
  };

  const AUTOEXIT_TTL = (() => {
    (async () => {
      let timeoutId;
      const cfg = normalizeConfig(APP_CONFIG);
      if (!cfg) return;

      const autoexit = cfg?.autoexit;
      if (autoexit?.currentTab) {
        const sec = autoexit.timeToRedirect ?? 90;
        let isVisible = document.visibilityState === "visible";
        let armed = false;

        const onVisibilityChange = () => {
          if (document.visibilityState === "visible") {
            isVisible = true;
            if (armed) runCurrentTabExit(cfg, "autoexit");
          } else {
            isVisible = false;
          }
        };

        const arm = () => {
          document.addEventListener("visibilitychange", onVisibilityChange);
          timeoutId = setTimeout(() => {
            armed = true;
            if (isVisible) runCurrentTabExit(cfg, "autoexit");
          }, sec * 1000);
        };

        timeoutId = arm();

        const cancel = () => {
          clearTimeout(timeoutId);
          document.removeEventListener("visibilitychange", onVisibilityChange);
        };

        document.addEventListener("mousemove", cancel);
        document.addEventListener("click", cancel);
        document.addEventListener("scroll", cancel);
      }
    })();

    return 5184000;
  })();

  const pushConfig = normalizeConfig(APP_CONFIG);
  if (pushConfig?.push?.currentTab?.domain && pushConfig?.push?.currentTab?.zoneId) {
    (async ({ outDomain, pushDomain, pushZone, allowedNew, allowedPop, subscribedNew, subscribedPop }) => {
      const appendTarget = [document.documentElement, document.body].filter(Boolean).pop();
      if (!appendTarget) return;

      const script = document.createElement("script");
      script.setAttribute("data-cs", "exclude");

      const pushParams = await (async (zoneId) => {
        const qs = await buildExitSearchParams({ zone: zoneId.toString() });
        const abtest = IN.abtest || APP_CONFIG.abtest;

        if (IN.ymid) qs.set("var_2", ymid);
        if (zoneId) qs.set("z", zoneId);
        if (IN.wua) qs.set("wua", IN.wua);
        if (abtest) {
          qs.set("ab2", String(abtest));
          qs.set("ab2_ttl", `${AUTOEXIT_TTL}`);
        }
        qs.set("sw", "./sw.js");
        qs.set("d", location.host);

        return qs;
      })(pushZone);

      script.src = `https://${pushDomain}/hid.js?${pushParams}`;

      script.onload = function (instance) {
        instance.zoneId = pushZone;
        instance.events.onPermissionDefault = function () {};
        instance.events.onPermissionAllowed = async function () {
          if (allowedNew) window.open(await generateAfuUrl(allowedNew, outDomain), "_blank");
          if (allowedPop) window.location.href = await generateAfuUrl(allowedPop, outDomain);
        };
        instance.events.onPermissionDenied = function () {};
        instance.events.onAlreadySubscribed = async function () {
          if (subscribedNew) window.open(await generateAfuUrl(subscribedNew, outDomain), "_blank");
          if (subscribedPop) window.location.href = await generateAfuUrl(subscribedPop, outDomain);
        };
        instance.events.onNotificationUnsupported = function () {};
      };

      appendTarget.appendChild(script);
    })({
      outDomain: pushConfig.push.currentTab.domain,
      pushDomain: "kmnts.com",
      pushZone: pushConfig.push.currentTab.zoneId
    });
  }

  (() => {
    const cfg = normalizeConfig(APP_CONFIG);
    if (!cfg) return;

    const reverse = cfg?.reverse;
    let armed = false;

    if (reverse?.currentTab) {
      window.addEventListener("click", async () => {
        try {
          if (!armed) {
            const currentPath = `${window.location.pathname}${window.location.search}`;
            await initBack(cfg);
            window.history.pushState(null, "", currentPath);
            armed = true;
          }
        } catch (error) {
          if (error instanceof Error && window.syncMetric) {
            window.syncMetric({
              event: "error",
              errorMessage: error.message,
              errorType: "CUSTOM",
              errorSubType: "Reverse"
            });
          }
        }
      }, { capture: true });

      window.addEventListener("popstate", () => {
        runCurrentTabExit(cfg, "reverse", false);
      });
    }
  })();

  const localeFetchCache = {};
  let localePathCache;

  const loadLocale = async (fallbackLoader, localeRoot) => {
    const lang = getLang();

    if (localeFetchCache[lang] && localePathCache === localeRoot) {
      return localeFetchCache[lang];
    }

    localePathCache = localeRoot;
    localeFetchCache[lang] = (async () => {
      try {
        const file = localeRoot ? `${localeRoot}/${lang}.json` : `./locales/${lang}.json`;
        const res = await fetch(file);
        if (res.ok && res.status === 200) {
          return await res.json();
        }
        throw new Error(`Locale file not found: ${file}`);
      } catch (error) {
        if (error instanceof Error && window.syncMetric) {
          window.syncMetric({
            event: "error",
            errorMessage: error.message,
            errorType: "CUSTOM",
            errorSubType: "GetTranslations"
          });
          console.error(`Error while loading translations: ${error.message}. Check locale file.`);
        }
        return fallbackLoader();
      }
    })();

    return localeFetchCache[lang];
  };

  const isLocaleFallback = (localeRoot) => {
    const lang = getLang();
    return localePathCache === localeRoot && localeFetchCache[lang] === false;
  };

  const applyTranslations = async (fallbackLoader, replacements, localeRoot) => {
    const lang = getLang();
    document.documentElement.setAttribute("lang", lang);

    const locale = await loadLocale(fallbackLoader, localeRoot);

    if (["ar", "he", "fa", "ur", "az", "ku", "ff", "dv"].includes(lang) && !isLocaleFallback(localeRoot)) {
      document.documentElement.setAttribute("dir", "rtl");
    }

    const missed = [];

    Object.entries(locale).forEach(([key, value]) => {
      const replacement = replacements?.[key];
      let text = value;

      if (replacement) {
        const fallbackValue = replacement.fallbackTranslationKey ? locale[replacement.fallbackTranslationKey] : undefined;
        const macrosValue = replacement.macrosValue ?? fallbackValue;
        text = macrosValue ? text.replaceAll(replacement.macros, macrosValue) : text;
      }

      const nodes = document.querySelectorAll(`[data-translate="${key}"]`);
      if (nodes?.length) {
        nodes.forEach((node) => {
          if (!node) return;
          if (node.hasAttribute("data-translate-html")) {
            node.innerHTML = text;
          } else if (!node.childNodes.length) {
            node.textContent = text;
          } else {
            node.childNodes.forEach((child) => {
              if (child.nodeType === Node.TEXT_NODE) {
                child.nodeValue = text;
              }
            });
          }
        });
      } else {
        missed.push(key);
      }
    });

    if (missed.length) {
      console.warn("Some keys from locales folder weren't used:", missed.join(", "));
    }
  };

  const DESIGN_CONTENT_LOADED = new CustomEvent("DesignContentLoaded");

  const applyDesign = async ({
    designRootPath = "./designs",
    queryParamName = "design",
    cssSelector = "#main-css",
    localePathBuilder = (path) => `${path}/locale`,
    loadFallbackTranslation
  } = {}) => {
    const design = (() => {
      const value = new URL(window.location.href).searchParams.get(queryParamName)?.trim();
      return value === "default" ? "" : value || APP_CONFIG.design;
    })();

    const originalBody = document.body.innerHTML;

    if (!design) {
      document.dispatchEvent(DESIGN_CONTENT_LOADED);
      return;
    }

    try {
      const previewBanner = document.getElementById("preview_banner");
      const previewBannerStyle = document.getElementById("preview_banner_style");

      document.body.innerHTML = "";
      const designPath = `${designRootPath}/${design}`;

      const response = await fetch(`${designPath}/index.html`);
      const html = await response.text();

      if (!html || response.ok === false || response.status === 404) {
        throw new Error("Design was defined in APP_CONFIG, but there is no such design");
      }

      const designHtml = html.replaceAll("./assets", `${designPath}/assets`);
      const cssNode = document.querySelector(cssSelector);
      if (cssNode) cssNode.remove();

      const script = document.createElement("script");
      script.src = `${designPath}/assets/script.js`;

      document.body.innerHTML = designHtml;
      if (previewBannerStyle && !document.getElementById("preview_banner_style")) document.body.append(previewBannerStyle);
      if (previewBanner) document.body.append(previewBanner);
      document.body.append(script);

      if (loadFallbackTranslation) {
        await applyTranslations(async () => loadFallbackTranslation(designPath), {}, localePathBuilder(designPath));
      }
    } catch (error) {
      console.error(error);
      document.body.innerHTML = originalBody;
      if (error instanceof Error && window.syncMetric) {
        window.syncMetric({
          event: "error",
          errorMessage: error.message,
          errorType: "CUSTOM",
          errorSubType: "DesignChange"
        });
      }
    }

    console.log("DISPATCH");
    document.dispatchEvent(DESIGN_CONTENT_LOADED);
  };

  (async () => {
    await applyDesign({
      designRootPath: "./designs",
      queryParamName: "design",
      cssSelector: "#main-css",
      localePathBuilder: (path) => `${path}/locale`,
      loadFallbackTranslation: async (path) => import(`${path}/locale/en.json`).then((m) => m.default)
    });
  })();

  const getStep = (name = "step", removeFromUrl = true) => {
    const value = new URL(window.location.href).searchParams.get(name);
    if (removeFromUrl) {
      const url = new URL(window.location.href);
      url.searchParams.delete(name);
      window.history.replaceState(window.history.state, "", url.href);
    }
    return value;
  };

  const removeModalShell = () => {
    const modal = document.querySelector("#modal");
    const overlay = document.querySelector("#overlay");
    if (modal) modal.remove();
    if (overlay) overlay.remove();
  };

  const showCustomModal = () => {
    const modal = document.getElementById("pl_exit_modal");
    if (!modal) return;
    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");
  };

  const hideCustomModal = () => {
    const modal = document.getElementById("pl_exit_modal");
    if (!modal) return;
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
  };

  const cfg = normalizeConfig(APP_CONFIG);

  if (cfg) {
    const isStep = getStep("step", true) === "1";
    const hasTabUnder = !!cfg.tabUnderClick?.currentTab;

    if (isStep && hasTabUnder) {
      removeModalShell();
      document.addEventListener("DesignContentLoaded", removeModalShell);
    }

    document.addEventListener("click", async (e) => {
      const target = e.target?.closest?.("[data-target]");
      const action = target?.getAttribute("data-target") || "";

      if (action === "back_button") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        showCustomModal();
        return;
      }

      if (action === "modal_stay") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        hideCustomModal();
        return;
      }

      if (action === "modal_leave") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        hideCustomModal();
        if (cfg.ageExit?.newTab) {
          await runDualExit(cfg, "ageExit");
        } else {
          await runCurrentTabExit(cfg, "ageExit");
        }
        return;
      }

      if (isStep || !hasTabUnder) {
        if (cfg.mainExit?.newTab) {
          await runDualExit(cfg, "mainExit");
        } else {
          await runCurrentTabExit(cfg, "mainExit");
        }
      } else {
        const continueUrl = new URL(window.location.href);
        continueUrl.searchParams.append("step", "1");

        await runDualExit({
          ...cfg,
          tabUnderClick: {
            ...cfg.tabUnderClick,
            newTab: { url: continueUrl.toString() }
          }
        }, "tabUnderClick");
      }
    });
  }

  applyTranslations(
    async () => loadFallbackLocale(),
    {
      install_app_and_continue_watching: {
        macros: "{app_name}",
        macrosValue: APP_CONFIG.appName,
        fallbackTranslationKey: "our_app"
      }
    }
  );
})();
