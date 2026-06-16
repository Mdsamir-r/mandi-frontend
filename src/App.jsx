import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Receipt, Package, Users, Printer, Wallet, Search, ArrowLeft, Plus, Edit3, Trash2, History, Calendar, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState({
    totalSales: 0, totalProfit: 0, totalCashReceived: 0, totalCustomerUdhaar: 0, totalPartyDena: 0,
    todaySales: 0, todayProfit: 0, todayCashReceived: 0, todayWeightSold: 0, todayItemsSoldList: []
  });

  const [customers, setCustomers] = useState([]);
  const [parties, setParties] = useState([]);
  const [stock, setStock] = useState([]);
  const [globalInwardHistory, setGlobalInwardHistory] = useState([]); // Dynamic Inward Records (NEW 🚀)
  
  // Panels states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfileUser, setSelectedProfileUser] = useState(null); 
  const [userTimeline, setUserTimeline] = useState([]); 
  const [isEditingMode, setIsEditingMode] = useState(false); 
  const [editingBillId, setEditingBillId] = useState(null);

  // Billing Search Filters
  const [billingCustomerSearch, setBillingCustomerSearch] = useState('');

  // Edit User Account Fields
  const [isUserEditMode, setIsUserEditMode] = useState(false);
  const [editUserName, setEditUserName] = useState('');
  const [editUserPhone, setEditUserPhone] = useState('');
  const [editUserBalance, setEditUserBalance] = useState('');

  // Edit Stock Item Fields
  const [editingStockId, setEditingStockId] = useState(null);
  const [editStockName, setEditStockName] = useState('');
  const [editStockQty, setEditStockQty] = useState('');
  const [editStockPurchasePrice, setEditStockPurchasePrice] = useState('');
  const [editStockSellingPrice, setEditStockSellingPrice] = useState('');

  // Deep History Modals
  const [deepHistoryList, setDeepHistoryList] = useState([]);
  const [deepHistoryTitle, setDeepHistoryTitle] = useState('');
  const [showDeepHistoryModal, setShowDeepHistoryModal] = useState(false);
  const [showTodayItemsModal, setShowTodayItemsSoldModal] = useState(false); 

  // Printable overlays
  const [lastGeneratedBill, setLastGeneratedBill] = useState(null);
  const [lastDepositSlip, setLastDepositSlip] = useState(null); 
  const [lastInwardChallan, setLastInwardChallan] = useState(null); 

  // Fast Global billing
  const [globalBillCustomer, setGlobalBillCustomer] = useState('');
  const [globalBillItems, setGlobalBillItems] = useState([{ productId: '', weightInput: '', rate: '' }]);
  const [globalCommCash, setGlobalCommCash] = useState('0'); 
  const [globalPaidAmount, setGlobalPaidAmount] = useState('');
  const [globalPayMode, setGlobalPayMode] = useState('Offline (Cash)');

  // Profile forms
  const [profBillItems, setProfBillItems] = useState([{ productId: '', weightInput: '', rate: '' }]);
  const [profCommCash, setProfCommCash] = useState('0'); 
  const [profPaidAmount, setProfPaidAmount] = useState('');
  const [profPayMode, setProfPayMode] = useState('Offline (Cash)');
  const [profDepositAmount, setProfDepositAmount] = useState('');
  const [profDepositMode, setProfDepositMode] = useState('Offline (Cash)'); 

  // Master fields
  const [newUserName, setNewUserName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState('customer');
  const [newUserBalance, setNewUserBalance] = useState('');

  const [newProdName, setNewProdName] = useState('');
  const [newProdStock, setNewProdStock] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdSellingPrice, setNewProdSellingPrice] = useState('');
  const [newProdUnit, setNewProdUnit] = useState('Kg');
  const [newProdSupplier, setNewProdSupplier] = useState('');

  const API_URL = 'https://mandi-backend-wk26.onrender.com/api';

  const fetchData = async () => {
    try {
      try {
        const dbRes = await fetch(API_URL + '/dashboard');
        if (dbRes.ok) setDashboardData(await dbRes.json());
      } catch (e) { console.log("Dashboard engine syncing..."); }

      const usersRes = await fetch(API_URL + '/users');
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        if (Array.isArray(usersData)) {
          setCustomers([...usersData.filter(u => u.role === 'customer')]);
          setParties([...usersData.filter(u => u.role === 'party')]);
        }
      }

      const prodRes = await fetch(API_URL + '/products');
      if (prodRes.ok) {
        const productsData = await prodRes.json();
        setStock(productsData);
      }

      // Dynamic Extraction of Global Inward Log History (NEW 🚀)
      // Sabhi users ki history ko process karke dynamic inventory setup compile karta hai
      const allUsers = await usersRes.json().catch(() => []);
      let accumulatedInwards = [];
      const partyUsers = usersData ? usersData.filter(u => u.role === 'party') : [];
      
      for (let p of partyUsers) {
        const tRes = await fetch(`${API_URL}/users/${p.id || p._id}/timeline`);
        if (tRes.ok) {
          const tData = await tRes.json();
          const itemsOnly = tData.filter(item => item.isInwardChallan);
          accumulatedInwards = [...accumulatedInwards, ...itemsOnly];
        }
      }
      accumulatedInwards.sort((a, b) => new Date(b.date) - new Date(a.date));
      setGlobalInwardHistory(accumulatedInwards);

    } catch (err) { console.error("Global Engine Refresh Mismatch: ", err); }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const loadUserProfile = async (user) => {
    const targetId = user.id || user._id;
    setSelectedProfileUser(user);
    setIsUserEditMode(false);
    try {
      const res = await fetch(API_URL + '/users/' + targetId + '/timeline');
      if (res.ok) setUserTimeline(await res.json());
    } catch (err) { console.error(err); }
  };

  const startUserEdit = () => {
    setIsUserEditMode(true);
    setEditUserName(selectedProfileUser.name);
    setEditUserPhone(selectedProfileUser.phone);
    setEditUserBalance(selectedProfileUser.balance);
  };

  const handleUpdateUserFields = async () => {
    const targetId = selectedProfileUser.id || selectedProfileUser._id;
    try {
      const res = await fetch(`${API_URL}/users/update/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editUserName, phone: editUserPhone, balance: Number(editUserBalance) })
      });
      if (res.ok) {
        alert('Khata information safely saved!');
        const updated = await res.json();
        setSelectedProfileUser(updated.user);
        setIsUserEditMode(false);
        fetchData();
      }
    } catch (err) { }
  };

  const handleUpdateStockItem = async (productId) => {
    try {
      const res = await fetch(`${API_URL}/products/update/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editStockName, stock: Number(editStockQty), purchasePrice: Number(editStockPurchasePrice), sellingPrice: Number(editStockSellingPrice) })
      });
      if (res.ok) {
        alert('Stock Vault updated!');
        setEditingStockId(null);
        fetchData();
      }
    } catch (err) { }
  };

  const handleRemoveProductCompletely = async (productId) => {
    if (!confirm('Kya aap is sabji ko stock vault se poori tarah delete karna chahte hain?')) return;
    try {
      const res = await fetch(`${API_URL}/products/${productId}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Maal completely deleted.');
        fetchData();
      }
    } catch (err) { }
  };

  const handleDeleteUser = async (userId, userName) => {
    const pinInput = prompt(`⚠️ WARNING: Secret code lock verify karein:`);
    if (pinInput === null) return;

    try {
      const res = await fetch(`${API_URL}/users/delete/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretCode: pinInput })
      });
      if (res.ok) {
        alert('Khata kamyabi se uda diya gaya!');
        setSelectedProfileUser(null);
        fetchData();
      }
    } catch (err) { }
  };

  const parseMultiBoraWeight = (inputString) => {
    if (!inputString) return 0;
    return inputString.split(',').map(val => parseFloat(val.trim())).filter(val => !isNaN(val)).reduce((sum, current) => sum + current, 0);
  };

  const triggerDeepHistory = async (modeType) => {
    try {
      const res = await fetch(API_URL + '/dashboard/deep-history');
      if (!res.ok) return;
      const { dayBills, dayDeposits, allUsers } = await res.json();
      
      let listData = [];
      if (modeType === 'profit') {
        setDeepHistoryTitle("Accumulated Profit Breakdown");
        listData = dayBills.map(b => ({ field1: b.customerName, field2: 'Bill No: ' + b.id, field3: 'Profit: Rs.' + b.totalProfit }));
      } else if (modeType === 'sales') {
        setDeepHistoryTitle("Sales Records List");
        listData = dayBills.map(b => ({ field1: b.customerName, field2: b.items.map(i => i.productName).join(', '), field3: 'Bill Amt: Rs.' + b.billAmount }));
      } else if (modeType === 'galla') {
        setDeepHistoryTitle("Galla Recovery Collection Summary");
        const fromBills = dayBills.filter(b => b.paidAmount > 0).map(b => ({ field1: b.customerName + ' (Counter)', field2: 'Payment - ' + b.paymentMode, field3: 'Rs.' + b.paidAmount }));
        const fromDeposits = dayDeposits.map(d => ({ field1: d.userName, field2: d.type === 'jama' ? 'Customer Entry':'Supplier Out', field3: 'Rs.' + d.amount }));
        listData = [...fromBills, ...fromDeposits];
      } else if (modeType === 'udhaar') {
        setDeepHistoryTitle("Market Outstanding Grahak Udhaar Summary");
        listData = allUsers.filter(u => u.role === 'customer' && u.balance > 0).map(u => ({ field1: u.name, field2: 'Mobile: ' + u.phone, field3: 'Udhaar: Rs.' + u.balance }));
      } else if (modeType === 'supplier_dena') {
        setDeepHistoryTitle("Kisaan / Supplier Net Owed Outstanding");
        listData = allUsers.filter(u => u.role === 'party' && u.balance < 0).map(u => ({ field1: u.name, field2: 'Party Mob: ' + u.phone, field3: 'Net Dena: Rs.' + Math.abs(u.balance) }));
      }
      
      setDeepHistoryList(listData);
      setShowDeepHistoryModal(true);
    } catch (err) { }
  };

  const startBillEdit = (bill) => {
    setIsEditingMode(true);
    setEditingBillId(bill.id);
    setProfCommCash(bill.commissionAmount.toString());
    setProfPaidAmount(bill.paidAmount.toString());
    setProfPayMode(bill.paymentMode);
    setProfBillItems(bill.items.map(i => ({ productId: (i.productId || i._id), weightInput: i.weight.toString(), rate: i.rate.toString() })));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveCustomerBill = async () => {
    const targetUrl = isEditingMode ? API_URL + '/bills/' + editingBillId : API_URL + '/bills';
    const targetMethod = isEditingMode ? 'PUT' : 'POST';
    const targetUserId = selectedProfileUser.id || selectedProfileUser._id;
    const processedItems = profBillItems.map(item => ({ productId: item.productId, weight: parseMultiBoraWeight(item.weightInput), rate: Number(item.rate) || 0 }));
    
    try {
      const res = await fetch(targetUrl, { method: targetMethod, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: targetUserId, items: processedItems, paidAmount: Number(profPaidAmount) || 0, customCommission: Number(profCommCash), paymentMode: profPayMode }) });
      const data = await res.json();
      if (res.ok) { 
        setLastGeneratedBill(data.bill); 
        setProfBillItems([{ productId: '', weightInput: '', rate: '' }]); 
        setProfCommCash('0'); 
        setProfPaidAmount(''); 
        setIsEditingMode(false); 
        await fetchData(); 
        if (selectedProfileUser) loadUserProfile(selectedProfileUser); 
      }
    } catch (err) { }
  };

  const handleGlobalCreateBill = async () => {
    if (!globalBillCustomer || !globalBillItems[0].productId) return alert('Details bharein!');
    const processedItems = globalBillItems.map(item => ({ productId: item.productId, weight: parseMultiBoraWeight(item.weightInput), rate: Number(item.rate) || 0 }));
    try {
      const res = await fetch(API_URL + '/bills', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: globalBillCustomer, items: processedItems, paidAmount: Number(globalPaidAmount) || 0, customCommission: Number(globalCommCash), paymentMode: globalPayMode }) });
      const data = await res.json();
      if (res.ok) { setLastGeneratedBill(data.bill); setGlobalBillCustomer(''); setGlobalBillItems([{ productId: '', weightInput: '', rate: '' }]); setGlobalCommCash('0'); setGlobalPaidAmount(''); fetchData(); }
    } catch (err) { }
  };

  const handleProfileDeposit = async (e) => {
    e.preventDefault();
    const targetUserId = selectedProfileUser.id || selectedProfileUser._id;
    try {
      const res = await fetch(API_URL + '/deposits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: targetUserId, amount: profDepositAmount, type: 'jama', paymentMode: profDepositMode }) });
      const data = await res.json();
      if (res.ok) { setLastDepositSlip(data.deposit); setProfDepositAmount(''); await fetchData(); if (selectedProfileUser) loadUserProfile(selectedProfileUser); }
    } catch (err) { }
  };

  const handleMasterAddUser = async (e) => {
    e.preventDefault();
    if (!newUserName.trim()) return;
    try {
      const res = await fetch(API_URL + '/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newUserName, phone: newUserPhone || 'N/A', role: newUserRole, initialBalance: Number(newUserBalance) || 0 })
      });
      if (res.ok) { 
        alert('Khata khul gaya safaltapoorvak!'); 
        setNewUserName(''); 
        setNewUserPhone(''); 
        setNewUserBalance(''); 
        await fetchData(); 
      }
    } catch (err) { }
  };

  const handleMasterAddStock = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(API_URL + '/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newProdName, stock: newProdStock, purchasePrice: newProdPrice, sellingPrice: newProdSellingPrice, unitType: newProdUnit, supplierId: newProdSupplier }) });
      if (res.ok) { 
        alert('Maal Supplier ke naam par vault me register ho gaya! 🥕');
        setNewProdName(''); setNewProdStock(''); setNewProdPrice(''); setNewProdSellingPrice(''); fetchData(); 
      }
    } catch (err) { }
  };

  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredParties = parties.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const billingSearchFilteredCustomers = customers.filter((c, idx) => {
    const term = billingCustomerSearch.toLowerCase();
    const serialNum = (idx + 1).toString();
    return c.name.toLowerCase().includes(term) || serialNum === term;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans text-slate-800 transition-all duration-300">
      
      <style>{`
        @media print {
          body, .min-h-screen { background-color: white !important; color: black !important; }
          nav, button, aside, .print\\:hidden { display: none !important; }
          .print-container-receipt { border: none !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; width: 100% !important; max-width: 100% !important; position: absolute; top: 0; left: 0; }
        }
      `}</style>

      {/* SIDEBAR - ULTRA DYNAMIC FLEX WRAP FOR RESPONSIVENESS */}
      <aside className="w-full lg:w-64 bg-emerald-900 text-white flex flex-col p-4 lg:p-5 shadow-xl print:hidden shrink-0">
        <div className="flex flex-row lg:flex-col items-center justify-between lg:justify-start gap-2 border-b border-emerald-800 pb-3 mb-4">
          <div className="text-left lg:text-center">
            <h2 className="text-lg lg:text-xl font-black tracking-tight uppercase text-emerald-100">Samim And Sons</h2>
            <p className="text-[10px] lg:text-xs text-emerald-300">Vegetable Live Trading Ledger</p>
          </div>
          <span className="bg-emerald-800 px-2.5 py-1 rounded-full text-[10px] font-bold text-emerald-200 border border-emerald-700 animate-pulse">Production Live</span>
        </div>
        
        <nav className="grid grid-cols-2 sm:grid-cols-4 lg:flex lg:flex-col gap-1.5 lg:gap-2 flex-1 w-full">
          <button onClick={() => { setActiveTab('dashboard'); setSelectedProfileUser(null); setShowTodayItemsModal(false); setShowDeepHistoryModal(false); }} className={`flex items-center justify-center lg:justify-start gap-2 lg:gap-3 p-2.5 lg:p-3 rounded-xl text-xs lg:text-sm font-semibold transition-all ${activeTab === 'dashboard' ? 'bg-emerald-700 text-white shadow-inner border border-emerald-600' : 'text-emerald-200 hover:bg-emerald-800/60'}`}>
            <LayoutDashboard size={16} /> <span className="truncate">Dashboard</span>
          </button>
          <button onClick={() => { setActiveTab('customers'); setSelectedProfileUser(null); }} className={`flex items-center justify-center lg:justify-start gap-2 lg:gap-3 p-2.5 lg:p-3 rounded-xl text-xs lg:text-sm font-semibold transition-all ${activeTab === 'customers' ? 'bg-emerald-700 text-white shadow-inner border border-emerald-600' : 'text-emerald-200 hover:bg-emerald-800/60'}`}>
            <Users size={16} /> <span className="truncate">Grahak Ledger</span>
          </button>
          <button onClick={() => { setActiveTab('parties'); setSelectedProfileUser(null); }} className={`flex items-center justify-center lg:justify-start gap-2 lg:gap-3 p-2.5 lg:p-3 rounded-xl text-xs lg:text-sm font-semibold transition-all ${activeTab === 'parties' ? 'bg-emerald-700 text-white shadow-inner border border-emerald-600' : 'text-emerald-200 hover:bg-emerald-800/60'}`}>
            <Users size={16} /> <span className="truncate">Supplier Khata</span>
          </button>
          <button onClick={() => { setActiveTab('stock'); setSelectedProfileUser(null); }} className={`flex items-center justify-center lg:justify-start gap-2 lg:gap-3 p-2.5 lg:p-3 rounded-xl text-xs lg:text-sm font-semibold transition-all ${activeTab === 'stock' ? 'bg-emerald-700 text-white shadow-inner border border-emerald-600' : 'text-emerald-200 hover:bg-emerald-800/60'}`}>
            <Package size={16} /> <span className="truncate">Mandi Stock Vault</span>
          </button>
        </nav>
      </aside>

      {/* MAIN CONTAINER AREA WITH RESPONSIVE SCREEN WRAPPING */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden print:p-0">
        
        {/* PARCHA BILL OVERLAYS */}
        {lastGeneratedBill && (
          <div className="bg-white p-5 rounded-2xl shadow-2xl max-w-md mx-auto border-2 border-emerald-600 mb-6 print-container-receipt animate-fadeIn">
            <div className="text-center border-b pb-2 mb-4">
              <h2 className="text-xl font-black uppercase text-emerald-800">Samim And Sons</h2>
              <p className="text-[10px] text-gray-500 font-bold">Mandi Merchant Vyapaar | Mob: 9955494854</p>
            </div>
            <div className="flex justify-between text-xs mb-3 bg-slate-50 p-2 rounded-lg border">
              <p><strong>Grahak:</strong> {lastGeneratedBill.customerName}</p>
              <p><strong>Date:</strong> {new Date(lastGeneratedBill.date).toLocaleDateString()}</p>
            </div>
            <table className="w-full text-xs text-left mb-3 border-b">
              <thead><tr className="bg-slate-100 font-bold text-slate-700"><th className="p-1.5">Item</th><th className="p-1.5 text-center">Wazan</th><th className="p-1.5 text-right">Rate</th><th className="p-1.5 text-right">Total</th></tr></thead>
              <tbody>
                {lastGeneratedBill.items.map((it, i) => (
                  <tr key={i} className="border-b hover:bg-slate-50"><td className="p-1.5 font-medium">{it.productName}</td><td className="p-1.5 text-center font-bold text-emerald-800">{it.weight} {it.unitType}</td><td className="p-1.5 text-right">Rs. {it.rate}</td><td className="p-1.5 text-right font-black">Rs. {it.total}</td></tr>
                ))}
              </tbody>
            </table>
            <div className="text-right text-xs space-y-1 bg-slate-50 p-3 rounded-xl border">
              <p>Maal Net Amount: Rs. {lastGeneratedBill.rawBillAmount}</p>
              <p className="text-emerald-700 font-extrabold">Mandi Aadat Commission: +Rs. {lastGeneratedBill.commissionAmount}</p>
              <p>Purana Balance Baaki: Rs. {lastGeneratedBill.previousBalance}</p>
              <div className="border-t pt-1 font-black text-slate-950 flex justify-between"><span>Grand Total:</span><span>Rs. {lastGeneratedBill.grandTotal}</span></div>
              <p className="text-blue-700 font-extrabold">Counter Cash Advance ({lastGeneratedBill.paymentMode}): -Rs. {lastGeneratedBill.paidAmount}</p>
              <p className="text-sm font-black text-rose-600 border-t border-dashed pt-1 mt-1 text-right">Net Baaki Khata: Rs. {lastGeneratedBill.newBalance}</p>
            </div>
            <div className="mt-4 flex gap-2 print:hidden"><button onClick={() => window.print()} className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white py-2.5 rounded-xl font-bold shadow-md">Print Parcha</button><button onClick={() => setLastGeneratedBill(null)} className="bg-slate-200 hover:bg-slate-300 px-4 py-2.5 rounded-xl font-bold">Close</button></div>
          </div>
        )}

        {/* DYNAMIC VIEWS PANELS */}
        {!lastGeneratedBill && !lastDepositSlip && !lastInwardChallan && (
          <div className="print:hidden space-y-6">
            
            {/* SEARCH DIRECTORY PANEL */}
            {activeTab !== 'global-billing-tab' && !selectedProfileUser && (
              <div className="bg-white p-3.5 rounded-2xl border shadow-sm flex items-center gap-3 transition-all focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent">
                <Search className="text-slate-400 shrink-0" size={18} />
                <input type="text" placeholder="🔍 Search Grahak ya Kisaan by name..." className="w-full focus:outline-none bg-transparent text-sm font-medium" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            )}

            {searchQuery && !selectedProfileUser && (
              <div className="bg-white border rounded-2xl shadow-xl p-3 max-h-60 overflow-y-auto space-y-1 animate-fadeIn">
                <p className="text-[10px] font-bold text-slate-400 uppercase px-2 mb-1">Matches Found ({filteredCustomers.length + filteredParties.length})</p>
                {filteredCustomers.map((c, i) => <div key={c.id || c._id} onClick={() => { loadUserProfile(c); setSearchQuery(''); }} className="p-2.5 hover:bg-emerald-50/50 cursor-pointer rounded-xl flex justify-between items-center transition"><span>Serial {i+1}. <strong className="text-slate-900">{c.name}</strong> <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded ml-1">Khareedar</span></span><span className="font-bold text-rose-600">Rs. {c.balance}</span></div>)}
                {filteredParties.map((p, i) => <div key={p.id || p._id} onClick={() => { loadUserProfile(p); setSearchQuery(''); }} className="p-2.5 hover:bg-amber-50 cursor-pointer rounded-xl flex justify-between items-center transition"><span>Serial {i+1}. <strong className="text-slate-900">{p.name}</strong> <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded ml-1">Supplier</span></span><span className="font-bold text-amber-600">Rs. {Math.abs(p.balance)}</span></div>)}
              </div>
            )}

            {/* PROFILE 360 DETAILED ACCOUNT COMPONENT */}
            {selectedProfileUser && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row justify-between gap-3 bg-white p-3 rounded-2xl border shadow-sm">
                  <button onClick={() => { setSelectedProfileUser(null); setIsUserEditMode(false); }} className="flex items-center justify-center gap-2 bg-slate-100 border hover:bg-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition">
                    <ArrowLeft size={14} /> Back to Directory List
                  </button>
                  <button onClick={() => handleDeleteUser((selectedProfileUser.id || selectedProfileUser._id), selectedProfileUser.name)} className="flex items-center justify-center gap-2 bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-600 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition">
                    <Trash2 size={14} /> Delete This Account 🔒
                  </button>
                </div>

                {/* USER PROFILE CARD BLOCK AND EDIT SWITCH */}
                <div className="bg-white p-5 sm:p-6 rounded-2xl border shadow-sm">
                  {!isUserEditMode ? (
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
                      <div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase flex items-center gap-3">
                          {selectedProfileUser.name}
                          <button onClick={startUserEdit} className="text-blue-600 hover:text-blue-900 transition"><Edit3 size={16} /></button>
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5 font-medium">Phone Connected: {selectedProfileUser.phone || 'N/A'}</p>
                        <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase text-white shadow-sm ${selectedProfileUser.role === 'customer' ? 'bg-emerald-600':'bg-amber-600'}`}>
                          {selectedProfileUser.role === 'customer' ? 'Grahak Ledger Account':'Mandi Supplier / Kisaan'}
                        </span>
                      </div>
                      <div className="bg-slate-50 border p-4 rounded-xl text-left sm:text-right w-full sm:w-auto shrink-0 shadow-inner">
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Net Outstanding Balance</p>
                        <p className="text-2xl font-black text-rose-600 mt-0.5">Rs. {Math.abs(selectedProfileUser.balance)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full bg-amber-50/40 p-4 rounded-xl border-2 border-dashed border-amber-300 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 items-end animate-fadeIn">
                      <div><label className="block text-[10px] uppercase font-black text-slate-500 mb-1">Modify Name</label><input type="text" className="w-full p-2 border rounded-xl bg-white text-xs font-bold" value={editUserName} onChange={e => setEditUserName(e.target.value)} /></div>
                      <div><label className="block text-[10px] uppercase font-black text-slate-500 mb-1">Modify Phone No</label><input type="text" className="w-full p-2 border rounded-xl bg-white text-xs font-bold" value={editUserPhone} onChange={e => setEditUserPhone(e.target.value)} /></div>
                      <div><label className="block text-[10px] uppercase font-black text-slate-500 mb-1">Adjust Opening Balance (Rs.)</label><input type="number" className="w-full p-2 border rounded-xl bg-white text-xs font-bold" value={editUserBalance} onChange={e => setEditUserBalance(e.target.value)} /></div>
                      <div className="flex gap-2"><button onClick={handleUpdateUserFields} className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white p-2 rounded-xl text-xs font-bold shadow">Save Updates</button><button onClick={() => setIsUserEditMode(false)} className="bg-slate-200 px-3 py-2 rounded-xl text-xs font-bold">X</button></div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* MAIN DASHBOARD BLOCK */}
            {activeTab === 'dashboard' && !selectedProfileUser && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border shadow-sm">
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">Samim And Sons Vegetable Ledger Dashboard</h2>
                    <p className="text-xs text-slate-400 font-medium">Realtime Production Sync Engine</p>
                  </div>
                  <button onClick={() => setActiveTab('global-billing-tab')} className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-5 py-3 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all transform active:scale-95 shrink-0 text-sm"><Receipt size={16} /> Naya Parcha / Billing (+)</button>
                </div>

                {/* STATS TILES */}
                <div className="bg-gradient-to-br from-emerald-950 to-emerald-800 p-5 sm:p-6 rounded-3xl text-white shadow-lg">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-300 mb-4 flex items-center gap-1">📊 Aaj Ka Mandi Live Vyapaar Counter</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div onClick={() => triggerDeepHistory('profit')} className="bg-white/10 p-4 rounded-2xl border border-white/10 cursor-pointer hover:bg-white/20 transition-all shadow-sm">
                      <p className="text-[11px] text-emerald-200 font-medium">Aaj Ka Kul Munafa (Profit)</p>
                      <p className="text-xl sm:text-2xl font-black mt-1">Rs. {dashboardData.todayProfit}</p>
                    </div>
                    <div onClick={() => triggerDeepHistory('sales')} className="bg-white/10 p-4 rounded-2xl border border-white/10 cursor-pointer hover:bg-white/20 transition-all shadow-sm">
                      <p className="text-[11px] text-emerald-200 font-medium">Aaj Ki Kul Bikri (Today Sales)</p>
                      <p className="text-xl sm:text-2xl font-black mt-1">Rs. {dashboardData.todaySales}</p>
                    </div>
                    <div onClick={() => triggerDeepHistory('galla')} className="bg-white/10 p-4 rounded-2xl border border-white/10 cursor-pointer hover:bg-white/20 transition-all shadow-sm">
                      <p className="text-[11px] text-emerald-200 font-medium">Aaj Ka Galla Cash Collection</p>
                      <p className="text-xl sm:text-2xl font-black mt-1 text-yellow-300">Rs. {dashboardData.todayCashReceived}</p>
                    </div>
                    <div onClick={() => setShowTodayItemsSoldModal(true)} className="bg-white/15 p-4 rounded-2xl border-2 border-dashed border-white/30 cursor-pointer hover:bg-white/25 transition-all">
                      <p className="text-[11px] text-yellow-200 font-bold flex items-center gap-1">👉 Aaj Kya Kya Maal Bika</p>
                      <p className="text-xl sm:text-2xl font-black mt-1 text-white">{dashboardData.todayWeightSold} Units</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* GLOBAL INSTANT INVOICE GEN WITH ROW FILTERS & SERIAL LOOKUPS */}
            {activeTab === 'global-billing-tab' && (
              <div className="bg-white p-5 sm:p-6 rounded-2xl border shadow-md max-w-3xl mx-auto space-y-4 animate-fadeIn">
                <h3 className="text-base sm:text-lg font-black text-slate-900 border-b pb-2 text-emerald-800 uppercase tracking-tight">🧾 Mandi Vyapaar Fast Invoice Generator</h3>
                
                <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200/60 space-y-2.5 shadow-inner">
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider">1. Search & Filter Grahak (Type Serial Number ya Name)</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1 flex items-center bg-white border rounded-xl px-2 focus-within:ring-2 focus-within:ring-emerald-500">
                      <Search size={14} className="text-slate-400 mr-1.5 shrink-0" />
                      <input 
                        type="text" 
                        placeholder="Ex: '1' for serial 1, or type 'asif'..." 
                        className="w-full p-2 focus:outline-none text-xs font-black text-slate-900" 
                        value={billingCustomerSearch} 
                        onChange={(e) => setBillingCustomerSearch(e.target.value)} 
                      />
                    </div>
                    {billingCustomerSearch && <button onClick={() => setBillingCustomerSearch('')} className="text-xs text-rose-600 bg-white px-2.5 border rounded-xl font-bold hover:bg-slate-100">Clear</button>}
                  </div>

                  <select 
                    className="w-full p-2.5 border rounded-xl text-xs font-black bg-white text-emerald-900 shadow-sm" 
                    value={globalBillCustomer} 
                    onChange={(e) => setGlobalBillCustomer(e.target.value)}
                  >
                    <option value="">-- Match List Click To Select ({billingSearchFilteredCustomers.length} found) --</option>
                    {billingSearchFilteredCustomers.map((c) => {
                      const originalIndex = customers.findIndex(cust => cust.id === c.id || cust._id === c._id) + 1;
                      return (
                        <option key={c.id || c._id} value={c.id || c._id}>
                          [SNo: {originalIndex}] {c.name} (Outstanding Khata: Rs.{c.balance})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1">Mandi Commission / Aadat Add (Rs.)</label>
                    <input type="number" className="w-full p-2 border rounded-xl bg-yellow-50 font-black text-slate-900" value={globalCommCash} onChange={(e) => setGlobalCommCash(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Channel Account Mode</label>
                    <select className="w-full p-2 border rounded-xl text-xs font-bold" value={globalPayMode} onChange={(e) => setGlobalPayMode(e.target.value)}><option value="Offline (Cash)">Offline Cash Desk</option><option value="Online (UPI/PhonePe)">Online UPI Channel</option></select>
                  </div>
                </div>

                {globalBillItems.map((item, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-slate-50/50 p-2 border rounded-xl">
                    <select className="w-full sm:flex-1 p-2 border rounded-lg text-xs font-medium bg-white" value={item.productId} onChange={(e) => { const n=[...globalBillItems]; n[idx].productId=e.target.value; const m=stock.find(s=>(s.id || s._id)===e.target.value); if(m)n[idx].rate=m.sellingPrice; setGlobalBillItems(n); }}><option value="">-- Select Sabji --</option>{stock.map(s => <option key={s.id || s._id} value={s.id || s._id}>{s.name} ({s.stock} left)</option>)}</select>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <input type="text" placeholder="Multi-Bora (30,35)" className="flex-1 sm:w-36 p-2 border rounded-lg text-xs font-bold bg-white" value={item.weightInput} onChange={(e) => { const n = [...globalBillItems]; n[idx].weightInput = e.target.value; setGlobalBillItems(n); }} />
                      <input type="number" placeholder="Rate" className="w-20 p-2 border rounded-lg text-xs bg-yellow-50 font-black text-slate-900" value={item.rate} onChange={(e) => { const n = [...globalBillItems]; n[idx].rate = e.target.value; setGlobalBillItems(n); }} />
                    </div>
                  </div>
                ))}
                <button onClick={() => setGlobalBillItems([...globalBillItems, { productId: '', weightInput: '', rate: '' }])} className="text-xs font-bold text-emerald-700 hover:text-emerald-900">+ Add Naye Sabji Row</button>
                <input type="number" placeholder="Counter Cash Amount Received (Rs.)" className="w-full p-3 border rounded-xl bg-emerald-50/60 font-black text-sm text-emerald-950 placeholder-emerald-700 focus:ring-2 focus:ring-emerald-600" value={globalPaidAmount} onChange={(e) => setGlobalPaidAmount(e.target.value)} />
                <div className="flex gap-2 pt-2"><button onClick={handleGlobalCreateBill} className="flex-1 bg-emerald-800 hover:bg-emerald-950 text-white p-3 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95">Generate Invoice Parcha 🚀</button><button onClick={() => setActiveTab('dashboard')} className="bg-slate-200 hover:bg-slate-300 px-5 py-3 rounded-xl font-bold text-sm">Cancel</button></div>
              </div>
            )}

            {/* CUSTOMERS LEDGER SECTION */}
            {activeTab === 'customers' && !selectedProfileUser && (
              <div className="space-y-4 animate-fadeIn">
                <form onSubmit={handleMasterAddUser} className="bg-white p-4 rounded-2xl border shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
                  <div><label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Grahak Naam</label><input type="text" placeholder="Full Name" className="w-full p-2 border rounded-xl text-xs font-bold" value={newUserName} onChange={(e) => { setNewUserName(e.target.value); setNewUserRole('customer'); }} required /></div>
                  <div><label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Phone Number</label><input type="text" placeholder="Mobile No" className="w-full p-2 border rounded-xl text-xs font-bold" value={newUserPhone} onChange={(e) => setNewUserPhone(e.target.value)} /></div>
                  <div><label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Opening Baaki Udhaar</label><input type="number" placeholder="Opening Cash" className="w-full p-2 border rounded-xl text-xs font-bold" value={newUserBalance} onChange={(e) => setNewUserBalance(e.target.value)} /></div>
                  <button type="submit" className="bg-emerald-700 hover:bg-emerald-800 text-white p-2 py-2.5 rounded-xl font-bold text-xs shadow-md transition">Open New Account</button>
                </form>
                <div className="bg-white p-4 sm:p-5 rounded-2xl border shadow-sm">
                  <h3 className="font-black text-sm text-slate-900 mb-3 uppercase tracking-tight">Khareedar List (Serial-wise Mapping)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {customers.map((c, i) => (
                      <div key={c.id || c._id} onClick={() => loadUserProfile(c)} className="p-3.5 border rounded-xl flex justify-between items-center cursor-pointer hover:bg-emerald-50/40 hover:border-emerald-200 transition shadow-sm bg-white">
                        <div className="truncate pr-2"><span className="text-slate-400 font-bold text-xs mr-1">{i+1}.</span> <strong className="text-slate-900 uppercase text-xs sm:text-sm">{c.name}</strong></div>
                        <span className="font-black text-rose-600 text-xs sm:text-sm shrink-0">Rs. {c.balance}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SUPPLIERS SECTION */}
            {activeTab === 'parties' && !selectedProfileUser && (
              <div className="space-y-4 animate-fadeIn">
                <form onSubmit={handleMasterAddUser} className="bg-white p-4 rounded-2xl border shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
                  <div><label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Supplier Naam</label><input type="text" placeholder="Kisaan Name" className="w-full p-2 border rounded-xl text-xs font-bold" value={newUserName} onChange={(e) => { setNewUserName(e.target.value); setNewUserRole('party'); }} required /></div>
                  <div><label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Phone Number</label><input type="text" placeholder="Mobile" className="w-full p-2 border rounded-xl text-xs font-bold" value={newUserPhone} onChange={(e) => setNewUserPhone(e.target.value)} /></div>
                  <div><label className="block text-[10px] uppercase font-black text-slate-400 mb-1">Opening Owed Balance</label><input type="number" placeholder="Purana Rakam (-)" className="w-full p-2 border rounded-xl text-xs font-bold" value={newUserBalance} onChange={(e) => setNewUserBalance(e.target.value)} /></div>
                  <button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white p-2 py-2.5 rounded-xl font-bold text-xs shadow-md transition">Add Party Supplier</button>
                </form>
                <div className="bg-white p-4 sm:p-5 rounded-2xl border shadow-sm">
                  <h3 className="font-black text-sm text-slate-900 mb-3 uppercase tracking-tight">Mandi Supplier List</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {parties.map((p, i) => (
                      <div key={p.id || p._id} onClick={() => loadUserProfile(p)} className="p-3.5 border rounded-xl flex justify-between items-center cursor-pointer hover:bg-amber-50/40 hover:border-amber-200 transition shadow-sm bg-white">
                        <div className="truncate pr-2"><span className="text-slate-400 font-bold text-xs mr-1">{i+1}.</span> <strong className="text-slate-900 uppercase text-xs sm:text-sm">{p.name}</strong></div>
                        <span className="font-black text-amber-700 text-xs sm:text-sm shrink-0">Rs. {Math.abs(p.balance)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* LIVE STOCK VAULT WITH COMPREHENSIVE DATE-WISE HISTORY (COMPLETED 🚀) */}
            {activeTab === 'stock' && !selectedProfileUser && (
              <div className="space-y-6 animate-fadeIn">
                <form onSubmit={handleMasterAddStock} className="bg-white p-4 rounded-2xl border shadow-sm grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 items-end">
                  <div className="col-span-2 sm:col-span-1"><label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Sabji Item</label><input type="text" placeholder="Naam" className="w-full p-2 border rounded-xl text-xs font-bold" value={newProdName} onChange={(e) => setNewProdName(e.target.value)} required /></div>
                  <div><label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Unit Type</label><select className="w-full p-2 border rounded-xl text-xs font-bold bg-white" value={newProdUnit} onChange={(e) => setNewProdUnit(e.target.value)}><option value="Kg">Kg</option><option value="Krate">Krate</option><option value="Piece">Piece</option><option value="Packet">Packet</option></select></div>
                  <div><label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Qty</label><input type="number" placeholder="Unload Count" className="w-full p-2 border rounded-xl text-xs font-bold" value={newProdStock} onChange={(e) => setNewProdStock(e.target.value)} required /></div>
                  <div><label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Khareed Bhav</label><input type="number" placeholder="Cost Price" className="w-full p-2 border rounded-xl text-xs font-bold" value={newProdPrice} onChange={(e) => setNewProdPrice(e.target.value)} required /></div>
                  <div><label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Est. Selling Bhav</label><input type="number" placeholder="Sale Rate" className="w-full p-2 border rounded-xl text-xs font-bold" value={newProdSellingPrice} onChange={(e) => setNewProdSellingPrice(e.target.value)} required /></div>
                  <div className="col-span-2 sm:col-span-1"><label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Tag Supplier Kisaan</label><select className="w-full p-2 border rounded-xl text-xs font-black bg-amber-50 text-amber-950" value={newProdSupplier} onChange={(e) => setNewProdSupplier(e.target.value)} required><option value="">-- Supplier --</option>{parties.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>)}</select></div>
                  <button type="submit" className="col-span-2 lg:col-span-1 bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl font-bold text-xs shadow transition">Unload Stock</button>
                </form>

                {/* SUB-BLOCK 1: CURRENT LIVE VAULT ROW BALANCE */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 mb-3 text-emerald-900 font-black text-sm uppercase tracking-tight"><CheckCircle2 size={16} /> Live Vault Balanced Stock</div>
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-left text-xs min-w-[600px]">
                      <thead>
                        <tr className="bg-slate-100 font-bold border-b text-slate-600">
                          <th className="p-3">Sabji Item</th>
                          <th className="p-3">Last Tagged Supplier</th>
                          <th className="p-3">Live Stock Vault (Available)</th>
                          <th className="p-3">Purchase Price Reference</th>
                          <th className="p-3">Current Target Selling Rate</th>
                          <th className="p-3 text-center">Manage / Wastage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y bg-white">
                        {stock.map(s => (
                          <tr key={s.id || s._id} className="hover:bg-slate-50/80 transition-all duration-150">
                            {editingStockId !== (s.id || s._id) ? (
                              <>
                                <td className="p-3 font-bold uppercase text-slate-900">{s.name}</td>
                                <td className="p-3 text-amber-800 font-extrabold bg-amber-50/30">{s.supplierName || 'N/A'}</td>
                                <td className="p-3 text-blue-600 font-black text-sm bg-blue-50/20">{s.stock} {s.unitType}</td>
                                <td className="p-3 text-slate-500 font-medium">Rs. {s.purchasePrice}/{s.unitType}</td>
                                <td className="p-3 font-black text-emerald-700 text-sm">Rs. {s.sellingPrice}/{s.unitType}</td>
                                <td className="p-3 flex justify-center gap-2 items-center">
                                  <button onClick={() => { setEditingStockId(s.id || s._id); setEditStockName(s.name); setEditStockQty(s.stock); setEditStockPurchasePrice(s.purchasePrice); setEditStockSellingPrice(s.sellingPrice); }} className="bg-orange-50 text-orange-600 p-2 rounded-xl hover:bg-orange-600 hover:text-white transition shadow-sm"><Edit3 size={12} /></button>
                                  <button onClick={() => handleRemoveProductCompletely(s.id || s._id)} className="bg-rose-50 text-rose-600 p-2 rounded-xl hover:bg-rose-600 hover:text-white transition shadow-sm"><Trash2 size={12} /></button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="p-2"><input type="text" className="w-24 p-1.5 border rounded-lg text-xs font-bold" value={editStockName} onChange={e => setEditStockName(e.target.value)} /></td>
                                <td className="p-2 text-slate-400 text-[10px]">Orig: {s.supplierName}</td>
                                <td className="p-2"><input type="number" className="w-20 p-1.5 border rounded-lg text-xs font-bold bg-blue-50 text-blue-700" value={editStockQty} onChange={e => setEditStockQty(e.target.value)} /></td>
                                <td className="p-2"><input type="number" className="w-16 p-1.5 border rounded-lg text-xs" value={editStockPurchasePrice} onChange={e => setEditStockPurchasePrice(e.target.value)} /></td>
                                <td className="p-2"><input type="number" className="w-16 p-1.5 border rounded-lg text-xs text-emerald-700 font-bold" value={editStockSellingPrice} onChange={e => setEditStockSellingPrice(e.target.value)} /></td>
                                <td className="p-2 flex gap-1 justify-center">
                                  <button onClick={() => handleUpdateStockItem(s.id || s._id)} className="bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-[10px] font-bold shadow">Save</button>
                                  <button onClick={() => setEditingStockId(null)} className="bg-slate-300 px-2 py-1.5 rounded-lg text-[10px]">X</button>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* SUB-BLOCK 2: DYNAMIC DATE-WISE INWARD HISTORY INVENTORY RECORD (NEW 🚀) */}
                {/* Mandi me kis tarikh ko kya maal unload hua hai, uska dynamic chronological ledger block */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border shadow-sm overflow-hidden animate-fadeIn">
                  <div className="flex items-center gap-2 mb-3 text-slate-900 font-black text-sm uppercase tracking-tight"><Calendar size={16} className="text-emerald-700" /> Date-Wise Unload Inward History Timeline</div>
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-left text-xs min-w-[650px]">
                      <thead>
                        <tr className="bg-slate-50 font-bold border-b text-slate-500">
                          <th className="p-3">Unload Date / Time</th>
                          <th className="p-3">Challan / Entry ID</th>
                          <th className="p-3">Sabji Name</th>
                          <th className="p-3">Kisaan / Supplier Origin</th>
                          <th className="p-3 text-right">Unloaded Quantity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y bg-white">
                        {globalInwardHistory.map((log, index) => (
                          <tr key={index} className="hover:bg-slate-50 font-medium">
                            <td className="p-3 text-slate-600">{new Date(log.date).toLocaleString()}</td>
                            <td className="p-3 font-mono text-slate-400 text-[11px]">{log.id}</td>
                            <td className="p-3 uppercase font-extrabold text-slate-900 tracking-wide">{log.description}</td>
                            <td className="p-3 text-amber-800 font-bold bg-amber-50/20">{log.rawObj?.supplierName || 'Unknown Supplier'}</td>
                            <td className="p-3 text-right text-blue-700 font-black text-sm">{log.amount} Units</td>
                          </tr>
                        ))}
                        {globalInwardHistory.length === 0 && (
                          <tr><td colSpan="5" className="p-4 text-center text-slate-400 font-bold">Abhi tak koi unloading stock log history recorded nahi hai.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

      </main>
    </div>
  );
}