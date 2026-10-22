import '../src/web-component';
import type { NumerologyWidget } from '../src/web-component';

const widget = document.getElementById('widget') as NumerologyWidget;
const datePicker = document.getElementById('date-picker') as HTMLInputElement;
const todayButton = document.getElementById('today-button') as HTMLButtonElement;

const BIRTHDAY_KEY = 'numerology-widget-birthday';
const savedBirthday = localStorage.getItem(BIRTHDAY_KEY);
if (savedBirthday) widget.setBirthday(savedBirthday);

datePicker.value = widget.getDate();

datePicker.addEventListener('change', () => {
  if (datePicker.value) widget.setDate(datePicker.value);
});

todayButton.addEventListener('click', () => {
  widget.goToToday();
  datePicker.value = widget.getDate();
});

widget.addEventListener('date-change', (event) => {
  const detail = (event as CustomEvent<{ date: string }>).detail;
  if (detail?.date) datePicker.value = detail.date;
});

widget.addEventListener('birthday-change', (event) => {
  const detail = (event as CustomEvent<{ birthday: string | null }>).detail;
  if (detail?.birthday) {
    localStorage.setItem(BIRTHDAY_KEY, detail.birthday);
  } else {
    localStorage.removeItem(BIRTHDAY_KEY);
  }
});
