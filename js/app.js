// ==========================================================================
// PHASE 1: DATA ENGINE BASE MANAGEMENT
// ==========================================================================
let coreLedger = {
    currentViewInterval: 'month',
    savingsPercent: 20, // Dynamic user allocation threshold
    inflows: [],
    fixedOutflows: [],
    variableOutflows: [],
    assetPositions: [],
    savingGoals: [],
    quickTemplates: [
        { id: 't1', label: '🍔 Food', amount: 12.50 },
        { id: 't2', label: '🚗 Transit', amount: 20.00 }
    ]
};

const annualConversionMap = { day: 365, week: 52.14, month: 12, year: 1 };

window.addEventListener('DOMContentLoaded', () => {
    setDefaultTimeInputs();
    const stored = localStorage.getItem('apex_ledger_v4');
    if (stored) {
        coreLedger = JSON.parse(stored);
    }
    
    // Synchronize UI strategy config input state with engine database
    if (coreLedger.savingsPercent === undefined) coreLedger.savingsPercent = 20;
    const strategyInput = document.getElementById('strategy-savings-pct');
    if (strategyInput) {
        strategyInput.value = coreLedger.savingsPercent;
    }

    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);
    document.getElementById('theme-select').value = savedTheme;
    
    renderAllInterfaceLists();
    runCalculations();
});

function setDefaultTimeInputs() {
    const today = new Date();
    document.getElementById('exp-date').value = today.toISOString().slice(0, 10);
    document.getElementById('exp-time').value = today.toTimeString().slice(0, 5);
}

