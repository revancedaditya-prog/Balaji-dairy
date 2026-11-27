import supabase from '../lib/supabase';

const qs = (pairs) => pairs.filter(([,v]) => v !== undefined && v !== null && v !== '').map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
const single = (rows) => Array.isArray(rows) ? rows[0] : rows;
const writeHeaders = { Prefer: 'return=representation' };

const mapProfile = (p) => p ? ({ _id:p.id, id:p.id, name:p.name, full_name:p.name, phone:p.phone, email:p.email, role:p.role, status:p.status }) : null;
const mapSupplier = (s) => s ? ({ _id:s.id, id:s.id, supplierCode:s.supplier_code, supplierName:s.supplier_name, fatherName:s.father_name || '', mobile:s.mobile || '', village:s.village, status:s.status, joiningDate:s.joining_date, createdAt:s.created_at }) : null;
const mapEntry = (e) => ({ _id:e.id, id:e.id, supplierCode:e.supplier_code, supplierName:e.supplier_name, date:e.date, time:String(e.time || '').slice(0,8), shift:e.shift, milkQuantity:Number(e.milk_quantity), fat:Number(e.fat), snf:Number(e.snf), rate:Number(e.rate), amount:Number(e.amount), remarks:e.remarks || '', createdAt:e.created_at });
const mapPayment = (p) => ({ _id:p.id, id:p.id, supplierCode:p.supplier_code, date:p.date, amountPaid:Number(p.amount_paid), paymentMode:p.payment_mode, remarks:p.remarks || '', createdAt:p.created_at });

const todayIST = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());

export const authService = {
  login: async (phone,password) => {
    const session = await supabase.auth.signInWithPassword({ phone, password });
    const rows = await supabase.query('profiles', qs([['select','*'],['id',`eq.${session.user.id}`],['limit','1']]));
    const user = mapProfile(single(rows));
    if (!user || user.status !== 'active') { await supabase.auth.signOut(); throw new Error('Account is inactive or profile is missing'); }
    return { success:true, token:session.access_token, user };
  },
  getMe: async () => {
    const authUser = await supabase.auth.getUser();
    if (!authUser) return { success:false };
    const rows = await supabase.query('profiles', qs([['select','*'],['id',`eq.${authUser.id}`],['limit','1']]));
    const user = mapProfile(single(rows));
    return { success:!!user, user };
  },
  changePassword: async (oldPassword,newPassword) => {
    const me = await supabase.auth.getUser();
    const profileRows = await supabase.query('profiles', qs([['select','phone'],['id',`eq.${me.id}`],['limit','1']]));
    const phone = single(profileRows)?.phone;
    await supabase.auth.signInWithPassword({ phone, password:oldPassword });
    await fetch(`${supabase.url}/auth/v1/user`, { method:'PUT', headers:{ apikey:supabase.publishableKey, Authorization:`Bearer ${supabase.getSession().access_token}`, 'Content-Type':'application/json' }, body:JSON.stringify({password:newPassword}) }).then(async r=>{ if(!r.ok) throw new Error((await r.json()).message || 'Failed to change password'); });
    return { success:true, message:'Password updated successfully' };
  },
};

export const supplierService = {
  getSuppliers: async (filters={}) => {
    const p=[['select','*'],['order','supplier_code.asc']];
    if(filters.status)p.push(['status',`eq.${filters.status}`]);
    if(filters.village)p.push(['village',`ilike.*${filters.village}*`]);
    if(filters.search){ const s=String(filters.search).trim(); p.push(/^\d+$/.test(s)?['supplier_code',`eq.${s}`]:['or',`(supplier_name.ilike.*${s}*,village.ilike.*${s}*)`]); }
    const rows=await supabase.query('suppliers',qs(p)); return {success:true,count:rows.length,data:rows.map(mapSupplier)};
  },
  getSupplierById: async id => ({success:true,data:mapSupplier(single(await supabase.query('suppliers',qs([['select','*'],['id',`eq.${id}`],['limit','1']]))))}),
  getSupplierByCode: async code => ({success:true,data:mapSupplier(single(await supabase.query('suppliers',qs([['select','*'],['supplier_code',`eq.${code}`],['limit','1']]))))}),
  addSupplier: async data => { const body={supplier_code:Number(data.supplierCode),supplier_name:data.supplierName,father_name:data.fatherName||null,mobile:data.mobile||null,village:data.village,status:data.status||'active',joining_date:data.joiningDate||todayIST()}; const r=single(await supabase.query('suppliers','',{method:'POST',headers:writeHeaders,body:JSON.stringify(body)})); await supabase.rpc('log_audit',{p_action:'SUPPLIER_ADD',p_target_type:'supplier',p_target_id:r.id,p_new_value:r}); return {success:true,data:mapSupplier(r)}; },
  updateSupplier: async (id,data) => { const body={}; if(data.supplierCode!==undefined)body.supplier_code=Number(data.supplierCode); if(data.supplierName!==undefined)body.supplier_name=data.supplierName; if(data.fatherName!==undefined)body.father_name=data.fatherName; if(data.mobile!==undefined)body.mobile=data.mobile; if(data.village!==undefined)body.village=data.village; if(data.status!==undefined)body.status=data.status; if(data.joiningDate!==undefined)body.joining_date=data.joiningDate; const r=single(await supabase.query('suppliers',qs([['id',`eq.${id}`]]),{method:'PATCH',headers:writeHeaders,body:JSON.stringify(body)})); return {success:true,data:mapSupplier(r)}; },
  deleteSupplier: async id => { await supabase.query('suppliers',qs([['id',`eq.${id}`]]),{method:'DELETE'}); return {success:true}; },
  bulkUpload: async suppliers => { let inserted=0,skipped=[]; for(const s of suppliers){try{await supplierService.addSupplier(s); inserted++;}catch(e){skipped.push({supplier:s,reason:e.message});}} return {success:true,insertedCount:inserted,skippedCount:skipped.length,skipped}; },
};

