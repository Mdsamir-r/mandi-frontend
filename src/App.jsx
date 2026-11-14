import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Receipt, Package, Users, Printer, Wallet, 
  Search, ArrowLeft, Plus, Edit3, Trash2, History, Calendar, 
  CheckCircle2, ArrowUpRight, ArrowDownLeft, Zap, Lock, LogOut, 
  Loader2, X, Sparkles, TrendingUp, DollarSign
} from 'lucide-react';

export default function App() {
  // Helper: Generates local datetime string (YYYY-MM-DDTHH:mm) without UTC shift
  const getLocalDateTime = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Helper: Strictly displays timestamp in Indian Standard Time (IST)
  const formatToIndianTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // ================= 1. SECURITY PIN AUTH =================
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('mandi_auth') === 'true';
  });
  const [pinInput, setPinInput] = useState('');
  const [authError, setAuthError] = useState('');
  const APP_PIN = "1234";

  const handleLogin = (e) => {
    e.preventDefault();
    if (pinInput === APP_PIN) {
      setIsAuthenticated(true);
      localStorage.setItem('mandi_auth', 'true');
      setAuthError('');
      setPinInput('');
    } else {
      setAuthError('Galat PIN! Kripya sahi 4-digit PIN daalein.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('mandi_auth');
  };

  // ================= 2. CORE APP STATES =================
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState({
    totalSales: 0, totalProfit: 0, totalCashReceived: 0, totalCustomerUdhaar: 0, totalPartyDena: 0,
    todaySales: 0, todayProfit: 0, todayCashReceived: 0, todayWeightSold: 0, todayItemsSoldList: []
  });

  const [customers, setCustomers] = useState([]);
  const [parties, setParties] = useState([]);
  const [stock, setStock] = useState([]);
  const [globalInwardHistory, setGlobalInwardHistory] = useState([]); 

  // Multi-Click Debounce States
  const [isSubmittingBill, setIsSubmittingBill] = useState(false);
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);

  // Search & Profile Views
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfileUser, setSelectedProfileUser] = useState(null); 
  const [userTimeline, setUserTimeline] = useState([]); 
  const [billingCustomerSearch, setBillingCustomerSearch] = useState('');

  // History Transaction Editing (1400 -> 1450 Mistake Fix)
  const [editingHistoryItem, setEditingHistoryItem] = useState(null);
  const [editHistoryAmount, setEditHistoryAmount] = useState('');
  const [editHistoryDate, setEditHistoryDate] = useState('');
  const [isUpdatingHistory, setIsUpdatingHistory] = useState(false);

  // Billing States
  const [billingMode, setBillingMode] = useState('itemized');
  const [directBillAmount, setDirectBillAmount] = useState('');
  const [directBillNote, setDirectBillNote] = useState('');
  const [globalBillCustomer, setGlobalBillCustomer] = useState('');
  const [globalBillItems, setGlobalBillItems] = useState([{ productId: '', weightInput: '', rate: '' }]);
  const [globalCommCash, setGlobalCommCash] = useState('0'); 
  const [globalPaidAmount, setGlobalPaidAmount] = useState('');
  const [globalPayMode, setGlobalPayMode] = useState('Offline (Cash)');

  // Dedicated Cash Deposit Desk Form
  const [depositTargetUser, setDepositTargetUser] = useState('');
  const [depositSearchFilter, setDepositSearchFilter] = useState('');
  const [depositAmountInput, setDepositAmountInput] = useState('');
  const [depositModeInput, setDepositModeInput] = useState('Offline (Cash)'); 
  const [depositDate, setDepositDate] = useState(getLocalDateTime);

  // In-Profile Deposit States
  const [profDepositAmount, setProfDepositAmount] = useState('');
  const [profDepositMode, setProfDepositMode] = useState('Offline (Cash)');
  const [profDepositDate, setProfDepositDate] = useState(getLocalDateTime);

  // Overlays
  const [lastGeneratedBill, setLastGeneratedBill] = useState(null);
  const [lastDepositSlip, setLastDepositSlip] = useState(null); 

  const API_URL = 'https://mandi-backend-wk26.onrender.com/api';

  const fetchData = async () => {
    try {
      const [dbRes, usersRes, prodRes] = await Promise.all([
        fetch(API_URL + '/dashboard'),
        fetch(API_URL + '/users'),
        fetch(API_URL + '/products')
      ]);

      if (dbRes.ok) setDashboardData(await dbRes.json());
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        if (Array.isArray(usersData)) {
          setCustomers(usersData.filter(u => u.role === 'customer'));
          setParties(usersData.filter(u => u.role === 'party'));
        }
      }
      if (prodRes.ok) setStock(await prodRes.json());
    } catch (err) {
      console.error("Fetch Error: ", err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [activeTab, isAuthenticated]);

  const loadUserProfile = async (user) => {
    const targetId = user.id || user._id;
    setSelectedProfileUser(user);
    try {
      const res = await fetch(`${API_URL}/users/${targetId}/timeline`);
      if (res.ok) setUserTimeline(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const parseMultiBoraWeight = (inputString) => {
    if (!inputString) return 0;
    return inputString.split(',').map(val => parseFloat(val.trim())).filter(val => !isNaN(val)).reduce((sum, current) => sum + current, 0);
  };

  // ================= 3. MULTI-TAP PROTECTED BILL SUBMIT =================
  const handleCreateBillSubmission = async (targetCustomerId) => {
    if (isSubmittingBill) return;

    const customerId = targetCustomerId || globalBillCustomer;
    if (!customerId) return alert('Kripya Grahak select karein!');

    let payload = {
      userId: customerId,
      paidAmount: Number(globalPaidAmount) || 0,
      customCommission: Number(globalCommCash) || 0,
      paymentMode: globalPayMode
    };

    if (billingMode === 'direct') {
      if (!directBillAmount || Number(directBillAmount) <= 0) {
        return alert('Direct Bill Amount daalein (jaise: 2000)!');
      }
      payload.directAmount = Number(directBillAmount);
      payload.note = directBillNote || 'Direct Lump-sum Bill';
      payload.items = [];
    } else {
      if (!globalBillItems[0]?.productId) {
        return alert('Kam se kam ek Sabji item chunein!');
      }
      payload.items = globalBillItems.map(item => ({
        productId: item.productId,
        weight: parseMultiBoraWeight(item.weightInput),
        rate: Number(item.rate) || 0
      }));
    }

    try {
      setIsSubmittingBill(true);
      const res = await fetch(API_URL + '/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setLastGeneratedBill(data.bill);
        setGlobalBillCustomer('');
        setGlobalBillItems([{ productId: '', weightInput: '', rate: '' }]);
        setDirectBillAmount('');
        setDirectBillNote('');
        setGlobalCommCash('0');
        setGlobalPaidAmount('');
        await fetchData();
        if (selectedProfileUser) loadUserProfile(selectedProfileUser);
      } else {
        alert(data.error || 'Bill save karne me samasya aayi!');
      }
    } catch (err) {
      alert('Network Error! Kripya connection check karein.');
    } finally {
      setIsSubmittingBill(false);
    }
  };

  // ================= 4. MULTI-TAP PROTECTED DEPOSIT SUBMIT =================
  const handleDepositSubmit = async (e, customUserId = null, customAmount = null, customDate = null, customMode = null) => {
    if (e) e.preventDefault();
    if (isSubmittingDeposit) return;

    const targetUserId = customUserId || depositTargetUser;
    const finalAmount = customAmount !== null ? customAmount : depositAmountInput;
    const finalDate = customDate || depositDate;
    const finalMode = customMode || depositModeInput;

    if (!targetUserId || !finalAmount) return alert('Khata aur Jama Rakam dono bharein!');

    try {
      setIsSubmittingDeposit(true);
      const res = await fetch(API_URL + '/deposits', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          userId: targetUserId, 
          amount: Number(finalAmount), 
          type: 'jama', 
          paymentMode: finalMode,
          date: finalDate
        }) 
      });
      const data = await res.json();
      if (res.ok) { 
        setLastDepositSlip(data.deposit); 
        setDepositAmountInput(''); 
        setDepositTargetUser('');
        setDepositDate(getLocalDateTime());
        setProfDepositAmount('');
        await fetchData(); 
        if (selectedProfileUser) loadUserProfile(selectedProfileUser); 
      } else {
        alert(data.error || 'Deposit save nahi ho paya!');
      }
    } catch (err) { 
      alert('Network Error!'); 
    } finally {
      setIsSubmittingDeposit(false);
    }
  };

  // ================= 5. EDIT TRANSACTION RECORD =================
  const openEditHistoryModal = (item) => {
    setEditingHistoryItem(item);
    setEditHistoryAmount(item.amount);
    if (item.date) {
      const d = new Date(item.date);
      const pad = (n) => String(n).padStart(2, '0');
      const year = d.getFullYear();
      const month = pad(d.getMonth() + 1);
      const day = pad(d.getDate());
      const hours = pad(d.getHours());
      const minutes = pad(d.getMinutes());
      setEditHistoryDate(`${year}-${month}-${day}T${hours}:${minutes}`);
    } else {
      setEditHistoryDate('');
    }
  };

  const handleSaveHistoryUpdate = async () => {
    if (!editingHistoryItem || !editHistoryAmount) return;
    try {
      setIsUpdatingHistory(true);
      const isDeposit = editingHistoryItem.isDeposit;
      const targetId = editingHistoryItem.rawObj?._id || editingHistoryItem.id;
      const endpoint = isDeposit ? `${API_URL}/deposits/${targetId}` : `${API_URL}/bills/${targetId}`;

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(editHistoryAmount),
          directAmount: Number(editHistoryAmount),
          date: editHistoryDate,
          items: editingHistoryItem.rawObj?.items || []
        })
      });

      if (res.ok) {
        alert('Transaction aur Khata safaltapoorvak update ho gaya!');
        setEditingHistoryItem(null);
        await fetchData();
        if (selectedProfileUser) loadUserProfile(selectedProfileUser);
      } else {
        const d = await res.json();
        alert(d.error || 'Update fail ho gaya!');
      }
    } catch (err) {
      alert('Network issue during update');
    } finally {
      setIsUpdatingHistory(false);
    }
  };

  // ================= PIN LOCK SCREEN =================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock size={30} />
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Samim And Sons</h2>
          <p className="text-xs text-slate-400 font-medium mb-6">Mandi Ledger Counter Lock</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              maxLength="4"
              placeholder="Enter 4-Digit PIN" 
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="w-full text-center text-3xl tracking-widest font-black py-3.5 border border-slate-700 rounded-2xl focus:border-emerald-500 focus:outline-none bg-slate-800/80 text-white placeholder-slate-500"
              autoFocus
            />
            {authError && <p className="text-xs font-bold text-rose-500">{authError}</p>}
            <button 
              type="submit" 
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-2xl shadow-lg transition active:scale-95 text-sm"
            >
              Unlock Counter Desk
            </button>
          </form>
        </div>
      </div>
    );
  }

  const billingSearchFilteredCustomers = customers.filter((c, idx) => {
    const term = billingCustomerSearch.toLowerCase();
    const serialNum = (idx + 1).toString();
    return c.name.toLowerCase().includes(term) || serialNum === term;
  });

  const depositSearchFilteredUsers = [...customers, ...parties].filter((u) => {
    return u.name.toLowerCase().includes(depositSearchFilter.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col lg:flex-row font-sans text-slate-100">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full lg:w-64 bg-slate-950/70 backdrop-blur-xl border-r border-slate-800/80 flex flex-col p-5 shadow-2xl shrink-0 print:hidden">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-6">
          <div>
            <h2 className="text-lg font-black uppercase text-emerald-400 tracking-tight flex items-center gap-1.5">
              <Sparkles size={16} /> Samim & Sons
            </h2>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Mandi Cloud Pro</p>
          </div>
          <button onClick={handleLogout} title="Lock App" className="p-2 bg-slate-800/80 hover:bg-rose-900/40 text-slate-300 hover:text-rose-400 rounded-xl transition border border-slate-700">
            <LogOut size={16} />
          </button>
        </div>
        
        <nav className="grid grid-cols-2 sm:grid-cols-5 lg:flex lg:flex-col gap-2 flex-1">
          <button onClick={() => { setActiveTab('dashboard'); setSelectedProfileUser(null); }} className={`flex items-center gap-3 p-3 rounded-2xl text-xs font-bold transition ${activeTab === 'dashboard' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}`}>
            <LayoutDashboard size={18} /> <span>Dashboard</span>
          </button>
          <button onClick={() => { setActiveTab('global-billing-tab'); setSelectedProfileUser(null); }} className={`flex items-center gap-3 p-3 rounded-2xl text-xs font-bold transition ${activeTab === 'global-billing-tab' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}`}>
            <Receipt size={18} /> <span>Create Bill</span>
          </button>
          <button onClick={() => { setActiveTab('deposit-tab'); setSelectedProfileUser(null); }} className={`flex items-center gap-3 p-3 rounded-2xl text-xs font-bold transition ${activeTab === 'deposit-tab' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}`}>
            <Wallet size={18} /> <span>Cash Deposit</span>
          </button>
          <button onClick={() => { setActiveTab('customers'); setSelectedProfileUser(null); }} className={`flex items-center gap-3 p-3 rounded-2xl text-xs font-bold transition ${activeTab === 'customers' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}`}>
            <Users size={18} /> <span>Grahak Ledger</span>
          </button>
          <button onClick={() => { setActiveTab('parties'); setSelectedProfileUser(null); }} className={`flex items-center gap-3 p-3 rounded-2xl text-xs font-bold transition ${activeTab === 'parties' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}`}>
            <Package size={18} /> <span>Supplier Khata</span>
          </button>
        </nav>
      </aside>

      {/* MAIN VIEW */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden bg-gradient-to-b from-slate-900 to-slate-950">
        
        {/* PARCHA PREVIEW OVERLAY */}
        {lastGeneratedBill && (
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-3xl shadow-2xl max-w-md mx-auto mb-6 animate-fadeIn">
            <div className="text-center border-b border-slate-800 pb-3 mb-4">
              <h2 className="text-xl font-black uppercase text-emerald-400">Samim And Sons</h2>
              <p className="text-[10px] text-slate-400 font-bold">Mandi Vyapaar Parcha | Mob: 9955494854</p>
            </div>
            <p className="text-xs font-bold mb-3 text-slate-300">Grahak: <strong className="text-white">{lastGeneratedBill.customerName}</strong></p>
            <div className="space-y-1.5 text-xs border-b border-slate-800 pb-3 mb-3">
              {lastGeneratedBill.items?.map((it, i) => (
                <div key={i} className="flex justify-between font-semibold text-slate-300">
                  <span>{it.productName} ({it.weight} {it.unitType})</span>
                  <span className="text-white">Rs. {it.total}</span>
                </div>
              ))}
            </div>
            <div className="text-right text-xs space-y-1 font-bold text-slate-300">
              <p>Total Bill: <strong className="text-white">Rs. {lastGeneratedBill.billAmount}</strong></p>
              <p className="text-emerald-400">Advance Jama: -Rs. {lastGeneratedBill.paidAmount}</p>
              <p className="text-base text-rose-400 font-black border-t border-slate-800 pt-2 mt-2">Baki Balance: Rs. {lastGeneratedBill.newBalance}</p>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={() => window.print()} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-bold text-xs shadow-md">Print Parcha</button>
              <button onClick={() => setLastGeneratedBill(null)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl font-bold text-xs">Close</button>
            </div>
          </div>
        )}

        {/* EDIT RECORD MODAL */}
        {editingHistoryItem && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="font-black text-sm text-white uppercase">Edit Record / Rakam Sudharein</h3>
                <button onClick={() => setEditingHistoryItem(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-black text-slate-400 mb-1.5">Rakam (Rs.)</label>
                <input 
                  type="number" 
                  value={editHistoryAmount} 
                  onChange={(e) => setEditHistoryAmount(e.target.value)}
                  className="w-full p-3 border border-slate-700 rounded-xl font-black text-base bg-slate-800 text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="Jaise: 1450"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-black text-slate-400 mb-1.5">Date & Time</label>
                <input 
                  type="datetime-local" 
                  value={editHistoryDate} 
                  onChange={(e) => setEditHistoryDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-700 rounded-xl font-bold text-xs bg-slate-800 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  onClick={handleSaveHistoryUpdate}
                  disabled={isUpdatingHistory}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-bold text-xs shadow flex items-center justify-center gap-2"
                >
                  {isUpdatingHistory ? <Loader2 size={14} className="animate-spin" /> : 'Save Sudhar'}
                </button>
                <button onClick={() => setEditingHistoryItem(null)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl font-bold text-xs">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* ================= USER PROFILE VIEW ================= */}
        {selectedProfileUser && (
          <div className="space-y-6 animate-fadeIn">
            <button onClick={() => setSelectedProfileUser(null)} className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-slate-700 transition">
              <ArrowLeft size={14} /> Back to Directory
            </button>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-md flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black uppercase text-white">{selectedProfileUser.name}</h2>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Mob: {selectedProfileUser.phone}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black uppercase text-slate-400">Total Udhaar Balance</span>
                <p className="text-3xl font-black text-rose-400 mt-0.5">Rs. {selectedProfileUser.balance}</p>
              </div>
            </div>

            {/* Profile Action Grid: Quick Cash Entry Desk */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
              <h3 className="font-black text-sm uppercase text-emerald-400 flex items-center gap-2">
                <Wallet size={16} /> Quick Jama Deposit (Kal ya Purani Date Support)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input 
                  type="number"
                  placeholder="Jama Rakam (Rs.)"
                  value={profDepositAmount}
                  onChange={(e) => setProfDepositAmount(e.target.value)}
                  className="p-3 border border-slate-700 rounded-2xl bg-slate-800 text-white font-black text-sm focus:border-emerald-500 focus:outline-none"
                />
                <input 
                  type="datetime-local"
                  value={profDepositDate}
                  onChange={(e) => setProfDepositDate(e.target.value)}
                  className="p-3 border border-slate-700 rounded-2xl bg-slate-800 text-white font-bold text-xs focus:border-emerald-500 focus:outline-none"
                />
                <button 
                  onClick={(e) => handleDepositSubmit(e, (selectedProfileUser.id || selectedProfileUser._id), profDepositAmount, profDepositDate, profDepositMode)}
                  disabled={isSubmittingDeposit}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold p-3 rounded-2xl text-xs shadow-md transition flex items-center justify-center gap-2"
                >
                  {isSubmittingDeposit ? <Loader2 size={16} className="animate-spin" /> : 'Save Cash Entry 🚀'}
                </button>
              </div>
            </div>

            {/* Khata Ledger Table with Indian Time Display */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-sm">
              <h3 className="font-black text-sm text-white mb-4 uppercase flex items-center gap-2">
                <History size={16} className="text-emerald-400" /> Khata Transaction History
              </h3>
              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left text-xs min-w-[550px]">
                  <thead>
                    <tr className="bg-slate-800/60 border-b border-slate-800 font-bold text-slate-400">
                      <th className="p-3.5">Date (IST)</th>
                      <th className="p-3.5">Vivaran</th>
                      <th className="p-3.5 text-right">Rakam</th>
                      <th className="p-3.5 text-right">Balance</th>
                      <th className="p-3.5 text-center">Sudhar (Edit)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {userTimeline.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition">
                        <td className="p-3.5 text-slate-400 font-medium">{formatToIndianTime(item.date)}</td>
                        <td className="p-3.5 font-bold text-white">{item.description}</td>
                        <td className="p-3.5 text-right font-black text-emerald-400">Rs. {item.amount}</td>
                        <td className="p-3.5 text-right font-black text-rose-400">Rs. {item.finalBalance}</td>
                        <td className="p-3.5 text-center">
                          <button 
                            onClick={() => openEditHistoryModal(item)}
                            className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-xl font-bold text-[10px] flex items-center gap-1 mx-auto transition"
                          >
                            <Edit3 size={11} /> Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                    {userTimeline.length === 0 && (
                      <tr><td colSpan="5" className="p-6 text-center text-slate-500 font-bold">Koi record register nahi mila.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= DEDICATED CASH DEPOSIT TAB ================= */}
        {activeTab === 'deposit-tab' && !selectedProfileUser && (
          <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl max-w-xl mx-auto space-y-5 animate-fadeIn">
            <h3 className="text-lg font-black uppercase text-emerald-400 border-b border-slate-800 pb-3 flex items-center gap-2">
              <Wallet size={20} /> Galla Cash Deposit Desk
            </h3>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-400 mb-1.5">Search Customer / Supplier</label>
              <input 
                type="text" 
                placeholder="Type name to filter..." 
                value={depositSearchFilter}
                onChange={(e) => setDepositSearchFilter(e.target.value)}
                className="w-full p-3 border border-slate-700 rounded-2xl font-bold text-xs bg-slate-800 text-white mb-2 focus:border-emerald-500 focus:outline-none"
              />
              <select 
                value={depositTargetUser} 
                onChange={(e) => setDepositTargetUser(e.target.value)}
                className="w-full p-3 border border-slate-700 rounded-2xl font-black text-xs bg-slate-800 text-emerald-300 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">-- Choose Account ({depositSearchFilteredUsers.length} found) --</option>
                {depositSearchFilteredUsers.map(u => (
                  <option key={u.id || u._id} value={u.id || u._id}>
                    {u.name} ({u.role === 'customer' ? 'Grahak' : 'Supplier'} | Udhaar: Rs. {u.balance})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-400 mb-1.5">Jama Cash Rakam (Rs.) *</label>
              <input 
                type="number" 
                placeholder="Jaise: 1500" 
                value={depositAmountInput}
                onChange={(e) => setDepositAmountInput(e.target.value)}
                className="w-full p-3.5 border-2 border-emerald-500/40 rounded-2xl font-black text-lg bg-emerald-950/20 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-400 mb-1.5">
                Deposit Date & Time (Kal ki date ke liye yahan badlein)
              </label>
              <input 
                type="datetime-local" 
                value={depositDate}
                onChange={(e) => setDepositDate(e.target.value)}
                className="w-full p-3 border border-slate-700 rounded-2xl font-bold text-xs bg-slate-800 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-400 mb-1.5">Payment Channel</label>
              <select 
                value={depositModeInput}
                onChange={(e) => setDepositModeInput(e.target.value)}
                className="w-full p-3 border border-slate-700 rounded-2xl font-bold text-xs bg-slate-800 text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="Offline (Cash)">Cash Desk</option>
                <option value="Online (UPI/PhonePe)">Online UPI Channel</option>
              </select>
            </div>

            <button 
              onClick={(e) => handleDepositSubmit(e, null)}
              disabled={isSubmittingDeposit}
              className={`w-full py-4 rounded-2xl font-black text-xs text-white shadow-lg transition flex items-center justify-center gap-2 ${
                isSubmittingDeposit ? 'bg-slate-700 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 active:scale-95 shadow-emerald-950/50'
              }`}
            >
              {isSubmittingDeposit ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Saving Entry...
                </>
              ) : (
                'Save Cash Jama Entry 🚀'
              )}
            </button>
          </div>
        )}

        {/* ================= CREATE BILL TAB ================= */}
        {activeTab === 'global-billing-tab' && !selectedProfileUser && (
          <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl max-w-2xl mx-auto space-y-5 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-black uppercase text-emerald-400 flex items-center gap-2">
                <Receipt size={18} /> Mandi Bill Counter
              </h3>

              <div className="flex gap-1.5 bg-slate-800 p-1.5 rounded-2xl border border-slate-700">
                <button 
                  onClick={() => setBillingMode('itemized')} 
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${billingMode === 'itemized' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
                >
                  🥦 Sabji Bill
                </button>
                <button 
                  onClick={() => setBillingMode('direct')} 
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1 ${billingMode === 'direct' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                >
                  <Zap size={12} /> Direct Rs. Bill
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-400 mb-1.5">Grahak Select Karein</label>
              <input 
                type="text" 
                placeholder="Serial No ya Name..." 
                value={billingCustomerSearch}
                onChange={(e) => setBillingCustomerSearch(e.target.value)}
                className="w-full p-2.5 border border-slate-700 rounded-2xl font-bold text-xs bg-slate-800 text-white mb-2 focus:border-emerald-500 focus:outline-none"
              />
              <select 
                value={globalBillCustomer}
                onChange={(e) => setGlobalBillCustomer(e.target.value)}
                className="w-full p-3 border border-slate-700 rounded-2xl font-black text-xs bg-slate-800 text-emerald-300 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">-- Choose Grahak --</option>
                {billingSearchFilteredCustomers.map((c, i) => (
                  <option key={c.id || c._id} value={c.id || c._id}>
                    [{i+1}] {c.name} (Baki: Rs. {c.balance})
                  </option>
                ))}
              </select>
            </div>

            {billingMode === 'direct' ? (
              <div className="bg-blue-950/20 border border-blue-500/30 p-5 rounded-2xl space-y-3 animate-fadeIn">
                <div>
                  <label className="block text-[10px] font-black uppercase text-blue-300 mb-1">Direct Bill Amount (Rs.) *</label>
                  <input 
                    type="number" 
                    placeholder="Jaise: 2000" 
                    value={directBillAmount}
                    onChange={(e) => setDirectBillAmount(e.target.value)}
                    className="w-full p-3.5 border border-blue-500/40 rounded-2xl font-black text-lg bg-slate-900 text-white focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Note / Vivaran</label>
                  <input 
                    type="text" 
                    placeholder="Aaj ka hisab..." 
                    value={directBillNote}
                    onChange={(e) => setDirectBillNote(e.target.value)}
                    className="w-full p-2.5 border border-slate-700 rounded-xl font-bold text-xs bg-slate-900 text-white focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {globalBillItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 bg-slate-800/60 p-2.5 rounded-2xl border border-slate-700">
                    <select 
                      value={item.productId}
                      onChange={(e) => {
                        const n = [...globalBillItems];
                        n[idx].productId = e.target.value;
                        const found = stock.find(s => (s.id || s._id) === e.target.value);
                        if (found) n[idx].rate = found.sellingPrice;
                        setGlobalBillItems(n);
                      }}
                      className="flex-1 p-2.5 border border-slate-700 rounded-xl text-xs font-bold bg-slate-900 text-white"
                    >
                      <option value="">-- Select Sabji --</option>
                      {stock.map(s => <option key={s.id || s._id} value={s.id || s._id}>{s.name} ({s.stock} {s.unitType})</option>)}
                    </select>
                    <input 
                      type="text" 
                      placeholder="Wazan" 
                      value={item.weightInput}
                      onChange={(e) => {
                        const n = [...globalBillItems];
                        n[idx].weightInput = e.target.value;
                        setGlobalBillItems(n);
                      }}
                      className="w-24 p-2.5 border border-slate-700 rounded-xl text-xs font-bold bg-slate-900 text-white"
                    />
                    <input 
                      type="number" 
                      placeholder="Rate" 
                      value={item.rate}
                      onChange={(e) => {
                        const n = [...globalBillItems];
                        n[idx].rate = e.target.value;
                        setGlobalBillItems(n);
                      }}
                      className="w-20 p-2.5 border border-slate-700 rounded-xl text-xs font-black bg-slate-900 text-yellow-300"
                    />
                  </div>
                ))}
                <button onClick={() => setGlobalBillItems([...globalBillItems, { productId: '', weightInput: '', rate: '' }])} className="text-xs font-bold text-emerald-400 hover:text-emerald-300">+ Add Row</button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Mandi Aadat / Commission (Rs.)</label>
                <input 
                  type="number" 
                  value={globalCommCash}
                  onChange={(e) => setGlobalCommCash(e.target.value)}
                  className="w-full p-2.5 border border-slate-700 rounded-xl font-bold text-xs bg-slate-800 text-yellow-300"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Cash Jama Advance (Rs.)</label>
                <input 
                  type="number" 
                  value={globalPaidAmount}
                  onChange={(e) => setGlobalPaidAmount(e.target.value)}
                  className="w-full p-2.5 border border-slate-700 rounded-xl font-black text-xs bg-emerald-950/40 text-emerald-400 border-emerald-500/30"
                />
              </div>
            </div>

            <button 
              onClick={() => handleCreateBillSubmission(null)}
              disabled={isSubmittingBill}
              className={`w-full py-4 rounded-2xl font-black text-xs text-white shadow-lg transition flex items-center justify-center gap-2 ${
                isSubmittingBill ? 'bg-slate-700 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 active:scale-95 shadow-emerald-950/50'
              }`}
            >
              {isSubmittingBill ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Saving Bill Entry...
                </>
              ) : (
                'Generate Parcha Bill 🚀'
              )}
            </button>
          </div>
        )}

        {/* ================= DASHBOARD TILES ================= */}
        {activeTab === 'dashboard' && !selectedProfileUser && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 border border-emerald-500/20 p-6 sm:p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                    <TrendingUp size={16} /> Aaj Ka Live Vyapaar Counter
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Real-time settlement overview</p>
                </div>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-black">
                  LIVE
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-800/40 border border-slate-700/60 p-4 rounded-2xl backdrop-blur-sm">
                  <p className="text-[10px] text-slate-400 uppercase font-black">Today Bikri</p>
                  <p className="text-xl sm:text-2xl font-black mt-1 text-white">Rs. {dashboardData.todaySales}</p>
                </div>
                <div className="bg-slate-800/40 border border-slate-700/60 p-4 rounded-2xl backdrop-blur-sm">
                  <p className="text-[10px] text-slate-400 uppercase font-black">Today Profit</p>
                  <p className="text-xl sm:text-2xl font-black mt-1 text-emerald-400">Rs. {dashboardData.todayProfit}</p>
                </div>
                <div className="bg-slate-800/40 border border-slate-700/60 p-4 rounded-2xl backdrop-blur-sm">
                  <p className="text-[10px] text-slate-400 uppercase font-black">Galla Collection</p>
                  <p className="text-xl sm:text-2xl font-black mt-1 text-yellow-300">Rs. {dashboardData.todayCashReceived}</p>
                </div>
                <div className="bg-slate-800/40 border border-slate-700/60 p-4 rounded-2xl backdrop-blur-sm">
                  <p className="text-[10px] text-slate-400 uppercase font-black">Weight Sold</p>
                  <p className="text-xl sm:text-2xl font-black mt-1 text-white">{dashboardData.todayWeightSold} Units</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-rose-500/20 p-6 rounded-3xl shadow-sm">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-black uppercase text-rose-400 tracking-wider">Total Bazaar Udhaar</p>
                  <span className="p-2 bg-rose-500/10 text-rose-400 rounded-xl"><DollarSign size={16}/></span>
                </div>
                <p className="text-3xl font-black text-rose-400 mt-2">Rs. {dashboardData.totalCustomerUdhaar}</p>
              </div>
              <div className="bg-slate-900 border border-amber-500/20 p-6 rounded-3xl shadow-sm">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-black uppercase text-amber-400 tracking-wider">Supplier Dena Baki</p>
                  <span className="p-2 bg-amber-500/10 text-amber-400 rounded-xl"><DollarSign size={16}/></span>
                </div>
                <p className="text-3xl font-black text-amber-400 mt-2">Rs. {dashboardData.totalPartyDena}</p>
              </div>
            </div>
          </div>
        )}

        {/* ================= CUSTOMERS LEDGER TAB ================= */}
        {activeTab === 'customers' && !selectedProfileUser && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm flex items-center gap-3">
              <Search className="text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search Grahak by name..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-bold bg-transparent text-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {customers.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map((c, i) => (
                <div 
                  key={c.id || c._id} 
                  onClick={() => loadUserProfile(c)} 
                  className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 p-5 rounded-2xl cursor-pointer shadow-sm flex justify-between items-center transition hover:bg-slate-850"
                >
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold">{i+1}.</span>
                    <p className="font-black text-sm uppercase text-white">{c.name}</p>
                    <p className="text-[11px] text-slate-400 font-semibold">{c.phone}</p>
                  </div>
                  <p className="text-sm font-black text-rose-400">Rs. {c.balance}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= SUPPLIER KHATA TAB ================= */}
        {activeTab === 'parties' && !selectedProfileUser && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm flex items-center gap-3">
              <Search className="text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search Supplier by name..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-bold bg-transparent text-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {parties.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map((p, i) => (
                <div 
                  key={p.id || p._id} 
                  onClick={() => loadUserProfile(p)} 
                  className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-5 rounded-2xl cursor-pointer shadow-sm flex justify-between items-center transition"
                >
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold">{i+1}.</span>
                    <p className="font-black text-sm uppercase text-white">{p.name}</p>
                    <p className="text-[11px] text-slate-400 font-semibold">{p.phone}</p>
                  </div>
                  <p className="text-sm font-black text-amber-400">Rs. {Math.abs(p.balance)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}