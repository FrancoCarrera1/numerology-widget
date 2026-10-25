import '../src/web-component';
import type { NumerologyWidget } from '../src/web-component';
import { mountPeopleRoster } from './people';

const widget = document.getElementById('widget') as NumerologyWidget;
const datePicker = document.getElementById('date-picker') as HTMLInputElement;
const todayButton = document.getElementById('today-button') as HTMLButtonElement;

mountPeopleRoster({ widget, datePicker, todayButton });
