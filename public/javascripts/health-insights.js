class HealthInsightsManager {
    constructor() {
        this.lastUpdate = null;
        this.updateInterval = 30 * 60 * 1000; // 30 minutes
        this.init();
    }

    async init() {
        await this.loadHealthTips();
        this.setupAutoRefresh();
        this.setupRefreshButton();
    }

    async loadHealthTips() {
        try {
            this.showLoading();
            
            const response = await fetch('/api/health-tips');
            const data = await response.json();
            
            if (data.success) {
                this.displayHealthTips(data.tips);
                this.lastUpdate = new Date();
                this.updateLastRefreshTime();
            } else {
                this.displayError('Failed to load health tips');
            }
        } catch (error) {
            console.error('Error loading health tips:', error);
            this.displayError('Unable to connect to health service');
        } finally {
            this.hideLoading();
        }
    }

    async loadInsights() {
        try {
            const response = await fetch('/api/insights');
            const data = await response.json();
            
            if (data.success) {
                this.displayInsights(data.insights);
            }
        } catch (error) {
            console.error('Error loading insights:', error);
        }
    }

    displayHealthTips(tips) {
        const container = document.getElementById('health-tips-container');
        if (!container) return;

        container.innerHTML = tips.map(tip => `
            <div class="health-tip-card ${tip.priority}" data-category="${tip.category}">
                <div class="tip-header">
                    <div class="tip-icon">
                        <i class="${tip.icon}"></i>
                    </div>
                    <div class="tip-meta">
                        <h4>${tip.title}</h4>
                        <span class="tip-category">${tip.category.replace('_', ' ')}</span>
                    </div>
                    <span class="priority-badge ${tip.priority}">${tip.priority}</span>
                </div>
                <div class="tip-content">
                    <p>${tip.description}</p>
                </div>
                <div class="tip-actions">
                    <button class="tip-action-btn" onclick="this.saveHealthTip('${tip.title}')">
                        <i class="bi bi-bookmark"></i> Save
                    </button>
                    <button class="tip-action-btn" onclick="this.shareHealthTip('${tip.title}')">
                        <i class="bi bi-share"></i> Share
                    </button>
                </div>
            </div>
        `).join('');

        // Add animation
        container.querySelectorAll('.health-tip-card').forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
            card.classList.add('fade-in');
        });
    }

    displayInsights(insights) {
        const container = document.getElementById('ai-insights-container');
        if (!container) return;

        container.innerHTML = `
            <div class="insights-summary">
                <h3>AI Analysis Summary</h3>
                <p>${insights.summary}</p>
            </div>
            
            <div class="insights-section">
                <h4><i class="bi bi-graph-up"></i> Key Patterns</h4>
                <ul class="insights-list">
                    ${insights.keyPatterns.map(pattern => `<li>${pattern}</li>`).join('')}
                </ul>
            </div>
            
            <div class="insights-section">
                <h4><i class="bi bi-lightbulb"></i> Recommendations</h4>
                <ul class="insights-list recommendations">
                    ${insights.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
            
            <div class="insights-section">
                <h4><i class="bi bi-trending-up"></i> Trends</h4>
                <ul class="insights-list trends">
                    ${insights.trends.map(trend => `<li>${trend}</li>`).join('')}
                </ul>
            </div>
            
            <div class="insights-footer">
                <small>Generated on ${new Date(insights.generatedAt).toLocaleString()}</small>
            </div>
        `;
    }

    setupAutoRefresh() {
        setInterval(() => {
            if (this.shouldRefresh()) {
                this.loadHealthTips();
            }
        }, this.updateInterval);
    }

    setupRefreshButton() {
        const refreshBtn = document.getElementById('refresh-health-tips');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadHealthTips();
            });
        }
    }

    shouldRefresh() {
        if (!this.lastUpdate) return true;
        return (new Date() - this.lastUpdate) >= this.updateInterval;
    }

    showLoading() {
        const container = document.getElementById('health-tips-container');
        if (container) {
            container.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>Generating personalized health insights...</p>
                </div>
            `;
        }
    }

    hideLoading() {
        // Loading is hidden when content is displayed
    }

    displayError(message) {
        const container = document.getElementById('health-tips-container');
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <i class="bi bi-exclamation-triangle"></i>
                    <h4>Unable to Load Health Tips</h4>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="healthInsights.loadHealthTips()">
                        Try Again
                    </button>
                </div>
            `;
        }
    }

    updateLastRefreshTime() {
        const timeElement = document.getElementById('last-update-time');
        if (timeElement && this.lastUpdate) {
            timeElement.textContent = `Last updated: ${this.lastUpdate.toLocaleTimeString()}`;
        }
    }

    saveHealthTip(title) {
        // Implement save functionality
        localStorage.setItem(`saved_tip_${Date.now()}`, title);
        this.showNotification('Health tip saved!', 'success');
    }

    shareHealthTip(title) {
        if (navigator.share) {
            navigator.share({
                title: 'Health Tip from Zynk',
                text: title,
                url: window.location.href
            });
        } else {
            // Fallback to copy to clipboard
            navigator.clipboard.writeText(title);
            this.showNotification('Health tip copied to clipboard!', 'info');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.healthInsights = new HealthInsightsManager();
});