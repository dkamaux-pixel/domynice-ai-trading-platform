import React, { useState } from "react";

function App() {
  const [activeTab, setActiveTab] = useState("Dashboard");

  const tabs = [
    "Dashboard",
    "Market Analysis",
    "AI Signals",
    "DTrader",
    "Bulk Trader",
  ];

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.logo}>Domynice AI</h1>
          <p style={styles.subtitle}>Deriv AI Trading Platform</p>
        </div>

        <button style={styles.loginButton}>Connect Deriv</button>
      </header>

      <nav style={styles.nav}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              ...styles.navButton,
              ...(activeTab === tab ? styles.activeNavButton : {}),
            }}
          >
            {tab}
          </button>
        ))}
      </nav>

      <main style={styles.main}>
        <section style={styles.hero}>
          <p style={styles.badge}>AI TRADING ANALYSIS</p>
          <h2>{activeTab}</h2>
          <p style={styles.description}>
            Analyze Deriv markets, study price movements, and manage your
            trading strategies from one platform.
          </p>
        </section>

        <section style={styles.grid}>
          <div style={styles.card}>
            <span style={styles.cardLabel}>Market</span>
            <strong>Volatility Index</strong>
            <span style={styles.value}>Live Analysis</span>
          </div>

          <div style={styles.card}>
            <span style={styles.cardLabel}>AI Signal</span>
            <strong>Waiting for market data</strong>
            <span style={styles.value}>No signal yet</span>
          </div>

          <div style={styles.card}>
            <span style={styles.cardLabel}>Risk Manager</span>
            <strong>Risk controls</strong>
            <span style={styles.value}>Ready</span>
          </div>
        </section>

        <section style={styles.chart}>
          <h3>Market Chart</h3>
          <div style={styles.chartArea}>
            <span>Live Deriv market data will appear here.</span>
          </div>
        </section>
      </main>
    </div>
  );
}

const styles = {
  app: {
    minHeight: "100vh",
    background: "#080d18",
    color: "#ffffff",
    fontFamily: "Arial, sans-serif",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "22px 6%",
    borderBottom: "1px solid #1d2638",
  },

  logo: {
    margin: 0,
    fontSize: "28px",
  },

  subtitle: {
    margin: "5px 0 0",
    color: "#8d99ae",
  },

  loginButton: {
    background: "#19c37d",
    color: "#07130d",
    border: "none",
    borderRadius: "8px",
    padding: "12px 18px",
    fontWeight: "bold",
  },

  nav: {
    display: "flex",
    gap: "8px",
    padding: "14px 6%",
    overflowX: "auto",
    borderBottom: "1px solid #1d2638",
  },

  navButton: {
    background: "#111827",
    color: "#aab4c5",
    border: "1px solid #263147",
    borderRadius: "7px",
    padding: "10px 14px",
    whiteSpace: "nowrap",
  },

  activeNavButton: {
    background: "#1d2b45",
    color: "#ffffff",
  },

  main: {
    width: "88%",
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "35px 0",
  },

  hero: {
    padding: "30px 0",
  },

  badge: {
    color: "#19c37d",
    fontSize: "12px",
    fontWeight: "bold",
    letterSpacing: "2px",
  },

  heroTitle: {
    fontSize: "40px",
  },

  description: {
    color: "#9aa6b8",
    maxWidth: "700px",
    lineHeight: 1.6,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  },

  card: {
    background: "#101827",
    border: "1px solid #202c40",
    borderRadius: "12px",
    padding: "22px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  cardLabel: {
    color: "#7f8ba0",
    fontSize: "13px",
  },

  value: {
    color: "#19c37d",
    fontSize: "13px",
  },

  chart: {
    marginTop: "22px",
    background: "#101827",
    border: "1px solid #202c40",
    borderRadius: "12px",
    padding: "22px",
  },

  chartArea: {
    height: "260px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0b1220",
    borderRadius: "8px",
    color: "#69778d",
  },
};

export default App;
