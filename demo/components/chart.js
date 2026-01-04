// Chart Component - Display historical metrics

let chartInstance = null;

export const ChartComponent = {
  canvasElement: null,

  init(canvasElement) {
    this.canvasElement = canvasElement;
  },

  render(aggregatedData) {
    if (!aggregatedData || aggregatedData.length === 0) {
      this.canvasElement.parentElement.innerHTML = '<div class="loading">No historical data available</div>';
      return;
    }

    const labels = aggregatedData.map((point) =>
      new Date(point.timestamp * 1000).toLocaleTimeString()
    );
    const values = aggregatedData.map((point) => parseFloat(point.value).toFixed(2));

    // Destroy previous chart if it exists
    if (chartInstance) {
      chartInstance.destroy();
    }

    const ctx = this.canvasElement.getContext('2d');
    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Metric Value',
            data: values,
            borderColor: '#0366d6',
            backgroundColor: 'rgba(3, 102, 214, 0.1)',
            tension: 0.3,
            fill: true,
            pointRadius: 4,
            pointBackgroundColor: '#0366d6',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true,
            position: 'top',
          },
          title: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: false,
            grid: {
              color: '#f0f0f0',
            },
          },
          x: {
            grid: {
              display: false,
            },
          },
        },
      },
    });
  },

  clear() {
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
  },
};
