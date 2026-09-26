
import React, { useEffect, useState } from "react";

const DERIV_REDIRECT_URI =
  "https://domynicetraders.com/callback";

const DERIV_CLIENT_ID =
  import.meta.env.VITE_DERIV_CLIENT_ID ||
  import.meta.env.NEXT_PUBLIC_DERIV_CLIENT_ID ||
  "";

const DERIV_SCOPES = "trade account_manage";

function base64UrlEncode(bytes) {
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function randomString(length = 64) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

  const randomValues = crypto.getRandomValues(new Uint8Array(length));

  return Array.from(randomValues)
    .map((value) => characters[value % characters.length])
    .join("");
}

async function createPKCE() {
  const codeVerifier = randomString(64);

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(codeVerifier)
  );

  const codeChallenge = base64UrlEncode(
    new Uint8Array(digest)
  );

  return {
    codeVerifier,
    codeChallenge,
  };
}

function App() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [connectionStatus, setConnectionStatus] = useState("");

  const tabs = [
    "Dashboard",
    "Market Analysis",
    "AI Signals",
    "DTrader",
    "Bulk Trader",
  ];

  useEffect(() => {
    const handleCallback = async () => {
      const url = new URL(window.location.href);

      const code = url.searchParams.get("code");
      const returnedState = url.searchParams.get("state");
      const error = url.searchParams.get("error");
      const errorDescription =
        url.searchParams.get("error_description");

      if (error) {
        setConnectionStatus(
          errorDescription || `Deriv login error: ${error}`
        );

        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

        return;
      }

      if (!code) {
        return;
      }

      const savedState =
        sessionStorage.getItem("deriv_oauth_state");

      const codeVerifier =
        sessionStorage.getItem("deriv_code_verifier");

      if (!savedState || returnedState !== savedState) {
        setConnectionStatus(
          "Deriv connection failed: invalid OAuth state."
        );
        return;
      }

      if (!codeVerifier) {
        setConnectionStatus(
          "Deriv connection failed: PKCE verifier is missing."
        );
        return;
      }

      setConnectionStatus("Connecting to Deriv...");

      try {
        const response = await fetch(
          "/.netlify/functions/deriv-token",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              code,
              code_verifier: codeVerifier,
              redirect_uri: DERIV_REDIRECT_URI,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok || !data.access_token) {
          throw new Error(
            data.error_description ||
              data.error ||
              "Unable to connect to Deriv."
          );
        }

        sessionStorage.removeItem("deriv_oauth_state");
        sessionStorage.removeItem("deriv_code_verifier");

        sessionStorage.setItem(
          "deriv_access_token",
          data.access_token
        );

        setConnectionStatus("Connected to Deriv.");

        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      } catch (error) {
        console.error("Deriv OAuth error:", error);

        setConnectionStatus(
          error.message || "Deriv connection failed."
        );
      }
    };

    handleCallback();
  }, []);

  const connectDeriv = async () => {
    if (!DERIV_CLIENT_ID) {
      setConnectionStatus(
        "Deriv client ID is not configured for the website."
      );
      return;
    }

    try {
      setConnectionStatus("Preparing Deriv login...");

      const { codeVerifier, codeChallenge } =
        await createPKCE();

      const state = randomString(32);

      sessionStorage.setItem(
        "deriv_code_verifier",
        codeVerifier
      );

      sessionStorage.setItem(
        "deriv_oauth_state",
        state
      );

      const authUrl = new URL(
        "https://auth.deriv.com/oauth2/auth"
      );

      authUrl.searchParams.set(
        "response_type",
        "code"
      );

      authUrl.searchParams.set(
        "client_id",
        DERIV_CLIENT_ID
      );

      authUrl.searchParams.set(
        "redirect_uri",
        DERIV_REDIRECT_URI
      );

      authUrl.searchParams.set(
        "scope",
        DERIV_SCOPES
      );

      authUrl.searchParams.set(
        "state",
        state
      );

      authUrl.searchParams.set(
        "code_challenge",
        codeChallenge
      );

      authUrl.searchParams.set(
        "code_challenge_method",
        "S256"
      );

      window.location.assign(authUrl.toString());
    } catch (error) {
      console.error("Unable to start Deriv OAuth:", error);

      setConnectionStatus(
        "Unable to start Deriv connection."
      );
    }
  };

  const isConnected =
    Boolean(sessionStorage.getItem("deriv_access_token"));

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.logo}>Domynice AI</h1>

          <p style={styles.subtitle}>
            Domynice AI Trading Platform
          </p>
        </div>

        <div style={styles.connectionArea}>
          <button
            type="button"
            onClick={connectDeriv}
            style={styles.loginButton}
          >
            {isConnected
              ? "Deriv Connected"
              : "Connect Deriv"}
          </button>

          {connectionStatus && (
            <span style={styles.connectionStatus}>
              {connectionStatus}
            </span>
          )}
        </div>
      </header>

      <nav style={styles.nav}>
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            style={{
              ...styles.navButton,
              ...(activeTab === tab
                ? styles.activeNavButton
                : {}),
            }}
          >
            {tab}
          </button>
        ))}
      </nav>

      <main style={styles.main}>
        <section style={styles.hero}>
          <p style={styles.badge}>
            DOMYNICE AI TRADING
          </p>

          <h2 style={styles.heroTitle}>
            {activeTab}
          </h2>

          <p style={styles.description}>
            Analyze Deriv markets, study price movements,
            generate AI-assisted trading insights, and
            manage your trading strategies from one
            platform.
          </p>
        </section>

        <section style={styles.grid}>
          <div style={styles.card}>
            <span style={styles.cardLabel}>
              Market
            </span>

            <strong>Volatility Index</strong>

            <span style={styles.value}>
              Live Analysis
            </span>
          </div>

          <div style={styles.card}>
            <span style={styles.cardLabel}>
              AI Signal
            </span>

            <strong>
              Waiting for market data
            </strong>

            <span style={styles.value}>
              No signal yet
            </span>
          </div>

          <div style={styles.card}>
            <span style={styles.cardLabel}>
              Risk Manager
            </span>

            <strong>Risk controls</strong>

            <span style={styles.value}>
              Ready
            </span>
          </div>
        </section>

        <section style={styles.chart}>
          <h3>Market Chart</h3>

          <div style={styles.chartArea}>
            <span>
              Live Deriv market data will appear here.
            </span>
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
    gap: "20px",
  },

  logo: {
    margin: 0,
    fontSize: "28px",
  },

  subtitle: {
    margin: "5px 0 0",
    color: "#8d99ae",
  },

  connectionArea: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "7px",
  },

  loginButton: {
    background: "#19c37d",
    color: "#07130d",
    border: "none",
    borderRadius: "8px",
    padding: "12px 18px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  connectionStatus: {
    color: "#8d99ae",
    fontSize: "12px",
    maxWidth: "260px",
    textAlign: "right",
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
    cursor: "pointer",
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
    margin: "12px 0",
  },

  description: {
    color: "#9aa6b8",
    maxWidth: "700px",
    lineHeight: 1.6,
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
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
