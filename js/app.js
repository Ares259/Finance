// ==========================================================================
// CORE CONSOLE ARCHITECTURE SETUP
// ==========================================================================
let coreLedger = {
    currentViewInterval: 'month',
    savingsPercent: 20,
    currentVerificationFilter: 'ALL', 
    activeThemePreference: 'dark',
    inflows: [],
    fixedOutflows: [],
    variableOutflows: [],
    assetPositions: [],
    categoryLimits: {},
    oneTimeTransactions: [],
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

// Helper utility to generate internal Ledger IDs
function generateUUID() {
    return 'id-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
}

// Helper utility to clear array fields quickly
function clearFields(fieldIdArray) {
    fieldIdArray.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

// Global interface synchronization loader
function renderAllInterfaceLists() {
    renderQuickChips();
    renderVariableExpenseList();
    renderInflows();
    renderFixedOutflows();
    renderStockList();
    renderOneTimeList();
}

// SINGLE MASTER INITIALIZATION
window.addEventListener('DOMContentLoaded', () => {
    setDefaultTimeInputs();
    
    const stored = localStorage.getItem('apex_ledger_v4');
    if (stored) {
        coreLedger = JSON.parse(stored);
    }
    
    if (coreLedger.savingsPercent === undefined) coreLedger.savingsPercent = 20;
    if (!coreLedger.currentVerificationFilter) coreLedger.currentVerificationFilter = 'ALL';
    
    const strategyInput = document.getElementById('strategy-savings-pct');
    if (strategyInput) strategyInput.value = coreLedger.savingsPercent;
    
    const currentTheme = coreLedger.activeThemePreference || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    const themeSelectDropdown = document.getElementById('theme-select');
    if (themeSelectDropdown) {
        themeSelectDropdown.value = currentTheme;
    }

    if (!coreLedger.categoryLimits || Object.keys(coreLedger.categoryLimits).length === 0) {
        coreLedger.categoryLimits = {};
    }
    Object.keys(categoryMetadata).forEach(cat => {
        if (coreLedger.categoryLimits[cat] === undefined) {
            coreLedger.categoryLimits[cat] = categoryMetadata[cat].limit;
        }
    });
    
    renderAllInterfaceLists();
    runCalculations();
});

function setDefaultTimeInputs() {
    const dateInput = document.getElementById('exp-date');
    const timeInput = document.getElementById('exp-time');
    const today = new Date();
    if (dateInput) dateInput.value = today.toISOString().slice(0, 10);
    if (timeInput) timeInput.value = today.toTimeString().slice(0, 5);
}

function showPage(pageId) {
    document.querySelectorAll('.view-page').forEach(page => page.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    
    const targetPage = document.getElementById(pageId + '-page');
    const targetNav = document.getElementById('nav-' + pageId);
    
    if (targetPage) targetPage.style.display = 'block';
    if (targetNav) targetNav.classList.add('active');
    
    if (pageId === 'analytics' && window.renderAnalyticsChart) {
        setTimeout(() => window.renderAnalyticsChart(), 100);
    }
}

function changeInterval(targetFrame) {
    coreLedger.currentViewInterval = targetFrame;
    document.querySelectorAll('.interval-btn').forEach(b => b.classList.remove('active'));
    
    const targetBtn = document.getElementById('btn-' + targetFrame);
    if (targetBtn) targetBtn.classList.add('active');
    
    const titleEl = document.getElementById('view-title');
    if (titleEl) titleEl.innerText = targetFrame.charAt(0).toUpperCase() + targetFrame.slice(1);
    
    runCalculations();
}

function updateSavingsRule(val) {
    let numericVal = parseInt(val);
    if (isNaN(numericVal) || numericVal < 0) numericVal = 0;
    if (numericVal > 100) numericVal = 100;
    coreLedger.savingsPercent = numericVal;
    runCalculations();
}

function applyTheme(themeValue) {
    coreLedger.activeThemePreference = themeValue;
    document.documentElement.setAttribute('data-theme', themeValue);
    localStorage.setItem('apex_ledger_v4', JSON.stringify(coreLedger));
}

// ==========================================================================
// CALCULATOR AND RENDERING
// ==========================================================================
function runCalculations() {
    localStorage.setItem('apex_ledger_v4', JSON.stringify(coreLedger));

    let totalAnnualIncome = coreLedger.inflows.reduce((acc, curr) => acc + (curr.amount * annualConversionMap[curr.frequency]), 0);
    let totalAnnualFixed = coreLedger.fixedOutflows.reduce((acc, curr) => acc + (curr.amount * annualConversionMap[curr.frequency]), 0);
    let currentIntervalVariable = coreLedger.variableOutflows.reduce((acc, curr) => acc + curr.amount, 0);
    let totalAssets = coreLedger.assetPositions.reduce((acc, curr) => acc + (curr.shares * (curr.currentPrice || curr.price || 0)), 0);
    let totalOneTime = coreLedger.oneTimeTransactions.reduce((acc, curr) => acc + curr.amount, 0);

    const viewIncome = (totalAnnualIncome + totalOneTime) / annualConversionMap[coreLedger.currentViewInterval];
    const viewFixed = totalAnnualFixed / annualConversionMap[coreLedger.currentViewInterval];
    const targetSavings = viewIncome * (coreLedger.savingsPercent / 100);
    const netLiquidCapital = viewIncome - targetSavings - (viewFixed + currentIntervalVariable);

    const incEl = document.getElementById('dash-income');
    const savEl = document.getElementById('dash-savings');
    const burnEl = document.getElementById('dash-burn');
    const stockEl = document.getElementById('dash-stocks');
    
    if (incEl) incEl.innerText = formatCurrency(viewIncome);
    if (savEl) savEl.innerText = formatCurrency(targetSavings);
    if (burnEl) burnEl.innerText = formatCurrency(viewFixed + currentIntervalVariable);
    if (stockEl) stockEl.innerText = formatCurrency(totalAssets);
    
    const budgetBox = document.getElementById('dash-budget');
    if (budgetBox) {
        budgetBox.innerText = formatCurrency(netLiquidCapital);
        budgetBox.style.color = netLiquidCapital < 0 ? 'var(--danger)' : 'var(--success)';
    }

    const lblEl = document.getElementById('dash-savings-label');
    const intervalLabel = coreLedger.currentViewInterval === 'day' ? 'Daily' : coreLedger.currentViewInterval === 'year' ? 'Yearly' : 'Monthly';
    if (lblEl) lblEl.innerText = `Saved This ${intervalLabel} (${coreLedger.savingsPercent}%)`;

    renderCopilotCategoryMetrics();
    renderPortfolioSummary();
    renderIncomeSourcesList();
    renderSpendingBreakdown();
}

function renderIncomeSourcesList() {
    const list = document.getElementById('income-sources-list');
    if(!list) return;
    list.innerHTML = '';
    
    if(coreLedger.inflows.length === 0) {
        list.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:20px;">No income sources added yet.</div>';
        return;
    }
    
    const totalIncome = coreLedger.inflows.reduce((acc, curr) => acc + curr.amount, 0);
    coreLedger.inflows.forEach(income => {
        const percent = totalIncome > 0 ? ((income.amount / totalIncome) * 100).toFixed(1) : 0;
        const html = '<div style="margin-bottom:12px; padding:12px; background:rgba(255,255,255,0.02); border-radius:10px; border:1px solid var(--card-border);">' +
            '<div style="display:flex; justify-content:space-between; align-items:center;">' +
            '<div style="flex:1;">' +
            '<div style="font-weight:700; margin-bottom:4px;">💰 ' + income.desc + '</div>' +
            '<div style="font-size:0.85rem; color:var(--text-muted);">From ' + income.frequency + ' income</div>' +
            '</div>' +
            '<div style="text-align:right;">' +
            '<div style="font-weight:700; color:var(--success);">' + formatCurrency(income.amount) + '</div>' +
            '<div style="font-size:0.85rem; color:var(--text-muted);">' + percent + '% of total</div>' +
            '</div>' +
            '</div>' +
            '</div>';
        list.innerHTML += html;
    });
}

function renderIncomeChart() {
    const canvas = document.getElementById('incomeChart');
    if(!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let incomeChartReference = window.incomeChartRef;
    
    const labels = coreLedger.inflows.map(i => i.desc);
    const values = coreLedger.inflows.map(i => i.amount);
    
    if(coreLedger.oneTimeTransactions && coreLedger.oneTimeTransactions.length > 0) {
        const oneTimeTotal = coreLedger.oneTimeTransactions.reduce((acc, curr) => acc + curr.amount, 0);
        labels.push('One-Time Money');
        values.push(oneTimeTotal);
    }
    
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316'];
    
    if(incomeChartReference) {
        incomeChartReference.destroy();
    }
    
    window.incomeChartRef = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors.slice(0, labels.length),
                borderColor: 'rgba(15, 23, 42, 0.92)',
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'bottom', labels: { color: 'var(--text-normal)' } }
            }
        }
    });
}

