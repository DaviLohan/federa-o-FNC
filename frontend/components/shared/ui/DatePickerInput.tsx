import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  min?: string;
  max?: string;
}

const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const monthNames = [
  'Janeiro',
  'Fevereiro',
  'Marco',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

type ViewMode = 'days' | 'months' | 'years';

function parseDate(value: string) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatDate(value: string) {
  const parsed = parseDate(value);
  if (!parsed) return 'dd/mm/aaaa';
  return parsed.toLocaleDateString('pt-BR');
}

function isSameDay(a: Date | null, b: Date | null) {
  if (!a || !b) return false;
  return a.toDateString() === b.toDateString();
}

export function DatePickerInput({ label, value, onChange, required = false, min, max }: DatePickerInputProps) {
  const selectedDate = useMemo(() => parseDate(value), [value]);
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [displayMonth, setDisplayMonth] = useState<Date>(selectedDate || parseDate(min || '') || new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('days');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 352,
  });
  const [renderAsCanvas, setRenderAsCanvas] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (selectedDate) {
      setDisplayMonth(selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!isOpen) {
      setViewMode('days');
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !containerRef.current?.contains(target) &&
        !popupRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const minDate = parseDate(min || '');
  const maxDate = parseDate(max || '');

  const monthLabel = displayMonth.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  const currentYear = displayMonth.getFullYear();
  const currentMonthIndex = displayMonth.getMonth();
  const yearRangeStart = Math.floor(currentYear / 12) * 12;

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const updatePosition = () => {
      if (!triggerRef.current) return;

      const rect = triggerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const desiredWidth = Math.min(352, viewportWidth - 24);
      const estimatedHeight = 360;
      const shouldRenderAsCanvas = viewportWidth < 768 || rect.bottom + estimatedHeight > viewportHeight - 24;

      setRenderAsCanvas(shouldRenderAsCanvas);

      if (shouldRenderAsCanvas) {
        setPopoverStyle({
          top: Math.max(16, (viewportHeight - estimatedHeight) / 2),
          left: Math.max(12, (viewportWidth - desiredWidth) / 2),
          width: desiredWidth,
        });
        return;
      }

      const left = Math.min(
        Math.max(12, rect.left),
        Math.max(12, viewportWidth - desiredWidth - 12)
      );
      const openAbove = rect.bottom + estimatedHeight > viewportHeight - 12 && rect.top > estimatedHeight;
      const top = openAbove
        ? Math.max(12, rect.top - estimatedHeight - 12)
        : Math.min(viewportHeight - estimatedHeight - 12, rect.bottom + 10);

      setPopoverStyle({
        top,
        left,
        width: desiredWidth,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const calendarDays = useMemo(() => {
    const year = displayMonth.getFullYear();
    const month = displayMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const leading = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const days: Array<Date | null> = [];

    for (let i = 0; i < leading; i += 1) days.push(null);
    for (let day = 1; day <= totalDays; day += 1) days.push(new Date(year, month, day));

    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [displayMonth]);

  const canSelectDate = (date: Date) => {
    if (minDate && date < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) return false;
    if (maxDate && date > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())) return false;
    return true;
  };

  const handleSelectDate = (date: Date) => {
    if (!canSelectDate(date)) return;
    const formatted = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
    onChange(formatted);
    setIsOpen(false);
  };

  const handlePrevious = () => {
    if (viewMode === 'years') {
      setDisplayMonth(new Date(currentYear - 12, currentMonthIndex, 1));
      return;
    }

    if (viewMode === 'months') {
      setDisplayMonth(new Date(currentYear - 1, currentMonthIndex, 1));
      return;
    }

    setDisplayMonth(new Date(currentYear, currentMonthIndex - 1, 1));
  };

  const handleNext = () => {
    if (viewMode === 'years') {
      setDisplayMonth(new Date(currentYear + 12, currentMonthIndex, 1));
      return;
    }

    if (viewMode === 'months') {
      setDisplayMonth(new Date(currentYear + 1, currentMonthIndex, 1));
      return;
    }

    setDisplayMonth(new Date(currentYear, currentMonthIndex + 1, 1));
  };

  const handleSelectMonth = (monthIndex: number) => {
    setDisplayMonth(new Date(currentYear, monthIndex, 1));
    setViewMode('days');
  };

  const handleSelectYear = (year: number) => {
    setDisplayMonth(new Date(year, currentMonthIndex, 1));
    setViewMode('months');
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="mb-2 block text-sm font-medium text-text">
        {label}
        {required && <span className="ml-1 text-error">*</span>}
      </label>

      <button
        type="button"
        ref={triggerRef}
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-11 w-full items-center justify-between rounded-2xl border border-stroke bg-panel2 px-4 text-left text-text transition-all duration-200 hover:border-gold/40 focus:outline-none focus:ring-2 focus:ring-gold/50"
      >
        <span className={value ? 'text-text' : 'text-muted2'}>{formatDate(value)}</span>
        <CalendarDays className="h-4 w-4 text-gold" />
      </button>

      <input type="hidden" value={value} required={required} />

      {isMounted && isOpen && createPortal(
        <div className="fixed inset-0 z-[9999]">
          <button
            type="button"
            aria-label="Fechar calendario"
            className="absolute inset-0 bg-black/45 backdrop-blur-[3px]"
            onClick={() => setIsOpen(false)}
          />

          <div
            ref={popupRef}
            className="absolute overflow-hidden rounded-[28px] border border-gold/20 bg-[#0b1220]/98 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all duration-150"
            style={{
              top: renderAsCanvas ? '50%' : `${popoverStyle.top}px`,
              left: renderAsCanvas ? '50%' : `${popoverStyle.left}px`,
              width: `${popoverStyle.width}px`,
              maxWidth: 'calc(100vw - 24px)',
              transform: renderAsCanvas ? 'translate(-50%, -50%)' : 'none',
            }}
          >
            <div className="border-b border-gold/10 bg-[radial-gradient(circle_at_top,rgba(214,161,30,0.16),transparent_55%)] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-stroke bg-panel2 text-text transition hover:border-gold/40 hover:text-gold"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="text-center">
                  <div className="text-xs uppercase tracking-[0.35em] text-gold/70">Calendario</div>
                  <div className="mt-1 flex items-center justify-center gap-2 text-sm font-semibold text-text">
                    <button
                      type="button"
                      onClick={() => setViewMode((current) => (current === 'months' ? 'days' : 'months'))}
                      className="rounded-lg px-2 py-1 capitalize transition hover:bg-gold/10 hover:text-gold"
                    >
                      {monthNames[currentMonthIndex]}
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode((current) => (current === 'years' ? 'days' : 'years'))}
                      className="rounded-lg px-2 py-1 transition hover:bg-gold/10 hover:text-gold"
                    >
                      {currentYear}
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-stroke bg-panel2 text-text transition hover:border-gold/40 hover:text-gold"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[min(22rem,calc(100vh-120px))] overflow-y-auto p-4">
              {viewMode === 'days' && (
                <>
                  <div className="mb-3 grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-gold/60">
                    {weekDays.map((day) => (
                      <span key={day}>{day}</span>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {calendarDays.map((date, index) => {
                      if (!date) {
                        return <div key={`empty-${index}`} className="h-10" />;
                      }

                      const isSelected = isSameDay(date, selectedDate);
                      const isToday = isSameDay(date, new Date());
                      const disabled = !canSelectDate(date);

                      return (
                        <button
                          key={date.toISOString()}
                          type="button"
                          onClick={() => handleSelectDate(date)}
                          disabled={disabled}
                          className={[
                            'h-10 rounded-2xl border text-sm font-medium transition',
                            disabled
                              ? 'cursor-not-allowed border-transparent bg-transparent text-muted2/40'
                              : isSelected
                              ? 'border-gold bg-gold text-background shadow-[0_0_20px_rgba(214,161,30,0.35)]'
                              : isToday
                              ? 'border-gold/40 bg-gold/10 text-gold hover:border-gold hover:bg-gold/20'
                              : 'border-stroke bg-panel2 text-text hover:border-gold/30 hover:bg-panel',
                          ].join(' ')}
                        >
                          {date.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {viewMode === 'months' && (
                <div className="grid grid-cols-3 gap-3">
                  {monthNames.map((month, index) => {
                    const isSelected = index === currentMonthIndex;

                    return (
                      <button
                        key={month}
                        type="button"
                        onClick={() => handleSelectMonth(index)}
                        className={[
                          'rounded-2xl border px-3 py-4 text-sm font-medium transition',
                          isSelected
                            ? 'border-gold bg-gold text-background shadow-[0_0_20px_rgba(214,161,30,0.35)]'
                            : 'border-stroke bg-panel2 text-text hover:border-gold/30 hover:bg-panel',
                        ].join(' ')}
                      >
                        {month.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              )}

              {viewMode === 'years' && (
                <div className="space-y-3">
                  <div className="text-center text-xs uppercase tracking-[0.3em] text-gold/60">
                    {yearRangeStart} - {yearRangeStart + 11}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {Array.from({ length: 12 }, (_, index) => yearRangeStart + index).map((year) => {
                      const isSelected = year === currentYear;

                      return (
                        <button
                          key={year}
                          type="button"
                          onClick={() => handleSelectYear(year)}
                          className={[
                            'rounded-2xl border px-3 py-4 text-sm font-medium transition',
                            isSelected
                              ? 'border-gold bg-gold text-background shadow-[0_0_20px_rgba(214,161,30,0.35)]'
                              : 'border-stroke bg-panel2 text-text hover:border-gold/30 hover:bg-panel',
                          ].join(' ')}
                        >
                          {year}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