export const milkEntryService = {
  getEntries: async (filters={}) => { const p=[['select','*'],['order','date.desc,time.desc']]; if(filters.startDate)p.push(['date',`gte.${filters.startDate}`]); if(filters.endDate)p.push(['date',`lte.${filters.endDate}`]); if(filters.shift)p.push(['shift',`eq.${filters.shift}`]); if(filters.supplierCode)p.push(['supplier_code',`eq.${filters.supplierCode}`]); if(filters.supplierName)p.push(['supplier_name',`ilike.*${filters.supplierName}*`]); const rows=await supabase.query('milk_entries',qs(p)); let data=rows.map(mapEntry); if(filters.village){const sups=(await supplierService.getSuppliers({village:filters.village})).data; const set=new Set(sups.map(s=>s.supplierCode)); data=data.filter(e=>set.has(e.supplierCode));} return {success:true,count:data.length,data}; },
  getEntryById: async id => ({success:true,data:mapEntry(single(await supabase.query('milk_entries',qs([['select','*'],['id',`eq.${id}`],['limit','1']]))))}),
  addEntry: async data => { const s=(await supplierService.getSupplierByCode(data.supplierCode)).data; if(!s)throw new Error('Supplier not found'); const q=Number(data.milkQuantity),a=Number(data.amount); if(!Number.isFinite(q)||q<=0)throw new Error('Milk quantity must be greater than zero'); if(!Number.isFinite(a)||a<0)throw new Error('Amount must be zero or more'); const currentUser=await supabase.auth.getUser(); if(!currentUser?.id)throw new Error('Your session has expired. Please sign in again.'); const body={supplier_code:s.supplierCode,supplier_name:s.supplierName,date:data.date,time:data.time,shift:data.shift,milk_quantity:q,fat:Number(data.fat||0),snf:Number(data.snf||0),rate:Number((a/q).toFixed(2)),amount:a,remarks:data.remarks||'',created_by:currentUser.id}; const r=single(await supabase.query('milk_entries','',{method:'POST',headers:writeHeaders,body:JSON.stringify(body)})); return {success:true,data:mapEntry(r)}; },
  bulkAddEntries: async (entries, suppliers = []) => {
    if (!entries.length) return { success: true, count: 0, data: [] };
    const supplierByCode = new Map(suppliers.map((supplier) => [Number(supplier.supplierCode), supplier]));
    const batchDate = entries[0].date;
    const batchShift = entries[0].shift;
    const codes = entries.map((data) => Number(data.supplierCode));
    if (new Set(codes).size !== codes.length) throw new Error('A supplier appears more than once in this save batch');
    if (entries.some((data) => data.date !== batchDate || data.shift !== batchShift)) throw new Error('A batch can contain only one date and shift');
    const existing = await supabase.query('milk_entries', qs([
      ['select', 'supplier_code'],
      ['date', `eq.${batchDate}`],
      ['shift', `eq.${batchShift}`],
      ['supplier_code', `in.(${codes.join(',')})`],
    ]));
    if (existing.length) {
      const duplicateCodes = [...new Set(existing.map((entry) => Number(entry.supplier_code)))];
      throw new Error(`Entry already exists for supplier code(s) ${duplicateCodes.join(', ')}. Refresh the date and shift before saving.`);
    }
    const body = entries.map((data) => {
      const supplier = supplierByCode.get(Number(data.supplierCode));
      if (!supplier) throw new Error(`Supplier #${data.supplierCode} could not be resolved`);
      const quantity = Number(data.milkQuantity);
      const amount = Number(data.amount);
      return {
        supplier_code: Number(data.supplierCode),
        supplier_name: data.supplierName || supplier.supplierName,
        date: data.date,
        time: data.time,
        shift: data.shift,
        milk_quantity: quantity,
        fat: Number(data.fat || 0),
        snf: Number(data.snf || 0),
        rate: quantity ? Number((amount / quantity).toFixed(2)) : 0,
        amount,
        remarks: '',
      };
    });
    const inserted = await supabase.query('milk_entries', '', {
      method: 'POST',
      headers: writeHeaders,
      body: JSON.stringify(body),
    });
    return { success: true, count: inserted.length, data: inserted.map(mapEntry) };
  },
  updateEntry: async (id,data) => { const current=(await milkEntryService.getEntryById(id)).data; if(!current)throw new Error('Milk entry not found'); const q=Number(data.milkQuantity??current.milkQuantity),a=Number(data.amount??current.amount); if(!Number.isFinite(q)||q<=0)throw new Error('Milk quantity must be greater than zero'); if(!Number.isFinite(a)||a<0)throw new Error('Amount must be zero or more'); const body={date:data.date??current.date,time:data.time??current.time,shift:data.shift??current.shift,milk_quantity:q,fat:Number(data.fat??current.fat),snf:Number(data.snf??current.snf),rate:Number((a/q).toFixed(2)),amount:a,remarks:data.remarks??current.remarks}; const r=single(await supabase.query('milk_entries',qs([['id',`eq.${id}`]]),{method:'PATCH',headers:writeHeaders,body:JSON.stringify(body)})); let auditLogged=false; try { await supabase.rpc('log_audit',{p_action:'MILK_ENTRY_UPDATE',p_target_type:'milk_entry',p_target_id:id,p_old_value:current,p_new_value:r}); auditLogged=true; } catch (auditError) { console.error('Milk entry saved, but audit log failed:',auditError); } return {success:true,data:mapEntry(r),auditLogged}; },
  deleteEntry: async id => { await supabase.query('milk_entries',qs([['id',`eq.${id}`]]),{method:'DELETE'}); return {success:true}; },
};