function renderSpendingBreakdown() {
    const list = document.getElementById('spending-breakdown-list');
    if(!list) return;
    list.innerHTML = '';
    
    const breakdown = {};
    coreLedger.variableOutflows.forEach(item => {
        if(!breakdown[item.category]) breakdown[item.category] = 0;
        breakdown[item.category] += item.amount;
    });
    
    if(Object.keys(breakdown).length === 0) {
        list.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:20px;">No spending recorded yet.</div>';
        return;
    }
    
    const totalSpending = Object.values(breakdown).reduce((a, b) => a + b, 0);
    
    Object.entries(breakdown).forEach(([category, amount]) => {
        const icon = categoryMetadata[category]?.icon || '💸';
        const percent = totalSpending > 0 ? ((amount / totalSpending) * 100).toFixed(1) : 0;
        const html = '<div style="margin-bottom:12px; padding:12px; background:rgba(255,255,255,0.02); border-radius:10px; border:1px solid var(--card-border);">' +
            '<div style="display:flex; justify-content:space-between; align-items:center;">' +
            '<div style="flex:1;">' +
            '<div style="font-weight:700; margin-bottom:4px;">' + icon + ' ' + category + '</div>' +
            '</div>' +
            '<div style="text-align:right;">' +
            '<div style="font-weight:700; color:var(--danger);">' + formatCurrency(amount) + '</div>' +
            '<div style="font-size:0.85rem; color:var(--text-muted);">' + percent + '% of spending</div>' +
            '</div>' +
            '</div>' +
            '</div>';
        list.innerHTML += html;
    });
}

