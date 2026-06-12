// ==========================================================================
// CORE CONSOLE ARCHITECTURE SETUP
// ==========================================================================
let coreLedger = {
    currentViewInterval: 'month',
    savingsPercent: 20,
    currentVerificationFilter: 'ALL', 
    activeThemePreference: 'dark', // Track theme state inside initialization
    inflows: [],
    fixedOutflows: [],
    variableOutflows: [],
    assetPositions: [],
    quickTemplates: [
        { id: 't1', label: '🍔 Food', amount: 15.00 },
        { id: 't2', label: '🚗 Transit', amount: 25.00 }
    ]
};

const annualConversionMap = { day: 365, week: 52.14, month: 12, year: 1 };

const categoryMetadata = {
    'Food': { icon: '🍔', limit: 400 },
    'Transport': { icon: '🚗', limit: 250 },
    'Housing': { icon: '🏠', limit: 1200 },
    'Entertainment': { icon: '🎬', limit: 150 },
    'Shopping': { icon: '🛍️', limit: 300 },
    'Health': { icon: '🩺', limit: 100 },
    'Education': { icon: '📚', limit: 100 }
};

// SINGLE MASTER INITIALIZATION DECK
window.addEventListener('DOMContentLoaded', () => {
    setDefaultTimeInputs();
    
    // 1. Recover core engine data structures
    const stored = localStorage.getItem('apex_ledger_v4');
    if (stored) {
        coreLedger = JSON.parse(stored);
    }
    
    // Fallback checks for safe runtimes
    if (coreLedger.savingsPercent === undefined) coreLedger.savingsPercent = 20;
    if (!coreLedger.currentVerificationFilter) coreLedger.currentVerificationFilter = 'ALL';
    
    const strategyInput = document.getElementById('strategy-savings-pct');
    if (strategyInput) strategyInput.value = coreLedger.savingsPercent;
    
    // 2. Recover system theme profiles safely inside single loop
    const currentTheme = coreLedger.activeThemePreference || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    const themeSelectDropdown = document.getElementById('theme-select');
    if (themeSelectDropdown) {
        themeSelectDropdown.value = currentTheme;
    }
    
    // 3. Kick off rendering pipelines
    renderAllInterfaceLists();
    runCalculations();
});

function setDefaultTimeInputs() {
    const today = new Date();
    document.getElementById('exp-date').value = today.toISOString().slice(0, 10);
    document.getElementById('exp-time').value = today.toTimeString().slice(0, 5);
}

