// Betting Tracker App
document.addEventListener('DOMContentLoaded', async () => {
    const data = await loadData();
    if (data) {
        renderStats(data);
        renderMarkets(data);
        renderBets(data);
        renderDaily(data);
        renderPending(data);
        setupFilters(data);
    }
});

async function loadData() {
    try {
        const response = await fetch('data/bets.json');
        return await response.json();
    } catch (error) {
        console.error('Error loading data:', error);
        return null;
    }
}

function renderStats(data) {
    const { bankroll, stats } = data;
    
    // Only count completed bets
    const completedBets = data.bets.filter(b => b.status !== 'pending');
    const wins = completedBets.filter(b => b.won === true).length;
    const totalCompleted = completedBets.length;
    
    // Bankroll
    document.getElementById('bankroll').textContent = formatCurrency(bankroll.current);
    const changePercent = ((bankroll.current - bankroll.initial) / bankroll.initial * 100).toFixed(1);
    const changeEl = document.getElementById('bankrollChange');
    changeEl.textContent = `${changePercent >= 0 ? '+' : ''}${changePercent}%`;
    changeEl.className = `stat-change ${changePercent >= 0 ? 'positive' : 'negative'}`;
    
    // Profit/Loss
    const plEl = document.getElementById('profitLoss');
    plEl.textContent = formatCurrency(stats.profitLoss);
    plEl.className = `stat-value ${stats.profitLoss >= 0 ? 'positive' : 'negative'}`;
    
    // Win Rate (only completed)
    const winRate = totalCompleted > 0 ? (wins / totalCompleted * 100).toFixed(1) : 0;
    document.getElementById('winRate').textContent = `${winRate}%`;
    document.getElementById('winRateDetail').textContent = `${wins}/${totalCompleted}`;
    
    // ROI
    const roi = stats.totalStaked > 0 ? (stats.profitLoss / stats.totalStaked * 100).toFixed(1) : 0;
    document.getElementById('roi').textContent = `${roi >= 0 ? '+' : ''}${roi}%`;
    
    // Header stats
    document.getElementById('headerWinRate').textContent = `${winRate}%`;
    document.getElementById('headerROI').textContent = `${roi >= 0 ? '+' : ''}${roi}%`;
}

function renderMarkets(data) {
    const grid = document.getElementById('marketsGrid');
    grid.innerHTML = '';
    
    const marketIcons = {
        'Handicap': '🎯',
        'BTTS': '⚽',
        'Combo': '🔗',
        'Goleador': '👟',
        'Parlay': '🎰',
        'Over/Under': '📊',
        'ML': '🏆'
    };
    
    Object.entries(data.markets).forEach(([name, market]) => {
        if (market.total === 0) return; // Skip empty markets
        const roi = market.staked > 0 ? (market.pl / market.staked * 100).toFixed(1) : 0;
        const card = document.createElement('div');
        card.className = 'market-card';
        card.innerHTML = `
            <div class="market-name">
                ${marketIcons[name] || '📌'} ${name}
            </div>
            <div class="market-stats">
                <span class="market-record">${market.wins}/${market.total}</span>
                <span class="market-roi ${roi >= 0 ? 'positive' : 'negative'}">${roi >= 0 ? '+' : ''}${roi}%</span>
            </div>
        `;
        grid.appendChild(card);
    });
}

function renderPending(data) {
    const pendingBets = data.bets.filter(b => b.status === 'pending');
    if (pendingBets.length === 0) return;
    
    // Create pending section if it doesn't exist
    let pendingSection = document.getElementById('pendingSection');
    if (!pendingSection) {
        pendingSection = document.createElement('section');
        pendingSection.id = 'pendingSection';
        pendingSection.className = 'pending-section';
        pendingSection.innerHTML = `
            <div class="container">
                <h2 class="section-title">⏳ Apuestas Pendientes</h2>
                <div class="pending-grid" id="pendingGrid"></div>
                <div class="pending-summary" id="pendingSummary"></div>
            </div>
        `;
        // Insert after stats section
        const statsSection = document.querySelector('.stats-section');
        statsSection.after(pendingSection);
    }
    
    const grid = document.getElementById('pendingGrid');
    grid.innerHTML = '';
    
    let totalStake = 0;
    let potentialReturn = 0;
    
    pendingBets.forEach(bet => {
        totalStake += bet.stake;
        potentialReturn += bet.stake * bet.odds;
        
        const card = document.createElement('div');
        card.className = 'pending-card';
        card.innerHTML = `
            <div class="pending-header">
                <span class="pending-league">${bet.league}</span>
                <span class="pending-odds">@ ${bet.odds.toFixed(2)}</span>
            </div>
            <div class="pending-match">${bet.match}</div>
            <div class="pending-pick">${bet.pick}</div>
            <div class="pending-footer">
                <span class="pending-stake">${formatCurrency(bet.stake)}</span>
                <span class="pending-potential">→ ${formatCurrency(bet.stake * bet.odds)}</span>
            </div>
        `;
        grid.appendChild(card);
    });
    
    document.getElementById('pendingSummary').innerHTML = `
        <div class="summary-row">
            <span>Total apostado:</span>
            <strong>${formatCurrency(totalStake)}</strong>
        </div>
        <div class="summary-row">
            <span>Retorno potencial:</span>
            <strong class="potential">${formatCurrency(potentialReturn)}</strong>
        </div>
    `;
}

