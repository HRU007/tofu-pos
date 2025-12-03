import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingCart, Plus, Minus, Trash2, Send, CheckCircle, ChefHat, 
  Flame, Utensils, LayoutDashboard, Package, DollarSign, 
  BarChart3, PieChart as PieChartIcon, Calendar, History, ArrowLeft, 
  UploadCloud, FileSpreadsheet, Pencil, Clock, Receipt, AlertTriangle, Edit, HelpCircle, Copy
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';
import { Card, Button, Modal, Toast, Badge, Tabs, Input } from './components/ui';
import { 
  Dish, SpiceLevel, Addon, CartItem, SubmitStatus, 
  OrderRecord, StockEntry, TimeRange, ChartType, FrequentStockItem 
} from './types';

// --- Configuration Data ---
const MAIN_DISHES: Dish[] = [
  { id: 'm1', name: '麻辣招牌', price: 100 },
  { id: 'm2', name: '麻辣總匯', price: 80 },
  { id: 'm4', name: '綜合煲', price: 60 },
  { id: 'm8', name: '綜合麵', price: 60 },
  { id: 'm3', name: '香豆腐煲', price: 60 },
  { id: 'm7', name: '香豆腐麵', price: 60 },
  { id: 'm5', name: '鴨血煲', price: 60 },
  { id: 'm9', name: '鴨血麵', price: 60 },
  { id: 'm10', name: '乾泡麵', price: 60 },
  { id: 'm6', name: '豬肉麵', price: 60 },
];

const SPICINESS_LEVELS: SpiceLevel[] = [
  { id: '大辣', label: '大辣', color: 'bg-red-600' },
  { id: '中辣', label: '中辣', color: 'bg-red-500' },
  { id: '小辣', label: '小辣', color: 'bg-red-400' },
  { id: '微辣', label: '微辣', color: 'bg-orange-300' },
  { id: '不辣', label: '不辣', color: 'bg-slate-300' },
];

const ADD_ONS: Addon[] = [
  { id: 'a1', name: '豬肉片', price: 30 },
  { id: 'a2', name: '牛肉片', price: 30 },
  { id: 'a3', name: '臭豆腐', price: 20 },
  { id: 'a4', name: '鴨血', price: 20 },
  { id: 'a11', name: '菜', price: 20 },
  { id: 'a5', name: '金針菇', price: 20 },
  { id: 'a6', name: '玉米筍', price: 20 },
  { id: 'a12', name: '餛飩', price: 30 },
  { id: 'a8', name: '貢丸', price: 20 },
  { id: 'a7', name: '起司球', price: 20 },
  { id: 'a13', name: '龍蝦沙拉丸', price: 20 },
  { id: 'a9', name: '魚蛋', price: 20 },
  { id: 'a14', name: '蟹肉棒', price: 20 },
  { id: 'a10', name: '豆皮', price: 10 },
  { id: 'a15', name: '麻辣湯', price: 35 },
  { id: 'a16', name: '王子麵', price: 15 },
  { id: 'a17', name: '烏龍麵', price: 15 },
  { id: 'a18', name: '冬粉', price: 15 },
];

// --- Helper Functions ---
const calculateItemTotal = (dish: Dish, addons: Record<string, number>) => {
  let total = dish.price;
  Object.entries(addons).forEach(([id, qty]) => {
    const addon = ADD_ONS.find(a => a.id === id);
    if (addon) total += addon.price * qty;
  });
  return total;
};

// --- Google API Config ---
const GOOGLE_CLIENT_ID = "GOOGLE_CLIENT_ID"; 
const GOOGLE_API_KEY = ""; 
const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

// --- Sub-components (Admin) ---

