'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface Match {
  id: number;
  scheduled_date: string;
  home_team: { id: number; name: string };
  away_team: { id: number; name: string };
  status: string;
  championship: { id: number; name: string };
}

interface MatchCalendarProps {
  matches: Match[];
  onSelectMatch: (match: Match) => void;
  onSelectDate: (date: Date) => void;
}

export function MatchCalendar({ matches, onSelectMatch, onSelectDate }: MatchCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const weekDaysMobile = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Dias do mês anterior
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: prevMonthLastDay - i,
        isCurrentMonth: false,
        fullDate: new Date(year, month - 1, prevMonthLastDay - i)
      });
    }

    // Dias do mês atual
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: i,
        isCurrentMonth: true,
        fullDate: new Date(year, month, i)
      });
    }

    // Dias do próximo mês
    const remainingDays = 42 - days.length; // 6 semanas * 7 dias
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: i,
        isCurrentMonth: false,
        fullDate: new Date(year, month + 1, i)
      });
    }

    return days;
  };

  const getMatchesForDate = (date: Date) => {
    return matches.filter(match => {
      if (!match.scheduled_date) return false;
      const matchDate = new Date(match.scheduled_date);
      return (
        matchDate.getDate() === date.getDate() &&
        matchDate.getMonth() === date.getMonth() &&
        matchDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-500';
      case 'IN_PROGRESS':
        return 'bg-green-500';
      case 'FINISHED':
        return 'bg-gray-500';
      case 'CANCELLED':
        return 'bg-red-500';
      case 'PENDING':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const days = getDaysInMonth(currentDate);

  return (
    <div className="rounded-xl border border-border bg-surface1">
      {/* Header */}
      <div className="border-b border-border bg-surface2 p-3 md:p-4">
        {/* Mobile: título em cima, controles embaixo */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {/* Month/Year Display */}
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-gold" />
            <h2 className="text-base font-bold text-text md:text-lg">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
          </div>

          <div className="flex items-center justify-between sm:gap-4">
            {/* Navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={goToPreviousMonth}
                className="rounded-lg p-2 text-muted transition-colors hover:bg-surface1 hover:text-text"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={goToToday}
                className="rounded-lg px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-surface1"
              >
                Hoje
              </button>
              <button
                onClick={goToNextMonth}
                className="rounded-lg p-2 text-muted transition-colors hover:bg-surface1 hover:text-text"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* View Toggle */}
            <div className="flex gap-1 rounded-lg bg-surface1 p-1">
              <button
                onClick={() => setView('month')}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  view === 'month'
                    ? 'bg-gold text-white'
                    : 'text-muted hover:text-text'
                }`}
              >
                Mês
              </button>
              <button
                onClick={() => setView('week')}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  view === 'week'
                    ? 'bg-gold text-white'
                    : 'text-muted hover:text-text'
                }`}
              >
                Semana
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-2 md:p-4">
        {/* Week Days Header */}
        <div className="mb-1 grid grid-cols-7 gap-1 md:mb-2 md:gap-2">
          {weekDays.map((day, i) => (
            <div
              key={day}
              className="text-center text-xs font-semibold text-muted md:text-sm"
            >
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{weekDaysMobile[i]}</span>
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {days.map((day, index) => {
            const dayMatches = getMatchesForDate(day.fullDate);
            const isTodayDate = isToday(day.fullDate);

            return (
              <button
                key={index}
                onClick={() => onSelectDate(day.fullDate)}
                className={`group relative min-h-[52px] rounded-lg border p-1 transition-all hover:border-gold hover:shadow-md md:min-h-[100px] md:p-2 ${
                  day.isCurrentMonth
                    ? 'border-border bg-surface2'
                    : 'border-transparent bg-surface1/50'
                } ${isTodayDate ? 'border-gold bg-gold/10' : ''}`}
              >
                {/* Date Number */}
                <div
                  className={`mb-0.5 text-xs font-semibold md:mb-1 md:text-sm ${
                    day.isCurrentMonth ? 'text-text' : 'text-muted'
                  } ${isTodayDate ? 'text-gold' : ''}`}
                >
                  {day.date}
                  {isTodayDate && (
                    <span className="ml-1 hidden rounded-full bg-gold px-1.5 py-0.5 text-[10px] text-white sm:inline">
                      Hoje
                    </span>
                  )}
                </div>

                {/* Matches — dots em mobile, badges em sm+ */}
                <div className="space-y-0.5 md:space-y-1">
                  {/* Mobile: pontos coloridos */}
                  {dayMatches.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 sm:hidden">
                      {dayMatches.slice(0, 3).map((match) => (
                        <div
                          key={match.id}
                          onClick={(e) => { e.stopPropagation(); onSelectMatch(match); }}
                          className={`h-2 w-2 rounded-full ${getStatusColor(match.status)}`}
                        />
                      ))}
                      {dayMatches.length > 3 && (
                        <div className="h-2 w-2 rounded-full bg-muted" />
                      )}
                    </div>
                  )}
                  {/* sm+: badges com texto */}
                  <div className="hidden sm:block space-y-0.5">
                    {dayMatches.slice(0, 3).map((match) => (
                      <div
                        key={match.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectMatch(match);
                        }}
                        className={`cursor-pointer rounded px-1.5 py-1 text-[10px] font-medium text-white transition-opacity hover:opacity-80 ${getStatusColor(
                          match.status
                        )}`}
                      >
                        <div className="truncate">
                          {match.home_team.name} vs {match.away_team.name}
                        </div>
                      </div>
                    ))}
                    {dayMatches.length > 3 && (
                      <div className="text-center text-[10px] font-medium text-muted">
                        +{dayMatches.length - 3} mais
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="border-t border-border bg-surface2 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-muted">Legenda:</span>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-yellow-500"></div>
            <span className="text-xs text-muted">Pendente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-blue-500"></div>
            <span className="text-xs text-muted">Agendada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-green-500"></div>
            <span className="text-xs text-muted">Em Andamento</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-gray-500"></div>
            <span className="text-xs text-muted">Finalizada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-red-500"></div>
            <span className="text-xs text-muted">Cancelada</span>
          </div>
        </div>
      </div>
    </div>
  );
}
