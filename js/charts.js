// DYNAMIC RE-RENDER ALLOCATION PIE MATRIX
(function(window) {
    let globalChartReference = null;

    window.renderAnalyticsChart = function() {
        const canvasElement = document.getElementById('analyticsChart');
        if (!canvasElement) return;

        // Categorization Processing Aggregation Loop
        const totalsByCategory = {
            Food: 0, Transport: 0, Housing: 0, Entertainment: 0, Shopping: 0, Health: 0, Education: 0
        };

        // Ensure coreLedger data structure is accessible before looping
        if (window.coreLedger && Array.isArray(window.coreLedger.variableOutflows)) {
            window.coreLedger.variableOutflows.forEach(item => {
                if (totalsByCategory[item.category] !== undefined) {
                    totalsByCategory[item.category] += item.amount;
                }
            });
        }

        const chartLabels = Object.keys(totalsByCategory);
        const chartValues = Object.values(totalsByCategory);
        const totalSum = chartValues.reduce((a, b) => a + b, 0);

        // Prevent blank charts from throwing layout anomalies
        if (totalSum === 0) {
            if (globalChartReference) { 
                globalChartReference.destroy(); 
                globalChartReference = null; 
            }
            canvasElement.parentElement.style.opacity = "0.5";
            return;
        }
        canvasElement.parentElement.style.opacity = "1";

        const chartConfigColors = ['#fbbf24', '#38bdf8', '#f87171', '#c084fc', '#34d399', '#f43f5e', '#60a5fa'];

        if (globalChartReference) {
            globalChartReference.data.datasets[0].data = chartValues;
            globalChartReference.update();
        } else {
            // Get the 2D canvas drawing context context explicitly
            const ctx = canvasElement.getContext('2d');
            
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
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { 
                                color: '#94a3b8', 
                                boxWidth: 12,
                                font: { weight: '500' }
                            }
                        }
                    }
                }
            });
        }
    };
})(window);