const SalesAnalysis: React.FC<{ 
  orders: OrderRecord[],
  onUpdateOrder: (order: OrderRecord) => void,
  onDeleteOrder: (id: string) => void
}> = ({ orders, onUpdateOrder, onDeleteOrder }) => {
  const [range, setRange] = useState<TimeRange | 'today'>('today');
  const [chartType, setChartType] = useState<ChartType>('bar');
  
  // Edit Order State
  const [editingOrder, setEditingOrder] = useState<OrderRecord | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editItems, setEditItems] = useState<CartItem[]>([]); // Items currently being edited

  // Item Editor State (Nested Modal)
  const [isDishSelectorOpen, setIsDishSelectorOpen] = useState(false);
  const [itemEditor, setItemEditor] = useState<{
    isOpen: boolean;
    mode: 'add' | 'edit';
    index: number; // Index in editItems array
    dish: Dish | null;
    spice: string;
    addons: Record<string, number>;
  }>({
    isOpen: false,
    mode: 'add',
    index: -1,
    dish: null,
    spice: '微辣',
    addons: {}
  });

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const [customStart, setCustomStart] = useState(todayStr);
  const [customEnd, setCustomEnd] = useState(todayStr);

  // --- Filtering Logic ---
  const filteredOrders = useMemo(() => {
    const now = new Date();
    let startDate = new Date();

    if (range === 'custom') {
      if (!customStart || !customEnd) return orders; 
      const end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
      return orders.filter(o => {
        const d = new Date(o.timestamp);
        return d >= new Date(customStart) && d <= end;
      });
    }

    switch (range) {
      case 'today':
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case '3days': startDate.setDate(now.getDate() - 3); break;
      case '7days': startDate.setDate(now.getDate() - 7); break;
      case '2weeks': startDate.setDate(now.getDate() - 14); break;
      case '1month': startDate.setMonth(now.getMonth() - 1); break;
      case '3months': startDate.setMonth(now.getMonth() - 3); break;
      case '6months': startDate.setMonth(now.getMonth() - 6); break;
      case '1year': startDate.setFullYear(now.getFullYear() - 1); break;
    }

    return orders.filter(o => new Date(o.timestamp) >= startDate);
  }, [orders, range, customStart, customEnd]);

  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [filteredOrders]);

  const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalCount = filteredOrders.reduce((sum, o) => sum + o.items.length, 0);
  
  const productStats = useMemo(() => {
    const stats: Record<string, number> = {};
    filteredOrders.forEach(o => {
      o.items.forEach(item => {
        stats[item.dish.name] = (stats[item.dish.name] || 0) + 1;
      });
    });
    return Object.entries(stats)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [filteredOrders]);

  const COLORS = ['#3b82f6', '#f97316', '#10b981', '#f43f5e', '#8b5cf6', '#06b6d4'];

  // --- Order Editing Handlers ---

  const handleStartEditOrder = (order: OrderRecord) => {
    const dt = new Date(order.timestamp);
    setEditingOrder(order);
    setEditDate(dt.toISOString().split('T')[0]);
    setEditTime(dt.toTimeString().slice(0, 5));
    // Deep copy items to avoid mutating state directly
    setEditItems(JSON.parse(JSON.stringify(order.items)));
  };

  const handleSaveOrder = () => {
    if (!editingOrder) return;
    const newTimestamp = new Date(`${editDate}T${editTime}:00`).toISOString();
    
    // Recalculate total based on current items
    const newTotal = editItems.reduce((sum, item) => sum + item.totalPrice, 0);

    const updatedOrder: OrderRecord = {
      ...editingOrder,
      timestamp: newTimestamp,
      items: editItems,
      totalAmount: newTotal
    };
    onUpdateOrder(updatedOrder);
    setEditingOrder(null);
  };

  const handleDeleteItem = (index: number) => {
    const newItems = [...editItems];
    newItems.splice(index, 1);
    setEditItems(newItems);
  };

  // --- Item Editing (Inner Modal) Handlers ---

  const openNewItemSelector = () => {
    setIsDishSelectorOpen(true);
  };

  const selectDishForNewItem = (dish: Dish) => {
    setIsDishSelectorOpen(false);
    setItemEditor({
      isOpen: true,
      mode: 'add',
      index: -1,
      dish: dish,
      spice: '微辣',
      addons: {}
    });
  };

  const openEditItem = (item: CartItem, index: number) => {
    setItemEditor({
      isOpen: true,
      mode: 'edit',
      index: index,
      dish: item.dish,
      spice: item.spice,
      addons: { ...item.addons }
    });
  };

  const handleItemEditorAddonLimit = (addonId: string, delta: number) => {
    setItemEditor(prev => {
      const currentQty = prev.addons[addonId] || 0;
      const newQty = Math.max(0, currentQty + delta);
      const newAddons = { ...prev.addons };
      if (newQty === 0) {
        delete newAddons[addonId];
      } else {
        newAddons[addonId] = newQty;
      }
      return { ...prev, addons: newAddons };
    });
  };

  const saveItemEditor = () => {
    if (!itemEditor.dish) return;

    const totalPrice = calculateItemTotal(itemEditor.dish, itemEditor.addons);
    const newItem: CartItem = {
      cartId: itemEditor.mode === 'edit' ? editItems[itemEditor.index].cartId : Date.now(),
      dish: itemEditor.dish,
      spice: itemEditor.spice,
      addons: itemEditor.addons,
      totalPrice: totalPrice
    };

    if (itemEditor.mode === 'add') {
      setEditItems([...editItems, newItem]);
    } else {
      const newItems = [...editItems];
      newItems[itemEditor.index] = newItem;
      setEditItems(newItems);
    }
    setItemEditor(prev => ({ ...prev, isOpen: false }));
  };

  const handleConfirmDeleteOrder = () => {
    if (deletingId) {
      onDeleteOrder(deletingId);
      setDeletingId(null);
    }
  };

  // Calculate dynamic total for the edit modal
  const editOrderTotal = editItems.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <label className="text-sm font-bold flex items-center gap-2 text-slate-700">
          <Calendar className="h-4 w-4" /> 選擇時間區間
        </label>
        <div className="flex flex-wrap gap-2">
          <button
              onClick={() => setRange('today')}
              className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-colors ${range === 'today' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
          >
            當天
          </button>
          {['3days', '7days', '2weeks', '1month', '3months'].map(r => (
            <button
              key={r}
              onClick={() => setRange(r as TimeRange)}
              className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-colors ${range === r ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
            >
              {r === '3days' ? '3天' : r === '7days' ? '7天' : r === '2weeks' ? '2週' : r === '1month' ? '1個月' : '3個月'}
            </button>
          ))}
          <button onClick={() => setRange('custom')} className={`px-3 py-1.5 text-xs font-bold rounded-full border ${range === 'custom' ? 'bg-blue-600 text-white' : 'bg-slate-50'}`}>自訂</button>
        </div>
        {range === 'custom' && (
          <div className="flex gap-2 pt-2 animate-in slide-in-from-top-2">
             <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} />
             <div className="flex items-center text-slate-400">至</div>
             <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 bg-blue-50 border-blue-100">
           <div className="text-xs text-blue-600 font-bold uppercase tracking-wider">總營業額</div>
           <div className="text-2xl font-bold text-slate-900 mt-1">${totalRevenue.toLocaleString()}</div>
        </Card>
        <Card className="p-4 bg-orange-50 border-orange-100">
           <div className="text-xs text-orange-600 font-bold uppercase tracking-wider">總售出數量</div>
           <div className="text-2xl font-bold text-slate-900 mt-1">{totalCount} <span className="text-sm font-normal text-slate-500">份</span></div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-800">熱銷商品統計</h3>
          <div className="flex bg-slate-100 p-1 rounded-lg">
             <button onClick={() => setChartType('bar')} className={`p-1.5 rounded ${chartType === 'bar' ? 'bg-white shadow' : 'text-slate-500'}`}><BarChart3 className="h-4 w-4" /></button>
             <button onClick={() => setChartType('pie')} className={`p-1.5 rounded ${chartType === 'pie' ? 'bg-white shadow' : 'text-slate-500'}`}><PieChartIcon className="h-4 w-4" /></button>
          </div>
        </div>
        
        <div className="bg-slate-50 rounded-lg border border-slate-100 p-2 h-64">
            {productStats.length === 0 ? (
              <div className="text-slate-400 text-sm h-full flex items-center justify-center">無資料</div>
            ) : chartType === 'bar' ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productStats.slice(0, 10)} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} height={40} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{fill: '#e2e8f0'}}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {productStats.slice(0, 10).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={productStats.slice(0, 6)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                  >
                    {productStats.slice(0, 6).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
        </div>
      </Card>

      {/* Order List */}
      <div className="space-y-3">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 mt-4">
          <Receipt className="h-4 w-4" /> 訂單明細
        </h3>
        {sortedOrders.length === 0 ? (
           <div className="text-center py-8 text-slate-400 bg-white rounded-xl border border-slate-100">
             沒有符合條件的訂單
           </div>
        ) : (
           sortedOrders.map(order => (
             <div key={order.id} className="bg-white p-3 rounded-lg border border-slate-100 flex justify-between items-center group shadow-sm">
                <div className="flex-1">
                   <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                        {new Date(order.timestamp).toLocaleString('zh-TW', {month: '2-digit', day: '2-digit', hour: '2-digit', minute:'2-digit'})}
                      </span>
                      <span className="font-bold text-slate-800">${order.totalAmount}</span>
                   </div>
                   <div className="text-xs text-slate-500 truncate max-w-[200px]">
                     {order.items.map(i => i.dish.name).join(', ')}
                   </div>
                </div>
                <div className="flex items-center gap-2">
                   <button 
                      onClick={() => handleStartEditOrder(order)}
                      className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                   >
                      <Pencil className="h-4 w-4" />
                   </button>
                   <button 
                      onClick={() => setDeletingId(order.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                   >
                      <Trash2 className="h-4 w-4" />
                   </button>
                </div>
             </div>
           ))
        )}
      </div>

      {/* 1. Edit Order Modal (Main) */}
      <Modal
        isOpen={!!editingOrder}
        onClose={() => setEditingOrder(null)}
        title="編輯訂單"
        footer={
           <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditingOrder(null)}>取消</Button>
              <Button className="flex-1" onClick={handleSaveOrder}>儲存變更</Button>
           </div>
        }
      >
         <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
               <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">日期</label>
                  <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
               </div>
               <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">時間</label>
                  <Input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} />
               </div>
            </div>

            <div>
               <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-500">訂單品項</label>
                  <Button variant="ghost" className="h-7 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100" onClick={openNewItemSelector}>
                    <Plus className="h-3 w-3 mr-1" /> 新增
                  </Button>
               </div>
               
               <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                 {editItems.length === 0 ? (
                   <div className="p-4 text-center text-slate-400 text-sm">無品項</div>
                 ) : (
                   editItems.map((item, idx) => (
                    <div key={idx} className="border-b border-slate-200 last:border-0 p-3 flex justify-between items-center bg-white">
                       <div className="flex-1">
                          <div className="font-bold text-sm text-slate-800">{item.dish.name}</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-100">{item.spice}</span>
                            {Object.entries(item.addons).map(([id, qty]) => {
                                const addon = ADD_ONS.find(a => a.id === id);
                                return <span key={id} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">{addon?.name} x{qty}</span>
                            })}
                          </div>
                       </div>
                       <div className="flex items-center gap-2 pl-2">
                          <span className="font-bold text-sm">${item.totalPrice}</span>
                          <div className="flex gap-1">
                            <button onClick={() => openEditItem(item, idx)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit className="h-4 w-4"/></button>
                            <button onClick={() => handleDeleteItem(idx)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4"/></button>
                          </div>
                       </div>
                    </div>
                 ))
                 )}
               </div>
            </div>

            <div>
               <label className="text-xs font-bold text-slate-500 mb-1 block">訂單總金額 (自動計算)</label>
               <div className="text-xl font-bold text-blue-600 bg-slate-100 p-2 rounded border border-slate-200 text-right">
                  ${editOrderTotal}
               </div>
            </div>
         </div>
      </Modal>

      {/* 2. Dish Selector Modal (For adding new item) */}
      <Modal
        isOpen={isDishSelectorOpen}
        onClose={() => setIsDishSelectorOpen(false)}
        title="選擇餐點"
      >
        <div className="grid grid-cols-2 gap-3">
          {MAIN_DISHES.map(dish => (
            <Card 
                key={dish.id} 
                className="cursor-pointer hover:shadow-md transition-all active:scale-95 border-slate-200 p-3 text-center"
                onClick={() => selectDishForNewItem(dish)}
            >
              <div className="font-bold text-slate-800">{dish.name}</div>
              <div className="text-sm font-bold text-blue-600 mt-1">${dish.price}</div>
            </Card>
          ))}
        </div>
      </Modal>

      {/* 3. Item Editor Modal (Customize Dish) */}
      <Modal
        isOpen={itemEditor.isOpen}
        onClose={() => setItemEditor(prev => ({ ...prev, isOpen: false }))}
        title={itemEditor.dish?.name || '編輯餐點'}
        footer={
          <Button className="w-full" onClick={saveItemEditor}>
            {itemEditor.mode === 'add' ? '加入訂單' : '更新餐點'} 
            (${itemEditor.dish && calculateItemTotal(itemEditor.dish, itemEditor.addons)})
          </Button>
        }
      >
          <div className="space-y-6">
            <div className="space-y-3">
                <label className="text-sm font-bold flex items-center gap-2 text-slate-700">
                    <Flame className="h-4 w-4 text-red-500" /> 辣度
                </label>
                <div className="flex flex-wrap gap-2">
                    {SPICINESS_LEVELS.map((spice) => (
                        <div 
                            key={spice.id}
                            onClick={() => setItemEditor(prev => ({...prev, spice: spice.id}))}
                            className={`
                                px-4 py-2 rounded-full text-sm font-bold cursor-pointer transition-all border select-none
                                ${itemEditor.spice === spice.id 
                                    ? `${spice.color} text-white border-transparent scale-105 shadow-md` 
                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}
                            `}
                        >
                            {spice.label}
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-dashed border-slate-200">
                <label className="text-sm font-bold flex items-center gap-2 text-slate-700">
                    <Utensils className="h-4 w-4 text-orange-500" /> 加點食材
                </label>
                <div className="grid grid-cols-1 gap-2">
                    {ADD_ONS.map((addon) => {
                        const count = itemEditor.addons[addon.id] || 0;
                        return (
                            <div key={addon.id} className="flex justify-between items-center p-3 rounded-lg bg-slate-50 border border-slate-100">
                                <span className="font-medium text-slate-700 flex items-center gap-2">
                                  {addon.name} 
                                  <span className="text-slate-400 text-xs bg-white px-1.5 py-0.5 rounded border border-slate-200">+${addon.price}</span>
                                </span>
                                <div className="flex items-center gap-3">
                                    <button 
                                        className={`h-8 w-8 rounded-full flex items-center justify-center border transition-colors ${count === 0 ? 'border-slate-200 text-slate-300' : 'border-slate-300 text-slate-600 hover:bg-slate-200'}`}
                                        disabled={count === 0}
                                        onClick={() => handleItemEditorAddonLimit(addon.id, -1)}
                                    >
                                        <Minus className="h-4 w-4" />
                                    </button>
                                    <span className={`w-6 text-center font-bold text-lg ${count > 0 ? 'text-blue-600' : 'text-slate-300'}`}>{count}</span>
                                    <button 
                                        className="h-8 w-8 rounded-full flex items-center justify-center border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"
                                        onClick={() => handleItemEditorAddonLimit(addon.id, 1)}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
          </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        title="確認刪除"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeletingId(null)}>取消</Button>
            <Button variant="destructive" className="flex-1" onClick={handleConfirmDeleteOrder}>確認刪除</Button>
          </div>
        }
      >
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <p className="font-bold text-slate-800 text-lg mb-2">確定要刪除這筆訂單嗎？</p>
          <p className="text-slate-500 text-sm">此動作將無法復原，請確認資料是否正確。</p>
        </div>
      </Modal>
    </div>
  );
};

const StockManagement: React.FC<{ 
  history: StockEntry[], 
  onAdd: (entry: StockEntry) => void,
  onUpdate: (entry: StockEntry) => void,
  onDelete: (id: string) => void,
  frequentItems: FrequentStockItem[],
  onNewItem: (item: FrequentStockItem) => void
}> = ({ history, onAdd, onUpdate, onDelete, frequentItems, onNewItem }) => {
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('');
  const [cost, setCost] = useState('');

  const [editingItem, setEditingItem] = useState<StockEntry | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editQty, setEditQty] = useState('');
  const [editCost, setEditCost] = useState('');

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleQuickAdd = (pName: string, pUnit: string) => {
    setName(pName);
    setUnit(pUnit);
  };

  const handleSubmit = () => {
    if (!name || !qty || !cost) return;
    const entry: StockEntry = {
      id: `stk-${Date.now()}`,
      timestamp: new Date().toISOString(),
      name,
      quantity: Number(qty),
      unit: unit || '個',
      cost: Number(cost)
    };
    onAdd(entry);
    
    if (!['小臭', '鴨血', '高麗菜', '豆卷', '王子麵'].includes(name) && !frequentItems.find(i => i.name === name)) {
      onNewItem({ name, unit: unit || '個' });
    }

    setName('');
    setQty('');
    setCost('');
  };

  const startEdit = (entry: StockEntry) => {
    setEditingItem(entry);
    setEditDate(new Date(entry.timestamp).toISOString().split('T')[0]);
    setEditQty(entry.quantity.toString());
    setEditCost(entry.cost.toString());
  };

  const saveEdit = () => {
    if (!editingItem) return;
    const updated: StockEntry = {
      ...editingItem,
      timestamp: new Date(editDate).toISOString(),
      quantity: Number(editQty),
      cost: Number(editCost)
    };
    onUpdate(updated);
    setEditingItem(null);
  };

  const handleConfirmDelete = () => {
    if (deletingId) {
      onDelete(deletingId);
      setDeletingId(null);
    }
  };

  const groupedHistory = useMemo(() => {
    const groups: Record<string, StockEntry[]> = {};
    history.forEach(entry => {
      const date = new Date(entry.timestamp).toLocaleDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(entry);
    });
    return groups;
  }, [history]);

  const summary = useMemo(() => {
    const totalCost = history.reduce((sum, item) => sum + item.cost, 0);
    const itemStats: Record<string, { qty: number, unit: string }> = {};
    history.forEach(item => {
      if (!itemStats[item.name]) {
          itemStats[item.name] = { qty: 0, unit: item.unit };
      }
      itemStats[item.name].qty += item.quantity;
    });
    return { totalCost, itemStats };
  }, [history]);

  const quickItems: FrequentStockItem[] = [
    {name: '小臭', unit: '包'},
    {name: '鴨血', unit: '片'},
    {name: '王子麵', unit: '箱'},
    ...frequentItems
  ];

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      <Card className="p-0 overflow-hidden bg-slate-800 text-white border-none shadow-lg">
        <div className="p-4 border-b border-slate-700">
           <div className="text-slate-400 text-xs font-bold uppercase">目前總支出</div>
           <div className="text-2xl font-bold mt-1 text-red-300">${summary.totalCost.toLocaleString()}</div>
        </div>
        <div className="p-4 bg-slate-800/50">
           <div className="text-slate-400 text-xs font-bold uppercase mb-2">品項進貨總計</div>
           <div className="grid grid-cols-2 gap-x-4 gap-y-2 max-h-32 overflow-y-auto custom-scrollbar">
              {Object.entries(summary.itemStats).map(([name, data]) => (
                <div key={name} className="flex justify-between text-sm border-b border-slate-700/50 pb-1 last:border-0">
                   <span className="text-slate-200">{name}</span>
                   <span className="font-mono text-slate-400">{data.qty} {data.unit}</span>
                </div>
              ))}
           </div>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
         <h3 className="font-bold text-slate-800 flex items-center gap-2"><Package className="h-4 w-4" /> 快速帶入</h3>
         <div className="flex flex-wrap gap-2">
            {quickItems.map(item => (
              <button 
                key={item.name}
                onClick={() => handleQuickAdd(item.name, item.unit)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-sm font-medium transition-colors"
              >
                {item.name}
              </button>
            ))}
         </div>
      </Card>

      <Card className="p-4 space-y-4 border-blue-200 shadow-blue-100">
         <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
               <label className="text-xs font-bold text-slate-500 mb-1 block">品項名稱</label>
               <Input placeholder="輸入名稱 (如: 高麗菜)" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
               <label className="text-xs font-bold text-slate-500 mb-1 block">進貨數量</label>
               <Input type="number" placeholder="數量" value={qty} onChange={e => setQty(e.target.value)} />
            </div>
            <div>
               <label className="text-xs font-bold text-slate-500 mb-1 block">單位</label>
               <Input placeholder="單位 (如: 顆)" value={unit} onChange={e => setUnit(e.target.value)} />
            </div>
            <div className="col-span-2">
               <label className="text-xs font-bold text-slate-500 mb-1 block">總花費 ($)</label>
               <div className="relative">
                  <DollarSign className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                  <Input type="number" className="pl-9" placeholder="本次進貨總金額" value={cost} onChange={e => setCost(e.target.value)} />
               </div>
            </div>
         </div>
         <Button className="w-full" onClick={handleSubmit} disabled={!name || !qty || !cost}>
            <Plus className="h-4 w-4 mr-2" /> 新增進貨紀錄
         </Button>
      </Card>

      <div className="space-y-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2"><History className="h-4 w-4" /> 近期進貨</h3>
        {Object.entries(groupedHistory).map(([date, entries]) => (
           <div key={date}>
              <div className="text-xs font-bold text-slate-400 mb-2 mt-4 ml-1">{date}</div>
              <div className="space-y-2">
                {entries.map(entry => (
                  <div key={entry.id} className="bg-white p-3 rounded-lg border border-slate-100 flex justify-between items-center group">
                     <div>
                        <div className="font-bold text-slate-800">{entry.name}</div>
                        <div className="text-xs text-slate-500">{entry.quantity} {entry.unit}</div>
                     </div>
                     <div className="flex items-center gap-3">
                       <div className="font-bold text-red-600">-${entry.cost}</div>
                       <button 
                          onClick={() => startEdit(entry)}
                          className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                       >
                          <Pencil className="h-4 w-4" />
                       </button>
                       <button 
                          onClick={() => setDeletingId(entry.id)}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                       >
                          <Trash2 className="h-4 w-4" />
                       </button>
                     </div>
                  </div>
                ))}
              </div>
           </div>
        ))}
      </div>

      <Modal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        title="編輯進貨紀錄"
        footer={
           <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditingItem(null)}>取消</Button>
              <Button className="flex-1" onClick={saveEdit}>儲存變更</Button>
           </div>
        }
      >
         <div className="space-y-4 pt-2">
            <div>
               <label className="text-xs font-bold text-slate-500 mb-1 block">品項名稱 (不可修改)</label>
               <div className="text-lg font-bold text-slate-800">{editingItem?.name}</div>
            </div>
            <div>
               <label className="text-xs font-bold text-slate-500 mb-1 block">進貨日期</label>
               <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">數量 ({editingItem?.unit})</label>
                <Input type="number" value={editQty} onChange={e => setEditQty(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">總花費</label>
                <Input type="number" value={editCost} onChange={e => setEditCost(e.target.value)} />
              </div>
            </div>
         </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        title="確認刪除"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeletingId(null)}>取消</Button>
            <Button variant="destructive" className="flex-1" onClick={handleConfirmDelete}>確認刪除</Button>
          </div>
        }
      >
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <p className="font-bold text-slate-800 text-lg mb-2">確定要刪除這筆進貨紀錄嗎？</p>
          <p className="text-slate-500 text-sm">此動作將無法復原，請確認資料是否正確。</p>
        </div>
      </Modal>
    </div>
  );
};

const FinanceSummary: React.FC<{ orders: OrderRecord[], stock: StockEntry[] }> = ({ orders, stock }) => {
  const now = new Date();
  
  const thisMonthOrders = orders.filter(o => {
    const d = new Date(o.timestamp);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const thisMonthStock = stock.filter(s => {
    const d = new Date(s.timestamp);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const income = thisMonthOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const expense = thisMonthStock.reduce((sum, s) => sum + s.cost, 0);
  const profit = income - expense;

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
       <Card className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl">
          <h3 className="text-slate-400 font-medium mb-1">本月淨利 (預估)</h3>
          <div className={`text-4xl font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
             {profit >= 0 ? '+' : ''}{profit.toLocaleString()}
          </div>
          <div className="mt-6 flex justify-between text-sm">
             <div>
               <div className="text-slate-400 mb-1">總收入</div>
               <div className="text-xl font-bold text-blue-300">${income.toLocaleString()}</div>
             </div>
             <div className="text-right">
               <div className="text-slate-400 mb-1">總支出</div>
               <div className="text-xl font-bold text-red-300">${expense.toLocaleString()}</div>
             </div>
          </div>
       </Card>

       <div className="text-sm text-slate-500 text-center">
          * 此數據僅供參考，實際盈餘請以會計帳務為準
       </div>
    </div>
  );
};

const AdminDashboard: React.FC<{
  activeTab: 'sales' | 'stock' | 'finance';
  onTabChange: (tab: 'sales' | 'stock' | 'finance') => void;
  orders: OrderRecord[];
  stockHistory: StockEntry[];
  setOrders: React.Dispatch<React.SetStateAction<OrderRecord[]>>; 
  setStockHistory: React.Dispatch<React.SetStateAction<StockEntry[]>>;
  frequentStockItems: FrequentStockItem[];
  setFrequentStockItems: React.Dispatch<React.SetStateAction<FrequentStockItem[]>>;
  onBack: () => void;
}> = ({ 
  activeTab, 
  onTabChange, 
  orders, 
  stockHistory, 
  setOrders,
  setStockHistory,
  frequentStockItems,
  setFrequentStockItems,
  onBack 
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [showGoogleHelp, setShowGoogleHelp] = useState(false);
  const currentOrigin = window.location.origin;

  useEffect(() => {
    const initGoogleApi = () => {
      if (window.google && window.google.accounts && window.gapi) {
        setTokenClient(window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: SCOPES,
          callback: '', 
        }));
        window.gapi.load('client', async () => {
          await window.gapi.client.init({
             apiKey: GOOGLE_API_KEY,
             discoveryDocs: [DISCOVERY_DOC],
          });
        });
      }
    };
    const timer = setTimeout(initGoogleApi, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleExportToGoogle = async () => {
    if (!tokenClient && GOOGLE_CLIENT_ID.includes("YOUR_CLIENT_ID")) {
       alert("請在程式碼中設定 GOOGLE_CLIENT_ID 才能啟用真實上傳功能。\n目前為模擬模式。");
       setIsExporting(true);
       setTimeout(() => { setIsExporting(false); alert("模擬上傳成功！"); }, 1500);
       return;
    }
    
    if (!tokenClient) {
        alert("Google API 尚未載入完成或設定錯誤");
        return;
    }

    setIsExporting(true);

    tokenClient.callback = async (resp: any) => {
      if (resp.error) {
        setIsExporting(false);
        // Do not alert purely on resp.error as it might be 'access_denied' by user closing popup
        if (resp.error !== 'access_denied') {
          console.error("Google Auth Error:", resp);
          alert(`Google 登入失敗: ${resp.error}\n請點擊旁邊的問號圖示查看設定教學。`);
        }
        return;
      }
      try {
        await createAndPopulateSheet();
        alert("成功建立試算表並上傳資料！");
      } catch (err) {
        console.error(err);
        alert("上傳失敗，請檢查控制台錯誤訊息。");
      } finally {
        setIsExporting(false);
      }
    };

    tokenClient.requestAccessToken({ prompt: 'consent' });
  };

  const createAndPopulateSheet = async () => {
     const title = `Tofu POS 報表 - ${new Date().toLocaleDateString()}`;
     const response = await window.gapi.client.sheets.spreadsheets.create({
       properties: { title }
     });
     const spreadsheetId = response.result.spreadsheetId;

     const salesStats = orders.reduce((acc, order) => {
       order.items.forEach(item => {
         if (!acc[item.dish.name]) {
             acc[item.dish.name] = { count: 0, price: item.dish.price };
         }
         const stat = acc[item.dish.name];
         if (stat) {
             stat.count += 1;
         }
       });
       return acc;
     }, {} as Record<string, {count: number, price: number}>);

     const salesData = [
       ["商品名稱", "售出數量", "單價", "總額"],
       ...Object.entries(salesStats).map(([name, data]) => {
          const d = data as {count: number, price: number};
          return [name, d.count, d.price, d.count * d.price];
       })
     ];

     const stockData = [
       ["日期", "品項", "數量", "單位", "成本"],
       ...stockHistory.map(s => [
         new Date(s.timestamp).toLocaleDateString(), s.name, s.quantity, s.unit, s.cost
       ])
     ];

     await window.gapi.client.sheets.spreadsheets.values.update({
       spreadsheetId,
       range: 'Sheet1!A1',
       valueInputOption: 'USER_ENTERED',
       resource: { values: salesData }
     });
     
     await window.gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: { requests: [{ addSheet: { properties: { title: "進貨紀錄" } } }] }
     });

     await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: '進貨紀錄!A1',
        valueInputOption: 'USER_ENTERED',
        resource: { values: stockData }
     });
  };

  const handleUpdateStock = (updatedEntry: StockEntry) => {
    setStockHistory(prev => prev.map(item => item.id === updatedEntry.id ? updatedEntry : item));
  };
  
  const handleDeleteStock = (id: string) => {
    setStockHistory(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateOrder = (updatedOrder: OrderRecord) => {
    setOrders(prev => prev.map(order => order.id === updatedOrder.id ? updatedOrder : order));
  };

  const handleDeleteOrder = (id: string) => {
    setOrders(prev => prev.filter(order => order.id !== id));
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-4 bg-white border-b border-slate-200 shadow-sm sticky top-0 z-20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onBack} className="p-0 mr-2">
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <h2 className="text-xl font-bold">後台管理</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => setShowGoogleHelp(true)}>
              <HelpCircle className="h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center gap-2 text-sm h-9 bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
              onClick={handleExportToGoogle}
              disabled={isExporting}
            >
              {isExporting ? <UploadCloud className="h-4 w-4 animate-bounce" /> : <FileSpreadsheet className="h-4 w-4" />}
              {isExporting ? '上傳中...' : '匯出報表'}
            </Button>
          </div>
        </div>
        <Tabs 
          tabs={[
            { id: 'sales', label: '銷量分析' },
            { id: 'stock', label: '進貨紀錄' },
            { id: 'finance', label: '本月盈餘' },
          ]}
          activeTab={activeTab}
          onChange={onTabChange}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 custom-scrollbar">
        {activeTab === 'sales' && (
          <SalesAnalysis 
            orders={orders} 
            onUpdateOrder={handleUpdateOrder}
            onDeleteOrder={handleDeleteOrder}
          />
        )}
        {activeTab === 'stock' && (
          <StockManagement 
            history={stockHistory} 
            onAdd={(entry) => setStockHistory([entry, ...stockHistory])} 
            onUpdate={handleUpdateStock}
            onDelete={handleDeleteStock}
            frequentItems={frequentStockItems}
            onNewItem={(item) => setFrequentStockItems([...frequentStockItems, item])}
          />
        )}
        {activeTab === 'finance' && <FinanceSummary orders={orders} stock={stockHistory} />}
      </div>

      {/* Google Setup Help Modal */}
      <Modal
        isOpen={showGoogleHelp}
        onClose={() => setShowGoogleHelp(false)}
        title="Google 串接設定教學"
        footer={
           <Button className="w-full" onClick={() => setShowGoogleHelp(false)}>我瞭解了</Button>
        }
      >
        <div className="space-y-4 text-sm text-slate-600">
           <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 flex gap-2">
             <AlertTriangle className="h-5 w-5 shrink-0" />
             <p>若出現 <strong>Error 400: invalid_request</strong>，代表您尚未授權此網址。</p>
           </div>
           
           <ol className="list-decimal pl-5 space-y-2">
             <li>前往 <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-blue-600 underline">Google Cloud Console</a>。</li>
             <li>點擊您的 <strong>OAuth 2.0 用戶端 ID</strong>。</li>
             <li>在 <strong>已授權的 JavaScript 來源</strong> 區塊，點擊「新增 URI」。</li>
             <li>複製並貼上您的網址：</li>
           </ol>

           <div className="bg-slate-100 p-3 rounded border border-slate-200 font-mono text-slate-800 break-all flex items-center justify-between gap-2">
             <span>{currentOrigin}</span>
             <button 
               onClick={() => {navigator.clipboard.writeText(currentOrigin); alert('已複製！');}}
               className="p-1.5 hover:bg-white rounded transition-colors text-slate-500"
               title="複製網址"
             >
               <Copy className="h-4 w-4" />
             </button>
           </div>

           <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">
             設定完成後，Google 需要約 5-10 分鐘更新生效，請稍候再試。
           </p>
        </div>
      </Modal>
    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [view, setView] = useState<'pos' | 'admin'>('pos');
  const [adminTab, setAdminTab] = useState<'sales' | 'stock' | 'finance'>('sales');
  
  // POS State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [currentSelection, setCurrentSelection] = useState<Dish | null>(null);
  const [tempSpice, setTempSpice] = useState<string>('微辣');
  const [tempAddons, setTempAddons] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>(null);

  // Persistent Data State (LocalStorage)
  const [orderHistory, setOrderHistory] = useState<OrderRecord[]>(() => {
    try {
      const saved = localStorage.getItem('tofu-pos-orders');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [stockHistory, setStockHistory] = useState<StockEntry[]>(() => {
    try {
      const saved = localStorage.getItem('tofu-pos-stock');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [frequentStockItems, setFrequentStockItems] = useState<FrequentStockItem[]>(() => {
    try {
      const saved = localStorage.getItem('tofu-pos-frequent');
      const defaults = [{name: '高麗菜', unit: '顆'}, {name: '豆卷', unit: '包'}];
      return saved ? JSON.parse(saved) : defaults;
    } catch (e) {
      return [{name: '高麗菜', unit: '顆'}, {name: '豆卷', unit: '包'}];
    }
  });

  // Effects to Save Data
  useEffect(() => {
    localStorage.setItem('tofu-pos-orders', JSON.stringify(orderHistory));
  }, [orderHistory]);

  useEffect(() => {
    localStorage.setItem('tofu-pos-stock', JSON.stringify(stockHistory));
  }, [stockHistory]);

  useEffect(() => {
    localStorage.setItem('tofu-pos-frequent', JSON.stringify(frequentStockItems));
  }, [frequentStockItems]);

  // POS Handlers
  const handleSelectDish = (dish: Dish) => {
    setCurrentSelection(dish);
    setTempSpice('微辣');
    setTempAddons({});
    setIsModalOpen(true);
  };

  const handleAddonLimit = (addonId: string, delta: number) => {
    setTempAddons(prev => {
      const currentQty = prev[addonId] || 0;
      const newQty = Math.max(0, currentQty + delta);
      if (newQty === 0) {
        const { [addonId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [addonId]: newQty };
    });
  };

  const addToCart = () => {
    if (!currentSelection) return;
    const newItem: CartItem = {
      cartId: Date.now(),
      dish: currentSelection,
      spice: tempSpice,
      addons: tempAddons,
      totalPrice: calculateItemTotal(currentSelection, tempAddons)
    };
    setCart([...cart, newItem]);
    setIsModalOpen(false);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);

  const removeFromCart = (cartId: number) => {
    setCart(cart.filter(item => item.cartId !== cartId));
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    setSubmitStatus(null);

    const newOrder: OrderRecord = {
      id: `ord-${Date.now()}`,
      timestamp: new Date().toISOString(),
      items: [...cart],
      totalAmount: cartTotal
    };

    // Simulate network delay slightly
    setTimeout(() => {
      setOrderHistory(prev => [newOrder, ...prev]);
      setIsSubmitting(false);
      setSubmitStatus('success');
      setCart([]); 
      setIsCartOpen(false);
      setTimeout(() => setSubmitStatus(null), 3000);
    }, 200);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 max-w-md mx-auto shadow-2xl overflow-hidden border-x border-slate-200 relative">
      {view === 'pos' ? (
        <>
          {/* Header */}
          <div className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-md z-10 shrink-0">
            <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                <ChefHat className="h-6 w-6" /> 豆腐他弟 POS
                </h1>
                <p className="text-xs text-slate-400">快速點餐系統</p>
            </div>
            <div className="flex items-center gap-4">
                <div onClick={() => setView('admin')} className="cursor-pointer bg-slate-800 p-2 rounded-full hover:bg-slate-700 transition-colors" title="管理後台">
                    <LayoutDashboard className="h-5 w-5 text-slate-300" />
                </div>
                <div className="relative" onClick={() => setIsCartOpen(true)}>
                    <ShoppingCart className="h-6 w-6 cursor-pointer" />
                    {cart.length > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
                            {cart.length}
                        </span>
                    )}
                </div>
            </div>
          </div>

          {/* Toast Notification */}
          {submitStatus === 'success' && (
            <Toast 
              title="訂單已送出！" 
              description="資料已同步至系統。" 
              type="success" 
            />
          )}

          {/* POS Menu List */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-24">
            <div className="grid grid-cols-2 gap-3">
              {MAIN_DISHES.map(dish => (
                <Card 
                    key={dish.id} 
                    className="cursor-pointer hover:shadow-lg transition-all active:scale-95 border-slate-200 flex flex-col"
                    onClick={() => handleSelectDish(dish)}
                >
                  <div className="p-4 pb-2 grow">
                    <h3 className="text-lg font-bold text-slate-800 leading-tight">{dish.name}</h3>
                  </div>
                  <div className="p-4 pt-0">
                    <div className="text-xl font-bold text-blue-600">${dish.price}</div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Sticky Bottom Bar */}
          {cart.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20">
                  <div className="flex justify-between items-center mb-3">
                      <span className="text-slate-500 font-medium text-sm">訂單總計 ({cart.length} 項)</span>
                      <span className="text-2xl font-bold text-slate-900">${cartTotal}</span>
                  </div>
                  <Button className="w-full h-12 text-lg font-bold shadow-blue-200 shadow-lg" onClick={() => setIsCartOpen(true)}>
                      查看購物車 & 結帳
                  </Button>
              </div>
          )}
        </>
      ) : (
        <AdminDashboard 
          activeTab={adminTab}
          onTabChange={setAdminTab}
          orders={orderHistory}
          setOrders={setOrderHistory}
          stockHistory={stockHistory}
          setStockHistory={setStockHistory}
          frequentStockItems={frequentStockItems}
          setFrequentStockItems={setFrequentStockItems}
          onBack={() => setView('pos')}
        />
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={
          <div className="flex justify-center items-center gap-2">
             <span>{currentSelection?.name}</span>
             <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0 text-lg px-2">
                ${currentSelection?.price}
             </Badge>
          </div>
        }
        footer={
          <Button className="w-full h-12 text-lg" onClick={addToCart}>
              加入訂單 (${currentSelection && calculateItemTotal(currentSelection, tempAddons)})
          </Button>
        }
      >
          <div className="space-y-6">
            <div className="space-y-3">
                <label className="text-sm font-bold flex items-center gap-2 text-slate-700">
                    <Flame className="h-4 w-4 text-red-500" /> 選擇辣度 (必選)
                </label>
                <div className="flex flex-wrap gap-2">
                    {SPICINESS_LEVELS.map((spice) => (
                        <div 
                            key={spice.id}
                            onClick={() => setTempSpice(spice.id)}
                            className={`
                                px-4 py-2 rounded-full text-sm font-bold cursor-pointer transition-all border select-none
                                ${tempSpice === spice.id 
                                    ? `${spice.color} text-white border-transparent scale-105 shadow-md` 
                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}
                            `}
                        >
                            {spice.label}
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-dashed border-slate-200">
                <label className="text-sm font-bold flex items-center gap-2 text-slate-700">
                    <Utensils className="h-4 w-4 text-orange-500" /> 加點食材 (選填)
                </label>
                <div className="grid grid-cols-1 gap-2">
                    {ADD_ONS.map((addon) => {
                        const count = tempAddons[addon.id] || 0;
                        return (
                            <div key={addon.id} className="flex justify-between items-center p-3 rounded-lg bg-slate-50 border border-slate-100">
                                <span className="font-medium text-slate-700 flex items-center gap-2">
                                  {addon.name} 
                                  <span className="text-slate-400 text-xs bg-white px-1.5 py-0.5 rounded border border-slate-200">+${addon.price}</span>
                                </span>
                                <div className="flex items-center gap-3">
                                    <button 
                                        className={`h-8 w-8 rounded-full flex items-center justify-center border transition-colors ${count === 0 ? 'border-slate-200 text-slate-300' : 'border-slate-300 text-slate-600 hover:bg-slate-200'}`}
                                        disabled={count === 0}
                                        onClick={() => handleAddonLimit(addon.id, -1)}
                                    >
                                        <Minus className="h-4 w-4" />
                                    </button>
                                    <span className={`w-6 text-center font-bold text-lg ${count > 0 ? 'text-blue-600' : 'text-slate-300'}`}>{count}</span>
                                    <button 
                                        className="h-8 w-8 rounded-full flex items-center justify-center border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"
                                        onClick={() => handleAddonLimit(addon.id, 1)}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
          </div>
      </Modal>

      <Modal 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        title={
          <div className="flex items-center justify-center gap-2">
            <CheckCircle className="text-green-600 h-5 w-5" />
            訂單確認
          </div>
        }
        footer={
           <div className="space-y-4">
              <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-slate-700">總金額</span>
                  <span className="text-2xl font-bold text-blue-600">${cartTotal}</span>
              </div>
              <Button 
                  className={`w-full h-12 text-lg flex items-center gap-2 shadow-lg ${isSubmitting ? 'bg-slate-400' : 'bg-green-600 hover:bg-green-700'}`}
                  onClick={handleSubmitOrder}
                  disabled={isSubmitting || cart.length === 0}
              >
                  {isSubmitting ? '傳送中...' : <><Send className="h-5 w-5" /> 送出訂單</>}
              </Button>
           </div>
        }
      >
        {cart.length === 0 ? (
            <div className="text-center py-10 text-slate-400 flex flex-col items-center gap-2">
              <ShoppingCart className="h-12 w-12 opacity-20" />
              <p>購物車是空的</p>
            </div>
        ) : (
            <div className="space-y-3">
                {cart.map((item) => (
                    <div key={item.cartId} className="flex bg-slate-50 p-3 rounded-lg border border-slate-100 group">
                        <div className="flex-1 pr-2">
                            <div className="font-bold text-slate-800 text-lg leading-tight mb-1">{item.dish.name}</div>
                            <div className="flex flex-wrap gap-1">
                                <Badge className="bg-red-50 text-red-600 border border-red-100 font-normal">
                                  {item.spice}
                                </Badge>
                                {Object.entries(item.addons).map(([id, qty]) => {
                                    const addon = ADD_ONS.find(a => a.id === id);
                                    return (
                                      <Badge key={id} className="bg-blue-50 text-blue-600 border border-blue-100 font-normal">
                                        {addon?.name} x{qty}
                                      </Badge>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="flex flex-col items-end justify-between pl-2 min-w-[60px]">
                           <button 
                                 className="text-slate-400 hover:text-red-500 transition-colors p-1 -mr-2"
                                 onClick={() => removeFromCart(item.cartId)}
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                            <span className="font-bold text-slate-900 text-lg">${item.totalPrice}</span>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </Modal>
    </div>
  );
};

export default App;
