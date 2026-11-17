import { useMemo, useState } from 'react';
import { Check, Divide, Info, Minus, Plus, Save } from 'lucide-react';

type Fraction = { numerator: bigint; denominator: bigint };
type Operation = 'add' | 'subtract' | 'divide';
type Unit = { value: string; label: string; bytes: number };

type Props = {
  units: Unit[];
  onSave: (item: { kind: 'equation'; title: string; details: string; result: string }) => void;
};

const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
const operations: { id: Operation; label: string; symbol: string; icon: typeof Plus }[] = [
  { id: 'add', label: 'جمع', symbol: '+', icon: Plus },
  { id: 'subtract', label: 'تفریق', symbol: '−', icon: Minus },
  { id: 'divide', label: 'تقسیم', symbol: '÷', icon: Divide },
];

function gcd(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a;
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

function fraction(numerator: bigint, denominator: bigint): Fraction {
  if (denominator < 0n) { numerator = -numerator; denominator = -denominator; }
  const common = gcd(numerator, denominator);
  return { numerator: numerator / common, denominator: denominator / common };
}

function parseAmount(input: string): Fraction | null {
  const clean = input.trim()
    .replace(/[۰-۹]/g, d => String(persianDigits.indexOf(d)))
    .replace(/[٠-٩]/g, d => String(arabicDigits.indexOf(d)))
    .replace(/٫/g, '.')
    .replace(/[٬,]/g, '');
  if (!/^(?:\d+)(?:\.\d{1,18})?$/.test(clean) || clean.replace(/\D/g, '').length > 30) return null;
  const [whole, decimal = ''] = clean.split('.');
  return fraction(BigInt(whole + decimal), 10n ** BigInt(decimal.length));
}

function multiply(a: Fraction, b: Fraction): Fraction { return fraction(a.numerator * b.numerator, a.denominator * b.denominator); }
function divide(a: Fraction, b: Fraction): Fraction { return fraction(a.numerator * b.denominator, a.denominator * b.numerator); }
function add(a: Fraction, b: Fraction): Fraction { return fraction(a.numerator * b.denominator + b.numerator * a.denominator, a.denominator * b.denominator); }
function subtract(a: Fraction, b: Fraction): Fraction { return fraction(a.numerator * b.denominator - b.numerator * a.denominator, a.denominator * b.denominator); }

function fa(value: string): string { return value.replace(/\d/g, d => persianDigits[Number(d)]); }
function grouped(value: bigint): string { return value.toLocaleString('fa-IR'); }

function displayFraction(value: Fraction): { text: string; exactFraction: string | null } {
  const negative = value.numerator < 0n;
  const absolute = negative ? -value.numerator : value.numerator;
  const whole = absolute / value.denominator;
  let remainder = absolute % value.denominator;
  const integer = grouped(whole);
  if (remainder === 0n) return { text: `${negative ? '−' : ''}${integer}`, exactFraction: null };

  // A reduced denominator containing only factors 2 and 5 has a finite, exact decimal expansion.
  let denominator = value.denominator;
  while (denominator % 2n === 0n) denominator /= 2n;
  while (denominator % 5n === 0n) denominator /= 5n;
  const finite = denominator === 1n;
  const digits: string[] = [];
  const limit = finite ? 120 : 18;
  while (remainder !== 0n && digits.length < limit) {
    remainder *= 10n;
    digits.push(String(remainder / value.denominator));
    remainder %= value.denominator;
  }
  const text = `${negative ? '−' : ''}${integer}٫${fa(digits.join(''))}${remainder !== 0n ? '…' : ''}`;
  const exactFraction = remainder !== 0n
    ? `${grouped(value.numerator)} / ${grouped(value.denominator)}`
    : null;
  return { text, exactFraction };
}

function shortUnit(unit: Unit): string { return unit.label.match(/\((.*?)\)/)?.[1] ?? unit.value; }

export default function Equation({ units, onSave }: Props) {
  const [first, setFirst] = useState('1');
  const [firstUnit, setFirstUnit] = useState('GB');
  const [second, setSecond] = useState('500');
  const [secondUnit, setSecondUnit] = useState('MB');
  const [resultUnit, setResultUnit] = useState('GB');
  const [operation, setOperation] = useState<Operation>('add');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const calculation = useMemo(() => {
    const left = parseAmount(first);
    const right = parseAmount(second);
    if (!left || !right) return { error: 'برای هر دو بسته، عدد معتبر و نامنفی وارد کنید (حداکثر ۱۸ رقم اعشار).' };
    if (operation === 'divide' && right.numerator === 0n) return { error: 'تقسیم بر صفر امکان‌پذیر نیست؛ حجم بسته دوم را تغییر دهید.' };
    const source1 = units.find(u => u.value === firstUnit)!;
    const source2 = units.find(u => u.value === secondUnit)!;
    const target = units.find(u => u.value === resultUnit)!;
    // Store everything as exact fractions of bits; even a single bit is never rounded to a byte.
    const a = multiply(left, fraction(BigInt(Math.round(source1.bytes * 8)), 1n));
    const b = multiply(right, fraction(BigInt(Math.round(source2.bytes * 8)), 1n));
    const answer = operation === 'divide' ? divide(a, b) : divide(operation === 'add' ? add(a, b) : subtract(a, b), fraction(BigInt(Math.round(target.bytes * 8)), 1n));
    return { result: displayFraction(answer), unit: operation === 'divide' ? 'برابر' : shortUnit(target) };
  }, [first, firstUnit, second, secondUnit, resultUnit, operation, units]);

  const update = (setter: (value: string) => void, value: string) => { setter(value); setSaved(false); setError(''); };
  const selectClass = 'input-base appearance-none w-full';
  const inputClass = 'input-base number-input w-full';
  const chosen = operations.find(item => item.id === operation)!;

  function save() {
    if (calculation.error || !calculation.result || !calculation.unit) { setError(calculation.error ?? 'مقدارها را بررسی کنید.'); return; }
    onSave({
      kind: 'equation',
      title: `معادله بسته‌ها · ${chosen.label}`,
      details: `${first} ${shortUnit(units.find(u => u.value === firstUnit)!)} ${chosen.symbol} ${second} ${shortUnit(units.find(u => u.value === secondUnit)!)}`,
      result: `${calculation.result.text} ${calculation.unit}${calculation.result.exactFraction ? ` (کسر دقیق: ${calculation.result.exactFraction})` : ''}`,
    });
    setSaved(true);
    setError('');
  }

  return (
    <section data-testid="equation-section" className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
      <div className="surface-card p-5 sm:p-7">
        <div className="mb-6 border-b border-[#211b52]/10 pb-4">
          <p className="text-xs font-black text-[#eb6835]">معادله حجم بسته‌ها</p>
          <h2 className="mt-1 text-lg font-black">بسته‌ها را با هم حساب کن</h2>
          <p className="mt-2 text-sm leading-7 text-[#686480]">برای هر بسته واحد جداگانه بگذار؛ جمع و تفریق با واحد خروجی دلخواه، تقسیم به صورت نسبت دو حجم.</p>
        </div>
        <div className="space-y-5">
          <div>
            <label htmlFor="equation-first" className="mb-2 block text-sm font-black">حجم بسته اول</label>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
              <input id="equation-first" data-testid="equation-first-input" inputMode="decimal" value={first} onChange={e => update(setFirst, e.target.value)} className={inputClass} placeholder="مثلاً ۲" />
              <select data-testid="equation-first-unit" aria-label="واحد بسته اول" value={firstUnit} onChange={e => update(setFirstUnit, e.target.value)} className={selectClass}>{units.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</select>
            </div>
          </div>
          <div>
            <span className="mb-2 block text-sm font-black">عملیات</span>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="عملیات معادله">
              {operations.map(item => { const Icon = item.icon; return <button key={item.id} type="button" data-testid={`equation-operation-${item.id}`} aria-pressed={operation === item.id} onClick={() => { setOperation(item.id); setSaved(false); setError(''); }} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-2 text-sm font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#211b52] ${operation === item.id ? 'border-[#7740c9] bg-[#7740c9] text-white shadow-[0_6px_14px_rgba(119,64,201,0.2)]' : 'border-[#211b52]/15 bg-[#faf9ff] hover:border-[#7740c9]/40'}`}><Icon size={18} />{item.label}</button>; })}
            </div>
          </div>
          <div>
            <label htmlFor="equation-second" className="mb-2 block text-sm font-black">حجم بسته دوم</label>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
              <input id="equation-second" data-testid="equation-second-input" inputMode="decimal" value={second} onChange={e => update(setSecond, e.target.value)} className={inputClass} placeholder="مثلاً ۵۰۰" />
              <select data-testid="equation-second-unit" aria-label="واحد بسته دوم" value={secondUnit} onChange={e => update(setSecondUnit, e.target.value)} className={selectClass}>{units.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</select>
            </div>
          </div>
          {operation !== 'divide' && <div><label htmlFor="equation-result-unit" className="mb-2 block text-sm font-black">واحد نتیجه</label><select id="equation-result-unit" data-testid="equation-result-unit" value={resultUnit} onChange={e => update(setResultUnit, e.target.value)} className={selectClass}>{units.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</select></div>}
        </div>
        {(error || calculation.error) && <p data-testid="equation-error" role="alert" className="error-message">{error || calculation.error}</p>}
        <button type="button" data-testid="equation-save" onClick={save} className="primary-action"><span>ذخیره معادله در تاریخچه</span><Save size={20} /></button>
      </div>
      <div className="result-panel min-h-80" data-testid="equation-result">
        <div className="relative z-10 flex h-full flex-col justify-between gap-8">
          <div className="flex items-center gap-2 text-xs font-black text-white/60"><span className="size-2 rounded-full bg-[#ffda50]" />نتیجه زنده معادله</div>
          {calculation.result && calculation.unit ? <div>
            <div dir="ltr" className="flex flex-wrap items-end gap-2"><strong data-testid="equation-result-value" className="break-all text-3xl font-black leading-snug text-white sm:text-4xl">{calculation.result.text}</strong><span className="pb-1 text-xl font-black text-[#ffda50]">{calculation.unit}</span></div>
            {calculation.result.exactFraction && <p data-testid="equation-exact-fraction" className="mt-4 break-all rounded-xl bg-white/10 p-3 text-sm leading-7 text-white/80">نمایش اعشاری ادامه‌دار است؛ مقدار دقیق: <span dir="ltr" className="inline-block">{calculation.result.exactFraction}</span></p>}
            {operation === 'divide' && <p className="mt-3 text-sm leading-7 text-white/55">تقسیم دو حجم، یک نسبت بدون واحد می‌دهد.</p>}
          </div> : <p className="text-sm leading-7 text-white/55">مقدارهای معتبر وارد کنید تا نتیجه اینجا نمایش داده شود.</p>}
          <div className="flex items-center gap-2 border-t border-white/10 pt-4 text-xs text-white/60">{saved ? <><Check size={16} className="text-[#ffda50]" /> در تاریخچه ذخیره شد</> : <><Info size={16} /> محاسبه بر پایه واحدهای دقیق بیت انجام می‌شود.</>}</div>
        </div>
      </div>
    </section>
  );
}