function showPage(pageId) {
    document.querySelectorAll('.view-page').forEach(page => page.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(`${pageId}-page`).style.display = 'block';
    document.getElementById(`nav-${pageId}`).classList.add('active');
}

function changeInterval(targetFrame) {
    coreLedger.currentViewInterval = targetFrame;
    document.querySelectorAll('.interval-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-${targetFrame}`).classList.add('active');
    document.getElementById('view-title').innerText = targetFrame.charAt(0).toUpperCase() + targetFrame.slice(1);
    runCalculations();
}

function updateSavingsRule(val) {
    let numericVal = parseInt(val);
    if (isNaN(numericVal) || numericVal < 0) numericVal = 0;
    if (numericVal > 100) numericVal = 100;
    coreLedger.savingsPercent = numericVal;
    runCalculations();
}

// ==========================================================================
// CALCULATOR INTERFACES & COPILOT PROGRESS RENDERING
// ==========================================================================
function runCalculations() {
    localStorage.setItem('apex_ledger_v4', JSON.stringify(coreLedger));

    let totalAnnualIncome = coreLedger.inflows.reduce((acc, curr) => acc + (curr.amount * annualConversionMap[curr.frequency]), 0);
    let totalAnnualFixed = coreLedger.fixedOutflows.reduce((acc, curr) => acc + (curr.amount * annualConversionMap[curr.frequency]), 0);
    let currentIntervalVariable = coreLedger.variableOutflows.reduce((acc, curr) => acc + curr.amount, 0);
    let totalAssets = coreLedger.assetPositions.reduce((acc, curr) => acc + (curr.shares * curr.price), 0);

    const viewIncome = totalAnnualIncome / annualConversionMap[coreLedger.currentViewInterval];
    const viewFixed = totalAnnualFixed / annualConversionMap[coreLedger.currentViewInterval];
    const targetSavings = viewIncome * (coreLedger.savingsPercent / 100);
    const netLiquidCapital = viewIncome - targetSavings - (viewFixed + currentIntervalVariable);

    document.getElementById('dash-income').innerText = formatCurrency(viewIncome);
    document.getElementById('dash-savings').innerText = formatCurrency(targetSavings);
    document.getElementById('dash-burn').innerText = formatCurrency(viewFixed + currentIntervalVariable);
    document.getElementById('dash-stocks').innerText = formatCurrency(totalAssets);
    
    const budgetBox = document.getElementById('dash-budget');
    budgetBox.innerText = formatCurrency(netLiquidCapital);
    budgetBox.style.color = netLiquidCapital < 0 ? 'var(--danger)' : 'var(--success)';

    document.getElementById('dash-savings-label').innerText = `Saved This Month (${coreLedger.savingsPercent}%)`;

    renderCopilotCategoryMetrics();
}

function renderCopilotCategoryMetrics() {
    const matrix = document.getElementById('copilot-budget-matrix');
    if (!matrix) return;
    matrix.innerHTML = '';

    let actualsMap = {};
    Object.keys(categoryMetadata).forEach(cat => actualsMap[cat] = 0);
    coreLedger.variableOutflows.forEach(item => {
        if (actualsMap[item.category] !== undefined) actualsMap[item.category] += item.amount;
    });

    Object.keys(categoryMetadata).forEach(cat => {
        const spent = actualsMap[cat];
        const limit = categoryMetadata[cat].limit;
        const icon = categoryMetadata[cat].icon;
        const percentage = Math.min((spent / limit) * 100, 100).toFixed(0);
        
        let barColor = 'var(--primary)';
        if (percentage >= 90) barColor = 'var(--danger)';
        else if (percentage >= 70) barColor = 'var(--accent)';

        matrix.innerHTML += `
            <div style="margin-bottom:10px; background:rgba(255,255,255,0.02); padding:10px; border-radius:8px; border:1px solid var(--card-border);">
                <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:4px;">
                    <span><b>${icon} ${cat}</b> <small style="color:var(--text-muted);">(${percentage}%)</small></span>
                    <span style="font-weight:600;">${formatCurrency(spent)} / ${formatCurrency(limit)}</span>
                </div>
                <div style="width:100%; height:6px; background:rgba(255,255,255,0.06); border-radius:3px; overflow:hidden;">
                    <div style="width:${percentage}%; height:100%; background:${barColor};"></div>
                </div>
            </div>`;
    });
}

function formatCurrency(val) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

// ==========================================================================
// CORE CONTROLLERS & RENDER PROCESSORS
// ==========================================================================
function addCustomExpense() {
    const desc = document.getElementById('exp-name').value;
    const amount = parseFloat(document.getElementById('exp-amount').value);
    const category = document.getElementById('exp-category').value;
    const date = document.getElementById('exp-date').value;
    const time = document.getElementById('exp-time').value;

    if (desc && amount) {
        coreLedger.variableOutflows.push({ 
            id: generateUUID(), desc, amount, category, date, time, reviewed: false 
        });
        clearFields(['exp-name', 'exp-amount']);
        setDefaultTimeInputs();
        renderVariableExpenseList();
        runCalculations();
    }
}

function toggleTransactionReview(id) {
    const index = coreLedger.variableOutflows.findIndex(item => item.id === id);
    if (index !== -1) {
        coreLedger.variableOutflows[index].reviewed = !coreLedger.variableOutflows[index].reviewed;
        renderVariableExpenseList();
        runCalculations();
    }
}

function setVerificationFilter(filterType) {
    coreLedger.currentVerificationFilter = filterType;
    document.querySelectorAll('[id^="filter-sw-"]').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`filter-sw-${filterType.toLowerCase()}`).classList.add('active');
    renderVariableExpenseList();
}

function renderVariableExpenseList() {
    const matrix = document.getElementById('expense-day-matrix');
    if (!matrix) return;
    matrix.innerHTML = '';
    
    const searchVal = document.getElementById('search-box').value.toLowerCase();
    const catFilter = document.getElementById('filter-category').value;
    const vFilter = coreLedger.currentVerificationFilter || 'ALL';

    let filteredItems = coreLedger.variableOutflows.filter(item => {
        const matchesSearch = item.desc.toLowerCase().includes(searchVal);
        const matchesCat = catFilter === 'ALL' || item.category === catFilter;
        let matchesVerification = true;
        if (vFilter === 'NEW') matchesVerification = !item.reviewed;
        if (vFilter === 'REVIEWED') matchesVerification = item.reviewed;
        return matchesSearch && matchesCat && matchesVerification;
    });

    if (filteredItems.length === 0) {
        matrix.innerHTML = '<div style="font-size:0.8rem;text-align:center;color:var(--text-muted);padding:10px;">No transaction entries matches filters.</div>';
        return;
    }

    filteredItems.sort((a,b) => b.date.localeCompare(a.date));
    
    filteredItems.forEach(item => {
        const isRev = !!item.reviewed;
        const itemIcon = categoryMetadata[item.category] ? categoryMetadata[item.category].icon : '💸';
        matrix.innerHTML += `
            <div class="row-item" style="border-left: 3px solid ${isRev ? 'transparent' : 'var(--accent)'}; padding-left: 8px; margin-bottom:6px;">
                <span>
                    <b>${itemIcon} ${item.desc}</b> <small style="color:var(--text-muted);">${item.date} ${item.time}</small>
                </span>
                <span style="display:flex; align-items:center; gap:8px;">
                    <button onclick="toggleTransactionReview('${item.id}')" style="background:none; border:none; cursor:pointer;">
                        ${isRev ? '✅' : '🟡'}
                    </button>
                    <b>${formatCurrency(item.amount)}</b>
                    <button class="delete-btn" onclick="deleteItem('variableOutflows','${item.id}')">✕</button>
                </span>
            </div>`;
    });
}

// ==========================================================================
// UTILITY SUBSYSTEM RE-RENDERING PIPELINES
// ==========================================================================
function renderQuickChips() {
    const container = document.getElementById('quick-chips-wrapper');
    if (!container) return;
    container.innerHTML = '';
    coreLedger.quickTemplates.forEach(t => {
        container.innerHTML += `
            <div class="quick-chip-wrapper">
                <span class="quick-chip-text" onclick="applyTemplate('${t.label}', ${t.amount})">${t.label} ($${t.amount})</span>
                <button class="quick-chip-del" onclick="deleteTemplate('${t.id}')">✕</button>
            </div>`;
    });
}

function applyTemplate(label, val) {
    let pureLabel = label.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, "").trim();
    document.getElementById('exp-name').value = pureLabel;
    document.getElementById('exp-amount').value = val;
}

