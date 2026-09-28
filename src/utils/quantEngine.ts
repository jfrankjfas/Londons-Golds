import { AsianRange, Candle, NYOpeningRange, StrategyParameters, TradeSignal } from '../types/trading.ts';

/**
 * Calculates Exponential Moving Average (EMA) for candle closes.
 */
export function calculateEMA(candles: Candle[], period: number = 20): Candle[] {
  const k = 2 / (period + 1);
  let prevEma: number | null = null;

  return candles.map((c, i) => {
    if (i < period - 1) {
      return { ...c, ema20: c.close };
    }
    if (i === period - 1) {
      const slice = candles.slice(0, period);
      const sma = slice.reduce((sum, item) => sum + item.close, 0) / period;
      prevEma = sma;
      return { ...c, ema20: sma };
    }
    const currentEma = c.close * k + (prevEma as number) * (1 - k);
    prevEma = currentEma;
    return { ...c, ema20: currentEma };
  });
}

/**
 * Identifies the Asian Session Range (00:00 - 07:00 UTC)
 */
export function getAsianRange(
  candles: Candle[],
  startHour: number = 0,
  endHour: number = 7
): AsianRange | null {
  const asiaCandles: { candle: Candle; index: number }[] = [];

  candles.forEach((c, idx) => {
    if (c.hour >= startHour && c.hour < endHour) {
      asiaCandles.push({ candle: c, index: idx });
    }
  });

  if (asiaCandles.length === 0) return null;

  let high = -Infinity;
  let low = Infinity;

  asiaCandles.forEach(({ candle }) => {
    if (candle.high > high) high = candle.high;
    if (candle.low < low) low = candle.low;
  });

  const rangePoints = high - low;
  const midpoint = (high + low) / 2;
  const startBarIndex = asiaCandles[0].index;
  const endBarIndex = asiaCandles[asiaCandles.length - 1].index;

  return {
    high: parseFloat(high.toFixed(2)),
    low: parseFloat(low.toFixed(2)),
    midpoint: parseFloat(midpoint.toFixed(2)),
    rangePoints: parseFloat(rangePoints.toFixed(2)),
    startBarIndex,
    endBarIndex,
    startTime: asiaCandles[0].candle.time,
    endTime: asiaCandles[asiaCandles.length - 1].candle.time,
    isComplete: true,
  };
}

/**
 * Identifies the New York Opening Range (13:30 - 13:45 UTC, 15m candle)
 */
export function getNYOpeningRange(
  candles: Candle[],
  startHour: number = 13,
  startMinute: number = 30
): NYOpeningRange | null {
  let orbIndex = -1;
  for (let i = 0; i < candles.length; i++) {
    if (candles[i].hour === startHour && candles[i].minute === startMinute) {
      orbIndex = i;
      break;
    }
  }

  if (orbIndex === -1) return null;

  const candle = candles[orbIndex];
  const rangePoints = candle.high - candle.low;
  const midpoint = (candle.high + candle.low) / 2;

  return {
    high: parseFloat(candle.high.toFixed(2)),
    low: parseFloat(candle.low.toFixed(2)),
    midpoint: parseFloat(midpoint.toFixed(2)),
    rangePoints: parseFloat(rangePoints.toFixed(2)),
    startBarIndex: orbIndex,
    endBarIndex: orbIndex,
    startTime: candle.time,
    endTime: candle.time,
    isComplete: true,
  };
}

/**
 * Calculates exact position sizing for XAU/USD (Gold)
 * Standard Gold contract = 100 Troy Ounces.
 * $1.00 move = $100 per 1.00 Lot ($1.00 per 0.01 micro lot).
 */
export function calculatePositionSize(
  accountBalance: number,
  riskPercent: number,
  entryPrice: number,
  slPrice: number
): {
  lotSize: number;
  riskAmountUSD: number;
  pointsAtRisk: number;
  pipsAtRisk: number;
} {
  const riskAmountUSD = (accountBalance * riskPercent) / 100;
  const pointsAtRisk = Math.abs(entryPrice - slPrice);
  const pipsAtRisk = pointsAtRisk * 10; // In XAU/USD, 0.10 is 1 pip

  // 1 standard lot (100 oz): 1 point ($1.00) = $100.00 USD
  const dollarRiskPerLot = pointsAtRisk * 100;
  let rawLots = dollarRiskPerLot > 0 ? riskAmountUSD / dollarRiskPerLot : 0.01;

  // Round down to 2 decimal places (standard micro lot minimum 0.01)
  let lotSize = Math.floor(rawLots * 100) / 100;
  if (lotSize < 0.01) lotSize = 0.01;

  return {
    lotSize,
    riskAmountUSD: parseFloat(riskAmountUSD.toFixed(2)),
    pointsAtRisk: parseFloat(pointsAtRisk.toFixed(2)),
    pipsAtRisk: parseFloat(pipsAtRisk.toFixed(1)),
  };
}

