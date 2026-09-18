(() => {
  "use strict";

  const CONFIG = window.DERIV_CONFIG || {};
  const APP_ID = CONFIG.APP_ID || "34qpgcq22ebRi5fTv1UsH";

  const WS_URL =
    "wss://ws.binaryws.com/websockets/v3" +
    "?app_id=" +
    encodeURIComponent(APP_ID);

  const GRANULARITY = {
    "1m": 60,
    "5m": 300,
    "15m": 900,
    "1h": 3600,
    "4h": 14400,
  };

  let chart = null;
  let candleSeries = null;
  let ws = null;
  let resizeObserver = null;

  let candles = [];
  let currentSymbol = "R_100";
  let currentTimeframe = "1m";

  let indicatorSeries = [];

  const $ = (id) => document.getElementById(id);

  function setSummary(message) {
    const element = $("analysisSummary");
    if (element) {
      element.textContent = message;
    }
  }

  function setStatus(message) {
    const element = $("summaryStatus");
    if (element) {
      element.textContent = message;
    }
  }

  function normalizeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function initializeChart() {
    if (!window.LightweightCharts) {
      setSummary("Chart library failed to load.");
      setStatus("Chart error");
      return false;
    }

    const container = $("chartContainer");

    if (!container) {
      return false;
    }

    container.innerHTML = "";

    chart = LightweightCharts.createChart(container, {
      width: container.clientWidth || 900,
      height: container.clientHeight || 560,

      layout: {
        background: {
          color: "#111827",
        },
        textColor: "#cbd5e1",
      },

      grid: {
        vertLines: {
          color: "rgba(148, 163, 184, 0.10)",
        },
        horzLines: {
          color: "rgba(148, 163, 184, 0.10)",
        },
      },

      rightPriceScale: {
        borderColor: "rgba(148, 163, 184, 0.20)",
      },

      timeScale: {
        borderColor: "rgba(148, 163, 184, 0.20)",
        timeVisible: true,
        secondsVisible: false,
      },

      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
      },
    });

    candleSeries = chart.addSeries(
      LightweightCharts.CandlestickSeries,
      {
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderVisible: false,
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
      }
    );

    resizeObserver = new ResizeObserver(() => {
      if (!chart || !container) {
        return;
      }

      chart.applyOptions({
        width: container.clientWidth || 900,
        height: container.clientHeight || 560,
      });
    });

    resizeObserver.observe(container);

    return true;
  }

  function disconnectWebSocket() {
    if (ws) {
      try {
        ws.close();
      } catch (_) {
        // Ignore close errors.
      }
    }

    ws = null;
  }

  function connectWebSocket(onOpen) {
    return new Promise((resolve, reject) => {
      disconnectWebSocket();

      setStatus("Connecting...");

      ws = new WebSocket(WS_URL);

      const timeout = setTimeout(() => {
        try {
          ws.close();
        } catch (_) {}

        reject(new Error("Deriv connection timed out."));
      }, 10000);

      ws.addEventListener("open", () => {
        clearTimeout(timeout);

        setStatus("Connected");

        if (typeof onOpen === "function") {
          onOpen();
        }

        resolve();
      });

      ws.addEventListener("error", () => {
        clearTimeout(timeout);
        reject(new Error("Unable to connect to Deriv market data."));
      });
    });
  }

  function requestHistory(symbol, timeframe) {
    return new Promise((resolve, reject) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        reject(new Error("Deriv connection is not open."));
        return;
      }

      const requestId = Date.now();

      const request = {
        ticks_history: symbol,
        end: "latest",
        count: 200,
        style: "candles",
        granularity: GRANULARITY[timeframe] || 60,
        req_id: requestId,
      };

      const handleMessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.req_id !== requestId) {
            return;
          }

          ws.removeEventListener("message", handleMessage);

          if (data.error) {
            reject(
              new Error(
                data.error.message || "Deriv returned an error."
              )
            );
            return;
          }

          if (
            !data.candles ||
            !Array.isArray(data.candles) ||
            data.candles.length === 0
          ) {
            reject(
              new Error(
                "No candle data was returned for this market."
              )
            );
            return;
          }

          resolve(data.candles);
        } catch (error) {
          ws.removeEventListener("message", handleMessage);
          reject(error);
        }
      };

      ws.addEventListener("message", handleMessage);
      ws.send(JSON.stringify(request));
    });
  }

  function convertCandles(rawCandles) {
    return rawCandles
      .map((candle) => {
        const open = normalizeNumber(candle.open);
        const high = normalizeNumber(candle.high);
        const low = normalizeNumber(candle.low);
        const close = normalizeNumber(candle.close);

        const epoch = Number(candle.epoch);

        if (
          !Number.isFinite(epoch) ||
          open === null ||
          high === null ||
          low === null ||
          close === null
        ) {
          return null;
        }

        return {
          time: epoch,
          open,
          high,
          low,
          close,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.time - b.time);
  }

  function calculateSMA(data, period = 20) {
    const output = [];

    for (let i = period - 1; i < data.length; i += 1) {
      let sum = 0;

      for (let j = i - period + 1; j <= i; j += 1) {
        sum += data[j].close;
      }

      output.push({
        time: data[i].time,
        value: sum / period,
      });
    }

    return output;
  }

  function calculateEMA(data, period = 20) {
    if (data.length < period) {
      return [];
    }

    const multiplier = 2 / (period + 1);

    let ema =
      data
        .slice(0, period)
        .reduce((sum, item) => sum + item.close, 0) / period;

    const output = [
      {
        time: data[period - 1].time,
        value: ema,
      },
    ];

    for (let i = period; i < data.length; i += 1) {
      ema =
        (data[i].close - ema) * multiplier +
        ema;

      output.push({
        time: data[i].time,
        value: ema,
      });
    }

    return output;
  }

  function calculateRSI(data, period = 14) {
    if (data.length <= period) {
      return [];
    }

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i += 1) {
      const change =
        data[i].close - data[i - 1].close;

      if (change >= 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }

    let averageGain = gains / period;
    let averageLoss = losses / period;

    const output = [];

    function rsiValue() {
      if (averageLoss === 0) {
        return 100;
      }

      const rs = averageGain / averageLoss;

      return 100 - 100 / (1 + rs);
    }

    output.push({
      time: data[period].time,
      value: rsiValue(),
    });

    for (let i = period + 1; i < data.length; i += 1) {
      const change =
        data[i].close - data[i - 1].close;

      const gain = Math.max(change, 0);
      const loss = Math.max(-change, 0);

      averageGain =
        (averageGain * (period - 1) + gain) /
        period;

      averageLoss =
        (averageLoss * (period - 1) + loss) /
        period;

      output.push({
        time: data[i].time,
        value: rsiValue(),
      });
    }

    return output;
  }

  function clearIndicators() {
    indicatorSeries.forEach((series) => {
      try {
        chart.removeSeries(series);
      } catch (_) {}
    });

    indicatorSeries = [];
  }

  function drawIndicators() {
    if (!chart || !candles.length) {
      return;
    }

    clearIndicators();

    const selected = Array.from(
      document.querySelectorAll(
        ".indicator-option input[type='checkbox']:checked"
      )
    ).map((input) => input.value);

    if (selected.includes("SMA")) {
      const series = chart.addSeries(
        LightweightCharts.LineSeries,
        {
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
        }
      );

      series.setData(calculateSMA(candles, 20));
      indicatorSeries.push(series);
    }

    if (selected.includes("EMA")) {
      const series = chart.addSeries(
        LightweightCharts.LineSeries,
        {
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
        }
      );

      series.setData(calculateEMA(candles, 20));
      indicatorSeries.push(series);
    }

    // RSI is calculated and displayed in the summary.
    // It is not plotted on the main price scale.
    if (selected.includes("RSI")) {
      updateSummary();
    }
  }

  function latestClose() {
    if (!candles.length) {
      return null;
    }

    return candles[candles.length - 1].close;
  }

  function updateSummary() {
    const price = latestClose();

    if (price === null) {
      setSummary("No market data available.");
      return;
    }

    const sma = calculateSMA(candles, 20);
    const rsi = calculateRSI(candles, 14);

    const latestSma =
      sma.length > 0
        ? sma[sma.length - 1].value
        : null;

    const latestRsi =
      rsi.length > 0
        ? rsi[rsi.length - 1].value
        : null;

    let trend = "Neutral";

    if (latestSma !== null) {
      if (price > latestSma) {
        trend = "Above 20-period SMA";
      } else if (price < latestSma) {
        trend = "Below 20-period SMA";
      }
    }

    let rsiText = "RSI unavailable";

    if (latestRsi !== null) {
      rsiText =
        "RSI(14): " + latestRsi.toFixed(2);
    }

    setSummary(
      `Market: ${currentSymbol} | ` +
      `Timeframe: ${currentTimeframe} | ` +
      `Latest price: ${price} | ` +
      `Trend reference: ${trend} | ` +
      rsiText
    );
  }

  async function loadChart() {
    const symbolInput = $("symbolInput");
    const timeframeSelect = $("timeframeSelect");
    const symbolDisplay = $("currentSymbol");

    const symbol =
      symbolInput?.value.trim() || "R_100";

    const timeframe =
      timeframeSelect?.value || "1m";

    currentSymbol = symbol.toUpperCase();
    currentTimeframe = timeframe;

    if (symbolDisplay) {
      symbolDisplay.textContent = currentSymbol;
    }

    setSummary("Loading market data...");
    setStatus("Loading...");

    try {
      await connectWebSocket();

      const rawCandles = await requestHistory(
        currentSymbol,
        currentTimeframe
      );

      candles = convertCandles(rawCandles);

      if (!candles.length) {
        throw new Error("No valid candles were received.");
      }

      candleSeries.setData(candles);

      drawIndicators();
      updateSummary();

      chart.timeScale().fitContent();

      setStatus("Live data");
    } catch (error) {
      console.error(error);

      candles = [];

      setSummary(
        "Unable to load " +
          currentSymbol +
          ". " +
          (error.message || "Unknown error.")
      );

      setStatus("Connection error");
    }
  }

  function setupControls() {
    $("loadChartButton")?.addEventListener(
      "click",
      loadChart
    );

    $("applyIndicatorsButton")?.addEventListener(
      "click",
      () => {
        drawIndicators();
        updateSummary();
      }
    );

    $("toggleIndicators")?.addEventListener(
      "click",
      () => {
        $("indicatorPanel")?.classList.toggle("hidden");
      }
    );

    $("symbolInput")?.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Enter") {
          loadChart();
        }
      }
    );
  }

  function start() {
    const chartReady = initializeChart();

    if (!chartReady) {
      return;
    }

    setupControls();

    loadChart();
  }

  window.addEventListener("beforeunload", () => {
    disconnectWebSocket();

    if (resizeObserver) {
      resizeObserver.disconnect();
    }
  });

  document.addEventListener("DOMContentLoaded", start);
})();
