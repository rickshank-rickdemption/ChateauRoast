import React, { useEffect, useMemo, useState } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import gsap from 'gsap';
import { Search, ChefHat, CheckCircle2, ListOrdered, Coffee, Leaf, Cookie } from 'lucide-react';

const formatPHP = (value) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value || 0));

const resolveHttpApiBase = () => {
  const wsRaw = String(import.meta.env.VITE_WS_URL || '').trim();
  if (wsRaw.startsWith('ws://')) return `http://${wsRaw.slice(5)}`;
  if (wsRaw.startsWith('wss://')) return `https://${wsRaw.slice(6)}`;
  if (wsRaw.startsWith('http://') || wsRaw.startsWith('https://')) return wsRaw;
  if (typeof window !== 'undefined') return `${window.location.protocol}//${window.location.hostname}:8080`;
  return 'http://127.0.0.1:8080';
};

const getItemType = (name) => {
  const raw = String(name || '').toLowerCase();
  if (raw.includes('matcha')) return 'matcha';
  if (
    raw.includes('cookie') ||
    raw.includes('croissant') ||
    raw.includes('bagel') ||
    raw.includes('donut') ||
    raw.includes('timbit') ||
    raw.includes('smores') ||
    raw.includes('pop tart') ||
    raw.includes('siopao')
  ) {
    return 'pastry';
  }
  return 'coffee';
};

const getOrderStatusBadgeClass = (statusValue) => {
  const status = String(statusValue || '').trim().toLowerCase();
  if (status === 'pending') return 'bg-amber-100 text-amber-800';
  if (status === 'preparing') return 'bg-indigo-100 text-indigo-800';
  if (status === 'completed') return 'bg-emerald-100 text-emerald-800';
  if (status === 'cancelled') return 'bg-rose-100 text-rose-800';
  return 'bg-black/10 text-black/70';
};

