// Stats Component - Display summary statistics

export const StatsComponent = {
  element: document.getElementById('stats'),

  render(data) {
    if (!data || !data.metrics || data.metrics.length === 0) {
      this.element.innerHTML = '<div class="loading">No data available</div>';
      return;
    }

    const metrics = data.metrics;
    const values = metrics.map(m => parseFloat(m.payload.value)).filter(v => !isNaN(v));

    if (values.length === 0) {
      this.element.innerHTML = '<div class="loading">No numeric values</div>';
      return;
    }

    const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
    const max = Math.max(...values).toFixed(2);
    const min = Math.min(...values).toFixed(2);
    const count = metrics.length;

    this.element.innerHTML = `
      <div class="stats-grid">
        <div class="stat">
          <div class="stat-label">Average</div>
          <div class="stat-value">${avg}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Maximum</div>
          <div class="stat-value">${max}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Minimum</div>
          <div class="stat-value">${min}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Count</div>
          <div class="stat-value">${count}</div>
        </div>
      </div>
    `;
  },
};