/**
 * Evaluates the New York Opening Range Breakout (ORB) strategy for a given day.
 */
export function evaluateNYOrbDay(
  candles: Candle[],
  prevDayTrend: 'BULLISH' | 'BEARISH',
  params: StrategyParameters
): {
  asianRange: AsianRange | null;
  nyOrbRange: NYOpeningRange | null;
  trade: TradeSignal | null;
  trades: TradeSignal[];
} {
  const candlesWithEma = calculateEMA(candles, 20);
  const orbRange = getNYOpeningRange(candlesWithEma, params.orbStartHour ?? 13, params.orbStartMinute ?? 30);

  if (!orbRange) {
    return { asianRange: null, nyOrbRange: null, trade: null, trades: [] };
  }

  const minOrb = params.minOrbRange ?? 3.0;
  const maxOrb = params.maxOrbRange ?? 15.0;
  if ((minOrb > 0 && orbRange.rangePoints < minOrb) || (maxOrb > 0 && orbRange.rangePoints > maxOrb)) {
    return { asianRange: null, nyOrbRange: orbRange, trade: null, trades: [] };
  }

  const trades: TradeSignal[] = [];
  const maxTrades = params.maxTradesPerDay ?? 2;
  const maxSl = params.maxSlPerDay ?? 2;
  let slCount = 0;
  let lastExitBarIndex = -1;

  const startTradeMins = (params.orbStartHour ?? 13) * 60 + 45; // 13:45 UTC
  const endTradeMins = (params.orbTradeEndHour ?? 16) * 60 + (params.orbTradeEndMinute ?? 30); // 16:30 UTC

  for (let i = orbRange.startBarIndex + 1; i < candlesWithEma.length; i++) {
    if (trades.length >= maxTrades) break;
    if (slCount >= maxSl) break;
    if (i <= lastExitBarIndex) continue;

    const currentCandle = candlesWithEma[i];
    const prevCandle = candlesWithEma[i - 1];
    const mins = currentCandle.hour * 60 + currentCandle.minute;

    if (mins < startTradeMins || mins > endTradeMins) continue;

    const buyBreakout = currentCandle.close > orbRange.high && prevCandle.close <= orbRange.high && currentCandle.close > currentCandle.open;
    const sellBreakout = currentCandle.close < orbRange.low && prevCandle.close >= orbRange.low && currentCandle.close < currentCandle.open;

    if (!buyBreakout && !sellBreakout) continue;

    const isLong = buyBreakout;
    const type: 'LONG' | 'SHORT' = isLong ? 'LONG' : 'SHORT';
    const entryPrice = currentCandle.close;
    const slPrice = orbRange.midpoint;
    const riskDistance = Math.abs(entryPrice - slPrice);
    if (riskDistance < 1.0) continue;

    const tpPrice = isLong
      ? parseFloat((entryPrice + riskDistance * params.rrRatio).toFixed(2))
      : parseFloat((entryPrice - riskDistance * params.rrRatio).toFixed(2));

    const sizing = calculatePositionSize(params.accountBalance, params.riskPercent, entryPrice, slPrice);
    const projectedProfitUSD = parseFloat((sizing.riskAmountUSD * params.rrRatio).toFixed(2));

    const beTriggerPrice = isLong
      ? parseFloat((entryPrice + riskDistance * (params.beTriggerRatio ?? 1.0)).toFixed(2))
      : parseFloat((entryPrice - riskDistance * (params.beTriggerRatio ?? 1.0)).toFixed(2));
    const bePriceLevel = parseFloat((isLong ? entryPrice + 0.20 : entryPrice - 0.20).toFixed(2));

    const currentTrade: TradeSignal = {
      id: `orb-${currentCandle.time}-${trades.length + 1}`,
      date: currentCandle.time.split(' ')[0],
      type,
      barIndex: i,
      time: currentCandle.time,
      entryPrice,
      slPrice,
      originalSlPrice: slPrice,
      tpPrice,
      riskAmountUSD: sizing.riskAmountUSD,
      projectedProfitUSD,
      lotSize: sizing.lotSize,
      status: 'ACTIVE',
      isBreakevenTriggered: false,
      bePrice: bePriceLevel,
      session: 'NEW_YORK',
      triggerType: 'INITIAL_BREAKOUT',
    };

    let currentSl = slPrice;
    let exitBar = candlesWithEma.length - 1;

    for (let j = i + 1; j < candlesWithEma.length; j++) {
      const future = candlesWithEma[j];

      if (type === 'LONG') {
        if (future.high >= tpPrice) {
          currentTrade.status = 'HIT_TP';
          currentTrade.exitPrice = tpPrice;
          currentTrade.exitTime = future.time;
          currentTrade.exitReason = 'TAKE_PROFIT';
          currentTrade.pnlUSD = projectedProfitUSD;
          currentTrade.pnlPips = parseFloat(((tpPrice - entryPrice) * 10).toFixed(1));
          exitBar = j;
          break;
        } else if (future.low <= currentSl) {
          if (currentTrade.isBreakevenTriggered) {
            currentTrade.status = 'BREAKEVEN';
            currentTrade.exitPrice = currentSl;
            currentTrade.exitTime = future.time;
            currentTrade.exitReason = 'BREAKEVEN';
            currentTrade.pnlUSD = 0;
            currentTrade.pnlPips = 0;
          } else {
            currentTrade.status = 'HIT_SL';
            currentTrade.exitPrice = currentSl;
            currentTrade.exitTime = future.time;
            currentTrade.exitReason = 'STOP_LOSS';
            currentTrade.pnlUSD = -sizing.riskAmountUSD;
            currentTrade.pnlPips = -parseFloat(((entryPrice - currentSl) * 10).toFixed(1));
            slCount++;
          }
          exitBar = j;
          break;
        }
        if (params.enableBreakEven && !currentTrade.isBreakevenTriggered && future.high >= beTriggerPrice) {
          currentTrade.isBreakevenTriggered = true;
          currentTrade.beTriggeredTime = future.time;
          currentSl = bePriceLevel;
          currentTrade.slPrice = bePriceLevel;
        }
      } else {
        if (future.low <= tpPrice) {
          currentTrade.status = 'HIT_TP';
          currentTrade.exitPrice = tpPrice;
          currentTrade.exitTime = future.time;
          currentTrade.exitReason = 'TAKE_PROFIT';
          currentTrade.pnlUSD = projectedProfitUSD;
          currentTrade.pnlPips = parseFloat(((entryPrice - tpPrice) * 10).toFixed(1));
          exitBar = j;
          break;
        } else if (future.high >= currentSl) {
          if (currentTrade.isBreakevenTriggered) {
            currentTrade.status = 'BREAKEVEN';
            currentTrade.exitPrice = currentSl;
            currentTrade.exitTime = future.time;
            currentTrade.exitReason = 'BREAKEVEN';
            currentTrade.pnlUSD = 0;
            currentTrade.pnlPips = 0;
          } else {
            currentTrade.status = 'HIT_SL';
            currentTrade.exitPrice = currentSl;
            currentTrade.exitTime = future.time;
            currentTrade.exitReason = 'STOP_LOSS';
            currentTrade.pnlUSD = -sizing.riskAmountUSD;
            currentTrade.pnlPips = -parseFloat(((currentSl - entryPrice) * 10).toFixed(1));
            slCount++;
          }
          exitBar = j;
          break;
        }
        if (params.enableBreakEven && !currentTrade.isBreakevenTriggered && future.low <= beTriggerPrice) {
          currentTrade.isBreakevenTriggered = true;
          currentTrade.beTriggeredTime = future.time;
          currentSl = bePriceLevel;
          currentTrade.slPrice = bePriceLevel;
        }
      }
    }

    trades.push(currentTrade);
    lastExitBarIndex = exitBar;
  }

  return {
    asianRange: null,
    nyOrbRange: orbRange,
    trade: trades[0] || null,
    trades,
  };
}

