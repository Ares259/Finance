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
    if(window.renderAnalyticsChart) window.renderAnalyticsChart();
    renderIncomeSourcesList();
    renderSpendingBreakdown();
});

function setDefaultTimeInputs() {
    const today = new Date();
    document.getElementById('exp-date').value = today.toISOString().slice(0, 10);
    document.getElementById('exp-time').value = today.toTimeString().slice(0, 5);
}

function showPage(pageId) {
    document.querySelectorAll('.view-page').forEach(page => page.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(pageId + '-page').style.display = 'block';
    document.getElementById('nav-' + pageId).classList.add('active');
    
    if(pageId === 'analytics' && window.renderAnalyticsChart) {
        setTimeout(() => window.renderAnalyticsChart(), 100);
    }
}

function changeInterval(targetFrame) {
    coreLedger.currentViewInterval = targetFrame;
    document.querySelectorAll('.interval-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-' + targetFrame).classList.add('active');
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

    document.getElementById('dash-income').innerText = formatCurrency(viewIncome);
    document.getElementById('dash-savings').innerText = formatCurrency(targetSavings);
    document.getElementById('dash-burn').innerText = formatCurrency(viewFixed + currentIntervalVariable);
    document.getElementById('dash-stocks').innerText = formatCurrency(totalAssets);
    
    const budgetBox = document.getElementById('dash-budget');
    budgetBox.innerText = formatCurrency(netLiquidCapital);
    budgetBox.style.color = netLiquidCapital < 0 ? 'var(--danger)' : 'var(--success)';

    const intervalLabel = coreLedger.currentViewInterval === 'day' ? 'Daily' : coreLedger.currentViewInterval === 'year' ? 'Yearly' : 'Monthly';
    document.getElementById('dash-budget-label').innerText = 'Money Balance (' + intervalLabel + ')';
    const savingsSelect = document.getElementById('savings-select');
    if (savingsSelect) savingsSelect.value = coreLedger.savingsPercent;

    renderCopilotCategoryMetrics();
    renderPortfolioSummary();
    renderIncomeSourcesList();
    renderSpendingBreakdown();
}

function toggleIncomeView(viewType) {
    const listView = document.getElementById('income-view-list');
    const chartView = document.getElementById('income-view-chart');
    const buttons = document.querySelectorAll('[data-view="income-list"], [data-view="income-chart"]');
    
    buttons.forEach(btn => btn.classList.remove('active'));
    
    if(viewType === 'list') {
        listView.style.display = 'block';
        chartView.style.display = 'none';
        document.querySelector('[data-view="income-list"]').classList.add('active');
    } else {
        listView.style.display = 'none';
        chartView.style.display = 'block';
        document.querySelector('[data-view="income-chart"]').classList.add('active');
        renderIncomeChart();
    }
}

function toggleSpendingView(viewType) {
    const listView = document.getElementById('spending-view-list');
    const chartView = document.getElementById('spending-view-chart');
    const buttons = document.querySelectorAll('[data-view="spending-list"], [data-view="spending-chart"]');
    
    buttons.forEach(btn => btn.classList.remove('active'));
    
    if(viewType === 'list') {
        listView.style.display = 'block';
        chartView.style.display = 'none';
        document.querySelector('[data-view="spending-list"]').classList.add('active');
    } else {
        listView.style.display = 'none';
        chartView.style.display = 'block';
        document.querySelector('[data-view="spending-chart"]').classList.add('active');
        renderSpendingChart();
    }
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
        const percent = ((income.amount / totalIncome) * 100).toFixed(1);
        const html = '<div style="margin-bottom:12px; padding:12px; background:rgba(255,255,255,0.02); border-radius:10px; border:1px solid var(--card-border);"><div style="display:flex; justify-content:space-between; align-items:center;"><div style="flex:1;"><div style="font-weight:700; margin-bottom:4px;">💰 ' + income.desc + '</div><div style="font-size:0.85rem; color:var(--text-muted);">From ' + income.frequency + ' income</div></div><div style="text-align:right;"><div style="font-weight:700; color:var(--success);">' + formatCurrency(income.amount) + '</div><div style="font-size:0.85rem; color:var(--text-muted);">' + percent + '% of total</div></div></div></div>';
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
        const percent = ((amount / totalSpending) * 100).toFixed(1);
        const html = '<div style="margin-bottom:12px; padding:12px; background:rgba(255,255,255,0.02); border-radius:10px; border:1px solid var(--card-border);"><div style="display:flex; justify-content:space-between; align-items:center;"><div style="flex:1;"><div style="font-weight:700; margin-bottom:4px;">' + icon + ' ' + category + '</div></div><div style="text-align:right;"><div style="font-weight:700; color:var(--danger);">' + formatCurrency(amount) + '</div><div style="font-size:0.85rem; color:var(--text-muted);">' + percent + '% of spending</div></div></div></div>';
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
        const percentage = Math.min((spent / limit) * 100, 100).toFixed(0);
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

function saveBudgetLimit() {
    const category = document.getElementById('budget-cat-select').value;
    const value = parseFloat(document.getElementById('budget-limit-input').value);
    if (!category || isNaN(value) || value <= 0) {
        document.getElementById('budget-limit-info').innerText = 'Enter a valid positive amount to save a new limit.';
        return;
    }

    coreLedger.categoryLimits[category] = value;
    localStorage.setItem('apex_ledger_v4', JSON.stringify(coreLedger));
    renderCopilotCategoryMetrics();
    renderBudgetLimitWidget();
    document.getElementById('budget-limit-info').innerText = category + ' limit saved as ' + formatCurrency(value) + '.';
}

function renderBudgetLimitWidget() {
    const category = document.getElementById('budget-cat-select').value;
    const limitInput = document.getElementById('budget-limit-input');
    const info = document.getElementById('budget-limit-info');
    if (!category || !limitInput || !info) return;

    const currentLimit = getCategoryLimit(category);
    limitInput.value = currentLimit;
    info.innerText = 'Current ' + category + ' budget limit is ' + formatCurrency(currentLimit) + '.';
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

    if (desc && amount) {
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
    document.getElementById('filter-sw-' + filterType.toLowerCase()).classList.add('active');
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
        const html = '<div class="row-item" style="border-left: 3px solid ' + (isRev ? 'transparent' : 'var(--accent)') + '; padding-left: 8px; margin-bottom:6px;"><span><b>' + itemIcon + ' ' + item.desc + '</b> <small style="color:var(--text-muted);">' + item.date + ' ' + item.time + '</small></span><span style="display:flex; align-items:center; gap:8px;"><button onclick="toggleTransactionReview(\'' + item.id + '\')" style="background:none; border:none; cursor:pointer;">' + (isRev ? '✅' : '🟡') + '</button><b>' + formatCurrency(item.amount) + '</b><button class="delete-btn" onclick="deleteItem(\'variableOutflows\',\'' + item.id + '\')">✕</button></span></div>';
        matrix.innerHTML += html;
    });
}

function renderQuickChips() {
    const container = document.getElementById('quick-chips-wrapper');
    if (!container) return;
    container.innerHTML = '';
    coreLedger.quickTemplates.forEach(t => {
        const html = '<div class="quick-chip-wrapper"><span class="quick-chip-text" onclick="applyTemplate(\'' + t.label + '\', ' + t.amount + ')">' + t.label + ' ($' + t.amount + ')</span><button class="quick-chip-del" onclick="deleteTemplate(\'' + t.id + '\')">✕</button></div>';
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
    
    if (label && amount) {
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
    if (desc && amount) {
        coreLedger.inflows.push({ id: generateUUID(), desc, amount, frequency });
        clearFields(['inc-name', 'inc-amount']);
        renderInflows();
        renderIncomeSourcesList();
        runCalculations();
    }
}

function addOneTimeMoney() {
    const source = document.getElementById('onetime-source').value;
    const amount = parseFloat(document.getElementById('onetime-amount').value);
    const date = new Date().toISOString().slice(0, 10);
    
    if(source && amount && amount > 0) {
        coreLedger.oneTimeTransactions.push({ 
            id: generateUUID(), 
            source, 
            amount, 
            date
        });
        document.getElementById('onetime-amount').value = '';
        renderOneTimeList();
        runCalculations();
    }
}

function renderOneTimeList() {
    const list = document.getElementById('onetime-list');
    if(!list) return;
    list.innerHTML = '';
    
    if(coreLedger.oneTimeTransactions.length === 0) {
        list.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:12px; font-size:0.9rem;">No one-time money added yet.</div>';
        return;
    }
    
    const sourceEmoji = {
        'Gift': '💝',
        'Bonus': '🎉',
        'Refund': '💵',
        'Found': '🔍',
        'Other': '📌'
    };
    
    coreLedger.oneTimeTransactions.forEach(item => {
        const emoji = sourceEmoji[item.source] || '💰';
        const html = '<div style="margin-bottom:8px; padding:10px; background:rgba(34, 197, 94, 0.08); border-radius:10px; border:1px solid var(--card-border); display:flex; justify-content:space-between; align-items:center;"><div><div style="font-weight:700; font-size:0.95rem;">' + emoji + ' ' + item.source + '</div><div style="font-size:0.8rem; color:var(--text-muted);">' + item.date + '</div></div><div style="text-align:right;"><div style="font-weight:700; color:var(--success); font-size:1rem;">+' + formatCurrency(item.amount) + '</div><button class="delete-btn" style="margin:0; margin-top:4px;" onclick="deleteItem(\'oneTimeTransactions\',\'' + item.id + '\')">✕</button></div></div>';
        list.innerHTML += html;
    });
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

function renderFixedOutflows() {
    const list = document.getElementById('monthly-list');
    if(!list) return;
    list.innerHTML = '';
    if(coreLedger.fixedOutflows.length === 0) {
        list.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:20px;">No monthly payments added yet.</div>';
        return;
    }
    coreLedger.fixedOutflows.forEach(item => {
        const html = '<div style="margin-bottom:12px; padding:12px; background:rgba(255,255,255,0.02); border-radius:10px; border:1px solid var(--card-border);"><div style="display:flex; justify-content:space-between; align-items:center;"><div><div style="font-weight:700;">💳 ' + item.desc + '</div><div style="font-size:0.85rem; color:var(--text-muted);">' + item.frequency + ' payment</div></div><div style="text-align:right;"><b style="color:var(--danger);">-' + formatCurrency(item.amount) + '</b><button class="delete-btn" onclick="deleteItem(\'fixedOutflows\',\'' + item.id + '\')">✕</button></div></div></div>';
        list.innerHTML += html;
    });
}

function renderInflows() {
    const list = document.getElementById('income-list');
    if(!list) return;
    list.innerHTML = '';
    if(coreLedger.inflows.length === 0) {
        list.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:20px;">No income sources added yet.</div>';
        return;
    }
    coreLedger.inflows.forEach(item => {
        const html = '<div style="margin-bottom:12px; padding:12px; background:rgba(255,255,255,0.02); border-radius:10px; border:1px solid var(--card-border);"><div style="display:flex; justify-content:space-between; align-items:center;"><div><div style="font-weight:700;">💰 ' + item.desc + '</div><div style="font-size:0.85rem; color:var(--text-muted);">' + item.frequency + ' income</div></div><div style="text-align:right;"><b style="color:var(--success);">+' + formatCurrency(item.amount) + '</b><button class="delete-btn" onclick="deleteItem(\'inflows\',\'' + item.id + '\')">✕</button></div></div></div>';
        list.innerHTML += html;
    });
}

function addStock() {
    const symbol = document.getElementById('stock-symbol').value.toUpperCase();
    const shares = parseFloat(document.getElementById('stock-shares').value);
    const purchasePrice = parseFloat(document.getElementById('stock-purchase-price').value);
    
    if (symbol && shares && purchasePrice) {
        coreLedger.assetPositions.push({
            id: generateUUID(),
            symbol,
            shares,
            purchasePrice,
            currentPrice: purchasePrice
        });
        clearFields(['stock-symbol', 'stock-shares', 'stock-purchase-price']);
        renderStockList();
        renderPortfolioSummary();
        runCalculations();
    }
}

function updateStockPrice(id) {
    const newPrice = prompt('Enter new price:');
    if (newPrice && !isNaN(parseFloat(newPrice))) {
        const stock = coreLedger.assetPositions.find(s => s.id === id);
        if (stock) {
            stock.currentPrice = parseFloat(newPrice);
            localStorage.setItem('apex_ledger_v4', JSON.stringify(coreLedger));
            renderStockList();
            renderPortfolioSummary();
            runCalculations();
        }
    }
}

function renderStockList() {
    const list = document.getElementById('portfolio-items');
    if(!list) return;
    list.innerHTML = '';
    if(coreLedger.assetPositions.length === 0) {
        list.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:20px;">No stocks added yet.</div>';
        return;
    }
    coreLedger.assetPositions.forEach(stock => {
        const totalValue = stock.shares * stock.currentPrice;
        const totalCost = stock.shares * stock.purchasePrice;
        const gainLoss = totalValue - totalCost;
        const gainLossPercent = ((gainLoss / totalCost) * 100).toFixed(2);
        const gainLossColor = gainLoss >= 0 ? 'var(--success)' : 'var(--danger)';
        const html = '<div style="margin-bottom:12px; padding:12px; background:rgba(255,255,255,0.02); border-radius:10px; border:1px solid var(--card-border);"><div style="display:flex; justify-content:space-between; margin-bottom:8px;"><div style="flex:1;"><div style="font-weight:700;">📈 ' + stock.symbol + '</div><div style="font-size:0.85rem; color:var(--text-muted);">' + stock.shares + ' shares @ $' + stock.purchasePrice.toFixed(2) + '</div></div><div style="text-align:right;"><div style="font-weight:700;">' + formatCurrency(totalValue) + '</div><div style="font-size:0.85rem; color:' + gainLossColor + ';">' + (gainLoss >= 0 ? '+' : '') + gainLoss.toFixed(2) + ' (' + gainLossPercent + '%)</div></div></div><div style="display:flex; gap:6px;"><button onclick="updateStockPrice(\'' + stock.id + '\')" style="flex:1;">Edit Price</button><button class="delete-btn" onclick="deleteItem(\'assetPositions\',\'' + stock.id + '\')">Delete</button></div></div>';
        list.innerHTML += html;
    });
}

function renderPortfolioSummary() {
    const summary = document.getElementById('portfolio-summary');
    if(!summary) return;
    
    const totalValue = coreLedger.assetPositions.reduce((acc, s) => acc + (s.shares * s.currentPrice), 0);
    const totalInvested = coreLedger.assetPositions.reduce((acc, s) => acc + (s.shares * s.purchasePrice), 0);
    const totalGainLoss = totalValue - totalInvested;
    const percentChange = totalInvested > 0 ? ((totalGainLoss / totalInvested) * 100).toFixed(2) : 0;
    const gainLossColor = totalGainLoss >= 0 ? 'var(--success)' : 'var(--danger)';
    
    summary.innerHTML = '<div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:20px;"><div style="background:rgba(16, 185, 129, 0.08); padding:14px; border-radius:10px; border:1px solid rgba(16, 185, 129, 0.2);"><div style="font-size:0.85rem; color:var(--text-muted);">Total Value</div><div style="font-size:1.5rem; font-weight:700; color:var(--success);">' + formatCurrency(totalValue) + '</div></div><div style="background:rgba(59, 130, 246, 0.08); padding:14px; border-radius:10px; border:1px solid rgba(59, 130, 246, 0.2);"><div style="font-size:0.85rem; color:var(--text-muted);">Total Invested</div><div style="font-size:1.5rem; font-weight:700;">' + formatCurrency(totalInvested) + '</div></div><div style="background:rgba(34, 197, 94, 0.08); padding:14px; border-radius:10px; border:1px solid rgba(34, 197, 94, 0.2); grid-column: 1 / -1;"><div style="font-size:0.85rem; color:var(--text-muted);">Gain / Loss</div><div style="font-size:1.5rem; font-weight:700; color:' + gainLossColor + ';">' + (totalGainLoss >= 0 ? '+' : '') + formatCurrency(totalGainLoss) + ' (' + percentChange + '%)</div></div></div>';
}

function deleteItem(arrayName, id) {
    if (arrayName === 'variableOutflows') {
        coreLedger.variableOutflows = coreLedger.variableOutflows.filter(item => item.id !== id);
        renderVariableExpenseList();
        renderSpendingBreakdown();
    } else if (arrayName === 'inflows') {
        coreLedger.inflows = coreLedger.inflows.filter(item => item.id !== id);
        renderInflows();
        renderIncomeSourcesList();
    } else if (arrayName === 'fixedOutflows') {
        coreLedger.fixedOutflows = coreLedger.fixedOutflows.filter(item => item.id !== id);
        renderFixedOutflows();
    } else if (arrayName === 'assetPositions') {
        coreLedger.assetPositions = coreLedger.assetPositions.filter(item => item.id !== id);
        renderStockList();
        renderPortfolioSummary();
    } else if (arrayName === 'oneTimeTransactions') {
        coreLedger.oneTimeTransactions = coreLedger.oneTimeTransactions.filter(item => item.id !== id);
        renderOneTimeList();
    }
    runCalculations();
}

function renderAllInterfaceLists() {
    renderVariableExpenseList();
    renderInflows();
    renderFixedOutflows();
    renderStockList();
    renderPortfolioSummary();
    renderQuickChips();
    renderOneTimeList();
}

function clearFields(fieldIds) {
    fieldIds.forEach(id => {
        document.getElementById(id).value = '';
    });
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function toggleTheme() {
    const newTheme = coreLedger.activeThemePreference === 'dark' ? 'light' : 'dark';
    coreLedger.activeThemePreference = newTheme;
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('apex_ledger_v4', JSON.stringify(coreLedger));
}
