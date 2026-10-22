/**
 * React wrapper for <numerology-widget>
 *
 * Importing this module registers the custom element, so the component works
 * with React 18 and 19 (including React 19's native custom element support).
 */

import { createElement, forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { CSSProperties } from 'react';
import { NumerologyWidget as NumerologyWidgetElement } from './web-component';

export interface NumerologyWidgetProps {
  /** Date to display in YYYY-MM-DD format. Defaults to today. */
  date?: string;
  /** Birthday in YYYY-MM-DD (or legacy MM-DD for personal cycles only). */
  birthday?: string;
  /** Tighter padding for sidebars and small screens. */
  compact?: boolean;
  /** Show the seven-day outlook immediately. */
  showWeekly?: boolean;
  /** Hide the monthly energy calendar. */
  hideCalendar?: boolean;
  /** Hide the universal/personal timing cards. */
  hideCycles?: boolean;
  /** Refresh automatically at local midnight. */
  autoRefresh?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Fired whenever the user selects a day in the calendar or weekly outlook. */
  onDateChange?: (date: string) => void;
  /** Fired when the birthday is set or cleared in the widget. */
  onBirthdayChange?: (birthday: string | null) => void;
}

export const NumerologyWidget = forwardRef<NumerologyWidgetElement, NumerologyWidgetProps>(
  function NumerologyWidget(
    { date, birthday, compact = false, showWeekly = false, hideCalendar = false, hideCycles = false, autoRefresh = false, className, style, onDateChange, onBirthdayChange },
    ref
  ) {
    const elementRef = useRef<NumerologyWidgetElement | null>(null);

    useImperativeHandle(ref, () => elementRef.current as NumerologyWidgetElement, []);

    useEffect(() => {
      const element = elementRef.current;
      if (!element) return;

      if (date) {
        element.setAttribute('date', date);
      } else {
        element.removeAttribute('date');
      }

      if (birthday) {
        element.setAttribute('birthday', birthday);
      } else {
        element.removeAttribute('birthday');
      }

      element.toggleAttribute('compact', compact);
      element.toggleAttribute('show-weekly', showWeekly);
      element.toggleAttribute('hide-calendar', hideCalendar);
      element.toggleAttribute('hide-cycles', hideCycles);
      element.toggleAttribute('auto-refresh', autoRefresh);
    }, [date, birthday, compact, showWeekly, hideCalendar, hideCycles, autoRefresh]);

    useEffect(() => {
      const element = elementRef.current;
      if (!element || !onDateChange) return;

      const handler = (event: Event) => {
        const detail = (event as CustomEvent<{ date: string }>).detail;
        if (detail?.date) onDateChange(detail.date);
      };

      element.addEventListener('date-change', handler);
      return () => element.removeEventListener('date-change', handler);
    }, [onDateChange]);

    useEffect(() => {
      const element = elementRef.current;
      if (!element || !onBirthdayChange) return;

      const handler = (event: Event) => {
        const detail = (event as CustomEvent<{ birthday: string | null }>).detail;
        onBirthdayChange(detail?.birthday ?? null);
      };

      element.addEventListener('birthday-change', handler);
      return () => element.removeEventListener('birthday-change', handler);
    }, [onBirthdayChange]);

    return createElement('numerology-widget', {
      ref: elementRef,
      class: className,
      style
    });
  }
);

export default NumerologyWidget;