function renderBets(data, filter = 'all') {
    const tbody = document.getElementById('betsTableBody');
    tbody.innerHTML = '';
    
    // Only show completed bets in main table
    let completedBets = data.bets.filter(b => b.status !== 'pending');
    completedBets = [...completedBets].reverse(); // Most recent first
    
    if (filter === 'won') {
        completedBets = completedBets.filter(b => b.won === true);
    } else if (filter === 'lost') {
        completedBets = completedBets.filter(b => b.won === false);
    }
    
    completedBets.forEach((bet, index) => {
        const row = document.createElement('tr');
        row.style.animationDelay = `${index * 0.05}s`;
        row.className = bet.won ? 'won' : 'lost';
        row.innerHTML = `
            <td>${formatDate(bet.date)}</td>
            <td>${bet.match}</td>
            <td>${bet.market}</td>
            <td><strong>${bet.pick}</strong></td>
            <td>${bet.odds.toFixed(2)}</td>
            <td>${formatCurrency(bet.stake)}</td>
            <td>
                <span class="result-badge ${bet.won ? 'won' : 'lost'}">
                    ${bet.won ? '✅' : '❌'} ${bet.result}
                </span>
            </td>
            <td>
                <span class="pl-value ${bet.pl >= 0 ? 'positive' : 'negative'}">
                    ${bet.pl >= 0 ? '+' : ''}${formatCurrency(bet.pl)}
                </span>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderDaily(data) {
    const grid = document.getElementById('dailyGrid');
    grid.innerHTML = '';
    
    // Group completed bets by date
    const completedBets = data.bets.filter(b => b.status !== 'pending');
    const dailyData = {};
    
    completedBets.forEach(bet => {
        if (!dailyData[bet.date]) {
            dailyData[bet.date] = { bets: 0, wins: 0, staked: 0, pl: 0 };
        }
        dailyData[bet.date].bets++;
        if (bet.won) dailyData[bet.date].wins++;
        dailyData[bet.date].staked += bet.stake;
        dailyData[bet.date].pl += bet.pl;
    });
    
    // Sort by date descending
    const sortedDays = Object.entries(dailyData).sort((a, b) => 
        new Date(b[0]) - new Date(a[0])
    );
    
    sortedDays.forEach(([date, day]) => {
        const roi = day.staked > 0 ? (day.pl / day.staked * 100).toFixed(1) : 0;
        const winRate = day.bets > 0 ? (day.wins / day.bets * 100).toFixed(1) : 0;
        
        const card = document.createElement('div');
        card.className = 'daily-card';
        card.innerHTML = `
            <div class="daily-header">
                <span class="daily-date">📅 ${formatDate(date)}</span>
                <span class="daily-pl ${day.pl >= 0 ? 'positive' : 'negative'}">
                    ${day.pl >= 0 ? '+' : ''}${formatCurrency(day.pl)}
                </span>
            </div>
            <div class="daily-stats">
                <div class="daily-stat">
                    <span class="daily-stat-label">Apuestas</span>
                    <span class="daily-stat-value">${day.bets}</span>
                </div>
                <div class="daily-stat">
                    <span class="daily-stat-label">Ganadas</span>
                    <span class="daily-stat-value">${day.wins}/${day.bets}</span>
                </div>
                <div class="daily-stat">
                    <span class="daily-stat-label">Win Rate</span>
                    <span class="daily-stat-value">${winRate}%</span>
                </div>
                <div class="daily-stat">
                    <span class="daily-stat-label">ROI</span>
                    <span class="daily-stat-value">${roi >= 0 ? '+' : ''}${roi}%</span>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function setupFilters(data) {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderBets(data, btn.dataset.filter);
        });
    });
}

function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(value);
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}