// ==========================================================================
// PHASE 2: ROUTING LAYER ENGINE
// ==========================================================================
function showPage(pageId) {
    document.querySelectorAll('.view-page').forEach(page => page.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(`${pageId}-page`).style.display = 'block';
    document.getElementById(`nav-${pageId}`).classList.add('active');
    
    if (pageId === 'analytics' && typeof window.renderAnalyticsChart === 'function') {
        window.renderAnalyticsChart();
    }
}

// ==========================================================================
// PHASE 3: METRIC VISUALIZATION & CALCULATION ENGINE
// ==========================================================================
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
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

function runCalculations() {
    localStorage.setItem('apex_ledger_v4', JSON.stringify(coreLedger));

    let totalAnnualIncome = coreLedger.inflows.reduce((acc, curr) => acc + (curr.amount * annualConversionMap[curr.frequency]), 0);
    let totalAnnualFixed = coreLedger.fixedOutflows.reduce((acc, curr) => acc + (curr.amount * annualConversionMap[curr.frequency]), 0);
    let currentIntervalVariable = coreLedger.variableOutflows.reduce((acc, curr) => acc + curr.amount, 0);
    let totalAssets = coreLedger.assetPositions.reduce((acc, curr) => acc + (curr.shares * curr.price), 0);

    const viewIncome = totalAnnualIncome / annualConversionMap[coreLedger.currentViewInterval];
    const viewFixed = totalAnnualFixed / annualConversionMap[coreLedger.currentViewInterval];
    
    // Dynamic percentage engine calculations
    const activePct = coreLedger.savingsPercent !== undefined ? coreLedger.savingsPercent : 20;
    const currentHorizonLabel = coreLedger.currentViewInterval.charAt(0).toUpperCase() + coreLedger.currentViewInterval.slice(1);
    
    const savingsLabelElement = document.getElementById('dash-savings-label');
    if (savingsLabelElement) {
        savingsLabelElement.innerText = `Saved This ${currentHorizonLabel} (${activePct}%)`;
    }

    const targetSavings = viewIncome * (activePct / 100);
    const netLiquidCapital = viewIncome - targetSavings - (viewFixed + currentIntervalVariable);

    document.getElementById('dash-income').innerText = formatCurrency(viewIncome);
    document.getElementById('dash-savings').innerText = formatCurrency(targetSavings);
    document.getElementById('dash-burn').innerText = formatCurrency(viewFixed + currentIntervalVariable);
    document.getElementById('dash-stocks').innerText = formatCurrency(totalAssets);
    
    const budgetBox = document.getElementById('dash-budget');
    budgetBox.innerText = formatCurrency(netLiquidCapital);
    budgetBox.style.color = netLiquidCapital < 0 ? 'var(--danger)' : 'var(--success)';
}

function formatCurrency(val) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

// ==========================================================================
// PHASE 4: CRUDS TRANSACTION CONTROLLERS
// ==========================================================================
function addIncome() {
    const desc = document.getElementById('inc-name').value;
    const amount = parseFloat(document.getElementById('inc-amount').value);
    const frequency = document.getElementById('inc-freq').value;
    if (desc && amount) {
        coreLedger.inflows.push({ id: generateUUID(), desc, amount, frequency });
        clearFields(['inc-name', 'inc-amount']);
        renderInflows();
        runCalculations();
    }
}

function addRecurring() {
    const desc = document.getElementById('rec-name').value;
    const amount = parseFloat(document.getElementById('rec-amount').value);
    const frequency = document.getElementById('rec-freq').value;
    if (desc && amount) {
        coreLedger.fixedOutflows.push({ id: generateUUID(), desc, amount, frequency });
        clearFields(['rec-name', 'rec-amount']);
        renderFixedOutflows();
        runCalculations();
    }
}

function addCustomExpense() {
    const desc = document.getElementById('exp-name').value;
    const amount = parseFloat(document.getElementById('exp-amount').value);
    const category = document.getElementById('exp-category').value;
    const date = document.getElementById('exp-date').value;
    const time = document.getElementById('exp-time').value;

    if (desc && amount) {
        coreLedger.variableOutflows.push({ id: generateUUID(), desc, amount, category, date, time });
        clearFields(['exp-name', 'exp-amount']);
        setDefaultTimeInputs();
        renderVariableExpenseList();
        renderDashboardRecentList();
        runCalculations();
    }
}

// ==========================================================================
// PHASE 5: QUICK SHORTCUT CONTROLLERS
// ==========================================================================
function renderQuickChips() {
    const container = document.getElementById('quick-chips-wrapper');
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
    document.getElementById('exp-name').value = label;
    document.getElementById('exp-amount').value = val;
}

function saveAsNewTemplate() {
    const label = document.getElementById('exp-name').value;
    const amount = parseFloat(document.getElementById('exp-amount').value);
    if (label && amount) {
        coreLedger.quickTemplates.push({ id: generateUUID(), label, amount });
        renderQuickChips();
        localStorage.setItem('apex_ledger_v4', JSON.stringify(coreLedger));
    }
}

function deleteTemplate(id) {
    coreLedger.quickTemplates = coreLedger.quickTemplates.filter(t => t.id !== id);
    renderQuickChips();
    localStorage.setItem('apex_ledger_v4', JSON.stringify(coreLedger));
}

// ==========================================================================
// PHASE 6: CHRONOLOGICAL LEDGER MANAGEMENT WITH FILTERING
// ==========================================================================
function renderVariableExpenseList() {
    const matrix = document.getElementById('expense-day-matrix');
    matrix.innerHTML = '';
    
    const searchVal = document.getElementById('search-box').value.toLowerCase();
    const catFilter = document.getElementById('filter-category').value;

    let processingItems = coreLedger.variableOutflows.filter(item => {
        const matchesSearch = item.desc.toLowerCase().includes(searchVal);
        const matchesCat = catFilter === 'ALL' || item.category === catFilter;
        return matchesSearch && matchesCat;
    });

    if (processingItems.length === 0) {
        matrix.innerHTML = '<div style="font-size:0.8rem;text-align:center;color:var(--text-muted);">No entries matched filters</div>';
        return;
    }

    processingItems.sort((a,b) => b.date.localeCompare(a.date));
    
    let grouped = processingItems.reduce((acc, curr) => {
        if (!acc[curr.date]) acc[curr.date] = [];
        acc[curr.date].push(curr);
        return acc;
    }, {});

    Object.keys(grouped).forEach(date => {
        let blockHtml = `<div class="day-group"><div class="day-header"><span>📅 ${date}</span></div><div>`;
        grouped[date].forEach(item => {
            blockHtml += `
                <div class="row-item">
                    <span><b>${item.desc}</b> <small style="color:var(--text-muted);">[${item.category}] at ${item.time}</small></span>
                    <span>${formatCurrency(item.amount)} <button class="delete-btn" onclick="deleteItem('variableOutflows','${item.id}')">✕</button></span>
                </div>`;
        });
        blockHtml += `</div></div>`;
        matrix.innerHTML += blockHtml;
    });
}

function renderDashboardRecentList() {
    const target = document.getElementById('dashboard-recent-list');
    target.innerHTML = '';
    const slice = [...coreLedger.variableOutflows].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 5);
    
    if(slice.length === 0) {
        target.innerHTML = '<div style="font-size:0.85rem;color:var(--text-muted);">No recorded historical data.</div>';
        return;
    }
    slice.forEach(item => {
        target.innerHTML += `
            <div class="row-item">
                <span><b>${item.desc}</b> <small style="color:var(--text-muted);">${item.date}</small></span>
                <span style="color:var(--danger); font-weight:bold;">-${formatCurrency(item.amount)}</span>
            </div>`;
    });
}

// ==========================================================================
// PHASE 7: SAVINGS GOALS MODULE MANAGEMENT
// ==========================================================================
function addNewGoal() {
    const name = document.getElementById('goal-name').value;
    const target = parseFloat(document.getElementById('goal-target').value);
    const current = parseFloat(document.getElementById('goal-current').value);
    if(name && target) {
        coreLedger.savingGoals.push({ id: generateUUID(), name, target, current });
        clearFields(['goal-name', 'goal-target', 'goal-current']);
        renderGoals();
        localStorage.setItem('apex_ledger_v4', JSON.stringify(coreLedger));
    }
}

