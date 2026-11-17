import BRAND_ICON from './assets/brand.png';
import { useEffect, useMemo, useState } from 'react';
import Equation from './Equation';
import {
  ArrowLeftRight,
  Calculator,
  Check,
  ChevronDown,
  Clock3,
  Database,
  Gauge,
  History,
  Info,
  Layers3,
  Save,
  Sparkles,
  Trash2,
  Wifi,
} from 'lucide-react';

type Tab = 'calculate' | 'convert' | 'history';
type HistoryKind = 'calculate' | 'convert' | 'equation';

type HistoryItem = {
  id: string;
  kind: HistoryKind;
  title: string;
  details: string;
  result: string;
  createdAt: string;
};

type UnitOption = {
  value: string;
  label: string;
  bytes: number;
};

const STORAGE_KEY = 'internet-data-calculator-history-v1';


const speedUnits = [
  { value: 'Kbps', label: 'کیلوبیت بر ثانیه (Kbps)', bitsPerSecond: 1_000 },
  { value: 'Mbps', label: 'مگابیت بر ثانیه (Mbps)', bitsPerSecond: 1_000_000 },
  { value: 'Gbps', label: 'گیگابیت بر ثانیه (Gbps)', bitsPerSecond: 1_000_000_000 },
];

const timeUnits = [
  { value: 'second', label: 'ثانیه', seconds: 1 },
  { value: 'minute', label: 'دقیقه', seconds: 60 },
  { value: 'hour', label: 'ساعت', seconds: 3_600 },
  { value: 'day', label: 'روز', seconds: 86_400 },
];

const dataUnits: UnitOption[] = [
  { value: 'bit', label: 'بیت (bit)', bytes: 1 / 8 },
  { value: 'byte', label: 'بایت (B)', bytes: 1 },
  { value: 'KB', label: 'کیلوبایت (KB)', bytes: 1_000 },
  { value: 'MB', label: 'مگابایت (MB)', bytes: 1_000_000 },
  { value: 'GB', label: 'گیگابایت (GB)', bytes: 1_000_000_000 },
  { value: 'TB', label: 'ترابایت (TB)', bytes: 1_000_000_000_000 },
  { value: 'KiB', label: 'کیبی‌بایت (KiB)', bytes: 1_024 },
  { value: 'MiB', label: 'مبی‌بایت (MiB)', bytes: 1_048_576 },
  { value: 'GiB', label: 'گیبی‌بایت (GiB)', bytes: 1_073_741_824 },
  { value: 'TiB', label: 'تبی‌بایت (TiB)', bytes: 1_099_511_627_776 },
];

const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
const arabicDigits = '٠١٢٣٤٥٦٧٨٩';

function normalizeNumber(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)))
    .replace(/٫/g, '.')
    .replace(/٬|,/g, '')
    .trim();
}

