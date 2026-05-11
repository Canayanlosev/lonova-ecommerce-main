/* eslint-disable */
const cx = (...a) => a.filter(Boolean).join(' ');

const Button = ({ variant = 'primary', size = 'md', className = '', children, ...rest }) => {
  const v = {
    primary: 'bg-slate-900 text-white hover:bg-indigo-600',
    outline: 'border border-slate-300 text-slate-900 hover:border-slate-900',
    ghost:   'text-slate-700 hover:bg-slate-100',
    accent:  'bg-indigo-600 text-white hover:bg-indigo-700',
  }[variant];
  const s = { sm: 'px-3 py-1.5 text-xs', md: 'px-5 py-2.5 text-sm', lg: 'px-7 py-3.5 text-sm' }[size];
  return (
    <button className={cx('inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 active:scale-[0.98]', v, s, className)} {...rest}>
      {children}
    </button>
  );
};

const Pill = ({ children, tone = 'slate' }) => {
  const t = {
    slate:   'bg-slate-100 text-slate-700',
    indigo:  'bg-indigo-50 text-indigo-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    rose:    'bg-rose-50 text-rose-700',
  }[tone];
  return <span className={cx('inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider', t)}>{children}</span>;
};

const IconBtn = ({ children, count, onClick, label }) => (
  <button onClick={onClick} aria-label={label} className="relative w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-colors">
    {children}
    {count > 0 && (
      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">{count}</span>
    )}
  </button>
);

// Deterministic gradient for product image slots.
const productGradient = (id) => {
  const palettes = [
    ['#fde68a', '#f59e0b'],
    ['#bae6fd', '#0ea5e9'],
    ['#e9d5ff', '#a855f7'],
    ['#fecaca', '#ef4444'],
    ['#bbf7d0', '#10b981'],
    ['#fed7aa', '#f97316'],
    ['#c7d2fe', '#6366f1'],
    ['#fbcfe8', '#ec4899'],
  ];
  let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return palettes[h % palettes.length];
};

const ProductImage = ({ id, label, className = '' }) => {
  const [a, b] = productGradient(id);
  return (
    <div className={cx('relative w-full overflow-hidden', className)} style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-white/80 font-black text-5xl tracking-tighter mix-blend-overlay">{label?.[0] ?? '·'}</div>
      </div>
    </div>
  );
};

Object.assign(window, { cx, Button, Pill, IconBtn, ProductImage, productGradient });