function renderGoals() {
    const container = document.getElementById('goals-matrix-container');
    container.innerHTML = '';
    if(coreLedger.savingGoals.length === 0) {
        container.innerHTML = '<div style="font-size:0.85rem;color:var(--text-muted);text-align:center;">No targeted structural goals configured.</div>';
        return;
    }
    coreLedger.savingGoals.forEach(g => {
        const pct = Math.min((g.current / g.target) * 100, 100).toFixed(0);
        container.innerHTML += `
            <div style="margin-bottom:15px; background:rgba(255,255,255,0.01); padding:10px; border-radius:8px; border:1px solid var(--card-border);">
                <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:4px;">
                    <span><b>🎯 ${g.name}</b> (${pct}%)</span>
                    <span>${formatCurrency(g.current)} / ${formatCurrency(g.target)}</span>
                </div>
                <progress value="${g.current}" max="${g.target}"></progress>
                <div style="text-align:right; margin-top:5px;"><button class="delete-btn" style="font-size:0.8rem;" onclick="deleteGoal('${g.id}')">Remove Target</button></div>
            </div>`;
    });
}

function deleteGoal(id) {
    coreLedger.savingGoals = coreLedger.savingGoals.filter(g => g.id !== id);
    renderGoals();
    localStorage.setItem('apex_ledger_v4', JSON.stringify(coreLedger));
}

// ==========================================================================
// PHASE 8: COMPONENT ARRAYS CLEANUP UTILS
// ==========================================================================
function deleteItem(key, id) {
    coreLedger[key] = coreLedger[key].filter(i => i.id !== id);
    renderAllInterfaceLists();
    runCalculations();
}

function renderInflows() {
    const list = document.getElementById('income-list'); list.innerHTML = '';
    coreLedger.inflows.forEach(i => {
        list.innerHTML += `<div class="row-item"><span><b>${i.desc}</b> (${i.frequency})</span><span>${formatCurrency(i.amount)} <button class="delete-btn" onclick="deleteItem('inflows','${i.id}')">✕</button></span></div>`;
    });
}

function renderFixedOutflows() {
    const list = document.getElementById('recurring-list'); list.innerHTML = '';
    coreLedger.fixedOutflows.forEach(r => {
        list.innerHTML += `<div class="row-item"><span><b>${r.desc}</b> (${r.frequency})</span><span>${formatCurrency(r.amount)} <button class="delete-btn" onclick="deleteItem('fixedOutflows','${r.id}')">✕</button></span></div>`;
    });
}

function renderStockList() {
    const list = document.getElementById('stock-list'); list.innerHTML = '';
    coreLedger.assetPositions.forEach(s => {
        list.innerHTML += `<div class="row-item"><span><b>${s.ticker}</b> (${s.shares} units)</span><span>${formatCurrency(s.shares * s.price)} <button class="delete-btn" onclick="deleteItem('assetPositions','${s.id}')">✕</button></span></div>`;
    });
}

function addStock() {
    const ticker = document.getElementById('stock-ticker').value.toUpperCase();
    const shares = parseFloat(document.getElementById('stock-shares').value);
    const price = parseFloat(document.getElementById('stock-price').value);
    if(ticker && shares && price) {
        coreLedger.assetPositions.push({ id:generateUUID(), ticker, shares, price });
        clearFields(['stock-ticker','stock-shares','stock-price']);
        renderStockList();
        runCalculations();
    }
}

function renderAllInterfaceLists() {
    renderQuickChips();
    renderInflows();
    renderFixedOutflows();
    renderVariableExpenseList();
    renderDashboardRecentList();
    renderStockList();
    renderGoals();
}

function clearFields(arr) { arr.forEach(f => document.getElementById(f).value = ''); }
function generateUUID() { return Math.random().toString(36).substring(2, 9); }

function resetSystemData() {
    if(confirm("Confirm system baseline wipe?")) { localStorage.clear(); location.reload(); }
}

function downloadStructuredCSV() {
    let csvLines = ["Data Type,Label,Value,Frequency,Group Category,Timestamp"];
    coreLedger.inflows.forEach(i => csvLines.push(`Inflow,${i.desc},${i.amount},${i.frequency},Revenue,N/A`));
    coreLedger.fixedOutflows.forEach(f => csvLines.push(`Fixed,${f.desc},${f.amount},${f.frequency},Overhead,N/A`));
    coreLedger.variableOutflows.forEach(v => csvLines.push(`Variable,${v.desc},${v.amount},Once,${v.category},${v.date} ${v.time}`));
    
    const blob = new Blob([csvLines.join("\n")], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "ApexFinance_MasterLedger.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
}