function renderSpendingChart() {
    const canvas = document.getElementById('spendingChart');
    if(!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let spendingChartReference = window.spendingChartRef;
    
    const breakdown = {};
    coreLedger.variableOutflows.forEach(item => {
        if(!breakdown[item.category]) breakdown[item.category] = 0;
        breakdown[item.category] += item.amount;
    });
    
    const labels = Object.keys(breakdown);
    const values = Object.values(breakdown);
    const colors = labels.map(cat => {
        const colorMap = {
            'Food': '#fbbf24',
            'Transport': '#38bdf8',
            'Housing': '#f87171',
            'Entertainment': '#c084fc',
            'Shopping': '#34d399',
            'Health': '#f43f5e',
            'Education': '#60a5fa'
        };
        return colorMap[cat] || '#94a3b8';
    });
    
    if(spendingChartReference) {
        spendingChartReference.destroy();
    }
    
    window.spendingChartRef = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderColor: 'rgba(15, 23, 42, 0.92)',
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'bottom', labels: { color: 'var(--text-normal)' } }
            }
        }
    });
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
        const limit = getCategoryLimit(cat);
        const icon = categoryMetadata[cat].icon;
        const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100).toFixed(0) : 0;
        const overBudget = spent > limit;
        
        let barColor = 'var(--primary)';
        if (percentage >= 90) barColor = 'var(--danger)';
        else if (percentage >= 70) barColor = 'var(--accent)';

        const html = '<div style="margin-bottom:10px; background:rgba(255,255,255,0.02); padding:14px; border-radius:14px; border:1px solid var(--card-border);"><div style="display:flex; justify-content:space-between; gap:12px; font-size:0.9rem; margin-bottom:8px;"><div><div style="font-weight:700; margin-bottom:4px;">' + icon + ' ' + cat + ' Budget</div><div style="font-size:0.82rem; color:var(--text-muted);">Limit: ' + formatCurrency(limit) + '</div></div><div style="text-align:right;"><div style="font-weight:700; color:' + (overBudget ? 'var(--danger)' : 'var(--success)') + ';">' + (overBudget ? 'Over budget' : 'Under budget') + '</div><div style="font-size:0.82rem; color:var(--text-muted);">' + formatCurrency(spent) + ' spent</div></div></div><div style="width:100%; height:8px; background:rgba(255,255,255,0.08); border-radius:999px; overflow:hidden;"><div style="width:' + percentage + '%; height:100%; background:' + barColor + ';"></div></div><div style="margin-top:8px; font-size:0.82rem; color:var(--text-muted);">' + percentage + '% of budget used</div></div>';
        matrix.innerHTML += html;
    });
}

function getCategoryLimit(category) {
    return coreLedger.categoryLimits && coreLedger.categoryLimits[category] !== undefined
        ? coreLedger.categoryLimits[category]
        : categoryMetadata[category]?.limit || 0;
}

function formatCurrency(val) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