export const paymentService = {
  getPayments: async (f={}) => {const p=[['select','*'],['order','date.desc,created_at.desc']]; if(f.supplierCode)p.push(['supplier_code',`eq.${f.supplierCode}`]); if(f.startDate)p.push(['date',`gte.${f.startDate}`]); if(f.endDate)p.push(['date',`lte.${f.endDate}`]); const rows=await supabase.query('supplier_payments',qs(p)); return {success:true,count:rows.length,data:rows.map(mapPayment)};},
  recordPayment: async d => {const s=(await supplierService.getSupplierByCode(d.supplierCode)).data;if(!s)throw new Error('Supplier not found');const currentUser=await supabase.auth.getUser();if(!currentUser?.id)throw new Error('Your session has expired. Please sign in again.');const amount=Number(d.amountPaid);if(!Number.isFinite(amount)||amount<=0)throw new Error('Payment amount must be greater than zero');const body={supplier_code:s.supplierCode,supplier_name:s.supplierName,date:d.date||todayIST(),amount_paid:amount,payment_mode:d.paymentMode||'Cash',remarks:d.remarks||'',created_by:currentUser.id};const r=single(await supabase.query('supplier_payments','',{method:'POST',headers:writeHeaders,body:JSON.stringify(body)}));return {success:true,data:mapPayment(r)};},
  getLedger: async (f={}) => {let rows=await supabase.query('supplier_ledger_summary',qs([['select','*'],['order','supplier_code.asc']]));let data=rows.map(x=>({supplierId:x.supplier_id,supplierCode:x.supplier_code,supplierName:x.supplier_name,mobile:x.mobile,village:x.village,status:x.status,totalMilk:Number(x.total_milk),totalAmount:Number(x.total_amount),totalPaid:Number(x.total_paid),pendingAmount:Number(x.pending_amount)}));if(f.village)data=data.filter(x=>x.village?.toLowerCase().includes(f.village.toLowerCase()));if(f.search){const s=String(f.search).toLowerCase();data=data.filter(x=>String(x.supplierCode)===s||x.supplierName?.toLowerCase().includes(s)||x.village?.toLowerCase().includes(s));}return {success:true,count:data.length,data};},
  getSupplierLedger: async code => {
    const supplier=(await supplierService.getSupplierByCode(code)).data;
    if(!supplier)throw new Error('Supplier not found');
    const [entries,pays]=await Promise.all([
      milkEntryService.getEntries({supplierCode:code}),
      paymentService.getPayments({supplierCode:code})
    ]);
    const events=[
      ...entries.data.map(e=>({
        id:e.id,date:e.date,time:e.time,type:'Milk Entry',
        description:e.shift+' | '+e.milkQuantity+' L | FAT '+e.fat+'% | SNF '+e.snf+'%',
        amount:e.amount,txnType:'debit',milkQuantity:e.milkQuantity,
        fat:e.fat,snf:e.snf,shift:e.shift,rate:e.rate
      })),
      ...pays.data.map(p=>({
        id:p.id,date:p.date,time:p.createdAt?new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date(p.createdAt)):'',
        type:'Payment',description:'Paid via '+p.paymentMode+(p.remarks?' - '+p.remarks:''),
        amount:p.amountPaid,txnType:'credit',paymentMode:p.paymentMode,remarks:p.remarks
      }))
    ].sort((a,b)=>(a.date+' '+a.time).localeCompare(b.date+' '+b.time));
    let balance=0;
    events.forEach(e=>{
      balance+=e.txnType==='debit'?e.amount:-e.amount;
      e.balance=Number(balance.toFixed(2));
    });
    const totalMilk=entries.data.reduce((sum,e)=>sum+e.milkQuantity,0);
    const totalAmount=entries.data.reduce((sum,e)=>sum+e.amount,0);
    const totalPaid=pays.data.reduce((sum,p)=>sum+p.amountPaid,0);
    return {
      success:true,
      supplier:{
        supplierCode:supplier.supplierCode,supplierName:supplier.supplierName,
        fatherName:supplier.fatherName,mobile:supplier.mobile,village:supplier.village,
        status:supplier.status
      },
      summary:{
        totalMilk,totalAmount,totalPaid,
        pendingAmount:Number((totalAmount-totalPaid).toFixed(2))
      },
      history:events.reverse()
    };
  },
};

