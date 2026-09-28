import { Candle, DayData } from '../types/trading.ts';

export type SessionProfile =
  | 'BULLISH_BREAKOUT_WIN'
  | 'BEARISH_BREAKOUT_WIN'
  | 'NO_BREAKOUT'
  | 'SL_HIT'
  | 'BREAKEVEN'
  | 'TODAY_ACTIVE';

/**
 * Generates realistic 15m intervals for a trading day (from 00:00 to 18:00 UTC)
 * Accurately models Asian Range (00:00-07:00 UTC), Pre-London (07:00-08:00 UTC),
 * and London Breakout Window (08:00-11:00 UTC).
 */
export function generateDayM15Candles(
  dateStr: string,
  dayOfMonth: number,
  baseOpen: number,
  profile: SessionProfile
): Candle[] {
  const candles: Candle[] = [];
  let currentPrice = baseOpen;

  // 00:00 to 18:00 is 18 hours * 4 = 72 candles (00:00 to 17:45 UTC)
  for (let h = 0; h <= 17; h++) {
    for (let m = 0; m < 60; m += 15) {
      const timeStr = `${dateStr} ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      const timestamp = new Date(`${dateStr}T${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00Z`).getTime();

      let open = currentPrice;
      let high = open;
      let low = open;
      let close = open;
      let volume = Math.floor(800 + Math.random() * 600);

      const isAsia = h >= 0 && h < 7;
      const isPreLondon = h === 7;
      const isLondonOpen = h >= 8 && h <= 11;

      if (profile === 'BULLISH_BREAKOUT_WIN') {
        if (isAsia) {
          const osc = Math.sin((h * 4 + m / 15) * 0.5) * 2.8;
          close = baseOpen + osc;
          high = Math.min(baseOpen + 3.8, Math.max(open, close) + 0.5);
          low = Math.max(baseOpen - 3.5, Math.min(open, close) - 0.5);
          volume = 450;
        } else if (isPreLondon) {
          close = baseOpen + 1.2 + (m / 60) * 1.0;
          high = Math.min(baseOpen + 3.2, close + 0.4);
          low = close - 0.4;
          volume = 850;
        } else if (h === 8 && m === 0) {
          open = baseOpen + 2.2;
          close = baseOpen + 3.2;
          high = baseOpen + 3.5;
          low = baseOpen + 1.8;
          volume = 1600;
        } else if (h === 8 && m === 15) {
          open = baseOpen + 3.2;
          close = baseOpen + 7.8;
          high = baseOpen + 8.2;
          low = baseOpen + 3.0;
          volume = 3800;
        } else if (h === 8 && m === 30) {
          open = baseOpen + 7.8;
          close = baseOpen + 13.0;
          high = baseOpen + 13.5;
          low = baseOpen + 7.5;
          volume = 2800;
        } else if (h === 8 && m === 45) {
          open = baseOpen + 13.0;
          close = baseOpen + 18.5;
          high = baseOpen + 19.0;
          low = baseOpen + 12.8;
          volume = 2400;
        } else if (h === 9 && m === 0) {
          open = baseOpen + 18.5;
          close = baseOpen + 24.0;
          high = baseOpen + 24.5;
          low = baseOpen + 18.0;
          volume = 2200;
        } else if (h >= 9 && h <= 12) {
          const step = (h - 9) * 4 + m / 15;
          close = baseOpen + 24.0 + Math.sin(step * 0.4) * 1.5;
          high = close + 0.8;
          low = close - 0.8;
          volume = 1400;
        } else if (h === 13 && m < 30) {
          close = baseOpen + 24.0;
          high = close + 0.8;
          low = close - 0.8;
        } else if (h === 13 && m === 30) {
          // NY Opening Bell M15 Candle (ORB Range: 6.5 USD)
          open = baseOpen + 24.0;
          close = baseOpen + 25.5;
          high = baseOpen + 27.5;
          low = baseOpen + 21.0;
          volume = 4800;
        } else if (h === 13 && m === 45) {
          // NY Breakout: Closes ABOVE 27.5 with strong body!
          open = baseOpen + 25.5;
          close = baseOpen + 29.5;
          high = baseOpen + 30.0;
          low = baseOpen + 25.0;
          volume = 4500;
        } else if (h === 14 && m === 0) {
          open = baseOpen + 29.5;
          close = baseOpen + 33.0;
          high = baseOpen + 33.5;
          low = baseOpen + 29.0;
          volume = 3200;
        } else if (h === 14 && m === 15) {
          // Breakeven 1:1 reached!
          open = baseOpen + 33.0;
          close = baseOpen + 36.5;
          high = baseOpen + 37.0;
          low = baseOpen + 32.5;
          volume = 3000;
        } else if (h === 14 && m === 30) {
          // Take Profit 1:2 reached!
          open = baseOpen + 36.5;
          close = baseOpen + 40.5;
          high = baseOpen + 41.0;
          low = baseOpen + 36.0;
          volume = 3500;
        } else {
          close = baseOpen + 40.0 + Math.sin((h * 4 + m / 15)) * 1.2;
          high = close + 0.8;
          low = close - 0.8;
        }
      } else if (profile === 'BEARISH_BREAKOUT_WIN') {
        if (isAsia) {
          const osc = Math.cos((h * 4 + m / 15) * 0.5) * 2.8;
          close = baseOpen + osc;
          high = Math.min(baseOpen + 3.5, Math.max(open, close) + 0.5);
          low = Math.max(baseOpen - 3.8, Math.min(open, close) - 0.5);
          volume = 450;
        } else if (isPreLondon) {
          close = baseOpen - 1.2 - (m / 60) * 1.0;
          high = close + 0.4;
          low = Math.max(baseOpen - 3.2, close - 0.4);
          volume = 850;
        } else if (h === 8 && m === 0) {
          open = baseOpen - 2.2;
          close = baseOpen - 3.2;
          high = baseOpen - 1.8;
          low = baseOpen - 3.5;
          volume = 1600;
        } else if (h === 8 && m === 15) {
          open = baseOpen - 3.2;
          close = baseOpen - 7.8;
          high = baseOpen - 3.0;
          low = baseOpen - 8.2;
          volume = 3800;
        } else if (h === 8 && m === 30) {
          open = baseOpen - 7.8;
          close = baseOpen - 13.0;
          high = baseOpen - 7.5;
          low = baseOpen - 13.5;
          volume = 2800;
        } else if (h === 8 && m === 45) {
          open = baseOpen - 13.0;
          close = baseOpen - 18.5;
          high = baseOpen - 12.8;
          low = baseOpen - 19.0;
          volume = 2400;
        } else if (h === 9 && m === 0) {
          open = baseOpen - 18.5;
          close = baseOpen - 24.0;
          high = baseOpen - 18.0;
          low = baseOpen - 24.5;
          volume = 2200;
        } else if (h >= 9 && h <= 12) {
          const step = (h - 9) * 4 + m / 15;
          close = baseOpen - 24.0 - Math.sin(step * 0.4) * 1.5;
          high = close + 0.8;
          low = close - 0.8;
          volume = 1400;
        } else if (h === 13 && m < 30) {
          close = baseOpen - 24.0;
          high = close + 0.8;
          low = close - 0.8;
        } else if (h === 13 && m === 30) {
          // NY Opening Bell M15 Candle (ORB Range: 6.5 USD)
          open = baseOpen - 24.0;
          close = baseOpen - 25.5;
          high = baseOpen - 21.0;
          low = baseOpen - 27.5;
          volume = 4800;
        } else if (h === 13 && m === 45) {
          // NY Breakout: Closes BELOW -27.5 with strong body!
          open = baseOpen - 25.5;
          close = baseOpen - 29.5;
          high = baseOpen - 25.0;
          low = baseOpen - 30.0;
          volume = 4500;
        } else if (h === 14 && m === 0) {
          open = baseOpen - 29.5;
          close = baseOpen - 33.0;
          high = baseOpen - 29.0;
          low = baseOpen - 33.5;
          volume = 3200;
        } else if (h === 14 && m === 15) {
          // Breakeven 1:1 reached!
          open = baseOpen - 33.0;
          close = baseOpen - 36.5;
          high = baseOpen - 32.5;
          low = baseOpen - 37.0;
          volume = 3000;
        } else if (h === 14 && m === 30) {
          // Take Profit 1:2 reached!
          open = baseOpen - 36.5;
          close = baseOpen - 40.5;
          high = baseOpen - 36.0;
          low = baseOpen - 41.0;
          volume = 3500;
        } else {
          close = baseOpen - 40.0 - Math.sin((h * 4 + m / 15)) * 1.2;
          high = close + 0.8;
          low = close - 0.8;
        }
      } else if (profile === 'BREAKEVEN') {
        if (isAsia) {
          close = baseOpen + Math.sin((h * 4 + m / 15) * 0.5) * 2.8;
          high = Math.min(baseOpen + 3.8, Math.max(open, close) + 0.5);
          low = Math.max(baseOpen - 3.8, Math.min(open, close) - 0.5);
        } else if (isPreLondon) {
          close = baseOpen + 1.5;
          high = baseOpen + 2.5;
          low = baseOpen + 0.8;
        } else if (h === 8 && m === 0) {
          open = baseOpen + 1.5;
          close = baseOpen + 2.8;
          high = baseOpen + 3.2;
          low = baseOpen + 1.2;
        } else if (h === 8 && m === 15) {
          open = baseOpen + 2.8;
          close = baseOpen + 7.5;
          high = baseOpen + 8.0;
          low = baseOpen + 2.5;
          volume = 3200;
        } else if (h === 8 && m === 45) {
          open = baseOpen + 7.5;
          close = baseOpen + 16.0;
          high = baseOpen + 16.5;
          low = baseOpen + 7.6;
        } else if (h >= 10 && h <= 11) {
          open = baseOpen + 12.0;
          close = baseOpen + 7.2;
          high = close + 0.8;
          low = baseOpen + 6.8;
        } else if (h === 13 && m === 30) {
          // NY ORB Candle: range 6.2 USD
          open = baseOpen + 6.0;
          close = baseOpen + 7.5;
          high = baseOpen + 9.2;
          low = baseOpen + 3.0;
          volume = 4200;
        } else if (h === 13 && m === 45) {
          // NY Breakout above 9.2
          open = baseOpen + 7.5;
          close = baseOpen + 10.8;
          high = baseOpen + 11.2;
          low = baseOpen + 7.0;
          volume = 3800;
        } else if (h === 14 && m === 15) {
          // Reaches 1:1 BE
          open = baseOpen + 10.8;
          close = baseOpen + 15.5;
          high = baseOpen + 16.0;
          low = baseOpen + 10.5;
        } else if (h === 14 && m === 45) {
          // Retraces to entry 10.8
          open = baseOpen + 15.5;
          close = baseOpen + 10.6;
          high = baseOpen + 15.8;
          low = baseOpen + 10.5;
        } else {
          close = baseOpen + 8.0;
          high = close + 0.8;
          low = close - 0.8;
        }
      } else if (profile === 'SL_HIT') {
        if (isAsia) {
          close = baseOpen + Math.sin((h * 4 + m / 15) * 0.5) * 2.8;
          high = Math.min(baseOpen + 3.8, Math.max(open, close) + 0.5);
          low = Math.max(baseOpen - 3.8, Math.min(open, close) - 0.5);
        } else if (isPreLondon) {
          close = baseOpen + 1.5;
          high = baseOpen + 2.5;
          low = baseOpen + 0.8;
        } else if (h === 8 && m === 0) {
          open = baseOpen + 1.5;
          close = baseOpen + 2.8;
          high = baseOpen + 3.2;
          low = baseOpen + 1.2;
        } else if (h === 8 && m === 15) {
          open = baseOpen + 2.8;
          close = baseOpen + 7.2;
          high = baseOpen + 7.6;
          low = baseOpen + 2.5;
          volume = 3100;
        } else if (h === 8 && m === 30) {
          open = baseOpen + 7.2;
          close = baseOpen - 2.0;
          high = open + 0.5;
          low = baseOpen - 2.5;
        } else if (h === 13 && m === 30) {
          // NY ORB Candle: range 5.8 USD
          open = baseOpen - 1.0;
          close = baseOpen + 0.5;
          high = baseOpen + 2.8;
          low = baseOpen - 3.0;
          volume = 4100;
        } else if (h === 13 && m === 45) {
          // NY False Breakout above 2.8
          open = baseOpen + 0.5;
          close = baseOpen + 3.8;
          high = baseOpen + 4.2;
          low = baseOpen + 0.2;
          volume = 3200;
        } else if (h === 14 && m === 0) {
          // Violent turnaround hitting SL at 50% midpoint (-0.1)
          open = baseOpen + 3.8;
          close = baseOpen - 1.5;
          high = baseOpen + 4.0;
          low = baseOpen - 2.5;
          volume = 4600;
        } else {
          close = baseOpen - 2.0;
          high = close + 0.8;
          low = close - 0.8;
        }
      } else if (profile === 'NO_BREAKOUT') {
        if (h === 13 && m === 30) {
          // NY ORB Candle: range 4.8 USD
          open = baseOpen;
          close = baseOpen + 0.8;
          high = baseOpen + 2.4;
          low = baseOpen - 2.4;
          volume = 3500;
        } else {
          close = baseOpen + Math.sin((h * 4 + m / 15) * 0.4) * 1.8;
          high = Math.min(baseOpen + 2.2, close + 0.4);
          low = Math.max(baseOpen - 2.2, close - 0.4);
        }
      } else {
        // TODAY_ACTIVE: Sesión en vivo activa
        if (isAsia) {
          const osc = Math.sin((h * 4 + m / 15) * 0.5) * 2.8;
          close = baseOpen + osc;
          high = Math.min(baseOpen + 3.8, Math.max(open, close) + 0.5);
          low = Math.max(baseOpen - 3.5, Math.min(open, close) - 0.5);
        } else if (h === 7) {
          close = baseOpen + 1.2 + (m / 60) * 1.0;
          high = Math.min(baseOpen + 3.2, close + 0.4);
          low = close - 0.4;
        } else if (h === 8 && m === 0) {
          open = baseOpen + 2.2;
          close = baseOpen + 3.2;
          high = baseOpen + 3.5;
          low = baseOpen + 1.8;
        } else if (h === 8 && m === 15) {
          open = baseOpen + 3.2;
          close = baseOpen + 7.8;
          high = baseOpen + 8.2;
          low = baseOpen + 3.0;
          volume = 3800;
        } else if (h === 8 && m === 30) {
          open = baseOpen + 7.8;
          close = baseOpen + 13.0;
          high = baseOpen + 13.5;
          low = baseOpen + 7.5;
          volume = 2800;
        } else if (h === 13 && m === 30) {
          open = baseOpen + 16.0;
          close = baseOpen + 18.5;
          high = baseOpen + 21.0;
          low = baseOpen + 14.2;
          volume = 4600;
        } else if (h === 13 && m === 45) {
          open = baseOpen + 18.5;
          close = baseOpen + 22.8;
          high = baseOpen + 23.2;
          low = baseOpen + 18.0;
          volume = 4100;
        } else if (h >= 14 && h <= 15) {
          close = baseOpen + 28.0;
          high = close + 1.0;
          low = close - 0.8;
        } else {
          close = baseOpen + 26.0 + (h - 8) * 0.4;
          high = Math.max(open, close) + 0.8;
          low = Math.min(open, close) - 0.8;
        }
      }

      currentPrice = parseFloat(close.toFixed(2));
      open = parseFloat(open.toFixed(2));
      high = parseFloat(Math.max(open, close, high).toFixed(2));
      low = parseFloat(Math.min(open, close, low).toFixed(2));
      close = parseFloat(close.toFixed(2));

      candles.push({
        time: timeStr,
        timestamp,
        open,
        high,
        low,
        close,
        volume,
        hour: h,
        minute: m,
        dayOfMonth,
      });
    }
  }

  return candles;
}

/**
 * Full Multi-Month Institutional Gold (XAU/USD) Backtesting Calendar
 * Spanning July 2026, August 2026, and September 2026 up to today (2026-09-26).
 * 64 total sessions calibrated to the institutional gold macro wave ($3,925 -> $4,385 -> $4,286.20).
 */
export const RAW_HISTORICAL_DAYS: DayData[] = [
  // ===================== JULIO 2026 (23 Sesiones) =====================
  {
    date: '2026-07-01',
    prevDayOpen: 3918.0,
    prevDayClose: 3930.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-07-01', 1, 3925.0, 'BULLISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-07-02',
    prevDayOpen: 3925.0,
    prevDayClose: 3942.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-07-02', 2, 3938.0, 'BULLISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-07-03',
    prevDayOpen: 3942.0,
    prevDayClose: 3940.0,
    prevDayTrend: 'BEARISH',
    candles: generateDayM15Candles('2026-07-03', 3, 3945.0, 'NO_BREAKOUT'),
  },
  {
    date: '2026-07-06',
    prevDayOpen: 3940.0,
    prevDayClose: 3955.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-07-06', 6, 3950.0, 'BULLISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-07-07',
    prevDayOpen: 3950.0,
    prevDayClose: 3958.0,
    prevDayTrend: 'BEARISH',
    candles: generateDayM15Candles('2026-07-07', 7, 3962.0, 'BEARISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-07-08',
    prevDayOpen: 3958.0,
    prevDayClose: 3948.0,
    prevDayTrend: 'BEARISH',
    candles: generateDayM15Candles('2026-07-08', 8, 3952.0, 'BREAKEVEN'),
  },
  {
    date: '2026-07-09',
    prevDayOpen: 3948.0,
    prevDayClose: 3962.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-07-09', 9, 3958.0, 'BULLISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-07-10',
    prevDayOpen: 3962.0,
    prevDayClose: 3975.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-07-10', 10, 3970.0, 'SL_HIT'),
  },
  {
    date: '2026-07-13',
    prevDayOpen: 3975.0,
    prevDayClose: 3965.0,
    prevDayTrend: 'BEARISH',
    candles: generateDayM15Candles('2026-07-13', 13, 3968.0, 'BEARISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-07-14',
    prevDayOpen: 3965.0,
    prevDayClose: 3972.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-07-14', 14, 3960.0, 'BULLISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-07-15',
    prevDayOpen: 3972.0,
    prevDayClose: 3985.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-07-15', 15, 3980.0, 'NO_BREAKOUT'),
  },
  {
    date: '2026-07-16',
    prevDayOpen: 3985.0,
    prevDayClose: 3995.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-07-16', 16, 3986.0, 'BULLISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-07-17',
    prevDayOpen: 3995.0,
    prevDayClose: 4010.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-07-17', 17, 4005.0, 'BREAKEVEN'),
  },
  {
    date: '2026-07-20',
    prevDayOpen: 4010.0,
    prevDayClose: 4025.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-07-20', 20, 4015.0, 'BULLISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-07-21',
    prevDayOpen: 4025.0,
    prevDayClose: 4020.0,
    prevDayTrend: 'BEARISH',
    candles: generateDayM15Candles('2026-07-21', 21, 4030.0, 'BEARISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-07-22',
    prevDayOpen: 4020.0,
    prevDayClose: 4032.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-07-22', 22, 4018.0, 'BULLISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-07-23',
    prevDayOpen: 4032.0,
    prevDayClose: 4035.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-07-23', 23, 4040.0, 'SL_HIT'),
  },
  {
    date: '2026-07-24',
    prevDayOpen: 4035.0,
    prevDayClose: 4048.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-07-24', 24, 4035.0, 'BULLISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-07-27',
    prevDayOpen: 4048.0,
    prevDayClose: 4060.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-07-27', 27, 4055.0, 'BULLISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-07-28',
    prevDayOpen: 4060.0,
    prevDayClose: 4062.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-07-28', 28, 4068.0, 'BREAKEVEN'),
  },
  {
    date: '2026-07-29',
    prevDayOpen: 4062.0,
    prevDayClose: 4078.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-07-29', 29, 4065.0, 'BULLISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-07-30',
    prevDayOpen: 4078.0,
    prevDayClose: 4072.0,
    prevDayTrend: 'BEARISH',
    candles: generateDayM15Candles('2026-07-30', 30, 4085.0, 'BEARISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-07-31',
    prevDayOpen: 4072.0,
    prevDayClose: 4082.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-07-31', 31, 4070.0, 'NO_BREAKOUT'),
  },

  // ===================== AGOSTO 2026 (21 Sesiones) =====================
  {
    date: '2026-08-03',
    prevDayOpen: 4082.0,
    prevDayClose: 4095.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-08-03', 3, 4088.0, 'BULLISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-08-04',
    prevDayOpen: 4095.0,
    prevDayClose: 4110.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-08-04', 4, 4102.0, 'BULLISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-08-05',
    prevDayOpen: 4110.0,
    prevDayClose: 4125.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-08-05', 5, 4118.0, 'BREAKEVEN'),
  },
  {
    date: '2026-08-06',
    prevDayOpen: 4125.0,
    prevDayClose: 4115.0,
    prevDayTrend: 'BEARISH',
    candles: generateDayM15Candles('2026-08-06', 6, 4125.0, 'BEARISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-08-07',
    prevDayOpen: 4115.0,
    prevDayClose: 4130.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-08-07', 7, 4110.0, 'BULLISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-08-10',
    prevDayOpen: 4130.0,
    prevDayClose: 4145.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-08-10', 10, 4138.0, 'BULLISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-08-11',
    prevDayOpen: 4145.0,
    prevDayClose: 4142.0,
    prevDayTrend: 'BEARISH',
    candles: generateDayM15Candles('2026-08-11', 11, 4150.0, 'SL_HIT'),
  },
  {
    date: '2026-08-12',
    prevDayOpen: 4142.0,
    prevDayClose: 4160.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-08-12', 12, 4145.0, 'BULLISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-08-13',
    prevDayOpen: 4160.0,
    prevDayClose: 4172.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-08-13', 13, 4168.0, 'NO_BREAKOUT'),
  },
  {
    date: '2026-08-14',
    prevDayOpen: 4172.0,
    prevDayClose: 4185.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-08-14', 14, 4175.0, 'BULLISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-08-17',
    prevDayOpen: 4185.0,
    prevDayClose: 4198.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-08-17', 17, 4190.0, 'BREAKEVEN'),
  },
  {
    date: '2026-08-18',
    prevDayOpen: 4198.0,
    prevDayClose: 4192.0,
    prevDayTrend: 'BEARISH',
    candles: generateDayM15Candles('2026-08-18', 18, 4200.0, 'BEARISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-08-19',
    prevDayOpen: 4192.0,
    prevDayClose: 4210.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-08-19', 19, 4190.0, 'BULLISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-08-20',
    prevDayOpen: 4210.0,
    prevDayClose: 4208.0,
    prevDayTrend: 'BEARISH',
    candles: generateDayM15Candles('2026-08-20', 20, 4215.0, 'SL_HIT'),
  },
  {
    date: '2026-08-21',
    prevDayOpen: 4208.0,
    prevDayClose: 4225.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-08-21', 21, 4205.0, 'BULLISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-08-24',
    prevDayOpen: 4225.0,
    prevDayClose: 4240.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-08-24', 24, 4230.0, 'BULLISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-08-25',
    prevDayOpen: 4240.0,
    prevDayClose: 4252.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-08-25', 25, 4245.0, 'NO_BREAKOUT'),
  },
  {
    date: '2026-08-26',
    prevDayOpen: 4252.0,
    prevDayClose: 4260.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-08-26', 26, 4255.0, 'BULLISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-08-27',
    prevDayOpen: 4260.0,
    prevDayClose: 4255.0,
    prevDayTrend: 'BEARISH',
    candles: generateDayM15Candles('2026-08-27', 27, 4265.0, 'BREAKEVEN'),
  },
  {
    date: '2026-08-28',
    prevDayOpen: 4255.0,
    prevDayClose: 4270.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-08-28', 28, 4252.0, 'BULLISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-08-31',
    prevDayOpen: 4270.0,
    prevDayClose: 4285.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-08-31', 31, 4275.0, 'BULLISH_BREAKOUT_WIN'),
  },

  // ===================== SEPTIEMBRE 2026 (20 Sesiones) =====================
  {
    date: '2026-09-01',
    prevDayOpen: 4285.0,
    prevDayClose: 4305.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-09-01', 1, 4290.0, 'BULLISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-09-02',
    prevDayOpen: 4305.0,
    prevDayClose: 4322.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-09-02', 2, 4310.0, 'BULLISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-09-03',
    prevDayOpen: 4322.0,
    prevDayClose: 4315.0,
    prevDayTrend: 'BEARISH',
    candles: generateDayM15Candles('2026-09-03', 3, 4325.0, 'SL_HIT'),
  },
  {
    date: '2026-09-04',
    prevDayOpen: 4315.0,
    prevDayClose: 4330.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-09-04', 4, 4312.0, 'BULLISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-09-07',
    prevDayOpen: 4330.0,
    prevDayClose: 4342.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-09-07', 7, 4335.0, 'BREAKEVEN'),
  },
  {
    date: '2026-09-08',
    prevDayOpen: 4342.0,
    prevDayClose: 4338.0,
    prevDayTrend: 'BEARISH',
    candles: generateDayM15Candles('2026-09-08', 8, 4345.0, 'BEARISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-09-09',
    prevDayOpen: 4338.0,
    prevDayClose: 4350.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-09-09', 9, 4335.0, 'BULLISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-09-10',
    prevDayOpen: 4350.0,
    prevDayClose: 4352.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-09-10', 10, 4355.0, 'NO_BREAKOUT'),
  },
  {
    date: '2026-09-11',
    prevDayOpen: 4352.0,
    prevDayClose: 4362.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-09-11', 11, 4350.0, 'BULLISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-09-14',
    prevDayOpen: 4338.5,
    prevDayClose: 4352.2,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-09-14', 14, 4346.0, 'BULLISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-09-15',
    prevDayOpen: 4385.0,
    prevDayClose: 4371.4,
    prevDayTrend: 'BEARISH',
    candles: generateDayM15Candles('2026-09-15', 15, 4376.0, 'BEARISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-09-16',
    prevDayOpen: 4342.0,
    prevDayClose: 4358.9,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-09-16', 16, 4350.0, 'NO_BREAKOUT'),
  },
  {
    date: '2026-09-17',
    prevDayOpen: 4372.0,
    prevDayClose: 4361.5,
    prevDayTrend: 'BEARISH',
    candles: generateDayM15Candles('2026-09-17', 17, 4362.0, 'SL_HIT'),
  },
  {
    date: '2026-09-18',
    prevDayOpen: 4341.0,
    prevDayClose: 4352.2,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-09-18', 18, 4348.0, 'BULLISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-09-21',
    prevDayOpen: 4352.2,
    prevDayClose: 4332.0,
    prevDayTrend: 'BEARISH',
    candles: generateDayM15Candles('2026-09-21', 21, 4336.0, 'BEARISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-09-22',
    prevDayOpen: 4320.0,
    prevDayClose: 4338.5,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-09-22', 22, 4330.0, 'BULLISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-09-23',
    prevDayOpen: 4338.5,
    prevDayClose: 4341.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-09-23', 23, 4340.0, 'NO_BREAKOUT'),
  },
  {
    date: '2026-09-24',
    prevDayOpen: 4330.0,
    prevDayClose: 4348.0,
    prevDayTrend: 'BULLISH',
    candles: generateDayM15Candles('2026-09-24', 24, 4342.0, 'BULLISH_BREAKOUT_WIN'),
  },
  {
    date: '2026-09-25',
    prevDayOpen: 4348.0,
    prevDayClose: 4312.0,
    prevDayTrend: 'BEARISH',
    candles: generateDayM15Candles('2026-09-25', 25, 4318.0, 'SL_HIT'),
  },
  {
    date: '2026-09-26',
    prevDayOpen: 4312.0,
    prevDayClose: 4286.2,
    prevDayTrend: 'BEARISH',
    candles: generateDayM15Candles('2026-09-26', 26, 4284.0, 'TODAY_ACTIVE'),
  },
];

/**
 * Returns historical days ensuring the current date is always dynamically present.
 */
export function getHistoricalDaysWithToday(): DayData[] {
  const todayStr = new Date().toISOString().split('T')[0];
  const list = [...RAW_HISTORICAL_DAYS];
  const lastKnown = list[list.length - 1];

  if (lastKnown.date === todayStr) {
    return list;
  }

  const lastDate = new Date(lastKnown.date + 'T12:00:00Z');
  const todayDate = new Date(todayStr + 'T12:00:00Z');

  let cursor = new Date(lastDate);
  cursor.setUTCDate(cursor.getUTCDate() + 1);

  let prevClose = lastKnown.prevDayClose || 4286.2;
  let prevOpen = lastKnown.prevDayOpen || 4312.0;

  while (cursor <= todayDate) {
    const curDateStr = cursor.toISOString().split('T')[0];
    const isToday = curDateStr === todayStr;
    const dayOfMonth = cursor.getUTCDate();
    const dayOfWeek = cursor.getUTCDay();

    const profile: SessionProfile = isToday
      ? 'TODAY_ACTIVE'
      : (dayOfWeek === 1 || dayOfWeek === 3 ? 'BULLISH_BREAKOUT_WIN' : 'BEARISH_BREAKOUT_WIN');
    const baseOpen = prevClose;
    const candles = generateDayM15Candles(curDateStr, dayOfMonth, baseOpen, profile);
    const dayClose = candles[candles.length - 1].close;

    list.push({
      date: curDateStr,
      prevDayOpen: parseFloat(prevOpen.toFixed(2)),
      prevDayClose: parseFloat(prevClose.toFixed(2)),
      prevDayTrend: prevClose >= prevOpen ? 'BULLISH' : 'BEARISH',
      candles,
    });

    prevOpen = baseOpen;
    prevClose = dayClose;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return list;
}

export const HISTORICAL_DAYS: DayData[] = getHistoricalDaysWithToday();
