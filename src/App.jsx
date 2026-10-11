
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  Check,
  Droplets,
  LayoutDashboard,
  Moon,
  Plus,
  RefreshCw,
  Sun,
  Waves,
  X,
  Database,
  Gauge,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import CursorWaves from "./CursorWaves";
import LoginPage from "./LoginPage";
import "./App.css";

const API_URL = `${import.meta.env.VITE_API_URL || "http://localhost:8080"}/api`;

const getArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.content)) return value.content;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const formatNumber = (value, digits = 1) => {
  const number = Number(value);
  return Number.isFinite(number)
    ? number.toLocaleString(undefined, { maximumFractionDigits: digits })
    : "—";
};

const getDeviceName = (device) =>
  device?.deviceName || device?.name || `Device ${device?.id ?? ""}`;

const getReadingFlow = (reading) =>
  Number(reading?.flowRate ?? reading?.flow_rate ?? 0);

const getReadingVolume = (reading) =>
  Number(
    reading?.volumeLitres ??
      reading?.volumeLiters ??
      reading?.volume_litres ??
      0
  );

const getReadingTime = (reading) =>
  reading?.recordedAt ||
  reading?.timestamp ||
  reading?.createdAt ||
  reading?.time;

function App() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("waterwatch-theme") || "dark"
  );
  const [activeTab, setActiveTab] = useState("Overview");
  const [devices, setDevices] = useState([]);
  const [readings, setReadings] = useState([]);
  const [summary, setSummary] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [deviceLocation, setDeviceLocation] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("login") === "success" || localStorage.getItem("waterwatch-login") === "true";
  });

  const handleGoogleLogin = () => {
    const backendUrl = (
      import.meta.env.VITE_API_URL || "http://localhost:8080"
    ).replace(/\/$/, "");

    window.location.href = `${backendUrl}/oauth2/authorization/google`;
  };

  const activeAlerts = alerts.filter(
    (alert) => alert.status !== "RESOLVED"
  );

  useEffect(() => {
    localStorage.setItem("waterwatch-theme", theme);
  }, [theme]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("login") === "success") {
      localStorage.setItem("waterwatch-login", "true");
      setIsLoggedIn(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleSignOut = async () => {
    const backendUrl = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/$/, "");
    try {
      await fetch(`${backendUrl}/logout`, { method: "POST", credentials: "include" });
    } catch (err) {
      console.warn("Sign-out request could not reach the backend:", err);
    }
    localStorage.removeItem("waterwatch-login");
    setIsLoggedIn(false);
    setDevices([]);
    setReadings([]);
    setAlerts([]);
    setSummary({});
  };

  const loadDashboard = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);

    try {
      const endpoints = [
        `${API_URL}/devices`,
        `${API_URL}/readings`,
        `${API_URL}/usage/summary`,
        `${API_URL}/alerts`,
      ];

      const responses = await Promise.all(
        endpoints.map(async (url) => {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Request failed (${response.status}): ${url}`);
          }
          return response.json();
        })
      );

      setDevices(getArray(responses[0]));
      setReadings(getArray(responses[1]));
      setSummary(
        responses[2] && typeof responses[2] === "object"
          ? responses[2]
          : {}
      );
      setAlerts(getArray(responses[3]));
      setError("");
    } catch (err) {
      console.error("WaterWatch loading error:", err);
      setError(
        "Could not load dashboard data. Make sure the Spring Boot backend is running on port 8080."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return undefined;
    }
    loadDashboard();
    const interval = setInterval(() => loadDashboard(), 10000);
    return () => clearInterval(interval);
  }, [isLoggedIn, loadDashboard]);

  const handleSimulateReadings = async (simulateLeak = false) => {
    if (devices.length === 0) {
      setError("Register a device before generating demo readings.");
      setActiveTab("Devices");
      return;
    }

    const device = devices[0];

    if (device.id == null) {
      setError("The selected device does not have an ID.");
      return;
    }

    setBusyAction(simulateLeak ? "leak" : "demo");
    setError("");
    setNotice("");

    try {
      const url =
        `${API_URL}/readings/simulate?deviceId=${encodeURIComponent(device.id)}` +
        `&count=40&simulateLeak=${simulateLeak}`;

      const response = await fetch(url, { method: "POST" });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || `Simulation failed (${response.status}).`);
      }

      await loadDashboard();

      setNotice(
        simulateLeak
          ? `Generated high-flow demo readings for ${getDeviceName(device)}. This does not prove a real leak.`
          : `Generated 40 demo readings for ${getDeviceName(device)}.`
      );
    } catch (err) {
      setError(err.message || "Could not generate demo readings.");
    } finally {
      setBusyAction("");
    }
  };

  const handleAddDevice = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!deviceName.trim() || !deviceLocation.trim()) {
      setError("Enter both a device name and location.");
      return;
    }

    setBusyAction("device");

    try {
      const response = await fetch(`${API_URL}/devices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceName: deviceName.trim(),
          location: deviceLocation.trim(),
          status: "ONLINE",
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || `Registration failed (${response.status}).`);
      }

      setDeviceName("");
      setDeviceLocation("");
      setModalOpen(false);
      setNotice("Device registered successfully.");
      await loadDashboard();
    } catch (err) {
      setError(err.message || "Could not register the device.");
    } finally {
      setBusyAction("");
    }
  };

  const handleResolveAlert = async (alertId) => {
    setBusyAction(`resolve-${alertId}`);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `${API_URL}/alerts/${alertId}/resolve`,
        { method: "PATCH" }
      );

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || "Could not resolve alert.");
      }

      setNotice("Alert resolved successfully.");
      await loadDashboard();
    } catch (err) {
      setError(err.message || "Could not resolve the alert.");
    } finally {
      setBusyAction("");
    }
  };

  const handleResolveAllAlerts = async () => {
    const unresolved = alerts.filter(
      (alert) => alert.status !== "RESOLVED"
    );

    if (unresolved.length === 0) {
      setNotice("There are no active alerts to resolve.");
      return;
    }

    if (
      !window.confirm(
        `Resolve all ${unresolved.length} active alerts?`
      )
    ) {
      return;
    }

    setBusyAction("resolve-all");
    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API_URL}/alerts/resolve-all`, {
        method: "PATCH",
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          body || `Could not resolve all alerts (${response.status}).`
        );
      }

      const result = await response.json();
      setNotice(
        `${result.resolvedCount ?? unresolved.length} alerts resolved successfully.`
      );
      await loadDashboard();
    } catch (err) {
      setError(
        err.message ||
          "Could not resolve all alerts. Check the backend endpoint."
      );
    } finally {
      setBusyAction("");
    }
  };

  const dailyUsage =
    summary.dailyUsageLitres ??
    summary.dailyUsageLiters ??
    summary.todayUsage ??
    summary.todayUsageLitres ??
    summary.daily ??
    0;

  const monthlyUsage =
    summary.monthlyUsageLitres ??
    summary.monthlyUsageLiters ??
    summary.monthUsage ??
    summary.monthlyUsage ??
    summary.monthly ??
    0;

  const averageFlow =
    summary.averageFlowRate ??
    summary.averageFlow ??
    summary.avgFlowRate ??
    0;

  const peakFlow =
    summary.peakFlowRate ??
    summary.peakFlow ??
    summary.maxFlowRate ??
    0;

  const chartData = [...readings]
    .sort(
      (a, b) =>
        new Date(getReadingTime(a) || 0) -
        new Date(getReadingTime(b) || 0)
    )
    .slice(-40)
    .map((reading, index) => {
      const time = getReadingTime(reading);
      const date = time ? new Date(time) : null;

      return {
        name:
          date && !Number.isNaN(date.getTime())
            ? date.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : `Reading ${index + 1}`,
        flow: getReadingFlow(reading),
        volume: getReadingVolume(reading),
      };
    });

  const lastReading = [...readings].sort(
    (a, b) =>
      new Date(getReadingTime(b) || 0) -
      new Date(getReadingTime(a) || 0)
  )[0];

  const lastUpdated = getReadingTime(lastReading);
  const formattedLastUpdated =
    lastUpdated && !Number.isNaN(new Date(lastUpdated).getTime())
      ? new Date(lastUpdated).toLocaleString()
      : "Waiting for readings";

  if (!isLoggedIn) {
    return <LoginPage onGoogleLogin={handleGoogleLogin} />;
  }

  const navItems = [
    { label: "Overview", icon: LayoutDashboard },
    { label: "Devices", icon: Waves },
    { label: "Consumption", icon: Activity },
    { label: "Alerts", icon: Bell },
  ];

  const pageTitle =
    activeTab === "Overview"
      ? "Water intelligence"
      : activeTab === "Consumption"
        ? "Consumption analysis"
        : activeTab === "Devices"
          ? "Connected instruments"
          : "Monitoring alerts";

  return (
    <div className={`app-shell ${theme}`} data-theme={theme}>
      <CursorWaves />

      <header className="topbar">
        <a
          className="brand"
          href="#overview"
          onClick={() => setActiveTab("Overview")}
        >
          <span className="brand-mark">
            <Droplets size={23} />
          </span>
          <span className="brand-copy">
            <strong>WATERWATCH</strong>
            <small>WATER INTELLIGENCE SYSTEM</small>
          </span>
        </a>

        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${activeTab === label ? "active" : ""}`}
              onClick={() => setActiveTab(label)}
            >
              <Icon size={16} />
              <span>{label}</span>
              {label === "Alerts" && alerts.length > 0 && (
                <span className="nav-count">{alerts.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="topbar-actions">
          <span className="system-status">
            <span className="status-dot" />
            LOCAL SYSTEM
          </span>
          <button
            className="secondary-button google-login-button"
            onClick={handleSignOut}
            type="button"
            title="Sign out of WaterWatch"
          >
            Sign out
          </button>
          <button
            className="icon-button"
            title="Refresh dashboard"
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
          >
            <RefreshCw
              size={17}
              className={refreshing ? "spin" : ""}
            />
          </button>
          <button
            className="icon-button"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            onClick={() =>
              setTheme(theme === "dark" ? "light" : "dark")
            }
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </header>

      <main className="main-content">
        <section className="page-heading">
          <div>
            <div className="eyebrow">
              <span>WATER RESOURCE MONITORING</span>
              <span className="eyebrow-separator">/</span>
              <span>DEMO ENVIRONMENT</span>
            </div>
            <h1>{pageTitle}</h1>
            <p className="page-description">
              Track flow, understand usage, and test water monitoring scenarios.
            </p>
          </div>

          <div className="heading-meta">
            <span className="meta-label">LAST READING</span>
            <strong>{formattedLastUpdated}</strong>
            <span className="meta-caption">
              {readings.length} readings loaded
            </span>
          </div>
        </section>

        {error && (
          <div className="message-banner error-banner" role="alert">
            <AlertTriangle size={18} />
            <span>{error}</span>
            <button
              className="banner-close"
              onClick={() => setError("")}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {notice && (
          <div className="message-banner success-banner" role="status">
            <Check size={18} />
            <span>{notice}</span>
            <button
              className="banner-close"
              onClick={() => setNotice("")}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {loading && (
          <div className="panel empty-state">
            <RefreshCw size={22} className="spin" />
            <strong>Loading WaterWatch...</strong>
          </div>
        )}

        {!loading && activeTab === "Overview" && (
          <>
            <section className="metric-grid">
              <MetricCard
                label="TODAY'S CONSUMPTION"
                value={formatNumber(dailyUsage)}
                unit="L"
                icon={Droplets}
                foot="Reported by usage summary API"
              />
              <MetricCard
                label="MONTHLY CONSUMPTION"
                value={formatNumber(monthlyUsage)}
                unit="L"
                icon={Activity}
                foot="Reported by usage summary API"
              />
              <MetricCard
                label="AVERAGE FLOW"
                value={formatNumber(averageFlow, 2)}
                unit="L/min"
                icon={Gauge}
                foot="Reported by usage summary API"
              />
              <MetricCard
                label="ACTIVE ALERTS"
                value={activeAlerts.length}
                icon={AlertTriangle}
                foot={`${alerts.length} total alerts in history`}
              />
            </section>

            <section className="content-grid">
              <article className="panel chart-panel">
                <div className="panel-heading">
                  <div>
                    <span className="section-index">01 / FLOW TELEMETRY</span>
                    <h2>Flow history</h2>
                    <p>Recent readings from the demo environment</p>
                  </div>
                  <span className="live-label">
                    <span className="status-dot" />
                    AUTO-REFRESH · 10 SEC
                  </span>
                </div>

                <div className="chart-legend">
                  <span>
                    <i className="legend-dot" /> Flow rate (L/min)
                  </span>
                </div>

                <div className="chart-area">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={chartData}
                        margin={{ top: 10, right: 8, left: -18, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="consumptionGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#168BCE"
                              stopOpacity={0.28}
                            />
                            <stop
                              offset="100%"
                              stopColor="#168BCE"
                              stopOpacity={0.01}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 5"
                          stroke="var(--chart-grid)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: "var(--muted)", fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          minTickGap={30}
                        />
                        <YAxis
                          tick={{ fill: "var(--muted)", fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "var(--panel)",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            color: "var(--text)",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="flow"
                          name="Flow (L/min)"
                          stroke="#168BCE"
                          strokeWidth={2}
                          fill="url(#consumptionGradient)"
                          isAnimationActive={false}
                        />
                        <Area
                          type="monotone"
                          dataKey="volume"
                          name="Volume (L)"
                          stroke="#4D9BE6"
                          strokeWidth={1.5}
                          fill="transparent"
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="empty-chart">
                      <Waves size={30} />
                      <strong>No readings available</strong>
                      <span>Generate demo data to see the chart.</span>
                    </div>
                  )}
                </div>

                <div className="page-action-row">
                  <button
                    className="primary-button"
                    onClick={() => handleSimulateReadings(false)}
                    disabled={Boolean(busyAction)}
                  >
                    <Plus size={17} /> Generate demo data
                  </button>
                </div>
              </article>

              <article className="panel side-panel">
                <div className="panel-heading">
                  <div>
                    <span className="section-index">02 / MONITORING</span>
                    <h2>Test scenarios</h2>
                    <p>Generate readings for demonstration</p>
                  </div>
                </div>

                <button
                  className="primary-button full-button"
                  onClick={() => handleSimulateReadings(false)}
                  disabled={Boolean(busyAction)}
                >
                  <Database size={17} /> Generate demo data
                </button>

                <button
                  className="secondary-button full-button"
                  onClick={() => handleSimulateReadings(true)}
                  disabled={Boolean(busyAction)}
                >
                  <AlertTriangle size={17} /> Simulate high flow
                </button>

                <p className="disclaimer">
                  Simulated readings are test data, not measurements from
                  physical water sensors.
                </p>

                <div className="device-summary">
                  <div>
                    <span className="summary-label">REGISTERED DEVICES</span>
                    <strong>{devices.length.toString().padStart(2, "0")}</strong>
                  </div>
                  <div>
                    <span className="summary-label">STORED READINGS</span>
                    <strong>{readings.length.toLocaleString()}</strong>
                  </div>
                </div>
              </article>
            </section>

            <section className="panel lower-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-index">03 / FIELD INSTRUMENTS</span>
                  <h2>Connected devices</h2>
                  <p>Devices registered in the backend</p>
                </div>
                <button
                  className="text-button"
                  onClick={() => setActiveTab("Devices")}
                >
                  View all devices →
                </button>
              </div>
              <DeviceList devices={devices.slice(0, 4)} />
            </section>

            <section className="panel lower-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-index">04 / EXCEPTIONS</span>
                  <h2>Recent alerts</h2>
                  <p>Latest events, including resolved alerts</p>
                </div>
                <button
                  className="text-button"
                  onClick={() => setActiveTab("Alerts")}
                >
                  View all alerts →
                </button>
              </div>
              <AlertList
                alerts={alerts.slice(0, 4)}
                onResolve={handleResolveAlert}
                busyAction={busyAction}
              />
            </section>
          </>
        )}

        {!loading && activeTab === "Devices" && (
          <section className="panel page-panel">
            <div className="panel-heading">
              <div>
                <span className="section-index">01 / DEVICE REGISTRY</span>
                <h2>Registered instruments</h2>
                <p>Manage demo devices and future sensor connections.</p>
              </div>
              <button
                className="primary-button"
                onClick={() => setModalOpen(true)}
              >
                <Plus size={17} /> Add device
              </button>
            </div>

            <DeviceList
              devices={devices}
              emptyText="No devices registered yet."
            />

            <div className="page-action-row">
              <button
                className="primary-button"
                onClick={() => handleSimulateReadings(false)}
                disabled={Boolean(busyAction)}
              >
                <Database size={17} /> Generate demo data
              </button>
              <button
                className="secondary-button"
                onClick={() => handleSimulateReadings(true)}
                disabled={Boolean(busyAction)}
              >
                <AlertTriangle size={17} /> Simulate high flow
              </button>
            </div>
          </section>
        )}

        {!loading && activeTab === "Consumption" && (
          <>
            <section className="metric-grid">
              <MetricCard
                label="TODAY'S CONSUMPTION"
                value={formatNumber(dailyUsage)}
                unit="L"
                icon={Droplets}
                foot="Daily usage summary"
              />
              <MetricCard
                label="MONTHLY CONSUMPTION"
                value={formatNumber(monthlyUsage)}
                unit="L"
                icon={Activity}
                foot="Monthly usage summary"
              />
              <MetricCard
                label="AVERAGE FLOW"
                value={formatNumber(averageFlow, 2)}
                unit="L/min"
                icon={Gauge}
                foot="Average reported flow"
              />
              <MetricCard
                label="PEAK FLOW"
                value={formatNumber(peakFlow, 2)}
                unit="L/min"
                icon={Waves}
                foot="Highest reported flow"
              />
            </section>

            <section className="panel page-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-index">01 / USAGE ANALYSIS</span>
                  <h2>Consumption history</h2>
                  <p>Latest 40 readings returned by the backend</p>
                </div>
                <button
                  className="primary-button"
                  onClick={() => handleSimulateReadings(false)}
                  disabled={Boolean(busyAction)}
                >
                  <Plus size={17} /> Generate demo data
                </button>
              </div>

              <div className="chart-area">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid
                        strokeDasharray="3 5"
                        stroke="var(--chart-grid)"
                      />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="flow"
                        name="Flow (L/min)"
                        stroke="#168BCE"
                        fill="#168BCE"
                        fillOpacity={0.15}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-chart">
                    <Waves size={30} />
                    <strong>No readings available</strong>
                    <span>Generate demo data to see the chart.</span>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {!loading && activeTab === "Alerts" && (
          <section className="panel page-panel">
            <div className="panel-heading">
              <div>
                <span className="section-index">01 / EVENT MONITORING</span>
                <h2>All monitoring alerts</h2>
                <p>
                  {activeAlerts.length} active · {alerts.length - activeAlerts.length} resolved · {alerts.length} total
                </p>
              </div>

              <div className="panel-heading-actions">
                <button
                  className="secondary-button"
                  onClick={handleResolveAllAlerts}
                  disabled={
                    Boolean(busyAction) || activeAlerts.length === 0
                  }
                >
                  <Check size={17} />
                  {busyAction === "resolve-all" ? "Resolving..." : "Resolve All"}
                </button>
                <button
                  className="secondary-button"
                  onClick={() => handleSimulateReadings(true)}
                  disabled={Boolean(busyAction)}
                >
                  <AlertTriangle size={17} /> Simulate high flow
                </button>
              </div>
            </div>

            <AlertList
              alerts={alerts}
              emptyText="No alerts returned by the backend."
              onResolve={handleResolveAlert}
              busyAction={busyAction}
            />

            <p className="disclaimer">
              Alerts are generated from configured monitoring rules. A
              high-flow alert is not proof of a physical leak.
            </p>
          </section>
        )}

        <footer className="app-footer">
          <span>
            WATERWATCH <span className="footer-divider">/</span> LOCAL
            DEVELOPMENT
          </span>
          <span>
            <span className="status-dot" /> DEMO DATA IS NOT LIVE SENSOR DATA
          </span>
        </footer>
      </main>

      {modalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setModalOpen(false)}
        >
          <section
            className="device-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="device-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <span className="section-index">DEVICE REGISTRY</span>
                <h2 id="device-modal-title">Register a device</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setModalOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddDevice}>
              <label htmlFor="device-name">Device name</label>
              <input
                id="device-name"
                value={deviceName}
                onChange={(event) => setDeviceName(event.target.value)}
                placeholder="e.g. Kitchen flow sensor"
                required
              />

              <label htmlFor="device-location">Location</label>
              <input
                id="device-location"
                value={deviceLocation}
                onChange={(event) => setDeviceLocation(event.target.value)}
                placeholder="e.g. Kitchen"
                required
              />

              <p className="form-note">
                This registers a demo device. It does not connect physical
                hardware.
              </p>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={busyAction === "device"}
                >
                  {busyAction === "device"
                    ? "Registering..."
                    : "Register device"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, unit, icon: Icon, foot }) {
  return (
    <article className="metric-card">
      <div className="metric-top">
        <span className="metric-label">{label}</span>
        <Icon size={19} />
      </div>
      <div className="metric-value">
        {value} {unit && <span className="metric-unit">{unit}</span>}
      </div>
      <div className="metric-foot">{foot}</div>
    </article>
  );
}

function DeviceList({ devices, emptyText = "No devices to display." }) {
  if (!devices.length) {
    return (
      <div className="empty-state">
        <Waves size={25} />
        <strong>{emptyText}</strong>
      </div>
    );
  }

  return (
    <div className="device-list">
      {devices.map((device, index) => (
        <div className="device-row" key={device.id ?? index}>
          <div className="device-icon">
            <Droplets size={19} />
          </div>
          <div className="device-main">
            <strong>{getDeviceName(device)}</strong>
            <span>{device.location || "Location not specified"}</span>
          </div>
          <span
            className={`device-status ${
              String(device.status || "ONLINE").toUpperCase() === "OFFLINE"
                ? "offline"
                : "online"
            }`}
          >
            {device.status || "ONLINE"}
          </span>
        </div>
      ))}
    </div>
  );
}

function AlertList({
  alerts,
  emptyText = "No alerts to display.",
  onResolve,
  busyAction = "",
}) {
  if (!alerts.length) {
    return (
      <div className="empty-state">
        <Check size={25} />
        <strong>{emptyText}</strong>
        <span>You can simulate high flow to test monitoring scenarios.</span>
      </div>
    );
  }

  return (
    <div className="alert-list">
      {alerts.map((alert, index) => {
        const time =
          alert.recordedAt ||
          alert.timestamp ||
          alert.createdAt ||
          alert.time;
        const date = time ? new Date(time) : null;
        const validDate = date && !Number.isNaN(date.getTime());
        const message =
          alert.message ||
          alert.description ||
          alert.reason ||
          alert.alertType ||
          "Potential high-flow event";
        const resolved = alert.status === "RESOLVED";
        const resolving = busyAction === `resolve-${alert.id}`;

        return (
          <div className="alert-row" key={alert.id ?? `${message}-${index}`}>
            <div className="alert-icon">
              {resolved ? <Check size={18} /> : <AlertTriangle size={18} />}
            </div>

            <div className="alert-main">
              <strong>{message}</strong>
              <span>
                {alert.deviceName ||
                  alert.device?.deviceName ||
                  (alert.deviceId != null
                    ? `Device ${alert.deviceId}`
                    : "Monitoring system")}
                {alert.flowRate != null &&
                  ` · ${formatNumber(alert.flowRate, 2)} L/min`}
              </span>
              <span>Status: {alert.status || "REQUIRES_INSPECTION"}</span>
              {resolved && alert.resolvedAt && (
                <span>
                  Resolved: {new Date(alert.resolvedAt).toLocaleString()}
                </span>
              )}
            </div>

            <div className="alert-time">
              {validDate ? date.toLocaleString() : "Time unavailable"}
            </div>

            {alert.id != null && !resolved && onResolve && (
              <button
                className="secondary-button"
                onClick={() => onResolve(alert.id)}
                disabled={Boolean(busyAction)}
              >
                {resolving ? "Resolving..." : "Resolve"}
              </button>
            )}

            {resolved && (
              <span className="device-status online">
                <Check size={14} /> Resolved
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default App;
