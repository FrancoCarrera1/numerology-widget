/**
 * Numerology Widget Web Component
 * 
 * A standalone, framework-agnostic web component that displays daily numerology energies.
 * Works in any browser, on any device (Mac, Android, iOS, Windows, Linux).
 * No build step required - just include the script and use <numerology-widget></numerology-widget>
 */

import {
  calculateCycleEnergies,
  calculateLifePath,
  calculateNumerologyEnergies,
  generateMonthlyCalendar,
  generateWeeklySchedule,
  formatDateKey,
  parseBirthDateInput,
  parseBirthdayInput,
  parseDateInput,
  NumerologyEnergiesResult
} from './numerology-core';

// ============================================================================
// Styles (injected via Shadow DOM)
// ============================================================================

const STYLES = `
  :host {
    display: block;
    font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif;
    --bg-primary: #1a1a1a;
    --bg-secondary: #2a2a2a;
    --bg-card: #222;
    --gold: #D4AF37;
    --gold-light: #E8C56D;
    --gold-dark: #B8960F;
    --bronze: #CD7F32;
    --text-primary: #f5f5f5;
    --text-secondary: #b0b0b0;
    --text-muted: #777;
    --border-color: #333;
    --shadow: 0 4px 20px rgba(0,0,0,0.4);
    --glow: 0 0 20px rgba(212, 175, 55, 0.3);
    --radius: 12px;
    --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @media (prefers-color-scheme: light) {
    :host {
      --bg-primary: #fafafa;
      --bg-secondary: #f0f0f0;
      --bg-card: #fff;
      --gold: #B8960F;
      --gold-light: #D4AF37;
      --gold-dark: #997700;
      --bronze: #A65D2E;
      --text-primary: #1a1a1a;
      --text-secondary: #444;
      --text-muted: #888;
      --border-color: #e0e0e0;
      --shadow: 0 4px 20px rgba(0,0,0,0.1);
      --glow: 0 0 20px rgba(184, 150, 15, 0.2);
    }
  }

  * {
    box-sizing: border-box;
  }

  .widget {
    background:
      radial-gradient(120% 70% at 15% 0%, rgba(212, 175, 55, 0.09), transparent 55%),
      radial-gradient(90% 60% at 100% 100%, rgba(205, 127, 50, 0.07), transparent 60%),
      var(--bg-primary);
    border-radius: var(--radius);
    padding: 1.5rem;
    box-shadow: var(--shadow);
    border: 1px solid var(--border-color);
    max-width: 400px;
    width: 100%;
    margin: 0 auto;
  }

  .widget.compact {
    padding: 1rem;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-color);
  }

  .title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .title-icon {
    width: 24px;
    height: 24px;
    color: var(--gold);
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.05); }
  }

  .date-display {
    font-size: 0.85rem;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }

  .life-path {
    margin-bottom: 1.5rem;
    padding: 0.85rem 0.95rem;
    border: 1px solid rgba(212, 175, 55, 0.45);
    border-left: 3px solid var(--gold);
    border-radius: 10px;
    background:
      linear-gradient(135deg, rgba(212, 175, 55, 0.1), transparent 62%),
      var(--bg-card);
  }

  .life-path.missing {
    border-color: var(--border-color);
    border-left-color: var(--border-color);
    background: var(--bg-card);
  }

  .life-path-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.2rem;
  }

  .life-path-label {
    font-size: 0.62rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--gold-light);
  }

  .life-path.missing .life-path-label {
    color: var(--text-muted);
  }

  .life-path-tag {
    font-size: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted);
  }

  .life-path-main {
    display: flex;
    align-items: baseline;
    gap: 0.7rem;
    min-width: 0;
  }

  .life-path-value {
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', monospace;
    font-size: 2.15rem;
    font-weight: 700;
    line-height: 1;
    color: var(--gold);
    font-variant-numeric: tabular-nums;
    text-shadow: 0 0 18px rgba(212, 175, 55, 0.35);
  }

  .life-path.missing .life-path-value {
    color: var(--text-muted);
    text-shadow: none;
  }

  .life-path-summary {
    min-width: 0;
    font-size: 0.82rem;
    line-height: 1.3;
    color: var(--text-secondary);
  }

  .life-path-note {
    margin-top: 0.3rem;
    font-size: 0.58rem;
    line-height: 1.35;
    color: var(--text-muted);
  }

  .energy-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .energy-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 1.25rem;
    text-align: center;
    transition: var(--transition);
    position: relative;
    overflow: hidden;
  }

  .energy-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--gold), var(--bronze));
  }

  .energy-card.secondary::before {
    background: linear-gradient(90deg, var(--bronze), var(--gold));
  }

  .energy-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--glow);
    border-color: var(--gold);
  }

  .energy-label {
    font-size: 0.7rem;
    line-height: 1.3;
    min-height: 2.6em;
    display: flex;
    align-items: center;
    justify-content: center;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted);
    margin-bottom: 0.5rem;
    font-weight: 500;
  }

  .energy-value {
    font-size: 3rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', monospace;
    line-height: 1;
    margin-bottom: 0.25rem;
  }

  .energy-card.primary .energy-value {
    color: var(--gold);
    text-shadow: 0 0 20px rgba(212, 175, 55, 0.4);
  }

  .energy-card.secondary .energy-value {
    color: var(--bronze);
    text-shadow: 0 0 20px rgba(205, 127, 50, 0.4);
  }

  .energy-note {
    font-size: 0.68rem;
    line-height: 1.35;
    color: var(--text-muted);
    min-height: 1.2em;
    white-space: pre-line;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .combined-energy {
    background: linear-gradient(135deg, var(--bg-card), var(--bg-secondary));
    border: 1px solid var(--gold);
    border-radius: 10px;
    padding: 1rem;
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .combined-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted);
    margin-bottom: 0.25rem;
  }

  .combined-value {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--gold);
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', monospace;
  }

  .cycles-section {
    margin-bottom: 1.5rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--border-color);
  }

  .widget.hide-cycles .cycles-section {
    display: none;
  }

  .cycles-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.65rem;
  }

  .cycles-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .cycles-subtitle {
    font-size: 0.55rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--text-muted);
  }

  .cycles-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.55rem;
  }

  .cycle-card {
    min-width: 0;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 0.55rem 0.6rem;
    position: relative;
    overflow: hidden;
  }

  .cycle-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, var(--gold), transparent);
  }

  .cycle-card.personal::before {
    background: linear-gradient(90deg, var(--bronze), transparent);
  }

  .cycle-label {
    display: block;
    font-size: 0.55rem;
    line-height: 1.2;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted);
  }

  .cycle-value {
    display: block;
    margin-top: 0.15rem;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', monospace;
    font-size: 1.45rem;
    font-weight: 700;
    line-height: 1.1;
    color: var(--gold);
    font-variant-numeric: tabular-nums;
  }

  .cycle-card.personal .cycle-value {
    color: var(--bronze);
  }

  .cycle-card.missing .cycle-value {
    color: var(--text-muted);
  }

  .cycle-note {
    display: block;
    margin-top: 0.2rem;
    font-size: 0.55rem;
    line-height: 1.3;
    color: var(--text-muted);
  }

  .birthday-controls {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    flex-wrap: wrap;
    margin-top: 0.6rem;
  }

  .birthday-label {
    font-size: 0.55rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .birthday-input {
    flex: 1 1 140px;
    min-width: 0;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-primary);
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', monospace;
    font-size: 0.68rem;
    padding: 0.38rem 0.45rem;
    color-scheme: dark;
  }

  @media (prefers-color-scheme: light) {
    .birthday-input {
      color-scheme: light;
    }
  }

  .birthday-input:focus {
    outline: none;
    border-color: var(--gold);
    box-shadow: 0 0 0 1px rgba(212, 175, 55, 0.25);
  }

  .birthday-clear {
    appearance: none;
    -webkit-appearance: none;
    background: transparent;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-muted);
    font-family: inherit;
    font-size: 0.62rem;
    padding: 0.38rem 0.5rem;
    cursor: pointer;
    transition: var(--transition);
  }

  .birthday-clear:hover {
    border-color: var(--gold);
    color: var(--gold);
  }

  .calendar-section {
    margin-bottom: 1.5rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--border-color);
  }

  .widget.hide-calendar .calendar-section {
    display: none;
  }

  .calendar-header {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-bottom: 0.65rem;
  }

  .calendar-heading {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.1rem;
  }

  .calendar-eyebrow {
    font-size: 0.55rem;
    line-height: 1;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: var(--text-muted);
  }

  .calendar-month {
    font-size: 0.92rem;
    font-weight: 600;
    line-height: 1.2;
    color: var(--text-primary);
    white-space: nowrap;
  }

  .calendar-nav,
  .calendar-today {
    appearance: none;
    -webkit-appearance: none;
    background: transparent;
    border: 1px solid var(--border-color);
    color: var(--gold);
    font-family: inherit;
    cursor: pointer;
    transition: var(--transition);
  }

  .calendar-nav {
    width: 28px;
    height: 28px;
    flex: 0 0 28px;
    padding: 0;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 1.15rem;
    line-height: 1;
  }

  .calendar-today {
    flex: 0 0 auto;
    padding: 0.3rem 0.5rem;
    border-radius: 999px;
    font-size: 0.62rem;
    line-height: 1;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .calendar-nav:hover,
  .calendar-today:hover {
    border-color: var(--gold);
    background: rgba(212, 175, 55, 0.12);
  }

  .calendar-nav:focus-visible,
  .calendar-today:focus-visible,
  .calendar-day:focus-visible {
    outline: 2px solid var(--gold-light);
    outline-offset: 2px;
  }

  .calendar-weekdays {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 0.25rem;
    margin-bottom: 0.3rem;
  }

  .calendar-weekdays span {
    text-align: center;
    font-size: 0.55rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
  }

  .calendar-grid {
    display: flex;
    flex-direction: column;
    gap: 0.28rem;
  }

  .calendar-week {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 0.28rem;
  }

  .calendar-day {
    appearance: none;
    -webkit-appearance: none;
    min-width: 0;
    min-height: 50px;
    padding: 0.32rem 0.1rem 0.28rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.08rem;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: inherit;
    font-family: inherit;
    line-height: 1.1;
    cursor: pointer;
    transition: var(--transition);
    overflow: hidden;
  }

  .calendar-day:hover {
    border-color: var(--gold);
    background: rgba(212, 175, 55, 0.06);
  }

  .calendar-day.today {
    border-color: var(--gold);
    background: linear-gradient(180deg, rgba(212, 175, 55, 0.16), var(--bg-card));
    box-shadow: 0 0 12px rgba(212, 175, 55, 0.2);
  }

  .calendar-day.selected {
    border-color: var(--gold-light);
    box-shadow: inset 0 0 0 1px var(--gold-light), 0 0 12px rgba(212, 175, 55, 0.18);
  }

  .calendar-day.blank {
    background: transparent;
    border-color: transparent;
    box-shadow: none;
    cursor: default;
    pointer-events: none;
  }

  .calendar-day-number {
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', monospace;
    font-size: 0.6rem;
    line-height: 1;
    color: var(--text-muted);
  }

  .calendar-day.today .calendar-day-number {
    color: var(--gold-light);
  }

  .calendar-primary {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', monospace;
    font-size: 0.7rem;
    font-weight: 700;
    line-height: 1.1;
    color: var(--gold);
  }

  .calendar-secondary {
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', monospace;
    font-size: 0.58rem;
    line-height: 1.1;
    color: var(--bronze);
  }

  .weekly-schedule {
    display: none;
  }

  .widget.expanded .weekly-schedule {
    display: block;
  }

  .schedule-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-color);
  }

  .schedule-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .toggle-btn {
    background: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    padding: 0.4rem 0.8rem;
    border-radius: 6px;
    font-size: 0.75rem;
    cursor: pointer;
    transition: var(--transition);
    font-family: inherit;
  }

  .toggle-btn:hover {
    border-color: var(--gold);
    color: var(--gold);
    background: rgba(212, 175, 55, 0.1);
  }

  .days-grid {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 0.4rem;
  }

  .day-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 0.6rem 0.2rem;
    min-width: 0;
    text-align: center;
    transition: var(--transition);
    cursor: pointer;
  }

  .day-card:hover {
    border-color: var(--gold);
    transform: translateY(-2px);
  }

  .day-card.today {
    border-color: var(--gold);
    box-shadow: var(--glow);
  }

  .day-card.selected {
    border-color: var(--gold-light);
    box-shadow: inset 0 0 0 1px var(--gold-light), var(--glow);
  }

  .day-card.high-probability {
    border-color: var(--bronze);
    background: linear-gradient(180deg, rgba(205, 127, 50, 0.1), var(--bg-card));
  }

  .day-name {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    margin-bottom: 0.25rem;
  }

  .day-date {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.35rem;
  }

  .day-energies {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
    font-size: 0.65rem;
  }

  .day-energy {
    padding: 0.1rem 0.3rem;
    border-radius: 4px;
    font-weight: 600;
    white-space: nowrap;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', monospace;
  }

  .day-energy.primary {
    background: rgba(212, 175, 55, 0.15);
    color: var(--gold);
    border: 1px solid rgba(212, 175, 55, 0.3);
  }

  .day-energy.secondary {
    background: rgba(205, 127, 50, 0.15);
    color: var(--bronze);
    border: 1px solid rgba(205, 127, 50, 0.3);
  }

  .day-indicator {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    margin-top: 0.35rem;
  }

  .day-indicator.today {
    background: var(--gold);
    box-shadow: 0 0 8px var(--gold);
  }

  .day-indicator.high-prob {
    background: var(--bronze);
    box-shadow: 0 0 8px var(--bronze);
  }

  .footer {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color);
    text-align: center;
    font-size: 0.7rem;
    color: var(--text-muted);
  }

  .footer a {
    color: var(--gold);
    text-decoration: none;
  }

  .footer a:hover {
    text-decoration: underline;
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    gap: 1rem;
    color: var(--text-muted);
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border-color);
    border-top-color: var(--gold);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-banner {
    margin-top: 1rem;
    padding: 0.6rem 0.75rem;
    border: 1px solid rgba(255, 107, 107, 0.45);
    border-radius: 8px;
    background: rgba(255, 107, 107, 0.1);
    color: #ff9b9b;
    font-size: 0.75rem;
    text-align: center;
  }

  /* Mobile responsive */
  @media (max-width: 480px) {
    .widget {
      padding: 1rem;
      border-radius: var(--radius);
      max-width: 100%;
    }

    .energy-grid {
      gap: 0.75rem;
    }

    .energy-card {
      padding: 1rem;
    }

    .energy-value {
      font-size: 2.5rem;
    }

    .cycle-value {
      font-size: 1.25rem;
    }

    .cycle-note {
      font-size: 0.52rem;
    }

    .calendar-week,
    .calendar-weekdays {
      gap: 0.2rem;
    }

    .calendar-grid {
      gap: 0.2rem;
    }

    .calendar-day {
      min-height: 44px;
      padding: 0.25rem 0.05rem 0.22rem;
      border-radius: 7px;
    }

    .calendar-weekdays span {
      font-size: 0.5rem;
    }

    .calendar-day-number {
      font-size: 0.54rem;
    }

    .calendar-primary {
      font-size: 0.63rem;
    }

    .calendar-secondary {
      font-size: 0.53rem;
    }

    .calendar-nav {
      flex-basis: 26px;
      width: 26px;
      height: 26px;
    }

    .days-grid {
      gap: 0.35rem;
    }

    .day-card {
      padding: 0.5rem 0.35rem;
    }

    .day-energies {
      gap: 0.25rem;
    }

    .day-energy {
      padding: 0.1rem 0.3rem;
      font-size: 0.6rem;
    }
  }

  /* Touch-friendly */
  @media (pointer: coarse) {
    .day-card {
      min-height: 80px;
    }

    .calendar-day {
      min-height: 46px;
    }

    .calendar-nav {
      width: 34px;
      height: 34px;
      flex-basis: 34px;
    }

    .toggle-btn {
      min-height: 44px;
      padding: 0.6rem 1rem;
    }
  }
`;