function saveAsNewTemplate() {
    const label = document.getElementById('exp-name').value;
    const amount = parseFloat(document.getElementById('exp-amount').value);
    const category = document.getElementById('exp-category').value;
    const icon = categoryMetadata[category] ? categoryMetadata[category].icon : '💸';
    
    if (label && amount) {
        coreLedger.quickTemplates.push({ id: generateUUID(), label: `${icon} ${label}`, amount });
        renderQuickChips();
        runCalculations();
    }
}

function deleteTemplate(id) {
    coreLedger.quickTemplates = coreLedger.quickTemplates.filter(t => t.id !== id);
    renderQuickChips();
    runCalculations();
}

function addIncome() {
    const desc = document.getElementById('inc-name').value;
    const amount = parseFloat(document.getElementById('inc-amount').value);
    const frequency = document.getElementById('inc-freq').value;
    if (desc && amount) {
        coreLedger.inflows.push({ id: generateUUID(), desc, amount, frequency });
        clearFields(['inc-name', 'inc-amount']);
        renderInflows(); runCalculations();
    }
}

function addRecurring() {
    const desc = document.getElementById('rec-name').value;
    const amount = parseFloat(document.getElementById('rec-amount').value);
    const frequency = document.getElementById('rec-freq').value;
    if (desc && amount) {
        coreLedger.fixedOutflows.push({ id: generateUUID(), desc, amount, frequency });
        clearFields(['rec-name', 'rec-amount']);
        renderFixedOutflows(); runCalculations();
    }
}

