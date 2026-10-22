var NumerologyWidget=function(f){"use strict";var Te=f=>{throw TypeError(f)};var Se=(f,p,D)=>p.has(f)||Te("Cannot "+D);var t=(f,p,D)=>(Se(f,p,"read from private field"),D?D.call(f):p.get(f)),g=(f,p,D)=>p.has(f)?Te("Cannot add the same private member more than once"):p instanceof WeakSet?p.add(f):p.set(f,D),c=(f,p,D,k)=>(Se(f,p,"write to private field"),k?k.call(f,D):p.set(f,D),D),l=(f,p,D)=>(Se(f,p,"access private method"),D);var m,$,ae,O,J,re,Q,ne,q,C,z,N,ie,P,U,oe,X,se,le,de,ce,W,Z,j,ee,V,S,A,x,F,R,T,L,i,Ie,Be,qe,K,he,Pe,B,ve,xe,H,Ue,ue,$e,Me,ke,ge,Ne,me;const p=new Set([11,22,33]);function D(n){if(p.has(n))return n;for(;n>9&&(n=k(n),!p.has(n)););return n}function k(n){return n.toString().split("").reduce((a,e)=>a+parseInt(e,10),0)}function E(n){const a=n.getFullYear(),e=String(n.getMonth()+1).padStart(2,"0"),r=String(n.getDate()).padStart(2,"0");return`${a}-${e}-${r}`}function Y(n){const a=typeof n=="string"?new Date(`${n}T00:00:00`):new Date(n);if(isNaN(a.getTime()))throw new Error("Invalid date provided");return a}function G(n){if(!Number.isFinite(n))throw new Error("Invalid number provided");const a=Math.abs(Math.trunc(n));let e=a;for(;e>9&&!p.has(e);)e=k(e);return e===2?{originalSum:a,reducedNumber:11,displayValue:"11",calculationNote:`${a} → 2; timing cycles read 2 as 11`}:{originalSum:a,reducedNumber:e,displayValue:String(e),calculationNote:p.has(e)?`${a}; ${e} is a master number and stays whole`:`${a} → ${e}`}}function te(n){let a,e;if(typeof n=="string"){const o=n.trim();if(/^\d{1,2}-\d{1,2}$/.test(o)){const[s,d]=o.split("-").map(Number);a=s,e=d}else{const s=Y(o);a=s.getMonth()+1,e=s.getDate()}}else if(n instanceof Date){if(isNaN(n.getTime()))throw new Error("Invalid birthday provided");a=n.getMonth()+1,e=n.getDate()}else a=n.month,e=n.day;if(!Number.isInteger(a)||a<1||a>12)throw new Error("Birthday month must be between 1 and 12");if(!Number.isInteger(e)||e<1||e>31)throw new Error("Birthday day must be between 1 and 31");if(new Date(2e3,a-1,e).getMonth()!==a-1)throw new Error("Invalid birthday day for the selected month");return{month:a,day:e}}function we(n){let a,e,r;if(typeof n=="string"){const d=n.trim(),h=/^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(d);if(!h)throw new Error("Life Path needs a full birth date (YYYY-MM-DD)");a=Number(h[1]),e=Number(h[2]),r=Number(h[3])}else if(n instanceof Date){if(isNaN(n.getTime()))throw new Error("Invalid birth date provided");a=n.getFullYear(),e=n.getMonth()+1,r=n.getDate()}else throw new Error("Invalid birth date provided");if(!Number.isInteger(a)||a<1e3||a>9999)throw new Error("Birth year must be a four-digit year");const o=te({month:e,day:r}),s=new Date(a,e-1,r);if(s.getFullYear()!==a||s.getMonth()!==e-1||s.getDate()!==r)throw new Error("Invalid birth date provided");return{year:a,month:o.month,day:o.day}}const We={1:"Initiator and leader",3:"Creative communicator",4:"Builder and foundation",5:"Explorer and freedom seeker",6:"Protector and nurturer",7:"Seeker and analyst",8:"Achiever and abundance",9:"Humanitarian and completion",11:"Intuitive teacher",22:"Master builder",33:"Master teacher",28:"Wealth Life Path · 1 underneath"};function Ee(n){let a=n;for(;a>9&&!p.has(a);)a=k(a);return a}function Le(n){const{year:a,month:e,day:r}=we(n),o=Ee(e),s=Ee(r),d=k(a),h=o+s+d;let u,w=null,v;if(h===28)u=28,w=1,v="28 is the Wealth Life Path; 1 underneath";else{let b=h;const I=[h];for(;b>9&&!p.has(b);)b=k(b),I.push(b);b===2&&(b=11,I.push(11)),u=b,w=b===11?2:b===22?4:b===33?6:null;const De=b===11&&I[I.length-2]===2;v=I.length>1?`${I.join(" → ")}${De?"; 2 reads as 11":""}`:p.has(b)?`${b} is a master number and stays whole`+(w?`; ${w} underneath`:""):`${b}`}const y=`Month ${e} → ${o} · Day ${r} → ${s} · Year ${a} digits = ${d}. ${o} + ${s} + ${d} = ${h}; ${v}`;return{birthday:`${a}-${String(e).padStart(2,"0")}-${String(r).padStart(2,"0")}`,month:e,day:r,year:a,monthValue:o,dayValue:s,yearValue:d,total:h,reducedNumber:u,displayValue:String(u),underlyingNumber:w,isMaster:p.has(u),isWealth:u===28,summary:We[u]||"Life Path",calculationNote:y}}function _(n,a){const e=new Date(n,a.month,0).getDate();return new Date(n,a.month-1,Math.min(a.day,e))}function Ce(n){return new Date(n.getFullYear(),n.getMonth(),n.getDate())}function ze(n,a){return n.getFullYear()===a.getFullYear()?`${n.toLocaleDateString("en-US",{month:"short",day:"numeric"})} – ${a.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`:`${n.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})} – ${a.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`}function ye(n,a,e,r){return{...n,startDate:E(a),endDate:E(e),dateLabel:r}}function Ae(n){let a=0;for(const e of String(n))a+=Number(e);return ye(G(a),new Date(n,0,1),new Date(n+1,0,1),String(n))}function je(n){const a=Y(n),e=a.getFullYear(),r=a.getMonth()+1,o=Ae(e),s=G(r),d=G(o.reducedNumber+s.reducedNumber),h=new Date(e,r-1,1),u=new Date(e,r,1);return ye(d,h,u,a.toLocaleDateString("en-US",{month:"long",year:"numeric"}))}function Ye(n,a){const e=Ce(Y(n)),r=te(a),o=e.getFullYear(),s=_(o,r),d=e>=s?o:o-1,h=_(d,r),u=_(d+1,r),w=k(r.month)+k(r.day)+k(d),v=G(w);return ye(v,h,u,ze(h,u))}function Re(n,a){const e=Ce(Y(n)),r=te(a),o=Ye(e,r);let s=e.getFullYear(),d=e.getMonth()+1,h=_(s,{month:d,day:r.day});h>e&&(d-=1,d===0&&(d=12,s-=1),h=_(s,{month:d,day:r.day}));const u=d===12?1:d+1,w=d===12?s+1:s,v=_(w,{month:u,day:r.day}),y=G(d),b=G(o.reducedNumber+y.reducedNumber);return ye(b,h,v,ze(h,v))}function Fe(n,a){const e=Y(n),r=Ae(e.getFullYear()),o=je(e);return a?{universalYear:r,universalMonth:o,personalYear:Ye(e,a),personalMonth:Re(e,a)}:{universalYear:r,universalMonth:o,personalYear:null,personalMonth:null}}function Ke(n){const a=n.getMonth()+1,e=n.getDate(),o=n.getFullYear().toString().split("").map(M=>parseInt(M,10)),s=o.reduce((M,fe)=>M+fe,0),d=p.has(a)?a:k(a),h=p.has(e)?e:k(e),u=d+h+s;let w;u===28?w=28:p.has(u)||u<=9?w=u:w=D(u);const v=w===2?11:w,y=a+e+s;if(y===20)return{originalSum:y,reducedNumber:11,displayValue:"20/2",calculationNote:`${a} + ${e} + ${o.join("+")} = ${y} (special: 20 = 11 numerologically)`,summary:"20 reduces to 11"};if(y===v){let M=y;if(y%10===0&&y!==20)M=y/10;else if(y>9&&!p.has(y)&&y!==28){const fe=D(y);p.has(fe)&&(M=fe)}return{originalSum:y,reducedNumber:M,displayValue:M.toString(),calculationNote:`Both methods agree: ${d}+${h}+${s} = ${u}${M!==y?` (${y}→${M})`:""}`,summary:"Both methods agree"}}let b=y;if(y%10===0&&y!==20)b=y/10;else if(y>9&&!p.has(y)&&y!==28){const M=D(y);p.has(M),b=M}if(b===v)return{originalSum:y,reducedNumber:v,displayValue:v.toString(),calculationNote:`Both methods agree after reduction: ${y} → ${b}`,summary:"Both methods agree"};const I=Math.min(b,v),De=Math.max(b,v);return{originalSum:y,reducedNumber:v,displayValue:`${I}/${De}`,calculationNote:`Method 1: ${d}+${h}+${s} = ${u} → ${v}; Method 2: ${a}+${e}+${s} = ${y} → ${b}`,summary:`Method 1: ${v}
Method 2: ${b}`}}function He(n){const a=n.getDate();if(a===2)return{originalDay:a,reducedNumber:11,displayValue:"11",note:"Day 2nd = 11 energy"};if(a===20)return{originalDay:a,reducedNumber:11,displayValue:"20/2",note:"Day 20th = 20/2 (numerologically 11)"};if(p.has(a))return{originalDay:a,reducedNumber:a,displayValue:a.toString(),note:"Master number day"};const e=D(a);return{originalDay:a,reducedNumber:e,displayValue:e.toString()}}function pe(n){const a=Y(n),e=Ke(a),r=He(a);return{date:a,fullDateEnergy:e,secondaryEnergy:r,combinedKey:`${e.displayValue} + ${r.displayValue}`,formattedDate:a.toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}}function Ge(n){const a=[],e=new Date(n+"T00:00:00");for(let r=0;r<7;r++){const o=new Date(e);o.setDate(e.getDate()+r);const s=pe(o);a.push({date:E(o),dayNumber:o.getDate(),dayName:o.toLocaleDateString("en-US",{weekday:"long"}),formattedDate:o.toLocaleDateString("en-US",{month:"short",day:"2-digit",year:"numeric"}),fullDateEnergy:s.fullDateEnergy.displayValue,secondaryEnergy:s.secondaryEnergy.displayValue,combinedKey:s.combinedKey,numerology:s})}return a}function _e(n){const a=[],e=new Date(n+"T00:00:00"),r=e.getFullYear(),o=e.getMonth(),s=new Date(r,o+1,0);for(let d=1;d<=s.getDate();d++){const h=new Date(r,o,d),u=pe(h);a.push({date:E(h),dayNumber:d,dayName:h.toLocaleDateString("en-US",{weekday:"long"}),formattedDate:h.toLocaleDateString("en-US",{month:"short",day:"2-digit",year:"numeric"}),fullDateEnergy:u.fullDateEnergy.displayValue,secondaryEnergy:u.secondaryEnergy.displayValue,combinedKey:u.combinedKey,numerology:u})}return a}function Oe(n){const a=Y(n),e=_e(E(a)),r=[],o=new Date(`${e[0].date}T00:00:00`).getDay();for(let d=0;d<o;d++)r.push({date:null,dayNumber:null,schedule:null});for(const d of e)r.push({date:d.date,dayNumber:d.dayNumber,schedule:d});for(;r.length%7!==0;)r.push({date:null,dayNumber:null,schedule:null});const s=[];for(let d=0;d<r.length;d+=7)s.push(r.slice(d,d+7));return{year:a.getFullYear(),month:a.getMonth(),monthLabel:a.toLocaleDateString("en-US",{month:"long",year:"numeric"}),weeks:s,days:e}}const Je=`
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
`,Ve=document.createElement("template");Ve.innerHTML=`
  <style>${Je}</style>
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
`;class be extends HTMLElement{constructor(){super();g(this,i);g(this,m);g(this,$);g(this,ae);g(this,O);g(this,J);g(this,re);g(this,Q);g(this,ne);g(this,q);g(this,C);g(this,z);g(this,N);g(this,ie);g(this,P);g(this,U);g(this,oe);g(this,X);g(this,se);g(this,le);g(this,de);g(this,ce);g(this,W);g(this,Z);g(this,j);g(this,ee);g(this,V);g(this,S,null);g(this,A,!1);g(this,x,new Date);g(this,F,new Date(new Date().getFullYear(),new Date().getMonth(),1));g(this,R,null);g(this,T,null);g(this,L,null);c(this,m,this.attachShadow({mode:"open"})),t(this,m).appendChild(Ve.content.cloneNode(!0)),c(this,$,t(this,m).querySelector(".widget")),c(this,ae,t(this,m).querySelector(".date-display")),c(this,O,t(this,m).querySelector(".energy-value")),c(this,J,t(this,m).querySelector(".energy-note")),c(this,re,t(this,m).querySelectorAll(".energy-value")[1]),c(this,Q,t(this,m).querySelectorAll(".energy-note")[1]),c(this,ne,t(this,m).querySelector(".combined-value")),c(this,q,t(this,m).querySelector(".life-path")),c(this,C,t(this,m).querySelector('[part="life-path-value"]')),c(this,z,t(this,m).querySelector('[part="life-path-summary"]')),c(this,N,t(this,m).querySelector('[part="life-path-note"]')),c(this,ie,t(this,m).querySelector(".days-grid")),c(this,P,t(this,m).querySelector(".toggle-btn")),c(this,U,t(this,m).querySelector(".calendar-grid")),c(this,oe,t(this,m).querySelector(".calendar-month")),c(this,X,t(this,m).querySelector(".calendar-today")),c(this,se,t(this,m).querySelector('[part="uy-value"]')),c(this,le,t(this,m).querySelector('[part="uy-note"]')),c(this,de,t(this,m).querySelector('[part="um-value"]')),c(this,ce,t(this,m).querySelector('[part="um-note"]')),c(this,W,t(this,m).querySelector('[part="py-value"]')),c(this,Z,t(this,m).querySelector('[part="py-note"]')),c(this,j,t(this,m).querySelector('[part="pm-value"]')),c(this,ee,t(this,m).querySelector('[part="pm-note"]')),c(this,V,t(this,m).querySelector(".birthday-input")),t(this,P).addEventListener("click",()=>l(this,i,Pe).call(this)),t(this,V).addEventListener("change",()=>{this.setBirthday(t(this,V).value||null)}),t(this,m).querySelector(".birthday-clear").addEventListener("click",()=>{this.setBirthday(null)}),t(this,m).querySelector(".calendar-nav.prev").addEventListener("click",()=>l(this,i,he).call(this,-1)),t(this,m).querySelector(".calendar-nav.next").addEventListener("click",()=>l(this,i,he).call(this,1)),t(this,X).addEventListener("click",()=>this.goToToday()),t(this,U).addEventListener("click",e=>{const o=e.target.closest(".calendar-day[data-date]")?.getAttribute("data-date");o&&this.setDate(o)}),t(this,$).addEventListener("click",e=>{const r=e.target.closest(".day-card");if(r){const o=r.getAttribute("data-date");o&&this.setDate(o)}}),t(this,$).addEventListener("keydown",e=>{if(e.key!=="Enter"&&e.key!==" ")return;const r=e.target.closest(".day-card");if(r){e.preventDefault();const o=r.getAttribute("data-date");o&&this.setDate(o)}})}static get observedAttributes(){return["date","compact","show-weekly","hide-calendar","hide-cycles","birthday","auto-refresh"]}connectedCallback(){l(this,i,Ie).call(this),l(this,i,B).call(this),this.hasAttribute("auto-refresh")&&l(this,i,Be).call(this)}disconnectedCallback(){t(this,R)!==null&&(clearInterval(t(this,R)),c(this,R,null)),t(this,T)!==null&&(clearTimeout(t(this,T)),c(this,T,null))}attributeChangedCallback(e,r,o){e==="date"&&o?this.setDate(o):e==="compact"?t(this,$).classList.toggle("compact",this.hasAttribute("compact")):e==="show-weekly"?(c(this,A,this.hasAttribute("show-weekly")),t(this,$).classList.toggle("expanded",t(this,A)),t(this,P).textContent=t(this,A)?"Collapse":"Expand",t(this,A)&&l(this,i,ke).call(this)):e==="hide-calendar"?t(this,$).classList.toggle("hide-calendar",this.hasAttribute("hide-calendar")):e==="hide-cycles"?t(this,$).classList.toggle("hide-cycles",this.hasAttribute("hide-cycles")):e==="birthday"&&l(this,i,ue).call(this,o||null)}setDate(e){try{c(this,x,e?Y(e):new Date)}catch{l(this,i,ge).call(this,`Invalid date: ${e}`);return}l(this,i,K).call(this),l(this,i,Ne).call(this),l(this,i,B).call(this),l(this,i,me).call(this)}getDate(){return E(t(this,x))}setBirthday(e){if(!e){this.hasAttribute("birthday")?this.removeAttribute("birthday"):l(this,i,ue).call(this,null),l(this,i,$e).call(this);return}try{te(e)}catch{l(this,i,ge).call(this,`Invalid birthday: ${e}`);return}this.getAttribute("birthday")===e?l(this,i,ue).call(this,e):this.setAttribute("birthday",e),l(this,i,$e).call(this)}getBirthday(){return t(this,S)}getCycles(){return Fe(t(this,x),t(this,S))}getLifePath(){if(!t(this,S))return null;try{return Le(t(this,S))}catch{return null}}refresh(){l(this,i,B).call(this)}getEnergies(){return pe(t(this,x))}nextDay(){t(this,x).setDate(t(this,x).getDate()+1),l(this,i,K).call(this),l(this,i,B).call(this),l(this,i,me).call(this)}previousDay(){t(this,x).setDate(t(this,x).getDate()-1),l(this,i,K).call(this),l(this,i,B).call(this),l(this,i,me).call(this)}goToToday(){c(this,x,new Date),l(this,i,K).call(this),l(this,i,B).call(this),l(this,i,me).call(this)}nextMonth(){l(this,i,he).call(this,1)}previousMonth(){l(this,i,he).call(this,-1)}getVisibleMonth(){return E(t(this,F))}}return m=new WeakMap,$=new WeakMap,ae=new WeakMap,O=new WeakMap,J=new WeakMap,re=new WeakMap,Q=new WeakMap,ne=new WeakMap,q=new WeakMap,C=new WeakMap,z=new WeakMap,N=new WeakMap,ie=new WeakMap,P=new WeakMap,U=new WeakMap,oe=new WeakMap,X=new WeakMap,se=new WeakMap,le=new WeakMap,de=new WeakMap,ce=new WeakMap,W=new WeakMap,Z=new WeakMap,j=new WeakMap,ee=new WeakMap,V=new WeakMap,S=new WeakMap,A=new WeakMap,x=new WeakMap,F=new WeakMap,R=new WeakMap,T=new WeakMap,L=new WeakMap,i=new WeakSet,Ie=function(){if(this.hasAttribute("compact")&&t(this,$).classList.add("compact"),this.hasAttribute("show-weekly")&&(t(this,$).classList.add("expanded"),c(this,A,!0),t(this,P).textContent="Collapse"),this.hasAttribute("hide-calendar")&&t(this,$).classList.add("hide-calendar"),this.hasAttribute("hide-cycles")&&t(this,$).classList.add("hide-cycles"),this.hasAttribute("birthday")&&l(this,i,ue).call(this,this.getAttribute("birthday")),this.hasAttribute("date"))try{c(this,x,Y(this.getAttribute("date"))),l(this,i,K).call(this)}catch{}},Be=function(){const e=new Date,r=new Date(e);r.setDate(r.getDate()+1),r.setHours(0,0,0,0);const o=r.getTime()-e.getTime(),s=()=>{l(this,i,qe).call(this),l(this,i,B).call(this)};c(this,T,window.setTimeout(()=>{c(this,T,null),s(),c(this,R,window.setInterval(s,864e5))},o))},qe=function(){const e=new Date,r=new Date(e);r.setDate(e.getDate()-1);const o=E(t(this,x));(o===E(e)||o===E(r))&&(c(this,x,e),l(this,i,K).call(this))},K=function(){c(this,F,new Date(t(this,x).getFullYear(),t(this,x).getMonth(),1))},he=function(e){c(this,F,new Date(t(this,F).getFullYear(),t(this,F).getMonth()+e,1)),l(this,i,Me).call(this)},Pe=function(){this.toggleAttribute("show-weekly",!t(this,A))},B=function(){try{const e=pe(t(this,x));t(this,ae).textContent=e.date.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"}),t(this,O).textContent=e.fullDateEnergy.displayValue,t(this,O).title=e.fullDateEnergy.calculationNote||"",t(this,J).textContent=e.fullDateEnergy.summary,t(this,J).title=e.fullDateEnergy.calculationNote||"",t(this,re).textContent=e.secondaryEnergy.displayValue,t(this,Q).textContent=e.secondaryEnergy.note||"",t(this,Q).title=e.secondaryEnergy.note||"",t(this,ne).textContent=e.combinedKey,l(this,i,Ne).call(this),l(this,i,ve).call(this),l(this,i,xe).call(this),l(this,i,Me).call(this),t(this,A)&&l(this,i,ke).call(this)}catch(e){console.error("Numerology widget error:",e),l(this,i,ge).call(this,"Failed to calculate energies")}},ve=function(){if(!t(this,S)){t(this,q).classList.add("missing"),t(this,C).textContent="—",t(this,z).textContent="Set birthday",t(this,N).textContent="A full birth date unlocks Life Path and personal cycles.",t(this,C).title="",t(this,z).title="",t(this,N).title="";return}try{const e=Le(t(this,S));t(this,q).classList.remove("missing"),t(this,C).textContent=e.displayValue,t(this,z).textContent=e.summary,e.isWealth?t(this,N).textContent="Exact total 28 · 1 underneath":e.reducedNumber===33?t(this,N).textContent="33 · 6 underneath":e.total===e.reducedNumber?t(this,N).textContent=`${e.total} · master number stays whole`:t(this,N).textContent=`${e.monthValue} + ${e.dayValue} + ${e.yearValue} = ${e.total} → ${e.displayValue}`,t(this,C).title=e.calculationNote,t(this,z).title=e.calculationNote,t(this,N).title=e.calculationNote}catch{t(this,q).classList.add("missing"),t(this,C).textContent="—",t(this,z).textContent="Add birth year",t(this,N).textContent="Life Path needs the full birth date; personal cycles still use month and day.",t(this,C).title="",t(this,z).title="",t(this,N).title=""}},xe=function(){try{const e=Fe(t(this,x),t(this,S));l(this,i,H).call(this,t(this,se),t(this,le),e.universalYear.displayValue,e.universalYear.dateLabel,e.universalYear.calculationNote),l(this,i,H).call(this,t(this,de),t(this,ce),e.universalMonth.displayValue,e.universalMonth.dateLabel,e.universalMonth.calculationNote);const r=t(this,W).closest(".cycle-card"),o=t(this,j).closest(".cycle-card");e.personalYear&&e.personalMonth?(r?.classList.remove("missing"),o?.classList.remove("missing"),l(this,i,H).call(this,t(this,W),t(this,Z),e.personalYear.displayValue,e.personalYear.dateLabel,e.personalYear.calculationNote),l(this,i,H).call(this,t(this,j),t(this,ee),e.personalMonth.displayValue,e.personalMonth.dateLabel,e.personalMonth.calculationNote)):(r?.classList.add("missing"),o?.classList.add("missing"),l(this,i,H).call(this,t(this,W),t(this,Z),"—","Set birthday",""),l(this,i,H).call(this,t(this,j),t(this,ee),"—","Set birthday",""))}catch(e){console.error("Cycles render error:",e)}},H=function(e,r,o,s,d){e.textContent=o,r.textContent=s,e.title=d,r.title=d},Ue=function(){if(!t(this,S))return"";try{const{year:e,month:r,day:o}=we(t(this,S));return`${e}-${String(r).padStart(2,"0")}-${String(o).padStart(2,"0")}`}catch{return""}},ue=function(e){if(!e){c(this,S,null),t(this,V).value="",l(this,i,ve).call(this),l(this,i,xe).call(this);return}try{const{month:r,day:o}=te(e);try{const{year:s}=we(e);c(this,S,`${s}-${String(r).padStart(2,"0")}-${String(o).padStart(2,"0")}`)}catch{c(this,S,`${String(r).padStart(2,"0")}-${String(o).padStart(2,"0")}`)}t(this,V).value=l(this,i,Ue).call(this),l(this,i,ve).call(this),l(this,i,xe).call(this)}catch{l(this,i,ge).call(this,`Invalid birthday: ${e}`)}},$e=function(){this.dispatchEvent(new CustomEvent("birthday-change",{detail:{birthday:t(this,S)},bubbles:!0,composed:!0}))},Me=function(){try{const e=Oe(t(this,F)),r=E(new Date),o=this.getDate();t(this,oe).textContent=e.monthLabel,t(this,U).setAttribute("aria-label",`${e.monthLabel} energy calendar`),t(this,U).innerHTML=e.weeks.map(s=>`<div class="calendar-week" role="row">${s.map(h=>{if(!h.schedule||!h.date)return'<span class="calendar-day blank" role="gridcell" aria-hidden="true"></span>';const u=h.schedule,w=h.date===r,v=h.date===o;return`
            <button type="button"
                    class="${["calendar-day",w?"today":"",v?"selected":""].filter(Boolean).join(" ")}"
                    data-date="${h.date}"
                    part="calendar-day"
                    role="gridcell"
                    aria-selected="${v}"
                    ${w?'aria-current="date"':""}
                    aria-label="${u.dayName}, ${u.formattedDate}. Primary ${u.fullDateEnergy}, secondary ${u.secondaryEnergy}.">
              <span class="calendar-day-number">${h.dayNumber}</span>
              <span class="calendar-primary">${u.fullDateEnergy}</span>
              <span class="calendar-secondary">${u.secondaryEnergy}</span>
            </button>
          `}).join("")}</div>`).join(""),t(this,X).setAttribute("aria-label",`Go to today, ${new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}`)}catch(e){console.error("Calendar render error:",e)}},ke=function(){try{const e=Ge(this.getDate()),r=E(new Date),o=this.getDate();t(this,ie).innerHTML=e.map(s=>{const d=s.date===r,h=s.date===o;return`
          <div class="day-card ${d?"today":""} ${h?"selected":""}"
               data-date="${s.date}"
               part="day-card"
               role="button"
               tabindex="0"
               aria-label="${s.dayName} ${s.formattedDate}, energy ${s.fullDateEnergy} plus ${s.secondaryEnergy}">
            <div class="day-name">${s.dayName.slice(0,3)}</div>
            <div class="day-date">${s.dayNumber}</div>
            <div class="day-energies">
              <span class="day-energy primary">${s.fullDateEnergy}</span>
              <span class="day-energy secondary">${s.secondaryEnergy}</span>
            </div>
            <div class="day-indicator ${d?"today":""}"></div>
          </div>
        `}).join("")}catch(e){console.error("Weekly schedule error:",e)}},ge=function(e){t(this,L)||(c(this,L,document.createElement("div")),t(this,L).className="error-banner",t(this,L).setAttribute("role","alert"),t(this,m).appendChild(t(this,L))),t(this,L).textContent=e},Ne=function(){t(this,L)&&(t(this,L).remove(),c(this,L,null))},me=function(){this.dispatchEvent(new CustomEvent("date-change",{detail:{date:this.getDate()},bubbles:!0,composed:!0}))},typeof customElements<"u"&&!customElements.get("numerology-widget")&&customElements.define("numerology-widget",be),typeof window<"u"&&(window.NumerologyWidget=be,window.initNumerologyWidget=(n="numerology-widget",a={})=>{const e=document.querySelectorAll(n);return Array.from(e).map(r=>(a.date&&r.setAttribute("date",a.date),a.birthday&&r.setAttribute("birthday",a.birthday),a.compact&&r.setAttribute("compact",""),a.showWeekly&&r.setAttribute("show-weekly",""),a.hideCalendar&&r.setAttribute("hide-calendar",""),a.hideCycles&&r.setAttribute("hide-cycles",""),a.autoRefresh&&r.setAttribute("auto-refresh",""),r))}),f.NumerologyWidget=be,f.default=be,Object.defineProperties(f,{__esModule:{value:!0},[Symbol.toStringTag]:{value:"Module"}}),f}({});
//# sourceMappingURL=numerology-widget.iife.js.map