/**
 * Evaluates the full London Breakout or NY ORB strategy on a list of M15 candles for a given day.
 */
export function evaluateStrategyDay(
  candles: Candle[],
  prevDayTrend: 'BULLISH' | 'BEARISH',
  params: StrategyParameters
): {
  asianRange: AsianRange | null;
  nyOrbRange?: NYOpeningRange | null;
  trade: TradeSignal | null;
  trades: TradeSignal[];
} {
  if (params.strategyType === 'NY_ORB') {
    return evaluateNYOrbDay(candles, prevDayTrend, params);
  }

  const candlesWithEma = calculateEMA(candles, 20);
  const asianRange = getAsianRange(candlesWithEma, params.startHourAsia, params.endHourAsia);

  if (!asianRange) {
    return { asianRange: null, nyOrbRange: null, trade: null, trades: [] };
  }

  // Filtro Cuantitativo de Amplitud Rango Tokio (Evita días de sobreextensión o compresión extrema)
  const minAsia = params.minAsiaRange ?? 6.0;
  const maxAsia = params.maxAsiaRange ?? 32.0;
  if ((minAsia > 0 && asianRange.rangePoints < minAsia) || (maxAsia > 0 && asianRange.rangePoints > maxAsia)) {
    return { asianRange, trade: null, trades: [] };
  }

  const trades: TradeSignal[] = [];
  const maxTrades = params.maxTradesPerDay ?? 2;
  const maxSl = params.maxSlPerDay ?? 2;
  let slCount = 0;
  let lastExitBarIndex = -1;
  let hasPriorLongBreakout = false;
  let hasPriorShortBreakout = false;

  const startNYH = params.startNYHour ?? 13;
  const startNYM = params.startNYMinute ?? 30;
  const endNYH = params.endNYHour ?? 15;
  const endNYM = params.endNYMinute ?? 30;
  const retestTolerance = params.retestTolerancePoints ?? 2.0;

  for (let i = 1; i < candlesWithEma.length; i++) {
    if (trades.length >= maxTrades) break;
    if (slCount >= maxSl) break;

    const prevCandle = candlesWithEma[i - 1];
    const currentCandle = candlesWithEma[i];

    // Track prior breakout occurrences after Asian range
    if (currentCandle.hour >= params.endHourAsia) {
      if (currentCandle.high > asianRange.high + 1.0) hasPriorLongBreakout = true;
      if (currentCandle.low < asianRange.low - 1.0) hasPriorShortBreakout = true;
    }

    if (i <= lastExitBarIndex) continue;

    // Check if candle is within London Entry Window (08:00 - 11:00 UTC)
    const inLondonWindow =
      (currentCandle.hour > params.startLondon ||
        (currentCandle.hour === params.startLondon && currentCandle.minute >= 0)) &&
      (currentCandle.hour < params.endLondonTrade ||
        (currentCandle.hour === params.endLondonTrade && currentCandle.minute === 0));

    // Check if candle is within New York Opening Window (13:30 - 15:30 UTC)
    const inNYWindow =
      Boolean(params.enableNYSession) &&
      ((currentCandle.hour > startNYH || (currentCandle.hour === startNYH && currentCandle.minute >= startNYM)) &&
       (currentCandle.hour < endNYH || (currentCandle.hour === endNYH && currentCandle.minute <= endNYM)));

    if (!inLondonWindow && !inNYWindow) continue;

    const session: 'LONDON' | 'NEW_YORK' = inNYWindow ? 'NEW_YORK' : 'LONDON';
    const isFirstTrade = trades.length === 0;
    const allowLongByTrend = params.trendMode === 'D1_STRICT' ? prevDayTrend === 'BULLISH' : true;
    const allowShortByTrend = params.trendMode === 'D1_STRICT' ? prevDayTrend === 'BEARISH' : true;

    // 1. Quiebre Inicial Limpio (Initial Breakout)
    const initialLongBreakout =
      allowLongByTrend &&
      currentCandle.close > asianRange.high &&
      prevCandle.close <= asianRange.high &&
      currentCandle.close > currentCandle.open;

    const initialShortBreakout =
      allowShortByTrend &&
      currentCandle.close < asianRange.low &&
      prevCandle.close >= asianRange.low &&
      currentCandle.close < currentCandle.open;

    // 2. Segunda Oportunidad por Retesteo M15 (Pullback al nivel de Tokio con rechazo alcista/bajista)
    const enableRetest = params.enableRetestEntry ?? true;
    const isRetestLong =
      enableRetest &&
      allowLongByTrend &&
      hasPriorLongBreakout &&
      currentCandle.close > asianRange.high &&
      currentCandle.low <= asianRange.high + retestTolerance &&
      currentCandle.close > currentCandle.open &&
      !initialLongBreakout;

    const isRetestShort =
      enableRetest &&
      allowShortByTrend &&
      hasPriorShortBreakout &&
      currentCandle.close < asianRange.low &&
      currentCandle.high >= asianRange.low - retestTolerance &&
      currentCandle.close < currentCandle.open &&
      !initialShortBreakout;

    // Fallback de continuación/retesteo si ya hubo un trade previo
    const continuationLong =
      !isFirstTrade &&
      allowLongByTrend &&
      currentCandle.close > asianRange.high &&
      currentCandle.low >= asianRange.high - 1.5 &&
      currentCandle.close > currentCandle.open;

    const continuationShort =
      !isFirstTrade &&
      allowShortByTrend &&
      currentCandle.close < asianRange.low &&
      currentCandle.high <= asianRange.low + 1.5 &&
      currentCandle.close < currentCandle.open;

    const breakoutLong = initialLongBreakout || isRetestLong || continuationLong;
    const breakoutShort = initialShortBreakout || isRetestShort || continuationShort;

    if (breakoutLong || breakoutShort) {
      const type = breakoutLong ? 'LONG' : 'SHORT';
      const triggerType: 'INITIAL_BREAKOUT' | 'M15_RETEST' =
        (isRetestLong || isRetestShort || !isFirstTrade) ? 'M15_RETEST' : 'INITIAL_BREAKOUT';
      const entryPrice = currentCandle.close;

      let slPrice = 0;
      if (triggerType === 'M15_RETEST' || params.tightRetestSl) {
        // En retesteo: Stop Loss ceñido (5 a 7 puntos) al mínimo del pullback para maximizar lotaje
        const tightPoints = Math.min(Math.max(asianRange.rangePoints * 0.35, 4.5), 7.5);
        slPrice = type === 'LONG' ? entryPrice - tightPoints : entryPrice + tightPoints;
      } else if (params.slMethod === '50_PERCENT') {
        slPrice = asianRange.midpoint;
      } else if (params.slMethod === 'EMA_20') {
        slPrice = currentCandle.ema20 || (type === 'LONG' ? asianRange.low : asianRange.high);
      } else {
        slPrice = type === 'LONG' ? asianRange.low : asianRange.high;
      }

      slPrice = parseFloat(slPrice.toFixed(2));

      // Calculate Take Profit using exact R:R (ej: 1:2.5)
      const riskDistance = Math.abs(entryPrice - slPrice);
      const tpDistance = riskDistance * params.rrRatio;
      const tpPrice = parseFloat(
        (type === 'LONG' ? entryPrice + tpDistance : entryPrice - tpDistance).toFixed(2)
      );

      // Position size calculation
      const effectiveRiskPercent = params.autoRiskPerTrade
        ? params.dailyRiskLimitPercent / (params.maxSlPerDay || 2)
        : params.riskPercent;

      const sizing = calculatePositionSize(
        params.accountBalance,
        effectiveRiskPercent,
        entryPrice,
        slPrice
      );

      const projectedProfitUSD = parseFloat((sizing.riskAmountUSD * params.rrRatio).toFixed(2));

      // Breakeven calculation parameters (1:1 ratio)
      const beRatio = params.beTriggerRatio || 1.0;
      const beOffsetUSD = (params.beOffsetPips || 0) * 0.1;
      const beTriggerPrice = parseFloat(
        (type === 'LONG' ? entryPrice + riskDistance * beRatio : entryPrice - riskDistance * beRatio).toFixed(2)
      );
      const bePriceLevel = parseFloat(
        (type === 'LONG' ? entryPrice + beOffsetUSD : entryPrice - beOffsetUSD).toFixed(2)
      );

      const currentTrade: TradeSignal = {
        id: `trade-${currentCandle.time}-${trades.length + 1}`,
        date: currentCandle.time.split(' ')[0],
        type,
        barIndex: i,
        time: currentCandle.time,
        entryPrice,
        slPrice,
        originalSlPrice: slPrice,
        tpPrice,
        riskAmountUSD: sizing.riskAmountUSD,
        projectedProfitUSD,
        lotSize: sizing.lotSize,
        status: 'ACTIVE',
        isBreakevenTriggered: false,
        bePrice: bePriceLevel,
        session,
        triggerType,
      };

      let currentSl = slPrice;
      let exitBar = candlesWithEma.length - 1;

      // Forward simulate subsequent candles to check outcome
      for (let j = i + 1; j < candlesWithEma.length; j++) {
        const futureCandle = candlesWithEma[j];

        // 1. Check Outcomes
        if (type === 'LONG') {
          if (futureCandle.high >= tpPrice) {
            currentTrade.status = 'HIT_TP';
            currentTrade.exitPrice = tpPrice;
            currentTrade.exitTime = futureCandle.time;
            currentTrade.exitReason = 'TAKE_PROFIT';
            currentTrade.pnlUSD = projectedProfitUSD;
            currentTrade.pnlPips = parseFloat(((tpPrice - entryPrice) * 10).toFixed(1));
            exitBar = j;
            break;
          } else if (futureCandle.low <= currentSl) {
            if (currentTrade.isBreakevenTriggered) {
              currentTrade.status = 'BREAKEVEN';
              currentTrade.exitPrice = currentSl;
              currentTrade.exitTime = futureCandle.time;
              currentTrade.exitReason = 'BREAKEVEN';
              const pnl = parseFloat(((currentSl - entryPrice) * 100 * sizing.lotSize).toFixed(2));
              currentTrade.pnlUSD = pnl >= 0 ? pnl : 0;
              currentTrade.pnlPips = parseFloat(((currentSl - entryPrice) * 10).toFixed(1));
            } else {
              currentTrade.status = 'HIT_SL';
              currentTrade.exitPrice = currentSl;
              currentTrade.exitTime = futureCandle.time;
              currentTrade.exitReason = 'STOP_LOSS';
              currentTrade.pnlUSD = -sizing.riskAmountUSD;
              currentTrade.pnlPips = -parseFloat(((entryPrice - currentSl) * 10).toFixed(1));
              slCount++;
            }
            exitBar = j;
            break;
          }

          // Breakeven check for subsequent candles
          if (params.enableBreakEven && !currentTrade.isBreakevenTriggered) {
            if (futureCandle.high >= beTriggerPrice) {
              currentTrade.isBreakevenTriggered = true;
              currentTrade.beTriggeredTime = futureCandle.time;
              currentSl = bePriceLevel;
              currentTrade.slPrice = bePriceLevel;
            }
          }
        } else {
          // SHORT
          if (futureCandle.low <= tpPrice) {
            currentTrade.status = 'HIT_TP';
            currentTrade.exitPrice = tpPrice;
            currentTrade.exitTime = futureCandle.time;
            currentTrade.exitReason = 'TAKE_PROFIT';
            currentTrade.pnlUSD = projectedProfitUSD;
            currentTrade.pnlPips = parseFloat(((entryPrice - tpPrice) * 10).toFixed(1));
            exitBar = j;
            break;
          } else if (futureCandle.high >= currentSl) {
            if (currentTrade.isBreakevenTriggered) {
              currentTrade.status = 'BREAKEVEN';
              currentTrade.exitPrice = currentSl;
              currentTrade.exitTime = futureCandle.time;
              currentTrade.exitReason = 'BREAKEVEN';
              const pnl = parseFloat(((entryPrice - currentSl) * 100 * sizing.lotSize).toFixed(2));
              currentTrade.pnlUSD = pnl >= 0 ? pnl : 0;
              currentTrade.pnlPips = parseFloat(((entryPrice - currentSl) * 10).toFixed(1));
            } else {
              currentTrade.status = 'HIT_SL';
              currentTrade.exitPrice = currentSl;
              currentTrade.exitTime = futureCandle.time;
              currentTrade.exitReason = 'STOP_LOSS';
              currentTrade.pnlUSD = -sizing.riskAmountUSD;
              currentTrade.pnlPips = -parseFloat(((currentSl - entryPrice) * 10).toFixed(1));
              slCount++;
            }
            exitBar = j;
            break;
          }

          // Breakeven check for subsequent candles
          if (params.enableBreakEven && !currentTrade.isBreakevenTriggered) {
            if (futureCandle.low <= beTriggerPrice) {
              currentTrade.isBreakevenTriggered = true;
              currentTrade.beTriggeredTime = futureCandle.time;
              currentSl = bePriceLevel;
              currentTrade.slPrice = bePriceLevel;
            }
          }
        }
      }

      trades.push(currentTrade);
      lastExitBarIndex = exitBar;
    }
  }

  return {
    asianRange,
    nyOrbRange: null,
    trade: trades[0] || null,
    trades,
  };
}
