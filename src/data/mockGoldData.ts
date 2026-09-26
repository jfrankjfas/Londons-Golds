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
        // Asian Range: [baseOpen - 3.5, baseOpen + 5.8] (~9.3 pts)
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
          // GATILLO: Ruptura alcista institucional a las 08:15 UTC (cierra por encima de baseOpen + 5.8)
          open = baseOpen + 5.5;
          close = baseOpen + 8.8; // Cierra con CUERPO sólido por encima del rango asiático
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
          // Consolidación de tarde
          close = open + (Math.random() - 0.4) * 1.2;
          high = Math.max(open, close) + 1.0;
          low = Math.min(open, close) - 1.0;
        }
      } else if (profile === 'BEARISH_BREAKOUT_WIN') {
        // Asian Range: [baseOpen - 5.8, baseOpen + 4.5] (~10.3 pts)
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
      } else if (profile === 'BREAKEVEN') {
        // Trade avanza a 1:1, activa Breakeven (SL a Entrada), y luego retrocede al punto de entrada
        if (isAsia) {
          const oscillation = Math.sin((h * 4 + m / 15) * 0.5) * 3.5;
          close = baseOpen + oscillation;
          high = Math.min(baseOpen + 5.0, Math.max(open, close) + 0.8);
          low = Math.max(baseOpen - 4.0, Math.min(open, close) - 0.8);
        } else if (isPreLondon) {
          close = baseOpen + 4.4 + (m / 60) * 1.0;
          high = close + 0.5;
          low = open - 0.4;
        } else if (h === 8 && m === 15) {
          // Ruptura alcista a 08:15 UTC (Entry: baseOpen + 8.0, SL ~ baseOpen + 0.5, Risk = 7.5 pts)
          open = baseOpen + 4.9;
          close = baseOpen + 8.0;
          high = baseOpen + 8.5;
          low = baseOpen + 4.8;
          volume = 3100;
        } else if (h === 9 && m === 15) {
          // Impulso alcanza +16.0 (supera 1:1 Risk Reward -> SL protegido a Entry +0.00)
          open = baseOpen + 12.0;
          close = baseOpen + 16.2;
          high = baseOpen + 16.8;
          low = baseOpen + 11.5;
          volume = 2800;
        } else if (h >= 11 && h <= 12) {
          // Fuerte rechazo devuelve el precio al punto de entrada (baseOpen + 8.0), saliendo en Breakeven ($0)
          close = baseOpen + 7.8;
          high = Math.max(open, close) + 0.8;
          low = baseOpen + 7.5;
          volume = 2100;
        } else {
          close = baseOpen + 6.5 + (Math.random() - 0.5) * 1.5;
          high = Math.max(open, close) + 0.8;
          low = Math.min(open, close) - 0.8;
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
        // TODAY_ACTIVE: Sesión en vivo de hoy (2026-09-26)
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

/**
 * Full Multi-Month Institutional Gold (XAU/USD) Backtesting Calendar
 * Spanning July 2026, August 2026, and September 2026 up to today (2026-09-26).
 * 64 total sessions calibrated to the institutional gold macro wave ($3,925 -> $4,385 -> $4,286.20).
 */
export const HISTORICAL_DAYS: DayData[] = [
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
    date: '2026-09-26', // HOY (Sesión activa en vivo)
    prevDayOpen: 4312.0,
    prevDayClose: 4286.2,
    prevDayTrend: 'BEARISH',
    candles: generateDayM15Candles('2026-09-26', 26, 4284.0, 'TODAY_ACTIVE'),
  },
];