// ============================================================================
// Template
// ============================================================================

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
  <style>${STYLES}</style>
  <div class="widget" part="widget">
    <div class="header">
      <div class="title">
        <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
        <span>Daily Energy</span>
      </div>
      <div class="date-display" part="date-display"></div>
    </div>

    <div class="life-path" part="life-path">
      <div class="life-path-head">
        <span class="life-path-label">Life Path</span>
        <span class="life-path-tag">Whole birth date</span>
      </div>
      <div class="life-path-main">
        <span class="life-path-value" part="life-path-value">--</span>
        <span class="life-path-summary" part="life-path-summary"></span>
      </div>
      <div class="life-path-note" part="life-path-note"></div>
    </div>

    <div class="energy-grid">
      <div class="energy-card primary" part="primary-energy">
        <div class="energy-label">Primary Energy</div>
        <div class="energy-value" part="primary-value">--</div>
        <div class="energy-note" part="primary-note"></div>
      </div>
      <div class="energy-card secondary" part="secondary-energy">
        <div class="energy-label">Secondary Energy</div>
        <div class="energy-value" part="secondary-value">--</div>
        <div class="energy-note" part="secondary-note"></div>
      </div>
    </div>

    <div class="combined-energy" part="combined">
      <div class="combined-label">Combined Energy</div>
      <div class="combined-value" part="combined-value">--</div>
    </div>

    <div class="cycles-section" part="cycles">
      <div class="cycles-header">
        <span class="cycles-title">Timing Cycles</span>
        <span class="cycles-subtitle">Universal &amp; personal</span>
      </div>
      <div class="cycles-grid">
        <div class="cycle-card universal" part="universal-year">
          <span class="cycle-label">Universal Year</span>
          <span class="cycle-value" part="uy-value">--</span>
          <span class="cycle-note" part="uy-note"></span>
        </div>
        <div class="cycle-card universal" part="universal-month">
          <span class="cycle-label">Universal Month</span>
          <span class="cycle-value" part="um-value">--</span>
          <span class="cycle-note" part="um-note"></span>
        </div>
        <div class="cycle-card personal" part="personal-year">
          <span class="cycle-label">Personal Year</span>
          <span class="cycle-value" part="py-value">--</span>
          <span class="cycle-note" part="py-note"></span>
        </div>
        <div class="cycle-card personal" part="personal-month">
          <span class="cycle-label">Personal Month</span>
          <span class="cycle-value" part="pm-value">--</span>
          <span class="cycle-note" part="pm-note"></span>
        </div>
      </div>
      <div class="birthday-controls">
        <label class="birthday-label" for="birthday-input">Birthday</label>
        <input class="birthday-input" id="birthday-input" type="date" aria-label="Birthday for personal cycles" />
        <button class="birthday-clear" type="button" part="birthday-clear">Clear</button>
      </div>
    </div>

    <div class="calendar-section" part="calendar">
      <div class="calendar-header">
        <button class="calendar-nav prev" type="button" aria-label="Previous month">‹</button>
        <div class="calendar-heading">
          <span class="calendar-eyebrow">Energy Calendar</span>
          <span class="calendar-month" part="calendar-month"></span>
        </div>
        <button class="calendar-nav next" type="button" aria-label="Next month">›</button>
        <button class="calendar-today" type="button" part="calendar-today">Today</button>
      </div>
      <div class="calendar-weekdays" aria-hidden="true">
        <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
      </div>
      <div class="calendar-grid" part="calendar-grid" role="grid" aria-label="Monthly energy calendar"></div>
    </div>

    <div class="weekly-schedule" part="weekly">
      <div class="schedule-header">
        <span class="schedule-title">Weekly Outlook</span>
        <button class="toggle-btn" part="toggle-btn">Expand</button>
      </div>
      <div class="days-grid" part="days-grid"></div>
    </div>

    <div class="footer" part="footer">
      GG33
    </div>
  </div>
