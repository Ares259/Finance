// DYNAMIC RE-RENDER ALLOCATION PIE MATRIX
(function(window) {
    let globalChartReference = null;

    window.renderAnalyticsChart = function() {
        const ctx = document.getElementById('analyticsChart');
        if (!ctx) return;

        // Categorization Processing Aggregation Loop
        const totalsByCategory = {
            Food: 0, Transport: 0, Housing: 0, Entertainment: 0, Shopping: 0, Health: 0, Education: 0
        };

        coreLedger.variableOutflows.forEach(item => {
            if (totalsByCategory[item.category] !== undefined) {
                totalsByCategory[item.category] += item.amount;
            }
        });

        const chartLabels = Object.keys(totalsByCategory);
        const chartValues = Object.values(totalsByCategory);
        const totalSum = chartValues.reduce((a, b) => a + b, 0);

        // Prevent blank charts from throwing layout anomalies
        if (totalSum === 0) {
            if (globalChartReference) { globalChartReference.destroy(); globalChartReference = null; }
            ctx.parentElement.style.opacity = "0.5";
            return;
        }
        ctx.parentElement.style.opacity = "1";

        const chartConfigColors = ['#fbbf24', '#38bdf8', '#f87171', '#c084fc', '#34d399', '#f43f5e', '#60a5fa'];

        if (globalChartReference) {
            globalChartReference.data.datasets[0].data = chartValues;
            globalChartReference.update();
        } else {
            globalChartReference = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: chartLabels,
                    datasets: [{
                        data: chartValues,
                        backgroundColor: chartConfigColors,
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: '#94a3b8', boxWidth: 12 }
                        }
                    }
                }
            });
        }
    };
})(window);