function parsePositiveNumber(value: string): number | null {
  const normalized = normalizeNumber(value);
  if (!normalized || !/^\d*\.?\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatNumber(value: number, maximumFractionDigits = 6): string {
  if (!Number.isFinite(value)) return '۰';
  if (value !== 0 && (Math.abs(value) >= 1e15 || Math.abs(value) < 1e-6)) {
    return value.toExponential(5).replace('e+', 'e');
  }
  return new Intl.NumberFormat('fa-IR', {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(value);
}

function unitLabel(value: string): string {
  return dataUnits.find((unit) => unit.value === value)?.label ?? value;
}

function shortUnitLabel(value: string): string {
  return unitLabel(value).match(/\((.*?)\)/)?.[1] ?? value;
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('calculate');
  const [calculateMode, setCalculateMode] = useState<'usage' | 'equation'>('usage');
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? (JSON.parse(saved) as HistoryItem[]) : [];
    } catch {
      return [];
    }
  });

  const [speed, setSpeed] = useState('10');
  const [speedUnit, setSpeedUnit] = useState('Mbps');
  const [duration, setDuration] = useState('1');
  const [timeUnit, setTimeUnit] = useState('hour');
  const [resultUnit, setResultUnit] = useState('GB');
  const [calculationError, setCalculationError] = useState('');
  const [calculatedResult, setCalculatedResult] = useState<number | null>(null);

  const [convertValue, setConvertValue] = useState('1');
  const [fromUnit, setFromUnit] = useState('GB');
  const [toUnit, setToUnit] = useState('MB');
  const [conversionError, setConversionError] = useState('');
  const [convertedResult, setConvertedResult] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const tabItems = [
    { id: 'calculate' as const, label: 'حساب', description: 'حجم مصرف', icon: Calculator },
    { id: 'convert' as const, label: 'مبدل', description: 'تبدیل واحد', icon: ArrowLeftRight },
    { id: 'history' as const, label: 'تاریخچه', description: 'نتایج ذخیره', icon: History },
  ];

  const liveEstimate = useMemo(() => {
    const speedValue = parsePositiveNumber(speed);
    const durationValue = parsePositiveNumber(duration);
    if (!speedValue || !durationValue) return null;
    const selectedSpeed = speedUnits.find((unit) => unit.value === speedUnit)!;
    const selectedTime = timeUnits.find((unit) => unit.value === timeUnit)!;
    const selectedResult = dataUnits.find((unit) => unit.value === resultUnit)!;
    const bytes = (speedValue * selectedSpeed.bitsPerSecond * durationValue * selectedTime.seconds) / 8;
    return bytes / selectedResult.bytes;
  }, [duration, resultUnit, speed, speedUnit, timeUnit]);

  const addHistoryItem = (item: Omit<HistoryItem, 'id' | 'createdAt'>) => {
    setHistory((current) => [
      { ...item, id: makeId(), createdAt: new Date().toISOString() },
      ...current,
    ].slice(0, 100));
  };

  const handleCalculate = () => {
    const speedValue = parsePositiveNumber(speed);
    const durationValue = parsePositiveNumber(duration);
    if (!speedValue || !durationValue) {
      setCalculationError('سرعت و مدت‌زمان باید عددی بزرگ‌تر از صفر باشند.');
      setCalculatedResult(null);
      return;
    }

    const selectedSpeed = speedUnits.find((unit) => unit.value === speedUnit)!;
    const selectedTime = timeUnits.find((unit) => unit.value === timeUnit)!;
    const selectedResult = dataUnits.find((unit) => unit.value === resultUnit)!;
    const bytes = (speedValue * selectedSpeed.bitsPerSecond * durationValue * selectedTime.seconds) / 8;
    const result = bytes / selectedResult.bytes;

    setCalculationError('');
    setCalculatedResult(result);
    addHistoryItem({
      kind: 'calculate',
      title: 'محاسبه حجم مصرفی',
      details: `${formatNumber(speedValue)} ${speedUnit} × ${formatNumber(durationValue)} ${selectedTime.label}`,
      result: `${formatNumber(result)} ${shortUnitLabel(resultUnit)}`,
    });
  };

  const handleConvert = () => {
    const value = parsePositiveNumber(convertValue);
    if (!value) {
      setConversionError('یک مقدار معتبر و بزرگ‌تر از صفر وارد کنید.');
      setConvertedResult(null);
      return;
    }
    const source = dataUnits.find((unit) => unit.value === fromUnit)!;
    const target = dataUnits.find((unit) => unit.value === toUnit)!;
    const result = (value * source.bytes) / target.bytes;

    setConversionError('');
    setConvertedResult(result);
    addHistoryItem({
      kind: 'convert',
      title: 'تبدیل واحد داده',
      details: `${formatNumber(value)} ${shortUnitLabel(fromUnit)} به ${shortUnitLabel(toUnit)}`,
      result: `${formatNumber(result)} ${shortUnitLabel(toUnit)}`,
    });
  };

  const swapUnits = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
    setConvertedResult(null);
    setConversionError('');
  };

  return (
    <div className="app-shell min-h-screen bg-[#f5f4fb] text-[#211b52]">
      <div className="mx-auto w-full max-w-[1480px] lg:grid lg:min-h-screen lg:grid-cols-[268px_minmax(0,1fr)] lg:gap-5 lg:p-5">
        <aside className="sidebar-panel hidden overflow-hidden rounded-[32px] bg-[#211b52] text-white lg:flex lg:flex-col lg:p-5">
          <Brand />

          <nav className="mt-14 space-y-2" aria-label="بخش‌های برنامه">
            {tabItems.map((tab, index) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  data-testid={`nav-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`sidebar-nav-item nav-tone-${tab.id} ${active ? 'sidebar-nav-active' : ''} group flex min-h-16 w-full items-center gap-3 rounded-2xl px-3 text-start transition focus:outline-none focus:ring-2 focus:ring-white`}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-black/10">
                    <Icon size={19} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-sm font-black">{tab.label}</strong>
                    <small className="text-xs opacity-75">{tab.description}</small>
                  </span>
                  <span className="text-xs font-black opacity-35">۰{index + 1}</span>
                </button>
              );
            })}
          </nav>

          <div className="sidebar-stat mt-auto rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-xs text-white/50"><Database size={15} /> حافظه محلی</div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <strong className="text-3xl font-black text-[#ffda50]">{history.length.toLocaleString('fa-IR')}</strong>
              <span className="pb-1 text-xs text-white/55">نتیجه ذخیره شده</span>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="px-4 pb-3 pt-4 sm:px-6 lg:px-4 lg:pb-4 lg:pt-3">
            <div className="flex items-center justify-between gap-3 lg:justify-end">
              <div className="lg:hidden"><Brand dark /></div>
              <div className="flex items-center gap-2 rounded-full border border-[#211b52]/10 bg-white/65 px-3 py-2 text-xs font-bold text-[#686480] backdrop-blur sm:text-sm">
                <span className="size-2 rounded-full bg-[#4168e8]" />
                محاسبه دقیق حجم اینترنت
              </div>
            </div>
          </header>

          <main className="px-4 pb-36 sm:px-6 lg:px-4 lg:pb-8">
            {activeTab === 'calculate' && (
              <section data-testid="calculate-screen">
                <PageHeading eyebrow={calculateMode === 'equation' ? 'PACKAGE EQUATION / 01' : 'DATA USAGE / 01'} title={calculateMode === 'equation' ? <>بسته‌ها را<br /><span className="text-[#eb6835]">با هم حساب کن.</span></> : <>حجم مصرفت را<br /><span className="text-[#eb6835]">قبل از دانلود</span> بدان.</>} description={calculateMode === 'equation' ? 'حجم بسته‌های اینترنت را با هر واحدی جمع، تفریق یا تقسیم کن و نتیجه دقیق را ببین.' : 'سرعت اتصال و مدت استفاده را وارد کن؛ نتیجه هم‌زمان بر پایه تبدیل دقیق بیت به بایت محاسبه می‌شود.'} icon={<Gauge size={22} />} />

                <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="نوع حساب">
                  <button type="button" data-testid="calculate-mode-usage" aria-pressed={calculateMode === 'usage'} onClick={() => setCalculateMode('usage')} className={`min-h-12 rounded-2xl px-5 text-sm font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4168e8] ${calculateMode === 'usage' ? 'bg-[#4168e8] text-white shadow-[0_8px_18px_rgba(65,104,232,0.2)]' : 'border border-[#211b52]/15 bg-white/70 hover:bg-white'}`}>محاسبه مصرف</button>
                  <button type="button" data-testid="calculate-mode-equation" aria-pressed={calculateMode === 'equation'} onClick={() => setCalculateMode('equation')} className={`min-h-12 rounded-2xl px-5 text-sm font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4168e8] ${calculateMode === 'equation' ? 'bg-[#4168e8] text-white shadow-[0_8px_18px_rgba(65,104,232,0.2)]' : 'border border-[#211b52]/15 bg-white/70 hover:bg-white'}`}>معادله بسته‌ها</button>
                </div>
                {calculateMode === 'equation' ? <Equation units={dataUnits} onSave={addHistoryItem} /> : <>
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
                  <div className="surface-card p-5 sm:p-7">
                    <div className="mb-7 flex items-center justify-between gap-3 border-b border-[#211b52]/10 pb-4">
                      <div>
                        <p className="text-xs font-black text-[#eb6835]">ورودی‌های محاسبه</p>
                        <h2 className="mt-1 text-lg font-black">مشخصات اتصال</h2>
                      </div>
                      <span className="grid size-11 place-items-center rounded-full bg-[#f5f4fb]"><Wifi size={20} /></span>
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <Field number="01" label="سرعت اینترنت" hint="سرعت درج‌شده روی سرویس">
                        <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(145px,1.2fr)] gap-2">
                          <input data-testid="speed-input" inputMode="decimal" value={speed} onChange={(event) => { setSpeed(event.target.value); setCalculatedResult(null); }} className="input-base number-input" aria-label="سرعت اینترنت" placeholder="۱۰" />
                          <Select value={speedUnit} onChange={(value) => { setSpeedUnit(value); setCalculatedResult(null); }} testId="speed-unit" options={speedUnits} />
                        </div>
                      </Field>

                      <Field number="02" label="مدت استفاده" hint="زمان استفاده با همین سرعت">
                        <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(110px,1fr)] gap-2">
                          <input data-testid="duration-input" inputMode="decimal" value={duration} onChange={(event) => { setDuration(event.target.value); setCalculatedResult(null); }} className="input-base number-input" aria-label="مدت استفاده" placeholder="۱" />
                          <Select value={timeUnit} onChange={(value) => { setTimeUnit(value); setCalculatedResult(null); }} testId="time-unit" options={timeUnits} />
                        </div>
                      </Field>
                    </div>

                    <div className="mt-6">
                      <Field number="03" label="واحد نمایش نتیجه" hint="پاسخ نهایی با این واحد نمایش داده می‌شود">
                        <Select value={resultUnit} onChange={(value) => { setResultUnit(value); setCalculatedResult(null); }} testId="result-unit" options={dataUnits.filter((unit) => unit.value !== 'bit')} />
                      </Field>
                    </div>

                    {calculationError && <p data-testid="calculation-error" className="error-message">{calculationError}</p>}

                    <button type="button" data-testid="calculate-button" onClick={handleCalculate} className="primary-action">
                      <span>محاسبه و ذخیره</span><Calculator size={20} aria-hidden="true" />
                    </button>
                  </div>

                  <ResultPanel label={calculatedResult === null ? 'برآورد زنده' : 'نتیجه نهایی'} value={calculatedResult ?? liveEstimate} unit={shortUnitLabel(resultUnit)} saved={calculatedResult !== null} testId="calculation-result" />
                </div>

                <div className="mt-4 flex gap-3 rounded-2xl border border-[#211b52]/10 bg-transparent px-4 py-4 text-sm leading-7 text-[#686480]">
                  <Info className="mt-1 shrink-0 text-[#eb6835]" size={18} />
                  <p><strong className="text-[#211b52]">درباره دقت:</strong> هر ۸ بیت دقیقاً یک بایت است. نتیجه، مصرف پیوسته در سرعت انتخابی را نشان می‌دهد؛ نوسان سرعت و سربار شبکه می‌تواند مصرف واقعی را کمی تغییر دهد.</p>
                </div>
                </>}
              </section>
            )}

            {activeTab === 'convert' && (
              <section data-testid="convert-screen">
                <PageHeading eyebrow="UNIT CONVERTER / 02" title={<>یک عدد،<br /><span className="text-[#eb6835]">ده واحد</span> متفاوت.</>} description="بین واحدهای استاندارد اینترنت و واحدهای دودویی رایانه تبدیل کن؛ بدون میان‌بُر و گردکردن اشتباه." icon={<Layers3 size={22} />} />

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
                  <div className="surface-card p-5 sm:p-7">
                    <div className="mb-7 flex items-center justify-between gap-3 border-b border-[#211b52]/10 pb-4">
                      <div>
                        <p className="text-xs font-black text-[#eb6835]">تبدیل دقیق</p>
                        <h2 className="mt-1 text-lg font-black">مقدار و واحدها</h2>
                      </div>
                      <span className="grid size-11 place-items-center rounded-full bg-[#f5f4fb]"><ArrowLeftRight size={20} /></span>
                    </div>

                    <Field number="01" label="مقدار" hint="اعداد فارسی و انگلیسی قابل قبول‌اند">
                      <input data-testid="convert-input" inputMode="decimal" value={convertValue} onChange={(event) => { setConvertValue(event.target.value); setConvertedResult(null); }} className="input-base number-input" aria-label="مقدار تبدیل" placeholder="۱" />
                    </Field>

                    <div className="mt-6 grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
                      <Field number="02" label="از واحد"><Select value={fromUnit} onChange={(value) => { setFromUnit(value); setConvertedResult(null); }} testId="from-unit" options={dataUnits} /></Field>
                      <button type="button" data-testid="swap-units" onClick={swapUnits} className="swap-button" aria-label="جابجایی واحدها"><ArrowLeftRight size={20} /></button>
                      <Field number="03" label="به واحد"><Select value={toUnit} onChange={(value) => { setToUnit(value); setConvertedResult(null); }} testId="to-unit" options={dataUnits} /></Field>
                    </div>

                    {conversionError && <p data-testid="conversion-error" className="error-message">{conversionError}</p>}

                    <button type="button" data-testid="convert-button" onClick={handleConvert} className="primary-action">
                      <span>تبدیل و ذخیره</span><ArrowLeftRight size={20} aria-hidden="true" />
                    </button>
                  </div>

                  <ResultPanel label="نتیجه تبدیل" value={convertedResult} unit={shortUnitLabel(toUnit)} saved={convertedResult !== null} testId="conversion-result" emptyText="مقدار و واحدها را انتخاب کن" />
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FactCard code="1000" title="واحد ده‌دهی" text="هر KB برابر ۱٬۰۰۰ بایت است؛ همان واحد رایج در بسته‌های اینترنت." />
                  <FactCard code="1024" title="واحد دودویی" text="هر KiB برابر ۱٬۰۲۴ بایت است؛ واحدی که بیشتر در سیستم‌عامل می‌بینی." />
                </div>
              </section>
            )}

            {activeTab === 'history' && (
              <section data-testid="history-screen">
                <PageHeading eyebrow="SAVED RESULTS / 03" title={<>همه حساب‌ها،<br /><span className="text-[#eb6835]">مرتب و ماندگار.</span></>} description="نتیجه‌های ذخیره‌شده فقط روی همین دستگاه نگهداری می‌شوند و هر زمان بخواهی قابل حذف‌اند." icon={<History size={22} />} action={history.length > 0 ? <button type="button" data-testid="clear-history" onClick={() => setHistory([])} className="danger-action"><Trash2 size={17} /> حذف همه</button> : undefined} />

                {history.length === 0 ? (
                  <div data-testid="history-empty" className="surface-card grid min-h-80 place-items-center border-dashed p-6 text-center">
                    <div className="max-w-sm">
                      <div className="mx-auto mb-5 grid size-20 place-items-center rounded-full bg-[#ffda50]"><History size={32} /></div>
                      <h2 className="text-xl font-black">هنوز چیزی اینجا نیست</h2>
                      <p className="mt-2 text-sm leading-7 text-[#686480]">اولین محاسبه، معادله یا تبدیل را انجام بده تا نتیجه‌اش اینجا قرار بگیرد.</p>
                      <button type="button" data-testid="empty-go-calculate" onClick={() => setActiveTab('calculate')} className="mt-5 min-h-12 rounded-full bg-[#211b52] px-6 text-sm font-black text-white transition hover:bg-[#eb6835] focus:outline-none focus:ring-2 focus:ring-[#211b52] focus:ring-offset-2">شروع محاسبه</button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3" data-testid="history-list">
                    {history.map((item, index) => (
                      <article key={item.id} data-testid={`history-item-${item.id}`} className="history-row">
                        <span className="hidden text-3xl font-black text-[#211b52]/15 sm:block">{String(index + 1).padStart(2, '0')}</span>
                        <div className={`grid size-12 shrink-0 place-items-center rounded-2xl ${item.kind === 'calculate' ? 'bg-[#ffe580] text-[#544000]' : item.kind === 'equation' ? 'bg-[#eee1ff] text-[#7136b9]' : 'bg-[#ffe3d3] text-[#c95324]'}`}>
                          {item.kind === 'calculate' || item.kind === 'equation' ? <Calculator size={20} /> : <ArrowLeftRight size={20} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <h2 className="font-black">{item.title}</h2>
                            <span className="flex items-center gap-1 text-xs text-[#85809d]"><Clock3 size={13} /> {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.createdAt))}</span>
                          </div>
                          <p className="mt-1 break-words text-sm leading-6 text-[#686480]">{item.details}</p>
                        </div>
                        <div className="flex w-full items-center justify-between gap-3 border-t border-[#211b52]/10 pt-3 sm:w-auto sm:border-0 sm:pt-0">
                          <strong className="min-w-0 break-all text-lg font-black sm:max-w-xs" dir="ltr">{item.result}</strong>
                          <button type="button" data-testid={`delete-history-${item.id}`} onClick={() => setHistory((current) => current.filter((entry) => entry.id !== item.id))} className="delete-button" aria-label={`حذف ${item.title}`}><Trash2 size={18} /></button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}
          </main>
        </div>
      </div>

      <nav className="mobile-nav lg:hidden" aria-label="منوی اصلی موبایل">
        <div className="mobile-nav-shell">
          {tabItems.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            const isCenter = tab.id === 'convert';
            return (
              <button
                key={tab.id}
                type="button"
                data-testid={`mobile-nav-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`mobile-nav-item nav-tone-${tab.id} ${isCenter ? 'mobile-nav-center' : ''} ${active ? 'mobile-nav-active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <span className="mobile-nav-icon"><Icon size={isCenter ? 25 : 23} strokeWidth={2.2} /></span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function Brand({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <img src={BRAND_ICON} alt="" className="size-12 shrink-0 rounded-[14px] object-contain drop-shadow-md" />
      <div>
        <strong className={`block text-sm font-black ${dark ? 'text-[#211b52]' : 'text-white'}`}>حجم‌سنج</strong>
        <span className={`block text-[11px] ${dark ? 'text-[#686480]' : 'text-white/45'}`}>ابزار دقیق داده</span>
      </div>
    </div>
  );
}

function PageHeading({ eyebrow, title, description, icon, action }: { eyebrow: string; title: React.ReactNode; description: string; icon: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="page-heading mb-7 grid grid-cols-1 gap-5 border-b border-[#211b52]/10 pb-7 md:grid-cols-[minmax(0,1fr)_minmax(260px,0.7fr)] md:items-end">
      <div>
        <div className="mb-4 flex items-center gap-2 text-xs font-black tracking-wider text-[#686480]" dir="ltr"><span className="grid size-9 place-items-center rounded-xl bg-[#e7ebff] text-[#4168e8]">{icon}</span>{eyebrow}</div>
        <h1 className="text-[2.35rem] font-black leading-[1.15] sm:text-5xl xl:text-[3.5rem]">{title}</h1>
      </div>
      <div>
        <p className="text-sm leading-7 text-[#686480] sm:text-base">{description}</p>
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}

function Field({ number, label, hint, children }: { number: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 flex items-center gap-2 text-sm font-black"><small className="text-[10px] text-[#eb6835]">{number}</small>{label}</span>
      {children}
      {hint && <span className="mt-2 block text-xs leading-5 text-[#85809d]">{hint}</span>}
    </label>
  );
}

function Select({ value, onChange, testId, options }: { value: string; onChange: (value: string) => void; testId: string; options: Array<{ value: string; label: string }> }) {
  return (
    <div className="relative min-w-0">
      <select data-testid={testId} value={value} onChange={(event) => onChange(event.target.value)} className="input-base appearance-none pe-10">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[#686480]" size={17} />
    </div>
  );
}

function ResultPanel({ label, value, unit, saved, testId, emptyText = 'سرعت و زمان را وارد کن' }: { label: string; value: number | null; unit: string; saved: boolean; testId: string; emptyText?: string }) {
  return (
    <div className="result-panel">
      <div className="relative z-10 flex h-full min-h-80 flex-col">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-xs font-black text-white/55"><span className="size-2 rounded-full bg-[#ffda50]" />{label}</span>
          <Sparkles size={20} className="text-[#ffda50]" />
        </div>
        <div className="my-auto py-9">
          {value === null ? (
            <div data-testid={testId}>
              <p className="max-w-xs text-2xl font-black leading-10 text-white/35">{emptyText}</p>
              <div className="mt-5 h-1.5 w-24 rounded-full bg-white/10" />
            </div>
          ) : (
            <div data-testid={testId}>
              <div className="flex flex-wrap items-end gap-x-3 gap-y-1" dir="ltr">
                <strong className="break-all text-5xl font-black leading-none tracking-tight text-white sm:text-6xl">{formatNumber(value)}</strong>
                <span className="text-2xl font-black text-[#ffda50]">{unit}</span>
              </div>
              <p className="mt-5 text-sm text-white/45">خروجی دقیق بر پایه بایت</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 border-t border-white/10 pt-4 text-xs font-bold text-white/55">
          {saved ? <><Check size={16} className="text-[#ffda50]" /> در تاریخچه ذخیره شد</> : <><Save size={16} /> با زدن دکمه، نتیجه ذخیره می‌شود</>}
        </div>
      </div>
    </div>
  );
}

function FactCard({ code, title, text }: { code: string; title: string; text: string }) {
  return (
    <div className="flex gap-4 rounded-2xl border border-[#211b52]/10 bg-white/45 p-4">
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#e8e4ff] text-xs font-black text-[#6b39c5]" dir="ltr">{code}</span>
      <div><h3 className="font-black">{title}</h3><p className="mt-1 text-sm leading-6 text-[#686480]">{text}</p></div>
    </div>
  );
}

export default App;