`;

// ============================================================================
// Web Component Class
// ============================================================================

export class NumerologyWidget extends HTMLElement {
  #shadowRoot: ShadowRoot;
  #widgetEl: HTMLElement;
  #dateDisplay: HTMLElement;
  #primaryValue: HTMLElement;
  #primaryNote: HTMLElement;
  #secondaryValue: HTMLElement;
  #secondaryNote: HTMLElement;
  #combinedValue: HTMLElement;
  #lifePathCard: HTMLElement;
  #lifePathValue: HTMLElement;
  #lifePathSummary: HTMLElement;
  #lifePathNote: HTMLElement;
  #daysGrid: HTMLElement;
  #toggleBtn: HTMLButtonElement;
  #calendarGrid: HTMLElement;
  #calendarMonthLabel: HTMLElement;
  #calendarTodayBtn: HTMLButtonElement;
  #uyValue: HTMLElement;
  #uyNote: HTMLElement;
  #umValue: HTMLElement;
  #umNote: HTMLElement;
  #pyValue: HTMLElement;
  #pyNote: HTMLElement;
  #pmValue: HTMLElement;
  #pmNote: HTMLElement;
  #birthdayInput: HTMLInputElement;
  #birthday: string | null = null;
  #expanded = false;
  #selectedDate: Date = new Date();
  #visibleMonth: Date = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  #updateInterval: number | null = null;
  #refreshTimeout: number | null = null;
  #errorBanner: HTMLElement | null = null;

  // Observed attributes
  static get observedAttributes() {
    return ['date', 'compact', 'show-weekly', 'hide-calendar', 'hide-cycles', 'birthday', 'auto-refresh'];
  }

  constructor() {
    super();
    this.#shadowRoot = this.attachShadow({ mode: 'open' });
    this.#shadowRoot.appendChild(TEMPLATE.content.cloneNode(true));

    // Cache elements
    this.#widgetEl = this.#shadowRoot.querySelector('.widget')!;
    this.#dateDisplay = this.#shadowRoot.querySelector('.date-display')!;
    this.#primaryValue = this.#shadowRoot.querySelector('.energy-value')!;
    this.#primaryNote = this.#shadowRoot.querySelector('.energy-note')!;
    this.#secondaryValue = this.#shadowRoot.querySelectorAll('.energy-value')[1] as HTMLElement;
    this.#secondaryNote = this.#shadowRoot.querySelectorAll('.energy-note')[1] as HTMLElement;
    this.#combinedValue = this.#shadowRoot.querySelector('.combined-value')!;
    this.#lifePathCard = this.#shadowRoot.querySelector('.life-path')!;
    this.#lifePathValue = this.#shadowRoot.querySelector('[part="life-path-value"]')!;
    this.#lifePathSummary = this.#shadowRoot.querySelector('[part="life-path-summary"]')!;
    this.#lifePathNote = this.#shadowRoot.querySelector('[part="life-path-note"]')!;
    this.#daysGrid = this.#shadowRoot.querySelector('.days-grid')!;
    this.#toggleBtn = this.#shadowRoot.querySelector('.toggle-btn')!;
    this.#calendarGrid = this.#shadowRoot.querySelector('.calendar-grid')!;
    this.#calendarMonthLabel = this.#shadowRoot.querySelector('.calendar-month')!;
    this.#calendarTodayBtn = this.#shadowRoot.querySelector('.calendar-today')!;
    this.#uyValue = this.#shadowRoot.querySelector('[part="uy-value"]')!;
    this.#uyNote = this.#shadowRoot.querySelector('[part="uy-note"]')!;
    this.#umValue = this.#shadowRoot.querySelector('[part="um-value"]')!;
    this.#umNote = this.#shadowRoot.querySelector('[part="um-note"]')!;
    this.#pyValue = this.#shadowRoot.querySelector('[part="py-value"]')!;
    this.#pyNote = this.#shadowRoot.querySelector('[part="py-note"]')!;
    this.#pmValue = this.#shadowRoot.querySelector('[part="pm-value"]')!;
    this.#pmNote = this.#shadowRoot.querySelector('[part="pm-note"]')!;
    this.#birthdayInput = this.#shadowRoot.querySelector('.birthday-input')!;

    // Bind events
    this.#toggleBtn.addEventListener('click', () => this.#toggleExpanded());
    this.#birthdayInput.addEventListener('change', () => {
      this.setBirthday(this.#birthdayInput.value || null);
    });
    this.#shadowRoot.querySelector('.birthday-clear')!.addEventListener('click', () => {
      this.setBirthday(null);
    });
    this.#shadowRoot.querySelector('.calendar-nav.prev')!.addEventListener('click', () => this.#shiftMonth(-1));
    this.#shadowRoot.querySelector('.calendar-nav.next')!.addEventListener('click', () => this.#shiftMonth(1));
    this.#calendarTodayBtn.addEventListener('click', () => this.goToToday());
    this.#calendarGrid.addEventListener('click', (e) => {
      const dayButton = (e.target as HTMLElement).closest('.calendar-day[data-date]');
      const date = dayButton?.getAttribute('data-date');
      if (date) this.setDate(date);
    });
    this.#widgetEl.addEventListener('click', (e) => {
      const dayCard = (e.target as HTMLElement).closest('.day-card');
      if (dayCard) {
        const date = dayCard.getAttribute('data-date');
        if (date) this.setDate(date);
      }
    });
    this.#widgetEl.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const dayCard = (e.target as HTMLElement).closest('.day-card');
      if (dayCard) {
        e.preventDefault();
        const date = dayCard.getAttribute('data-date');
        if (date) this.setDate(date);
      }
    });
  }

  connectedCallback() {
    this.#applyAttributes();
    this.#render();

    // Auto-refresh at midnight
    if (this.hasAttribute('auto-refresh')) {
      this.#startAutoRefresh();
    }
  }

  disconnectedCallback() {
    if (this.#updateInterval !== null) {
      clearInterval(this.#updateInterval);
      this.#updateInterval = null;
    }
    if (this.#refreshTimeout !== null) {
      clearTimeout(this.#refreshTimeout);
      this.#refreshTimeout = null;
    }
  }

  attributeChangedCallback(name: string, _oldValue: string, newValue: string) {
    if (name === 'date' && newValue) {
      this.setDate(newValue);
    } else if (name === 'compact') {
      this.#widgetEl.classList.toggle('compact', this.hasAttribute('compact'));
    } else if (name === 'show-weekly') {
      this.#expanded = this.hasAttribute('show-weekly');
      this.#widgetEl.classList.toggle('expanded', this.#expanded);
      this.#toggleBtn.textContent = this.#expanded ? 'Collapse' : 'Expand';
      if (this.#expanded) {
        this.#renderWeeklySchedule();
      }
    } else if (name === 'hide-calendar') {
      this.#widgetEl.classList.toggle('hide-calendar', this.hasAttribute('hide-calendar'));
    } else if (name === 'hide-cycles') {
      this.#widgetEl.classList.toggle('hide-cycles', this.hasAttribute('hide-cycles'));
    } else if (name === 'birthday') {
      this.#applyBirthday(newValue || null);
    }
  }

  #applyAttributes() {
    if (this.hasAttribute('compact')) {
      this.#widgetEl.classList.add('compact');
    }
    if (this.hasAttribute('show-weekly')) {
      this.#widgetEl.classList.add('expanded');
      this.#expanded = true;
      this.#toggleBtn.textContent = 'Collapse';
    }
    if (this.hasAttribute('hide-calendar')) {
      this.#widgetEl.classList.add('hide-calendar');
    }
    if (this.hasAttribute('hide-cycles')) {
      this.#widgetEl.classList.add('hide-cycles');
    }
    if (this.hasAttribute('birthday')) {
      this.#applyBirthday(this.getAttribute('birthday'));
    }
    if (this.hasAttribute('date')) {
      try {
        this.#selectedDate = parseDateInput(this.getAttribute('date')!);
        this.#syncVisibleMonth();
      } catch {
        // Keep today's date if the attribute is invalid; #render reports the error.
      }
    }
  }

  #startAutoRefresh() {
    // Calculate milliseconds until next local midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    const tick = () => {
      this.#advanceToTodayIfNeeded();
      this.#render();
    };

    this.#refreshTimeout = window.setTimeout(() => {
      this.#refreshTimeout = null;
      tick();
      // Then refresh every 24 hours
      this.#updateInterval = window.setInterval(tick, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
  }

  /**
   * Roll a "today" view over at midnight. If the user is browsing another
   * date, leave their selection alone.
   */
  #advanceToTodayIfNeeded() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const selectedKey = formatDateKey(this.#selectedDate);

    if (selectedKey === formatDateKey(today) || selectedKey === formatDateKey(yesterday)) {
      this.#selectedDate = today;
      this.#syncVisibleMonth();
    }
  }

  #syncVisibleMonth() {
    this.#visibleMonth = new Date(
      this.#selectedDate.getFullYear(),
      this.#selectedDate.getMonth(),
      1
    );
  }

  #shiftMonth(delta: number) {
    this.#visibleMonth = new Date(
      this.#visibleMonth.getFullYear(),
      this.#visibleMonth.getMonth() + delta,
      1
    );
    this.#renderCalendar();
  }

  #toggleExpanded() {
    this.toggleAttribute('show-weekly', !this.#expanded);
  }

  /**
   * Show a specific date. Accepts YYYY-MM-DD or any Date-parsable string.
   * Pass no argument (or an empty string) to return to today.
   */
  setDate(dateString?: string) {
    try {
      this.#selectedDate = dateString ? parseDateInput(dateString) : new Date();
    } catch {
      this.#showError(`Invalid date: ${dateString}`);
      return;
    }

    this.#syncVisibleMonth();
    this.#clearError();
    this.#render();
    this.#emitDateChange();
  }

  getDate(): string {
    return formatDateKey(this.#selectedDate);
  }

  /**
   * Set the birthday used for Life Path and Personal Year/Month. Accepts
   * YYYY-MM-DD or legacy MM-DD (personal cycles only). Pass null to clear it.
   */
  setBirthday(birthday?: string | null) {
    if (!birthday) {
      if (this.hasAttribute('birthday')) {
        this.removeAttribute('birthday');
      } else {
        this.#applyBirthday(null);
      }
      this.#emitBirthdayChange();
      return;
    }

    try {
      parseBirthdayInput(birthday);
    } catch {
      this.#showError(`Invalid birthday: ${birthday}`);
      return;
    }

    if (this.getAttribute('birthday') === birthday) {
      this.#applyBirthday(birthday);
    } else {
      this.setAttribute('birthday', birthday);
    }
    this.#emitBirthdayChange();
  }

  getBirthday(): string | null {
    return this.#birthday;
  }

  /** Universal and personal timing cycles for the currently displayed date. */
  getCycles() {
    return calculateCycleEnergies(this.#selectedDate, this.#birthday);
  }

  /** Life Path from the full birth date, or null when only MM-DD is set. */
  getLifePath() {
    if (!this.#birthday) return null;
    try {
      return calculateLifePath(this.#birthday);
    } catch {
      return null;
    }
  }

  #render() {
    try {
      const energies = calculateNumerologyEnergies(this.#selectedDate);

      // Update date display
      this.#dateDisplay.textContent = energies.date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      // Update primary energy
      this.#primaryValue.textContent = energies.fullDateEnergy.displayValue;
      this.#primaryValue.title = energies.fullDateEnergy.calculationNote || '';
      this.#primaryNote.textContent = energies.fullDateEnergy.summary;
      this.#primaryNote.title = energies.fullDateEnergy.calculationNote || '';

      // Update secondary energy
      this.#secondaryValue.textContent = energies.secondaryEnergy.displayValue;
      this.#secondaryNote.textContent = energies.secondaryEnergy.note || '';
      this.#secondaryNote.title = energies.secondaryEnergy.note || '';

      // Update combined
      this.#combinedValue.textContent = energies.combinedKey;

      this.#clearError();

      this.#renderLifePath();
      this.#renderCycles();
      this.#renderCalendar();

      // Re-render weekly if expanded
      if (this.#expanded) {
        this.#renderWeeklySchedule();
      }
    } catch (error) {
      console.error('Numerology widget error:', error);
      this.#showError('Failed to calculate energies');
    }
  }

  #renderLifePath() {
    if (!this.#birthday) {
      this.#lifePathCard.classList.add('missing');
      this.#lifePathValue.textContent = '—';
      this.#lifePathSummary.textContent = 'Set birthday';
      this.#lifePathNote.textContent =
        'A full birth date unlocks Life Path and personal cycles.';
      this.#lifePathValue.title = '';
      this.#lifePathSummary.title = '';
      this.#lifePathNote.title = '';
      return;
    }

    try {
      const lifePath = calculateLifePath(this.#birthday);
      this.#lifePathCard.classList.remove('missing');
      this.#lifePathValue.textContent = lifePath.displayValue;
      this.#lifePathSummary.textContent = lifePath.summary;

      if (lifePath.isWealth) {
        this.#lifePathNote.textContent = 'Exact total 28 · 1 underneath';
      } else if (lifePath.reducedNumber === 33) {
        this.#lifePathNote.textContent = '33 · 6 underneath';
      } else if (lifePath.total === lifePath.reducedNumber) {
        this.#lifePathNote.textContent =
          `${lifePath.total} · master number stays whole`;
      } else {
        this.#lifePathNote.textContent =
          `${lifePath.monthValue} + ${lifePath.dayValue} + ${lifePath.yearValue} ` +
          `= ${lifePath.total} → ${lifePath.displayValue}`;
      }

      this.#lifePathValue.title = lifePath.calculationNote;
      this.#lifePathSummary.title = lifePath.calculationNote;
      this.#lifePathNote.title = lifePath.calculationNote;
    } catch {
      this.#lifePathCard.classList.add('missing');
      this.#lifePathValue.textContent = '—';
      this.#lifePathSummary.textContent = 'Add birth year';
      this.#lifePathNote.textContent =
        'Life Path needs the full birth date; personal cycles still use month and day.';
      this.#lifePathValue.title = '';
      this.#lifePathSummary.title = '';
      this.#lifePathNote.title = '';
    }
  }

  #renderCycles() {
    try {
      const cycles = calculateCycleEnergies(this.#selectedDate, this.#birthday);
      this.#setCycle(
        this.#uyValue,
        this.#uyNote,
        cycles.universalYear.displayValue,
        cycles.universalYear.dateLabel,
        cycles.universalYear.calculationNote
      );
      this.#setCycle(
        this.#umValue,
        this.#umNote,
        cycles.universalMonth.displayValue,
        cycles.universalMonth.dateLabel,
        cycles.universalMonth.calculationNote
      );

      const personalYearCard = this.#pyValue.closest('.cycle-card');
      const personalMonthCard = this.#pmValue.closest('.cycle-card');

      if (cycles.personalYear && cycles.personalMonth) {
        personalYearCard?.classList.remove('missing');
        personalMonthCard?.classList.remove('missing');
        this.#setCycle(
          this.#pyValue,
          this.#pyNote,
          cycles.personalYear.displayValue,
          cycles.personalYear.dateLabel,
          cycles.personalYear.calculationNote
        );
        this.#setCycle(
          this.#pmValue,
          this.#pmNote,
          cycles.personalMonth.displayValue,
          cycles.personalMonth.dateLabel,
          cycles.personalMonth.calculationNote
        );
      } else {
        personalYearCard?.classList.add('missing');
        personalMonthCard?.classList.add('missing');
        this.#setCycle(this.#pyValue, this.#pyNote, '—', 'Set birthday', '');
        this.#setCycle(this.#pmValue, this.#pmNote, '—', 'Set birthday', '');
      }
    } catch (error) {
      console.error('Cycles render error:', error);
    }
  }

  #setCycle(
    valueEl: HTMLElement,
    noteEl: HTMLElement,
    value: string,
    note: string,
    title: string
  ) {
    valueEl.textContent = value;
    noteEl.textContent = note;
    valueEl.title = title;
    noteEl.title = title;
  }

  #birthdayInputValue(): string {
    if (!this.#birthday) return '';
    try {
      const { year, month, day } = parseBirthDateInput(this.#birthday);
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    } catch {
      // A legacy MM-DD birthday still drives personal cycles, but a date
      // input cannot represent it. Leave it blank until the year is added.
      return '';
    }
  }

  #applyBirthday(value: string | null) {
    if (!value) {
      this.#birthday = null;
      this.#birthdayInput.value = '';
      this.#renderLifePath();
      this.#renderCycles();
      return;
    }

    try {
      const { month, day } = parseBirthdayInput(value);
      try {
        const { year } = parseBirthDateInput(value);
        this.#birthday =
          `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      } catch {
        // Keep legacy month-day birthdays working for personal cycles.
        this.#birthday =
          `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
      this.#birthdayInput.value = this.#birthdayInputValue();
      this.#renderLifePath();
      this.#renderCycles();
    } catch {
      this.#showError(`Invalid birthday: ${value}`);
    }
  }

  #emitBirthdayChange() {
    this.dispatchEvent(new CustomEvent('birthday-change', {
      detail: { birthday: this.#birthday },
      bubbles: true,
      composed: true
    }));
  }

  #renderCalendar() {
    try {
      const calendar = generateMonthlyCalendar(this.#visibleMonth);
      const todayString = formatDateKey(new Date());
      const selectedDate = this.getDate();

      this.#calendarMonthLabel.textContent = calendar.monthLabel;
      this.#calendarGrid.setAttribute('aria-label', `${calendar.monthLabel} energy calendar`);

      this.#calendarGrid.innerHTML = calendar.weeks.map(week => {
        const cells = week.map(cell => {
          if (!cell.schedule || !cell.date) {
            return '<span class="calendar-day blank" role="gridcell" aria-hidden="true"></span>';
          }

          const day = cell.schedule;
          const isToday = cell.date === todayString;
          const isSelected = cell.date === selectedDate;
          const classes = [
            'calendar-day',
            isToday ? 'today' : '',
            isSelected ? 'selected' : ''
          ].filter(Boolean).join(' ');

          return `
            <button type="button"
                    class="${classes}"
                    data-date="${cell.date}"
                    part="calendar-day"
                    role="gridcell"
                    aria-selected="${isSelected}"
                    ${isToday ? 'aria-current="date"' : ''}
                    aria-label="${day.dayName}, ${day.formattedDate}. Primary ${day.fullDateEnergy}, secondary ${day.secondaryEnergy}.">
              <span class="calendar-day-number">${cell.dayNumber}</span>
              <span class="calendar-primary">${day.fullDateEnergy}</span>
              <span class="calendar-secondary">${day.secondaryEnergy}</span>
            </button>
          `;
        }).join('');

        return `<div class="calendar-week" role="row">${cells}</div>`;
      }).join('');

      this.#calendarTodayBtn.setAttribute(
        'aria-label',
        `Go to today, ${new Date().toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })}`
      );
    } catch (error) {
      console.error('Calendar render error:', error);
    }
  }

  #renderWeeklySchedule() {
    try {
      const schedule = generateWeeklySchedule(this.getDate());
      const todayString = formatDateKey(new Date());
      const selectedDate = this.getDate();

      this.#daysGrid.innerHTML = schedule.map(day => {
        const isToday = day.date === todayString;
        const isSelected = day.date === selectedDate;

        return `
          <div class="day-card ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}"
               data-date="${day.date}"
               part="day-card"
               role="button"
               tabindex="0"
               aria-label="${day.dayName} ${day.formattedDate}, energy ${day.fullDateEnergy} plus ${day.secondaryEnergy}">
            <div class="day-name">${day.dayName.slice(0, 3)}</div>
            <div class="day-date">${day.dayNumber}</div>
            <div class="day-energies">
              <span class="day-energy primary">${day.fullDateEnergy}</span>
              <span class="day-energy secondary">${day.secondaryEnergy}</span>
            </div>
            <div class="day-indicator ${isToday ? 'today' : ''}"></div>
          </div>
        `;
      }).join('');
    } catch (error) {
      console.error('Weekly schedule error:', error);
    }
  }

  #showError(message: string) {
    if (!this.#errorBanner) {
      this.#errorBanner = document.createElement('div');
      this.#errorBanner.className = 'error-banner';
      this.#errorBanner.setAttribute('role', 'alert');
      this.#shadowRoot.appendChild(this.#errorBanner);
    }
    this.#errorBanner.textContent = message;
  }

  #clearError() {
    if (this.#errorBanner) {
      this.#errorBanner.remove();
      this.#errorBanner = null;
    }
  }

  // Public API
  refresh() {
    this.#render();
  }

  /** Energies for the currently displayed date. */
  getEnergies(): NumerologyEnergiesResult {
    return calculateNumerologyEnergies(this.#selectedDate);
  }

  nextDay() {
    this.#selectedDate.setDate(this.#selectedDate.getDate() + 1);
    this.#syncVisibleMonth();
    this.#render();
    this.#emitDateChange();
  }

  previousDay() {
    this.#selectedDate.setDate(this.#selectedDate.getDate() - 1);
    this.#syncVisibleMonth();
    this.#render();
    this.#emitDateChange();
  }

  goToToday() {
    this.#selectedDate = new Date();
    this.#syncVisibleMonth();
    this.#render();
    this.#emitDateChange();
  }

  /** Move the calendar one month forward without changing the selected date. */
  nextMonth() {
    this.#shiftMonth(1);
  }

  /** Move the calendar one month back without changing the selected date. */
  previousMonth() {
    this.#shiftMonth(-1);
  }

  /** First day of the month currently shown in the calendar, as YYYY-MM-DD. */
  getVisibleMonth(): string {
    return formatDateKey(this.#visibleMonth);
  }

  #emitDateChange() {
    this.dispatchEvent(new CustomEvent('date-change', {
      detail: { date: this.getDate() },
      bubbles: true,
      composed: true
    }));
  }
}

// ============================================================================
// Registration
// ============================================================================

if (typeof customElements !== 'undefined' && !customElements.get('numerology-widget')) {
  customElements.define('numerology-widget', NumerologyWidget);
}

// ============================================================================
// Auto-initialization for script tag usage
// ============================================================================

declare global {
  interface Window {
    NumerologyWidget: typeof NumerologyWidget;
    initNumerologyWidget: (selector?: string, options?: { date?: string; birthday?: string; compact?: boolean; showWeekly?: boolean; hideCalendar?: boolean; hideCycles?: boolean; autoRefresh?: boolean }) => NumerologyWidget[];
  }
}

if (typeof window !== 'undefined') {
  window.NumerologyWidget = NumerologyWidget;
  
  window.initNumerologyWidget = (selector = 'numerology-widget', options = {}) => {
    const elements = document.querySelectorAll(selector);
    return Array.from(elements).map(el => {
      if (options.date) el.setAttribute('date', options.date);
      if (options.birthday) el.setAttribute('birthday', options.birthday);
      if (options.compact) el.setAttribute('compact', '');
      if (options.showWeekly) el.setAttribute('show-weekly', '');
      if (options.hideCalendar) el.setAttribute('hide-calendar', '');
      if (options.hideCycles) el.setAttribute('hide-cycles', '');
      if (options.autoRefresh) el.setAttribute('auto-refresh', '');
      return el as NumerologyWidget;
    });
  };
}

export default NumerologyWidget;