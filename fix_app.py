#!/usr/bin/env python3
import re

# Read the current file
with open('js/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the start of renderIncomeSourcesList
start_marker = 'function renderIncomeSourcesList() {'
start_idx = content.find(start_marker)

if start_idx == -1:
    print("Could not find renderIncomeSourcesList")
    exit(1)

# Find the start of renderCopilotCategoryMetrics (the next major function that's clean)
end_marker = 'function renderCopilotCategoryMetrics() {'
end_idx = content.find(end_marker, start_idx)

if end_idx == -1:
    print("Could not find renderCopilotCategoryMetrics")
    exit(1)

# The replacement text - all rendering functions cleanly
replacement = '''function renderIncomeSourcesList() {
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
        const percent = ((amount / totalSpending) * 100).toFixed(1);
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

'''

# Replace the corrupted section
new_content = content[:start_idx] + replacement + content[end_idx:]

# Write back
with open('js/app.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Fixed app.js successfully!")
