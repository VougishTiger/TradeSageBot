import { RSI, EMA, VWAP, MACD } from 'technicalindicators';

/**
 * Calculate RSI from bar data
 * @param {Array} bars - Array of bar objects with ClosePrice property
 * @param {number} period - RSI period, typically 14
 * @returns {Array} RSI values aligned with bars
 */
export const calculateRSI = (bars, period = 14) => {
  const closes = bars.map(bar => bar.ClosePrice);
  return RSI.calculate({ values: closes, period });
};

/**
 * Calculate EMA for a given period
 * @param {Array} bars - Array of bar objects with ClosePrice property
 * @param {number} period
 * @returns {Array} EMA values
 */
export const calculateEMA = (bars, period) => {
  const closes = bars.map(bar => bar.ClosePrice);
  return EMA.calculate({ values: closes, period });
};

/**
 * Calculate VWAP
 * @param {Array} bars - Array of bar objects with HighPrice, LowPrice, ClosePrice, and Volume
 * @returns {Array} VWAP values
 */
export const calculateVWAP = (bars) => {
  return VWAP.calculate({
    high: bars.map(bar => bar.HighPrice),
    low: bars.map(bar => bar.LowPrice),
    close: bars.map(bar => bar.ClosePrice),
    volume: bars.map(bar => bar.Volume),
  });
};

/**
 * Calculate MACD
 * @param {Array} bars - Array of bar objects with ClosePrice
 * @returns {Array} MACD values
 */
export const calculateMACD = (bars) => {
  const closes = bars.map(bar => bar.ClosePrice);
  return MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
};

/**
 * Check for a volume spike
 * @param {Array} bars
 * @returns {boolean} - true if latest volume is 1.5x higher than average of last 20 bars
 */
export const isVolumeSpike = (bars) => {
  const volumes = bars.map(bar => bar.Volume);
  const avgVolume = volumes.slice(-21, -1).reduce((a, b) => a + b, 0) / 20;
  const latestVolume = volumes[volumes.length - 1];
  return latestVolume > avgVolume * 1.5;
};

/**
 * Consolidated indicator results
 * @param {Array} bars
 * @returns {Object} - All indicators needed for trade logic
 */
export const getAllIndicators = (bars) => {
  const rsi = calculateRSI(bars);
  const ema9 = calculateEMA(bars, 9);
  const ema21 = calculateEMA(bars, 21);
  const ema50 = calculateEMA(bars, 50);
  const vwap = calculateVWAP(bars);
  const macd = calculateMACD(bars);
  const volumeSpike = isVolumeSpike(bars);

  return {
    rsi: rsi[rsi.length - 1],
    ema9: ema9[ema9.length - 1],
    ema21: ema21[ema21.length - 1],
    ema50: ema50[ema50.length - 1],
    vwap: vwap[vwap.length - 1],
    macd: macd[macd.length - 1],
    volumeSpike,
  };
};