export const reportService = {
  getDashboardStats: async () => {const data=await supabase.rpc('dashboard_stats',{p_today:todayIST()});const recent=(await milkEntryService.getEntries({})).data.slice(0,5);return {success:true,data:{...data,recentEntries:recent}};},
  getChartsData: async () => {const entries=(await milkEntryService.getEntries({})).data;const daily=new Map(),monthly=new Map(),top=new Map();entries.forEach(e=>{daily.set(e.date,(daily.get(e.date)||0)+e.milkQuantity);const m=e.date.slice(0,7);monthly.set(m,(monthly.get(m)||0)+e.milkQuantity);top.set(`${e.supplierCode}|${e.supplierName}`,(top.get(`${e.supplierCode}|${e.supplierName}`)||0)+e.milkQuantity);});return {success:true,data:{dailyTrend:[...daily].sort().slice(-10).map(([date,milk])=>({date,milk})),monthlyTrend:[...monthly].sort().map(([month,milk])=>({month,milk})),topSuppliers:[...top].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,milk])=>({supplierCode:Number(k.split('|')[0]),name:k.split('|')[1],milk}))}};},
  getShiftWise: async f => ({success:true,data:await aggregateReport('shift',f)}),
  getSupplierWise: async f => ({success:true,data:await aggregateReport('supplier',f)}),
  getVillageWise: async f => ({success:true,data:await aggregateReport('village',f)}),
  getMonthly: async f => ({success:true,data:await aggregateReport('month',f)}),
  getYearly: async f => ({success:true,data:await aggregateReport('year',f)}),
};