function addStock() {
    const ticker = document.getElementById('stock-ticker').value.toUpperCase();
    const shares = parseFloat(document.getElementById('stock-shares').value);
    const price = parseFloat(document.getElementById('stock-price').value);
    if(ticker && shares && price) {
        coreLedger.assetPositions.push({ id:generateUUID(), ticker, shares, price });
        clearFields(['stock-ticker','stock-shares','stock-price']);
        renderStockList(); runCalculations();
    }
}

function deleteItem(key, id) {
    coreLedger[key] = coreLedger[key].filter(i => i.id !== id);
    renderAllInterfaceLists();
    runCalculations();
}

function renderInflows() {
    const list = document.getElementById('income-list'); if(!list) return; list.innerHTML = '';
    coreLedger.inflows.forEach(i => {
        list.innerHTML += `<div class="row-item"><span><b>💰 ${i.desc}</b> (${i.frequency})</span><span>${formatCurrency(i.amount)} <button class="delete-btn" onclick="deleteItem('inflows','${i.id}')">✕</button></span></div>`;
    });
}

function renderFixedOutflows() {
    const list = document.getElementById('recurring-list'); if(!list) return; list.innerHTML = '';
    coreLedger.fixedOutflows.forEach(r => {
        list.innerHTML += `<div class="row-item"><span><b>🔄 ${r.desc}</b> (${r.frequency})</span><span>${formatCurrency(r.amount)} <button class="delete-btn" onclick="deleteItem('fixedOutflows','${r.id}')">✕</button></span></div>`;
    });
}

function renderStockList() {
    const list = document.getElementById('stock-list'); if(!list) return; list.innerHTML = '';
    coreLedger.assetPositions.forEach(s => {
        list.innerHTML += `<div class="row-item"><span><b>📈 ${s.ticker}</b> (${s.shares} units)</span><span>${formatCurrency(s.shares * s.price)} <button class="delete-btn" onclick="deleteItem('assetPositions','${s.id}')">✕</button></span></div>`;
    });
}

function renderAllInterfaceLists() {
    renderQuickChips();
    renderInflows();
    renderFixedOutflows();
    renderVariableExpenseList();
    renderStockList();
}

function clearFields(arr) { arr.forEach(f => { const el = document.getElementById(f); if(el) el.value = ''; }); }
function generateUUID() { return Math.random().toString(36).substring(2, 9); }
function resetSystemData() { if(confirm("Confirm reset?")) { localStorage.clear(); location.reload(); } }

function downloadStructuredCSV() {
    let csvLines = ["Data Type,Label,Value,Frequency,Group Category"];
    coreLedger.inflows.forEach(i => csvLines.push(`Inflow,${i.desc},${i.amount},${i.frequency},Revenue`));
    coreLedger.fixedOutflows.forEach(f => csvLines.push(`Fixed,${f.desc},${f.amount},${f.frequency},Overhead`));
    coreLedger.variableOutflows.forEach(v => csvLines.push(`Variable,${v.desc},${v.amount},Once,${v.category}`));
    const blob = new Blob([csvLines.join("\n")], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "Ledger.csv"); link.click();
}

// ==========================================================================
// SYSTEM LIGHT/DARK MULTI-MODE ENGINE CONTROLLER
// ==========================================================================
function applyTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    coreLedger.activeThemePreference = themeName;
    localStorage.setItem('apex_ledger_v4', JSON.stringify(coreLedger));
}