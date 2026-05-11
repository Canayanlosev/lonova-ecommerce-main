/* eslint-disable */
// Primitives — Card, Button, Input, Badge, IconChip

const cx = (...args) => args.filter(Boolean).join(' ');

const Card = ({ className = '', children, glass = false, ...rest }) => (
  <div
    className={cx(
      'rounded-2xl border p-6 transition-all duration-300',
      glass
        ? 'bg-white/5 backdrop-blur-xl border-white/10'
        : 'bg-slate-900 border-slate-800',
      className
    )}
    {...rest}
  >
    {children}
  </div>
);

const CardHeader = ({ className = '', children }) => (
  <div className={cx('mb-4 flex flex-col space-y-1.5', className)}>{children}</div>
);
const CardTitle = ({ className = '', children }) => (
  <h3 className={cx('text-xl font-bold tracking-tight text-white', className)}>{children}</h3>
);
const CardContent = ({ className = '', children }) => (
  <div className={cx('text-slate-400', className)}>{children}</div>
);

const Button = ({ variant = 'primary', size = 'md', className = '', children, ...rest }) => {
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-[0_10px_15px_-3px_rgba(99,102,241,0.25)]',
    secondary: 'bg-purple-600 text-white hover:bg-purple-700',
    outline: 'border-2 border-indigo-500 text-indigo-400 hover:bg-indigo-500/10',
    ghost: 'text-slate-400 hover:bg-slate-800 hover:text-white',
    danger: 'bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white',
  };
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-6 py-2.5 text-sm', lg: 'px-8 py-3.5 text-base' };
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-300 active:scale-[0.97]',
        variants[variant], sizes[size], className
      )}
      {...rest}
    >
      {children}
    </button>
  );
};

const Input = ({ icon, label, hint, type = 'text', ...rest }) => (
  <div className="space-y-2">
    {(label || hint) && (
      <div className="flex items-center justify-between ml-1">
        {label && <label className="text-sm font-medium text-white">{label}</label>}
        {hint && <a className="text-xs text-indigo-400 hover:underline cursor-pointer">{hint}</a>}
      </div>
    )}
    <div className="relative">
      {icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
      )}
      <input
        type={type}
        className={cx(
          'w-full py-2.5 rounded-xl border border-slate-800 bg-slate-900/50 text-white outline-none',
          'focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all',
          'placeholder:text-slate-500 text-sm',
          icon ? 'pl-11 pr-4' : 'px-4'
        )}
        {...rest}
      />
    </div>
  </div>
);

const Badge = ({ tone = 'info', children, dot = true }) => {
  const tones = {
    info: 'bg-indigo-500/12 text-indigo-300',
    success: 'bg-emerald-500/12 text-emerald-400',
    warning: 'bg-orange-500/12 text-orange-400',
    danger: 'bg-red-500/12 text-red-400',
    neutral: 'bg-slate-500/15 text-slate-300',
  };
  return (
    <span className={cx('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold', tones[tone])}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
};

const IconChip = ({ tone = 'indigo', size = 'md', children, active = false, className = '' }) => {
  const tones = {
    indigo: active ? 'bg-indigo-500 text-white' : 'bg-indigo-500/10 text-indigo-400',
    purple: active ? 'bg-purple-500 text-white' : 'bg-purple-500/10 text-purple-400',
    emerald: active ? 'bg-emerald-500 text-white' : 'bg-emerald-500/10 text-emerald-400',
    orange: active ? 'bg-orange-500 text-white' : 'bg-orange-500/10 text-orange-400',
    red: active ? 'bg-red-500 text-white' : 'bg-red-500/10 text-red-400',
    slate: 'bg-slate-800 text-slate-300',
  };
  const sizes = { sm: 'w-9 h-9 rounded-lg', md: 'w-12 h-12 rounded-xl', lg: 'w-16 h-16 rounded-2xl' };
  return (
    <div className={cx('flex items-center justify-center transition-all duration-300', tones[tone], sizes[size], className)}>
      {children}
    </div>
  );
};

const HeroGlow = ({ className = '' }) => (
  <div
    className={cx('absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] rounded-full -z-10 pointer-events-none', className)}
    style={{ background: '#6366f1', opacity: 0.10, filter: 'blur(120px)' }}
  />
);

Object.assign(window, { cx, Card, CardHeader, CardTitle, CardContent, Button, Input, Badge, IconChip, HeroGlow });
