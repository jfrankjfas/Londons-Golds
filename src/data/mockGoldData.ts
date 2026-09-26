import { Candle, DayData } from '../types/trading.ts';

// Helper to generate 15m intervals for a day (from 00:00 to 18:00 UTC)
function generateDayM15Candles(
  dateStr: string,
  dayOfMonth: number,
  baseOpen: number,
  profile: 'BULLISH_BREAKOUT_WIN' | 'BEARISH_BREAKOUT_WIN' | 'NO_BREAKOUT' | 'SL_HIT' | 'TODAY_ACTIVE'
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
        // Asian Range: [baseOpen - 3.5, baseOpen + 6.0] (~9.5 pts)
        if (isAsia) {
          const oscillation = Math.sin((h * 4 + m / 15) * 0.5) * 3.8;
          close = baseOpen + oscillation + (Math.random() - 0.5) * 1.2;
          high = Math.min(baseOpen + 5.8, Math.max(open, close) + Math.random() * 1.0);
          low = Math.max(baseOpen - 3.4, Math.min(open, close) - Math.random() * 1.0);
          volume = Math.floor(400 + Math.random() * 350);
        } else if (isPreLondon) {
          close = baseOpen + 4.5 + (m / 60) * 1.2;
          high = close + 0.6;
          low = open - 0.5;
          volume = Math.floor(850 + Math.random() * 400);
        } else if (h === 8 && m === 15) {
          // GATILLO: Ruptura alcista institucional a las 08:15 UTC (cierra por encima del rango asiático)
          open = baseOpen + 5.5;
          close = baseOpen + 8.8; // Cierra con CUERPO sólido por encima de baseOpen + 5.8
          high = baseOpen + 9.4;
          low = baseOpen + 5.2;
          volume = 3600; // Alto volumen institucional
        } else if (isLondonOpen) {
          const step = (h - 8) * 4 + m / 15;
          close = baseOpen + 8.5 + step * 1.4 + (Math.random() - 0.3) * 1.2;
          high = Math.max(open, close) + Math.random() * 1.4;
          low = Math.min(open, close) - Math.random() * 0.6;
          volume = Math.floor(1800 + Math.random() * 1100);
        } else {
          // Tarde sesión consolidación
          close = open + (Math.random() - 0.4) * 1.2;
          high = Math.max(open, close) + 1.0;
          low = Math.min(open, close) - 1.0;
        }
      } else if (profile === 'BEARISH_BREAKOUT_WIN') {
        // Asian Range: [baseOpen - 6.0, baseOpen + 4.5] (~10.5 pts)
        if (isAsia) {
          const oscillation = Math.cos((h * 4 + m / 15) * 0.4) * 4.0;
          close = baseOpen + oscillation + (Math.random() - 0.5) * 1.1;
          high = Math.min(baseOpen + 4.5, Math.max(open, close) + Math.random() * 0.9);
          low = Math.max(baseOpen - 5.8, Math.min(open, close) - Math.random() * 0.9);
          volume = Math.floor(420 + Math.random() * 320);
        } else if (isPreLondon) {
          close = baseOpen - 4.2 - (m / 60) * 1.4;
          high = open + 0.5;
          low = close - 0.6;
          volume = 920;
        } else if (h === 8 && m === 30) {
          // GATILLO: Ruptura bajista a las 08:30 UTC
          open = baseOpen - 5.2;
          close = baseOpen - 8.6; // Cierra con CUERPO por debajo de baseOpen - 5.8
          high = baseOpen - 4.8;
          low = baseOpen - 9.1;
          volume = 3850;
        } else if (isLondonOpen) {
          const step = (h - 8) * 4 + m / 15;
          close = baseOpen - 8.5 - step * 1.3 + (Math.random() - 0.5) * 1.1;
          high = Math.max(open, close) + 0.8;
          low = Math.min(open, close) - 1.4;
          volume = Math.floor(1900 + Math.random() * 1000);
        } else {
          close = open + (Math.random() - 0.5) * 1.1;
          high = Math.max(open, close) + 0.9;
          low = Math.min(open, close) - 0.9;
        }
      } else if (profile === 'NO_BREAKOUT') {
        // Rango asiático nunca rompe con cuerpo en Londres
        if (isAsia) {
          close = baseOpen + Math.sin((h * 4 + m / 15) * 0.6) * 3.0;
          high = Math.min(baseOpen + 4.2, Math.max(open, close) + 0.7);
          low = Math.max(baseOpen - 4.2, Math.min(open, close) - 0.7);
        } else {
          if (h === 8 && m === 15) {
            high = baseOpen + 4.8;
            close = baseOpen + 3.2; // Mechazo pero cuerpo cierra dentro
            low = baseOpen + 1.5;
          } else {
            close = baseOpen + (Math.random() - 0.5) * 2.8;
            high = Math.max(open, close) + 0.8;
            low = Math.min(open, close) - 0.8;
          }
        }
      } else if (profile === 'SL_HIT') {
        if (isAsia) {
          close = baseOpen + Math.sin((h * 4 + m / 15) * 0.5) * 3.2;
          high = Math.min(baseOpen + 4.5, Math.max(open, close) + 0.7);
          low = Math.max(baseOpen - 4.5, Math.min(open, close) - 0.7);
        } else if (h === 8 && m === 15) {
          open = baseOpen - 4.2;
          close = baseOpen - 6.2; // Ruptura aparente
          high = baseOpen - 4.0;
          low = baseOpen - 6.8;
          volume = 2600;
        } else if (h >= 9 && h <= 10) {
          // Giro violento en contra que toca Stop Loss
          close = baseOpen - 2.0 + (h - 9) * 3.5;
          high = close + 1.2;
          low = open - 0.4;
        } else {
          close = open + (Math.random() - 0.5) * 1.3;
          high = Math.max(open, close) + 1.0;
          low = Math.min(open, close) - 1.0;
        }
      } else {
        // TODAY_ACTIVE: Live simulation setup (2026-09-26)
        if (isAsia) {
          const oscillation = Math.sin((h * 4 + m / 15) * 0.5) * 3.5;
          close = baseOpen + oscillation;
          high = Math.min(baseOpen + 4.8, Math.max(open, close) + Math.random() * 0.8);
          low = Math.max(baseOpen - 4.2, Math.min(open, close) - Math.random() * 0.8);
        } else if (h === 7) {
          close = baseOpen + 1.8 + (m / 60) * 1.2;
          high = close + 0.7;
          low = open - 0.4;
        } else if (h === 8 && m === 0) {
          open = baseOpen + 2.8;
          close = baseOpen + 3.4;
          high = baseOpen + 3.8;
          low = baseOpen + 2.4;
        } else if (h === 8 && m === 15) {
          open = baseOpen + 3.5;
          close = baseOpen + 5.8;
          high = baseOpen + 6.4;
          low = baseOpen + 3.2;
          volume = 3800;
        } else if (h === 8 && m === 30) {
          open = baseOpen + 5.8;
          close = baseOpen + 7.6;
          high = baseOpen + 8.1;
          low = baseOpen + 5.4;
          volume = 3200;
        } else {
          close = baseOpen + 7.0 + (h - 8) * 0.9 + (Math.random() - 0.5) * 1.2;
          high = Math.max(open, close) + 1.0;
          low = Math.min(open, close) - 1.0;
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

export const HISTORICAL_DAYS: DayData[] = [
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
    date: '2026-09-26', // Today (Hoy)
    prevDayOpen: 4312.0,
    prevDayClose: 4286.2,
    prevDayTrend: 'BEARISH',
    candles: generateDayM15Candles('2026-09-26', 26, 4284.0, 'TODAY_ACTIVE'),
  },
];
