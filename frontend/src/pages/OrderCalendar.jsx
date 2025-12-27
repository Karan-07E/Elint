import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import { getAllOrders, getMyOrders } from '../services/api';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

// Helper to format dates safely
const toDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const toISODate = (date) => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isSameDay = (d1, d2) => {
  if (!d1 || !d2) return false;
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

const isWithinRange = (day, start, end) => {
  if (!day || !start || !end) return false;
  const ts = day.setHours(0, 0, 0, 0);
  const s = start.setHours(0, 0, 0, 0);
  const e = end.setHours(0, 0, 0, 0);
  return ts >= s && ts <= e;
};

const monthNames = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const weekdayShort = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const OrderCalendar = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return toISODate(today);
  });

  // Helper to get user role
  const getUserRole = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user?.role || 'user';
    }
    return 'user';
  };

  // Fetch orders based on user role
  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const userRole = getUserRole();
      
      // If employee, fetch only their assigned orders; otherwise fetch all orders
      let res;
      if (userRole === 'employee') {
        res = await getMyOrders();
        // getMyOrders returns { orders: [...] }
        const rawOrders = res.data.orders || [];
        const normalized = normalizeOrders(rawOrders);
        setOrders(normalized);
      } else {
        res = await getAllOrders();
        const rawOrders = res.data || [];
        const normalized = normalizeOrders(rawOrders);
        setOrders(normalized);
      }
      
      setError(null);
    } catch (err) {
      console.error('Failed to load orders for calendar', err);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Extract normalization logic
  const normalizeOrders = (rawOrders) => {
    return rawOrders
      .filter(o => o.status !== 'Deleted')
      .map(o => {
        const start = toDate(o.poDate || o.startDate) || null;

        const candidateDates = [];
        if (o.estimatedDeliveryDate || o.deadline) {
          const est = toDate(o.estimatedDeliveryDate || o.deadline);
          if (est) candidateDates.push(est);
        }
        if (Array.isArray(o.items)) {
          o.items.forEach(it => {
            if (it && it.deliveryDate) {
              const d = toDate(it.deliveryDate);
              if (d) candidateDates.push(d);
            }
          });
        }

        const end = candidateDates.length
          ? new Date(Math.max(...candidateDates.map(d => d.getTime())))
          : start;

        return {
          ...o,
          _startDate: start,
          _endDate: end,
        };
      })
      .filter(o => o._startDate && o._endDate);
  };

  // Initial load
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Refresh when window/tab gains focus (so other employees' updates appear)
  useEffect(() => {
    window.addEventListener('focus', loadOrders);
    return () => window.removeEventListener('focus', loadOrders);
  }, [loadOrders]);

  // Light polling so long-open dashboards stay in sync (e.g. every 30s)
  useEffect(() => {
    const id = setInterval(loadOrders, 30000);
    return () => clearInterval(id);
  }, [loadOrders]);

  // Build calendar grid for the current month
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const monthIndex = currentMonth.getMonth();

    const firstDayOfMonth = new Date(year, monthIndex, 1);
    const lastDayOfMonth = new Date(year, monthIndex + 1, 0);

    const leadingBlankDays = firstDayOfMonth.getDay(); // 0 (Sun) - 6 (Sat)
    const daysInMonth = lastDayOfMonth.getDate();

    const days = [];

    // Leading blanks
    for (let i = 0; i < leadingBlankDays; i++) {
      days.push(null);
    }

    // Actual days
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(year, monthIndex, d));
    }

    // Trailing blanks to complete weeks
    while (days.length % 7 !== 0) {
      days.push(null);
    }

    return days;
  }, [currentMonth]);

  const selectedDateObj = useMemo(() => {
    if (!selectedDate) return null;
    const d = new Date(selectedDate);
    return isNaN(d.getTime()) ? null : d;
  }, [selectedDate]);

  const ordersByDay = useMemo(() => {
    const map = {};
    calendarDays.forEach(day => {
      if (!day) return;
      const key = toISODate(day);
      // Only show the order on its deadline date, not on every day in the range
      map[key] = orders.filter(o => o._endDate && isSameDay(day, o._endDate));
    });
    return map;
  }, [calendarDays, orders]);

  const selectedDayOrders = useMemo(() => {
    if (!selectedDate || !ordersByDay[selectedDate]) return [];
    return ordersByDay[selectedDate];
  }, [ordersByDay, selectedDate]);

  const goPrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleDayClick = (day) => {
    if (!day) return;
    setSelectedDate(toISODate(day));
  };

  const today = new Date();

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar />
      <div className="ml-64 p-6">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Order Calendar</h1>
            <p className="text-sm text-slate-500">
              View each order's journey from start date to expected completion, shared across all teams.
            </p>
          </div>
          <button
            onClick={() => navigate('/orders')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm"
          >
            View Order List
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Calendar Card */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 xl:col-span-2 flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Deadlines Calendar</p>
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={goPrevMonth}
                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                    title="Previous month"
                  >
                    <FaChevronLeft size={14} />
                  </button>
                  <button
                    onClick={goNextMonth}
                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                    title="Next month"
                  >
                    <FaChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div className="px-4 pt-4 pb-5">
              {/* Weekday header */}
              <div className="grid grid-cols-7 gap-1 mb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                {weekdayShort.map(d => (
                  <div key={d} className="text-center py-1">{d}</div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-1 text-xs">
                {calendarDays.map((day, idx) => {
                  if (!day) {
                    return <div key={`blank-${idx}`} className="h-16 rounded-lg" />;
                  }

                  const key = toISODate(day);
                  const dayOrders = ordersByDay[key] || [];
                  const hasDeadlines = dayOrders.length > 0;
                  const isToday = isSameDay(day, today);
                  const isSelected = selectedDate && key === selectedDate;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleDayClick(day)}
                      className={`
                        h-16 w-full rounded-lg border px-1.5 pt-0.5 pb-1 flex flex-col items-stretch text-left transition-all
                        ${isSelected
                          ? 'border-blue-500 bg-blue-50 shadow-sm'
                          : hasDeadlines
                          ? 'border-blue-100 bg-slate-50 hover:border-blue-300'
                          : 'border-slate-200 bg-white hover:bg-slate-50'}
                      `}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[11px] font-medium ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                          {day.getDate()}
                        </span>
                        {isToday && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                            Today
                          </span>
                        )}
                      </div>

                      <div className="flex-1 overflow-hidden">
                        {dayOrders.slice(0, 2).map(order => {
                          const firstItemName = Array.isArray(order.items) && order.items.length > 0
                            ? (order.items[0].itemName || order.items[0].name || 'Item')
                            : 'Item';
                          const isCompleted = order.status === 'Completed';
                          const derivedPriority = (order.items || []).some(i => (i.priority || '').toLowerCase() === 'high') ? 'High' : (order.priority || 'Normal');

                          return (
                            <div
                              key={order._id}
                              className={`
                                mb-0.5 px-1 py-0.5 rounded text-[10px] font-medium truncate
                                ${isCompleted
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  : derivedPriority === 'High'
                                  ? 'bg-red-50 text-red-700 border border-red-100'
                                  : 'bg-blue-50 text-blue-700 border border-blue-100'}
                              `}
                              title={`PO: ${order.poNumber || 'N/A'}`}
                            >
                              {firstItemName}
                            </div>
                          );
                        })}
                        {dayOrders.length > 2 && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            +{dayOrders.length - 2} more
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {loading && (
                <div className="mt-4 flex justify-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                </div>
              )}

              {error && !loading && (
                <p className="mt-3 text-xs text-red-600 text-center">{error}</p>
              )}
            </div>
          </div>

          {/* Side panel with details for selected date */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200">
              <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Selected Day</p>
              <h2 className="text-lg font-semibold text-slate-800">
                {selectedDateObj
                  ? selectedDateObj.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
                  : 'No date selected'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {selectedDayOrders.length === 0
                  ? 'No order deadlines on this date.'
                  : `${selectedDayOrders.length} order${selectedDayOrders.length > 1 ? 's' : ''} with deadline on this date.`}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {selectedDayOrders.map(order => {
                const startLabel = order._startDate ? order._startDate.toLocaleDateString() : '-';
                const endLabel = order._endDate ? order._endDate.toLocaleDateString() : '-';
                const customer = order.customerName || order.party?.name || 'Customer';
                const primaryItem = Array.isArray(order.items) && order.items.length > 0
                  ? (order.items[0].itemName || order.items[0].name || 'Item')
                  : 'Item';

                return (
                  <div
                    key={order._id}
                    className="border border-slate-200 rounded-lg p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          PO: {order.poNumber || 'N/A'}
                        </p>
                        <p className="text-xs text-slate-500">{customer}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Item: {primaryItem}</p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                          order.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : order.status === 'Dispatch'
                            ? 'bg-blue-100 text-blue-700'
                            : order.status === 'Manufacturing'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {order.status || 'New'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-slate-600 mb-1">
                      <div>
                        <p className="uppercase text-[10px] text-slate-400">Start</p>
                        <p className="font-medium">{startLabel}</p>
                      </div>
                      <div className="h-px flex-1 mx-2 bg-gradient-to-r from-slate-300 via-slate-400 to-slate-300" />
                      <div className="text-right">
                        <p className="uppercase text-[10px] text-slate-400">Deadline</p>
                        <p className="font-medium">{endLabel}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-1 text-[11px]">
                      <span className="font-medium text-slate-700">₹{(order.totalAmount || 0).toLocaleString()}</span>
                      {(order.items || []).some(i => (i.priority || '').toLowerCase() === 'high') && (
                        <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-semibold flex items-center gap-1">
                          <span>High Priority</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {!loading && !error && selectedDayOrders.length === 0 && (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No active orders for this date.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderCalendar;
