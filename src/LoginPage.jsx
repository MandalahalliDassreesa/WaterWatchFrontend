import { Droplets, ShieldCheck, Waves, Activity, ArrowUpRight } from "lucide-react";
import "./LoginPage.css";

export default function LoginPage({ onGoogleLogin }) {
  return (
    <main className="login-screen">
      <div className="login-glow login-glow-one" />
      <div className="login-glow login-glow-two" />
      <header className="login-header">
        <a className="login-brand" href="#home" aria-label="WaterWatch home">
          <span className="login-brand-mark"><Droplets size={24} /></span>
          <span><strong>WATERWATCH</strong><small>WATER INTELLIGENCE SYSTEM</small></span>
        </a>
        <span className="login-secure-label"><ShieldCheck size={15} /> SMART WATER MONITORING</span>
      </header>

      <section className="login-layout">
        <div className="login-story">
          <div className="login-eyebrow"><span /> YOUR WATER. UNDER CONTROL.</div>
          <h1>Every drop<br />has a <em>story.</em></h1>
          <p className="login-description">Monitor usage, spot unusual flow, and stay ahead of leaks — all from one clear, intelligent dashboard.</p>
          <div className="login-feature-list">
            <div className="login-feature"><span><Activity size={19} /></span><div><strong>Live usage insights</strong><small>Understand consumption at a glance</small></div></div>
            <div className="login-feature"><span><Waves size={19} /></span><div><strong>Leak alerts that matter</strong><small>Catch unusual flow before it adds up</small></div></div>
            <div className="login-feature"><span><ShieldCheck size={19} /></span><div><strong>Your monitoring workspace</strong><small>One place for devices, readings, and alerts</small></div></div>
          </div>
          <div className="login-waterline" aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div>
        </div>

        <div className="login-card-wrap">
          <div className="login-card">
            <div className="login-card-icon"><Droplets size={27} /></div>
            <div className="login-card-kicker">WELCOME TO WATERWATCH</div>
            <h2>Sign in to continue</h2>
            <p className="login-card-copy">Use your Google account to open your water monitoring workspace.</p>
            <button className="login-google-button" onClick={onGoogleLogin} type="button">
              <span className="login-google-g" aria-hidden="true">G</span>
              <span>Continue with Google</span>
              <ArrowUpRight size={17} className="login-google-arrow" />
            </button>
            <div className="login-divider"><span /> <small>SECURE SIGN-IN</small> <span /></div>
            <div className="login-trust-note"><ShieldCheck size={16} /><span>Authentication is handled by Google. WaterWatch never asks for your Google password.</span></div>
            <p className="login-help">By continuing, you’ll be redirected to Google to sign in.</p>
          </div>
          <div className="login-card-foot"><span className="login-live-dot" /> WATERWATCH SYSTEM <span>•</span> BLUE SERIES</div>
        </div>
      </section>
      <footer className="login-footer"><span>WATERWATCH © 2026</span><span>USE WATER WISELY.</span></footer>
    </main>
  );
}