// ==========================================================================
// CORE CONTROLLERS
// ==========================================================================
function addCustomExpense() {
    const desc = document.getElementById('exp-name').value;
    const amount = parseFloat(document.getElementById('exp-amount').value);
    const category = document.getElementById('exp-category').value;
    const date = document.getElementById('exp-date').value;
    const time = document.getElementById('exp-time').value;

    if (desc && !isNaN(amount)) {
        coreLedger.variableOutflows.push({ 
            id: generateUUID(), desc, amount, category, date, time, reviewed: false 
        });
        clearFields(['exp-name', 'exp-amount']);
        setDefaultTimeInputs();
        renderVariableExpenseList();
        renderSpendingBreakdown();
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
    
    const targetFilterBtn = document.getElementById('filter-sw-' + filterType.toLowerCase());
    if (targetFilterBtn) targetFilterBtn.classList.add('active');
    
    renderVariableExpenseList();
}

function renderVariableExpenseList() {
    const matrix = document.getElementById('expense-day-matrix');
    if (!matrix) return;
    matrix.innerHTML = '';
    
    const searchVal = document.getElementById('search-box')?.value.toLowerCase() || '';
    const catFilter = document.getElementById('filter-category')?.value || 'ALL';
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
        matrix.innerHTML = '<div style="font-size:0.8rem;text-align:center;color:var(--text-muted);padding:10px;">No transaction entries match filters.</div>';
        return;
    }

    filteredItems.sort((a,b) => b.date.localeCompare(a.date));
    
    filteredItems.forEach(item => {
        const isRev = !!item.reviewed;
        const itemIcon = categoryMetadata[item.category] ? categoryMetadata[item.category].icon : '💸';
        const html = '<div class="row-item" style="border-left: 3px solid ' + (isRev ? 'transparent' : 'var(--accent)') + '; padding-left: 8px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;"><span><b>' + itemIcon + ' ' + item.desc + '</b> <small style="color:var(--text-muted);">' + item.date + ' ' + item.time + '</small></span><span style="display:flex; align-items:center; gap:8px;"><button onclick="toggleTransactionReview(\'' + item.id + '\')" style="background:none; border:none; cursor:pointer;">' + (isRev ? '✅' : '🟡') + '</button><b>' + formatCurrency(item.amount) + '</b><button class="delete-btn" onclick="deleteItem(\'variableOutflows\',\'' + item.id + '\')">✕</button></span></div>';
        matrix.innerHTML += html;
    });
}

function renderQuickChips() {
    const container = document.getElementById('quick-chips-wrapper');
    if (!container) return;
    container.innerHTML = '';
    coreLedger.quickTemplates.forEach(t => {
        const html = '<div class="quick-chip-wrapper" style="display:inline-flex; align-items:center; gap:4px; margin-right:6px; background:rgba(255,255,255,0.05); padding:4px 8px; border-radius:20px;"><span class="quick-chip-text" style="cursor:pointer;" onclick="applyTemplate(\'' + t.label + '\', ' + t.amount + ')">' + t.label + ' ($' + t.amount + ')</span><button class="quick-chip-del" style="background:none; border:none; color:var(--text-muted); cursor:pointer;" onclick="deleteTemplate(\'' + t.id + '\')">✕</button></div>';
        container.innerHTML += html;
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
    
    if (label && !isNaN(amount)) {
        coreLedger.quickTemplates.push({ id: generateUUID(), label: icon + ' ' + label, amount });
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
    if (desc && !isNaN(amount)) {
        coreLedger.inflows.push({ id: generateUUID(), desc, amount, frequency });
        clearFields(['inc-name', 'inc-amount']);
        renderInflows();
        renderIncomeSourcesList();
        runCalculations();
    }
}

function addRecurring() {
    const desc = document.getElementById('rec-name').value;
    const amount = parseFloat(document.getElementById('rec-amount').value);
    const frequency = document.getElementById('rec-freq').value;
    if (desc && !isNaN(amount)) {
        coreLedger.fixedOutflows.push({ id: generateUUID(), desc, amount, frequency });
        clearFields(['rec-name', 'rec-amount']);
        renderFixedOutflows();
        runCalculations();
    }
}

function renderFixedOutflows() {
    const list = document.getElementById('recurring-list');
    if (!list) return;
    list.innerHTML = '';
    if (coreLedger.fixedOutflows.length === 0) {
        list.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:20px;">No monthly payments added yet.</div>';
        return;
    }
    coreLedger.fixedOutflows.forEach(item => {
        const html = '<div style="margin-bottom:12px; padding:12px; background:rgba(255,255,255,0.02); border-radius:10px; border:1px solid var(--card-border);"><div style="display:flex; justify-content:space-between; align-items:center;"><div><div style="font-weight:700;">💳 ' + item.desc + '</div><div style="font-size:0.85rem; color:var(--text-muted);">' + item.frequency + ' payment</div></div><div style="text-align:right;"><b style="color:var(--danger); margin-right:8px;">-' + formatCurrency(item.amount) + '</b><button class="delete-btn" onclick="deleteItem(\'fixedOutflows\',\'' + item.id + '\')">✕</button></div></div></div>';
        list.innerHTML += html;
    });
}

function renderInflows() {
    const list = document.getElementById('income-list');
    if (!list) return;
    list.innerHTML = '';
    if (coreLedger.inflows.length === 0) {
        list.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:20px;">No income sources added yet.</div>';
        return;
    }
    coreLedger.inflows.forEach(item => {
        const html = '<div style="margin-bottom:12px; padding:12px; background:rgba(255,255,255,0.02); border-radius:10px; border:1px solid var(--card-border);"><div style="display:flex; justify-content:space-between;