import axios from 'axios';
import { getAllIndicators } from './indicators.js';
import dotenv from 'dotenv';
dotenv.config();

const API_URL = 'https://api.tradier.com/v1';
const ACCESS_TOKEN = process.env.TRADIER_ACCESS_TOKEN;
const ACCOUNT_ID = process.env.TRADIER_ACCOUNT_ID;
const SYMBOL = 'SPY';
const TIMEFRAME = '1min';
const MAX_CANDLES = 100;
const RISK_PER_TRADE = 100; // USD risked per trade

if (!ACCESS_TOKEN || !ACCOUNT_ID) {
  console.error('❌ Missing TRADIER_ACCESS_TOKEN or TRADIER_ACCOUNT_ID in .env');
  process.exit(1);
}

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    Accept: 'application/json',
  },
});

let confirmationCandles = [];

const fetchBars = async () => {
  try {
    const res = await axiosInstance.get('/markets/timesales', {
      params: {
        symbol: SYMBOL,
        interval: TIMEFRAME,
        session_filter: 'open',
      },
    });

    const candles = res.data.series?.data || [];
    return candles.slice(-MAX_CANDLES).map(c => ({
      Time: c.time,
      OpenPrice: c.open,
      HighPrice: c.high,
      LowPrice: c.low,
      ClosePrice: c.close,
      Volume: c.volume,
    }));
  } catch (error) {
    console.error('❌ Error fetching bars:', error.response?.data || error.message);
    return [];
  }
};

const shouldEnterTrade = (indicators, price) => {
  const {
    rsi,
    ema9,
    ema21,
    ema50,
    vwap,
    macd,
    volumeSpike,
  } = indicators;

  const macdCrossUp = macd.MACD > macd.signal;
  const macdCrossDown = macd.MACD < macd.signal;

  const isCall =
    rsi > 50 && rsi < 70 &&
    price > vwap &&
    price > ema9 &&
    price > ema21 &&
    price > ema50 &&
    macdCrossUp &&
    volumeSpike;

  const isPut =
    rsi < 50 && rsi > 30 &&
    price < vwap &&
    price < ema9 &&
    price < ema21 &&
    price < ema50 &&
    macdCrossDown &&
    volumeSpike;

  return { isCall, isPut };
};

const placeOptionsTrade = async (direction) => {
  const action = 'buy_to_open';

  try {
    const chainRes = await axiosInstance.get('/markets/options/chains', {
      params: {
        symbol: SYMBOL,
        expiration: 'nearest',
        greeks: 'false',
      },
    });

    const contracts = chainRes.data.options?.option || [];
    const filtered = contracts.filter(opt => opt.option_type === (direction === 'CALL' ? 'call' : 'put'));
    if (filtered.length === 0) {
      console.log('No option contracts found for direction:', direction);
      return;
    }

    const sorted = filtered.sort((a, b) => Math.abs(a.strike - SYMBOL) - Math.abs(b.strike - SYMBOL));
    const selectedOption = sorted[0];

    const quantity = Math.floor(RISK_PER_TRADE / selectedOption.ask);
    if (quantity < 1) {
      console.log(`🚫 Option too expensive for risk tolerance. Ask: $${selectedOption.ask}`);
      return;
    }

    const order = {
      class: 'option',
      symbol: selectedOption.symbol,
      duration: 'day',
      side: action,
      quantity,
      type: 'market',
    };

    await axiosInstance.post(`/accounts/${ACCOUNT_ID}/orders`, new URLSearchParams(order));
    console.log(`✅ Executed ${direction} trade on ${selectedOption.symbol}, Quantity: ${quantity}`);
  } catch (err) {
    console.error('❌ Failed to place options trade:', err.response?.data || err.message);
  }
};

const runBot = async () => {
  try {
    const bars = await fetchBars();
    if (bars.length < MAX_CANDLES) {
      console.log(`Not enough bars data (${bars.length}/${MAX_CANDLES}). Waiting...`);
      return;
    }

    const lastCandle = bars[bars.length - 1];
    const closePrice = lastCandle.ClosePrice;

    const indicators = getAllIndicators(bars);
    const { isCall, isPut } = shouldEnterTrade(indicators, closePrice);
    const signal = isCall ? 'CALL' : isPut ? 'PUT' : null;

    if (!signal) {
      confirmationCandles = [];
      console.log('No signal. Waiting...');
      return;
    }

    confirmationCandles.push(signal);

    if (
      confirmationCandles.length >= 2 &&
      confirmationCandles.every(sig => sig === signal)
    ) {
      console.log(`✅ Confirmed ${signal} signal! Executing trade...`);
      await placeOptionsTrade(signal);
      confirmationCandles = [];
    } else {
      console.log(`1/${confirmationCandles.length} ${signal} signal(s) confirmed. Waiting for more...`);
    }
  } catch (error) {
    console.error('❌ Error in runBot:', error.message || error);
  }
};

setInterval(runBot, 60 * 1000);