const KitchenDashboard = () => {
  const { lastMessage, sendMessage, isReady } = useWebSocket();
  const { logout, user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [pendingStatusUpdateId, setPendingStatusUpdateId] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!isReady) return;
    sendMessage('GET_ACTIVE_ORDERS');
    sendMessage('GET_ORDER_HISTORY');
  }, [isReady, sendMessage, refreshTick]);

  useEffect(() => {
    if (!isReady) return;
    const interval = setInterval(() => {
      sendMessage('GET_ACTIVE_ORDERS');
      sendMessage('GET_ORDER_HISTORY');
    }, 10000);
    return () => clearInterval(interval);
  }, [isReady, sendMessage]);

  useEffect(() => {
    const refetch = () => {
      if (!isReady) return;
      sendMessage('GET_ACTIVE_ORDERS');
      sendMessage('GET_ORDER_HISTORY');
    };
    window.addEventListener('focus', refetch);
    document.addEventListener('visibilitychange', refetch);
    return () => {
      window.removeEventListener('focus', refetch);
      document.removeEventListener('visibilitychange', refetch);
    };
  }, [isReady, sendMessage]);

  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'INIT_ORDERS') {
      setOrders(lastMessage.payload || []);
      if (isUpdatingStatus && pendingStatusUpdateId != null) {
        const exists = (lastMessage.payload || []).some((order) => Number(order.id) === Number(pendingStatusUpdateId));
        if (!exists) {
          setIsUpdatingStatus(false);
          setPendingStatusUpdateId(null);
        }
      }
    } else if (lastMessage.type === 'ORDER_HISTORY') {
      const history = lastMessage.payload || [];
      setOrderHistory(history);
      const activeFromHistory = history
        .filter((order) => {
          const status = String(order.status || '').trim().toLowerCase();
          return status === 'pending' || status === 'preparing';
        })
        .map((order) => ({
          ...order,
          customer: order.customer || order.customer_name,
          time: order.time || order.created_at
        }));
      setOrders(activeFromHistory);
    } else if (lastMessage.type === 'NEW_ORDER') {
      const newOrder = lastMessage.payload;
      setOrders((prev) => [...prev, newOrder]);
      gsap.fromTo(
        `#order-${newOrder.id}`,
        { backgroundColor: '#fffbe6' },
        { backgroundColor: 'white', duration: 1 }
      );
    } else if (lastMessage.type === 'STATUS_UPDATED') {
      let updatedOrder = null;
      setOrders((prev) =>
        prev.map((o) => {
          if (Number(o.id) !== Number(lastMessage.payload.id)) return o;
          updatedOrder = { ...o, status: lastMessage.payload.status };
          return updatedOrder;
        })
      );
      setOrderHistory((prev) => {
        const next = [...prev];
        const idx = next.findIndex((order) => Number(order.id) === Number(lastMessage.payload.id));
        if (idx >= 0) {
          next[idx] = { ...next[idx], status: lastMessage.payload.status };
          return next;
        }
        if (!updatedOrder) return next;
        return [
          {
            id: updatedOrder.id,
            customer_name: updatedOrder.customer_name || updatedOrder.customer || 'Guest Customer',
            status: updatedOrder.status,
            total: updatedOrder.total || 0,
            payment_method: updatedOrder.payment_method || 'cash',
            receipt_number: updatedOrder.receipt_number || '-',
            created_at: updatedOrder.created_at || new Date().toISOString().slice(0, 19).replace('T', ' ')
          },
          ...next
        ];
      });
      setActionError('');
      setIsUpdatingStatus(false);
      setPendingStatusUpdateId(null);
    } else if (lastMessage.type === 'SERVER_ERROR') {
      setActionError(lastMessage.payload?.message || 'Unable to update order status.');
      setIsUpdatingStatus(false);
      setPendingStatusUpdateId(null);
    }
  }, [lastMessage, sendMessage, isUpdatingStatus, pendingStatusUpdateId]);

  useEffect(() => {
    if (!isUpdatingStatus || pendingStatusUpdateId == null) return;
    const timer = setTimeout(() => {
      setIsUpdatingStatus(false);
      setPendingStatusUpdateId(null);
      setActionError('Status update timed out. Please try again.');
      sendMessage('GET_ACTIVE_ORDERS');
      sendMessage('GET_ORDER_HISTORY');
    }, 15000);
    return () => clearTimeout(timer);
  }, [isUpdatingStatus, pendingStatusUpdateId, sendMessage]);

  useEffect(() => {
    if (!orders.length) {
      setSelectedOrderId(null);
      return;
    }
    if (!selectedOrderId || !orders.some((o) => Number(o.id) === Number(selectedOrderId))) {
      setSelectedOrderId(orders[0].id);
    }
  }, [orders, selectedOrderId]);

  const updateStatus = async (id, status) => {
    if (!isReady) {
      setActionError('Server disconnected. Please try again.');
      return;
    }
    setIsUpdatingStatus(true);
    setPendingStatusUpdateId(id);
    setActionError('');

    try {
      const apiBase = resolveHttpApiBase();
      const url = new URL('/api/update-status', apiBase);
      url.searchParams.set('id', String(id));
      url.searchParams.set('status', status);
      url.searchParams.set('auth_username', user?.username || '');

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(url.toString(), {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeout);

      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok || !data?.ok) {
        setActionError(data?.message || 'Unable to update order status.');
        setIsUpdatingStatus(false);
        setPendingStatusUpdateId(null);
        return;
      }

      setOrders((prev) =>
        prev.map((order) => (Number(order.id) === Number(id) ? { ...order, status } : order))
      );
      setOrderHistory((prev) =>
        prev.map((order) => (Number(order.id) === Number(id) ? { ...order, status } : order))
      );
      setActionError('');
      setIsUpdatingStatus(false);
      setPendingStatusUpdateId(null);
      setRefreshTick((v) => v + 1);
    } catch (error) {
      setActionError('Status update failed. Please try again.');
      setIsUpdatingStatus(false);
      setPendingStatusUpdateId(null);
    }
  };

  const completedOrders = useMemo(
    () =>
      orderHistory
        .filter((order) => String(order.status || '').trim().toLowerCase() === 'completed')
        .map((order) => ({
          ...order,
          customer: order.customer || order.customer_name,
          time: order.time || order.created_at,
          items: order.items || []
        })),
    [orderHistory]
  );

  const ordersForCards = useMemo(() => {
    if (statusFilter === 'completed') return completedOrders;
    return orders;
  }, [statusFilter, completedOrders, orders]);

  const filteredOrders = useMemo(() => {
    const query = orderSearch.trim().toLowerCase();
    return ordersForCards.filter((order) => {
      const normalizedStatus = String(order.status || '').toLowerCase();
      const status = normalizedStatus.trim();
      const matchStatus = statusFilter === 'all' ? status === 'pending' || status === 'preparing' : status === statusFilter;
      const matchQuery = query
        ? `${order.id} ${order.customer || order.customer_name || ''} ${status}`.toLowerCase().includes(query)
        : true;
      return matchStatus && matchQuery;
    });
  }, [ordersForCards, statusFilter, orderSearch]);

  const selectedOrder = filteredOrders.find((order) => Number(order.id) === Number(selectedOrderId)) || null;
  const selectedOrderStatus = String(selectedOrder?.status || '').trim().toLowerCase();
  const pendingCount = orders.filter((o) => String(o.status || '').trim().toLowerCase() === 'pending').length;
  const preparingCount = orders.filter((o) => String(o.status || '').trim().toLowerCase() === 'preparing').length;
  const completedToday = orderHistory.filter((o) => String(o.status || '').trim().toLowerCase() === 'completed').length;
  const filteredHistory = useMemo(() => {
    const query = orderSearch.trim().toLowerCase();
    if (!query) return orderHistory;
    return orderHistory.filter((order) =>
      `${order.id} ${order.customer_name || ''} ${order.status || ''} ${order.payment_method || ''} ${order.receipt_number || ''}`
        .toLowerCase()
        .includes(query)
    );
  }, [orderHistory, orderSearch]);
  const HISTORY_PAGE_SIZE = 5;
  const historyTotalPages = Math.max(1, Math.ceil(filteredHistory.length / HISTORY_PAGE_SIZE));
  const paginatedHistory = useMemo(() => {
    const safePage = Math.min(historyPage, historyTotalPages);
    const start = (safePage - 1) * HISTORY_PAGE_SIZE;
    return filteredHistory.slice(start, start + HISTORY_PAGE_SIZE);
  }, [filteredHistory, historyPage, historyTotalPages]);

  useEffect(() => {
    setHistoryPage(1);
  }, [orderSearch, orderHistory.length]);

  useEffect(() => {
    if (historyPage > historyTotalPages) {
      setHistoryPage(historyTotalPages);
    }
  }, [historyPage, historyTotalPages]);

  return (
    <main className="role-page">
      <div className="role-main mx-auto w-full max-w-[1360px] px-2 sm:px-3">
        <header className="relative mb-4 sm:flex sm:items-start sm:justify-between sm:gap-3">
          <div className="pr-24 sm:pr-0">
            <h2 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">Kitchen Display</h2>
            <p className="text-sm text-black/60">Real-time order queue and preparation workflow.</p>
          </div>
          <button
            onClick={logout}
            className="role-btn role-btn-danger absolute right-0 top-0 sm:static"
          >
            Logout
          </button>
        </header>

        <div className="role-panel p-3 sm:p-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.9fr_1fr]">
            <div className="rounded-2xl border border-emerald-900/20 bg-white p-3">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="flex w-full items-center gap-2 rounded-full border border-emerald-900/35 px-3 py-2 sm:w-auto">
                  <Search size={15} className="text-emerald-900/70" />
                  <input
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search order or customer..."
                    className="min-w-0 w-full bg-transparent text-sm outline-none sm:w-[260px]"
                  />
                </div>
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`rounded-full border border-black/30 px-3 py-1 text-xs font-semibold ${statusFilter === 'all' ? 'bg-[#0C090A] text-white' : 'bg-white text-black/70'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`rounded-full border border-black/30 px-3 py-1 text-xs font-semibold ${statusFilter === 'pending' ? 'bg-[#0C090A] text-white' : 'bg-white text-black/70'}`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setStatusFilter('preparing')}
                  className={`rounded-full border border-black/30 px-3 py-1 text-xs font-semibold ${statusFilter === 'preparing' ? 'bg-[#0C090A] text-white' : 'bg-white text-black/70'}`}
                >
                  Preparing
                </button>
                <button
                  onClick={() => setStatusFilter('completed')}
                  className={`rounded-full border border-black/30 px-3 py-1 text-xs font-semibold ${statusFilter === 'completed' ? 'bg-[#0C090A] text-white' : 'bg-white text-black/70'}`}
                >
                  Completed
                </button>
              </div>

              <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <article className="rounded-xl border border-[#e6dfd5] bg-[#f7ecdc] p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-black/55">Pending</p>
                  <p className="mt-1 text-3xl font-semibold leading-none sm:text-4xl">{pendingCount}</p>
                </article>
                <article className="rounded-xl border border-[#ddd9ee] bg-[#f0ebfa] p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-black/55">Preparing</p>
                  <p className="mt-1 text-3xl font-semibold leading-none sm:text-4xl">{preparingCount}</p>
                </article>
                <article className="rounded-xl border border-[#d9ead7] bg-[#eaf5e9] p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-black/55">Completed</p>
                  <p className="mt-1 text-3xl font-semibold leading-none sm:text-4xl">{completedToday}</p>
                </article>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filteredOrders.map((order) => (
                  <article
                    key={order.id}
                    id={`order-${order.id}`}
                    className={`rounded-2xl border p-3 transition ${
                      selectedOrderId === order.id ? 'border-emerald-700 bg-emerald-50/50' : 'border-emerald-900/30 bg-white'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${getOrderStatusBadgeClass(order.status)}`}>
                        {order.status}
                      </span>
                      <button
                        onClick={() => setSelectedOrderId(order.id)}
                        className="h-8 w-8 rounded-full border border-emerald-900/35 text-lg leading-none text-emerald-900"
                      >
                        +
                      </button>
                    </div>
                    <p className="font-semibold">Order #{order.id}</p>
                    <p className="text-sm text-black/70">{order.customer || order.customer_name || 'Walk-in'}</p>
                    <p className="text-xs text-black/50">{order.time || order.created_at || ''}</p>
                    <p className="mt-1 text-sm font-semibold">{(order.items || []).length} items</p>
                  </article>
                ))}
                {filteredOrders.length === 0 ? (
                  <p className="text-sm text-black/55">No active orders match your filter.</p>
                ) : null}
              </div>
            </div>

            <aside className="rounded-2xl border border-emerald-900/20 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-semibold">Order Details</p>
                <ListOrdered size={16} className="text-black/45" />
              </div>

              {actionError ? (
                <div className="mb-3 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {actionError}
                </div>
              ) : null}

              {selectedOrder ? (
                <>
                  <div className="rounded-xl border border-emerald-900/25 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-black/55">Selected Order</p>
                    <p className="mt-1 text-lg font-semibold">#{selectedOrder.id}</p>
                    <p className="text-sm text-black/65">{selectedOrder.customer || selectedOrder.customer_name || 'Walk-in'}</p>
                    <p className="text-xs text-black/50">{selectedOrder.time || selectedOrder.created_at || ''}</p>
                  </div>

                  <div className="mt-3 rounded-xl border border-black/10 p-3">
                    <p className="mb-2 text-xs uppercase tracking-[0.12em] text-black/55">Order List</p>
                    <div className="max-h-[210px] space-y-2 overflow-y-auto">
                      {(selectedOrder.items || []).map((item, idx) => (
                        <div key={`${item.name}-${idx}`} className="flex items-center justify-between rounded-lg border border-black/10 px-2 py-1.5 text-sm">
                          <span className="flex items-center gap-2">
                            {getItemType(item.name) === 'matcha' ? (
                              <Leaf size={14} className="text-black/45" />
                            ) : getItemType(item.name) === 'pastry' ? (
                              <Cookie size={14} className="text-black/45" />
                            ) : (
                              <Coffee size={14} className="text-black/45" />
                            )}
                            {item.name}
                          </span>
                          <span className="font-semibold">x{item.qty}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    <button
                      onClick={() => updateStatus(selectedOrder.id, 'preparing')}
                      disabled={selectedOrderStatus !== 'pending' || isUpdatingStatus}
                      className="role-btn role-btn-ghost w-full !py-2.5 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <ChefHat size={14} className="mr-1 inline" />
                      {isUpdatingStatus ? 'Updating...' : 'Start Prep'}
                    </button>
                    <button
                      onClick={() => updateStatus(selectedOrder.id, 'completed')}
                      disabled={selectedOrderStatus !== 'preparing' || isUpdatingStatus}
                      className="role-btn role-btn-primary w-full !py-2.5 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <CheckCircle2 size={14} className="mr-1 inline" />
                      {isUpdatingStatus ? 'Updating...' : 'Mark as Completed'}
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-black/60">Select an order from the left panel.</p>
              )}

              <hr className="my-4 border-black/10" />
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.12em] text-black/55">Latest Completed</p>
                <div className="space-y-2">
                  {orderHistory
                    .filter((order) => String(order.status || '').trim().toLowerCase() === 'completed')
                    .slice(0, 3)
                    .map((order) => (
                      <div key={order.id} className="flex items-center justify-between rounded-lg border border-black/10 px-2 py-1.5 text-sm">
                        <span>#{order.id}</span>
                        <span>{formatPHP(order.total || 0)}</span>
                      </div>
                    ))}
                </div>
              </div>
            </aside>
          </div>
        </div>

        <section className="role-panel mt-4 p-3 sm:p-4">
          <h3 className="mb-3 font-serif text-xl font-semibold sm:text-2xl">Order History</h3>
          <div className="overflow-x-auto">
            <table className="role-table w-full border-collapse">
              <thead>
                <tr className="border-b text-left text-sm">
                  <th className="py-2">Order</th>
                  <th className="py-2">Customer</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Total</th>
                  <th className="py-2">Payment</th>
                  <th className="py-2">Receipt</th>
                  <th className="py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {paginatedHistory.map((order) => (
                  <tr key={order.id} className="text-sm">
                    <td className="py-2">#{order.id}</td>
                    <td className="py-2">{order.customer_name || '-'}</td>
                    <td className="py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${getOrderStatusBadgeClass(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-2">{formatPHP(order.total || 0)}</td>
                    <td className="py-2 uppercase">{order.payment_method || '-'}</td>
                    <td className="py-2">{order.receipt_number || '-'}</td>
                    <td className="py-2">{order.created_at}</td>
                  </tr>
                ))}
                {paginatedHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-3 text-sm text-black/55">No order history matched your search.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {filteredHistory.length > HISTORY_PAGE_SIZE ? (
            <div className="mt-3 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setHistoryPage((prev) => Math.max(1, prev - 1))}
                disabled={historyPage === 1}
                className="rounded-full border border-black/20 px-3 py-1 text-xs font-semibold disabled:opacity-40"
              >
                Prev
              </button>
              {Array.from({ length: historyTotalPages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setHistoryPage(page)}
                  className={`h-8 min-w-8 rounded-full border px-2 text-xs font-semibold ${
                    historyPage === page ? 'border-[#0C090A] bg-[#0C090A] text-white' : 'border-black/20 text-black/70'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setHistoryPage((prev) => Math.min(historyTotalPages, prev + 1))}
                disabled={historyPage === historyTotalPages}
                className="rounded-full border border-black/20 px-3 py-1 text-xs font-semibold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
};

export default KitchenDashboard;