async function aggregateReport(kind,f={}){const entries=(await milkEntryService.getEntries(f)).data;const supMap=new Map((await supplierService.getSuppliers()).data.map(s=>[s.supplierCode,s]));const m=new Map();for(const e of entries){let key;if(kind==='shift')key=`${e.date}|${e.shift}`;else if(kind==='supplier')key=String(e.supplierCode);else if(kind==='village')key=supMap.get(e.supplierCode)?.village||'Unknown';else if(kind==='month')key=e.date.slice(0,7);else key=e.date.slice(0,4);const x=m.get(key)||{totalMilk:0,totalAmount:0,fatWeight:0,snfWeight:0,entryCount:0};x.totalMilk+=e.milkQuantity;x.totalAmount+=e.amount;x.fatWeight+=e.fat*e.milkQuantity;x.snfWeight+=e.snf*e.milkQuantity;x.entryCount++;m.set(key,x);}return [...m].map(([key,x])=>{const base={totalMilk:Number(x.totalMilk.toFixed(2)),totalAmount:Number(x.totalAmount.toFixed(2)),avgFat:x.totalMilk?Number((x.fatWeight/x.totalMilk).toFixed(2)):0,avgSnf:x.totalMilk?Number((x.snfWeight/x.totalMilk).toFixed(2)):0,entryCount:x.entryCount};if(kind==='shift'){const [date,shift]=key.split('|');return{date,shift,...base};}if(kind==='supplier'){const s=supMap.get(Number(key));return{supplierCode:Number(key),supplierName:s?.supplierName||'',...base};}if(kind==='village')return{village:key,...base};if(kind==='month')return{month:key,...base};return{year:key,...base};});}

export const rateChartService = {
  getRateChart: async () => {const rows=await supabase.query('rate_chart',qs([['select','*'],['order','fat.asc,snf.asc']]));return {success:true,count:rows.length,data:rows.map(r=>({_id:r.id,...r,fat:Number(r.fat),snf:Number(r.snf),rate:Number(r.rate)}))};},
  setRate: async d => {const existing=await supabase.query('rate_chart',qs([['select','id'],['fat',`eq.${Number(d.fat).toFixed(1)}`],['snf',`eq.${Number(d.snf).toFixed(1)}`],['limit','1']]));if(existing.length)return rateChartService._update(existing[0].id,d);const r=single(await supabase.query('rate_chart','',{method:'POST',headers:writeHeaders,body:JSON.stringify({fat:d.fat,snf:d.snf,rate:d.rate})}));return{success:true,data:r};},
  _update: async(id,d)=>({success:true,data:single(await supabase.query('rate_chart',qs([['id',`eq.${id}`]]),{method:'PATCH',headers:writeHeaders,body:JSON.stringify({rate:d.rate})}))}),
  bulkUpload: async rates => {for(const r of rates)await rateChartService.setRate(r);return{success:true};},
  lookupRate: async(fat,snf)=>{const rows=await supabase.query('rate_chart',qs([['select','rate'],['fat',`eq.${Number(fat).toFixed(1)}`],['snf',`eq.${Number(snf).toFixed(1)}`],['limit','1']]));if(!rows.length)throw new Error('Rate not defined');return{success:true,rate:Number(rows[0].rate)};},
  clearRateChart: async()=>{await supabase.query('rate_chart','',{method:'DELETE'});return{success:true};},
  deleteRate: async id=>{await supabase.query('rate_chart',qs([['id',`eq.${id}`]]),{method:'DELETE'});return{success:true};},
};

export const auditService={getLogs:async(f={})=>{const p=[['select','*'],['order','created_at.desc'],['limit','200']];if(f.action)p.push(['action',`eq.${f.action}`]);if(f.search)p.push(['or',`(actor_name.ilike.*${f.search}*,action.ilike.*${f.search}*,target_type.ilike.*${f.search}*)`]);const rows=await supabase.query('audit_logs',qs(p));return{success:true,count:rows.length,data:rows.map(r=>({_id:r.id,user:r.actor_name,action:r.action,target:r.target_type,timestamp:r.created_at,oldValue:r.old_value,newValue:r.new_value}))};}};

export const userService={
  getUsers:async()=>{const rows=await supabase.query('profiles',qs([['select','*'],['order','created_at.desc']]));return{success:true,count:rows.length,data:rows.map(mapProfile)};},
  getUserById:async id=>({success:true,data:mapProfile(single(await supabase.query('profiles',qs([['select','*'],['id',`eq.${id}`],['limit','1']]))))}),
  createUser:async data=>supabase.function('manage-user',{action:'create',...data}),
  updateUser:async(id,data)=>supabase.function('manage-user',{action:'update',id,...data}),
  deleteUser:async id=>supabase.function('manage-user',{action:'delete',id}),
  resetPassword:async(id,password)=>supabase.function('manage-user',{action:'reset-password',id,password}),
};

export const backupService={
  triggerExport:async()=>{const collections={};for(const t of ['profiles','suppliers','milk_entries','rate_chart','payments','audit_logs','app_settings'])collections[t]=await supabase.query(t,'select=*');return new Blob([JSON.stringify({backupVersion:'supabase-1.0',timestamp:new Date().toISOString(),collections},null,2)],{type:'application/json'});},
  restore:async()=>{throw new Error('Supabase restore is disabled in the browser for data safety. Use the database migration/import workflow.');},
};

export default supabase;
