import { AsianRange, Candle, StrategyParameters, TradeSignal } from '../types/trading.ts';

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
 * Evaluates the full London Breakout strategy on a list of M15 candles for a given day.
 */
export function evaluateStrategyDay(
  candles: Candle[],
  prevDayTrend: 'BULLISH' | 'BEARISH',
  params: StrategyParameters
): {
  asianRange: AsianRange | null;
  trade: TradeSignal | null;
} {
  const candlesWithEma = calculateEMA(candles, 20);
  const asianRange = getAsianRange(candlesWithEma, params.startHourAsia, params.endHourAsia);

  if (!asianRange) {
    return { asianRange: null, trade: null };
  }

  let trade: TradeSignal | null = null;
  let tradeExecutedToday = false;

  for (let i = 1; i < candlesWithEma.length; i++) {
    const prevCandle = candlesWithEma[i - 1];
    const currentCandle = candlesWithEma[i];

    // Check if candle is within London Entry Window (e.g. 07:00/08:00 - 10:00/11:00 UTC)
    const inLondonWindow =
      (currentCandle.hour > params.startLondon ||
        (currentCandle.hour === params.startLondon && currentCandle.minute >= 0)) &&
      (currentCandle.hour < params.endLondonTrade ||
        (currentCandle.hour === params.endLondonTrade && currentCandle.minute === 0));

    if (!tradeExecutedToday && inLondonWindow) {
      // Condition 1: Bullish Breakout
      // Close breaks above Asian High with body (close > asianHigh), previous close was within/below, and D1 was Bullish
      const breakoutLong =
        currentCandle.close > asianRange.high &&
        prevCandle.close <= asianRange.high &&
        prevDayTrend === 'BULLISH';

      // Condition 2: Bearish Breakout
      // Close breaks below Asian Low with body (close < asianLow), previous close was within/above, and D1 was Bearish
      const breakoutShort =
        currentCandle.close < asianRange.low &&
        prevCandle.close >= asianRange.low &&
        prevDayTrend === 'BEARISH';

      if (breakoutLong || breakoutShort) {
        tradeExecutedToday = true;
        const type = breakoutLong ? 'LONG' : 'SHORT';
        const entryPrice = currentCandle.close;

        let slPrice = 0;
        if (params.slMethod === '50_PERCENT') {
          // Mathematical 50% of the Asian Range
          if (type === 'LONG') {
            slPrice = entryPrice - asianRange.rangePoints * 0.5;
            // Or alternatively, mid-point of the range if preferred
            if (slPrice > asianRange.midpoint) {
              slPrice = asianRange.midpoint;
            }
          } else {
            slPrice = entryPrice + asianRange.rangePoints * 0.5;
            if (slPrice < asianRange.midpoint) {
              slPrice = asianRange.midpoint;
            }
          }
        } else if (params.slMethod === 'EMA_20') {
          slPrice = currentCandle.ema20 || (type === 'LONG' ? asianRange.low : asianRange.high);
        } else {
          // OPPOSITE_RANGE
          slPrice = type === 'LONG' ? asianRange.low : asianRange.high;
        }

        slPrice = parseFloat(slPrice.toFixed(2));

        // Calculate Take Profit using exact R:R
        const riskDistance = Math.abs(entryPrice - slPrice);
        const tpDistance = riskDistance * params.rrRatio;
        const tpPrice = parseFloat(
          (type === 'LONG' ? entryPrice + tpDistance : entryPrice - tpDistance).toFixed(2)
        );

        // Position size calculation
        // Calculate risk percent with respect to daily limit coherence if enabled
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

        // Breakeven calculation parameters
        const beRatio = params.beTriggerRatio || 1.0;
        const beOffsetUSD = (params.beOffsetPips || 0) * 0.1;
        const beTriggerPrice = parseFloat(
          (type === 'LONG' ? entryPrice + riskDistance * beRatio : entryPrice - riskDistance * beRatio).toFixed(2)
        );
        const bePriceLevel = parseFloat(
          (type === 'LONG' ? entryPrice + beOffsetUSD : entryPrice - beOffsetUSD).toFixed(2)
        );

        trade = {
          id: `trade-${currentCandle.time}`,
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
        };

        let currentSl = slPrice;

        // Forward simulate subsequent candles to check outcome
        for (let j = i + 1; j < candlesWithEma.length; j++) {
          const futureCandle = candlesWithEma[j];

          // 1. Check Breakeven Trigger (1:1 Ratio achieved)
          if (params.enableBreakEven && !trade.isBreakevenTriggered) {
            const hitBeCondition =
              type === 'LONG'
                ? futureCandle.high >= beTriggerPrice
                : futureCandle.low <= beTriggerPrice;

            if (hitBeCondition) {
              trade.isBreakevenTriggered = true;
              trade.beTriggeredTime = futureCandle.time;
              currentSl = bePriceLevel;
              trade.slPrice = bePriceLevel; // Move SL to Entry (Breakeven)
            }
          }

          // 2. Check Outcomes (Take Profit vs Stop Loss / Breakeven)
          if (type === 'LONG') {
            if (futureCandle.high >= tpPrice) {
              trade.status = 'HIT_TP';
              trade.exitPrice = tpPrice;
              trade.exitTime = futureCandle.time;
              trade.exitReason = 'TAKE_PROFIT';
              trade.pnlUSD = projectedProfitUSD;
              trade.pnlPips = parseFloat(((tpPrice - entryPrice) * 10).toFixed(1));
              break;
            } else if (futureCandle.low <= currentSl) {
              if (trade.isBreakevenTriggered) {
                trade.status = 'BREAKEVEN';
                trade.exitPrice = currentSl;
                trade.exitTime = futureCandle.time;
                trade.exitReason = 'BREAKEVEN';
                const pnl = parseFloat(((currentSl - entryPrice) * 100 * sizing.lotSize).toFixed(2));
                trade.pnlUSD = pnl >= 0 ? pnl : 0;
                trade.pnlPips = parseFloat(((currentSl - entryPrice) * 10).toFixed(1));
              } else {
                trade.status = 'HIT_SL';
                trade.exitPrice = currentSl;
                trade.exitTime = futureCandle.time;
                trade.exitReason = 'STOP_LOSS';
                trade.pnlUSD = -sizing.riskAmountUSD;
                trade.pnlPips = -parseFloat(((entryPrice - currentSl) * 10).toFixed(1));
              }
              break;
            }
          } else {
            // SHORT
            if (futureCandle.low <= tpPrice) {
              trade.status = 'HIT_TP';
              trade.exitPrice = tpPrice;
              trade.exitTime = futureCandle.time;
              trade.exitReason = 'TAKE_PROFIT';
              trade.pnlUSD = projectedProfitUSD;
              trade.pnlPips = parseFloat(((entryPrice - tpPrice) * 10).toFixed(1));
              break;
            } else if (futureCandle.high >= currentSl) {
              if (trade.isBreakevenTriggered) {
                trade.status = 'BREAKEVEN';
                trade.exitPrice = currentSl;
                trade.exitTime = futureCandle.time;
                trade.exitReason = 'BREAKEVEN';
                const pnl = parseFloat(((entryPrice - currentSl) * 100 * sizing.lotSize).toFixed(2));
                trade.pnlUSD = pnl >= 0 ? pnl : 0;
                trade.pnlPips = parseFloat(((entryPrice - currentSl) * 10).toFixed(1));
              } else {
                trade.status = 'HIT_SL';
                trade.exitPrice = currentSl;
                trade.exitTime = futureCandle.time;
                trade.exitReason = 'STOP_LOSS';
                trade.pnlUSD = -sizing.riskAmountUSD;
                trade.pnlPips = -parseFloat(((currentSl - entryPrice) * 10).toFixed(1));
              }
              break;
            }
          }
        }

        break; // Only 1 trade per day
      }
    }
  }

  return { asianRange, trade };
}
