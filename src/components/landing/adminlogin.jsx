import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../config/axios_config.jsx";
import { saveToken, saveValue } from "../../config/reusable_config.jsx";

const AdminLogin = () => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [creation_key, setCreation_Key] = useState("");
    const [code, setCode] = useState("");
    const [mode, setMode] = useState("login"); // "login" | "invite" | "register"
    const [pageMsg, setPageMsg] = useState("");
    const [busy, setBusy] = useState(false);
    const [showPwd, setShowPwd] = useState(false);
    const [showCode, setShowCode] = useState(false);

    const navigate = useNavigate();

    const statusClass =
        pageMsg.toLowerCase().includes("success")
            ? "login-status success"
            : pageMsg.toLowerCase().includes("invalid") ||
                pageMsg.toLowerCase().includes("error")
                ? "login-status error"
                : "login-status";

    const handleLogin = async (e) => {
        e.preventDefault();
        setBusy(true);
        setPageMsg("Logging you in…");
        try {
            const res = await api.post(
                "/admin/login",
                { email, password },
                { requiresAuth: false }
            );
            if (res.data?.token) {
                await saveToken(res.data.token, true);
                await saveValue("user_type", "admin");
                setPageMsg("Success! Redirecting…");
                navigate("/admin/client-view", { replace: true });
            } else {
                setPageMsg("Login failed. Please check your credentials.");
            }
        } catch (err) {
            console.error("Login error:", err);
            setPageMsg("An error occurred during login.");
        } finally {
            setBusy(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setBusy(true);
        setPageMsg("Creating account…");
        try {
            await api.post(
                "/admin/register",
                { name, email, password, code },
                { requiresAuth: false }
            );
            setPageMsg("You’ve registered! Please log in.");
            setMode("login");
        } catch (err) {
            console.error("Registration error:", err);
            setPageMsg("An error occurred during registration.");
        } finally {
            setBusy(false);
        }
    };

    const startInvite = () => {
        setPageMsg("Please contact your administrator for the Creation Key.");
        setMode("invite");
    };

    const getRegistrationCode = async (e) => {
        e.preventDefault();
        setBusy(true);
        setPageMsg("Sending code…");
        try {
            const res = await api.post(
                "/admin/invite-admin",
                { email, creation_key },
                { requiresAuth: false }
            );
            if (res.status === 200) {
                setPageMsg(`Code sent to: ${email}`);
                setMode("register");
            } else {
                throw new Error("Failed to send registration code.");
            }
        } catch (err) {
            const status = err?.response?.status;
            const detail = err?.response?.data?.detail;
            // console.log("Invite error:", status, detail);
            setPageMsg(detail || "There was an error sending your Registration Code.");
        } finally {
            setBusy(false);
        }
    };

    const backToLogin = () => {
        setPageMsg("");
        setMode("login");
    };

    const pasteTo = async (setter) => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) setter(text.trim());
        } catch { }
    };

    return (
        <div className="user-login-page">
            <div className="user-login-card">
                <div className="user-login-header">
                    <div className="user-login-title">
                        {mode === "login" && "Admin Login"}
                        {mode === "invite" && "Send Registration Code"}
                        {mode === "register" && "Register Admin"}
                    </div>
                    <div className="user-login-subtitle">
                        {mode === "login" && "Sign in to manage projects"}
                        {mode === "invite" &&
                            "Enter your email and the Creation Key to receive a registration code"}
                        {mode === "register" &&
                            "Create your account using the registration code we emailed"}
                    </div>
                </div>

                {/* LOGIN */}
                {mode === "login" && (
                    <form onSubmit={handleLogin} className="user-login-form">
                        <label className="user-login-label" htmlFor="email">Email</label>
                        <div className="input-row">
                            <input
                                id="email"
                                className="user-login-input"
                                type="email"
                                placeholder="you@firm.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={busy}
                                required
                            />
                            <div className="input-action">
                                <button type="button" onClick={() => pasteTo(setEmail)}>Paste</button>
                            </div>
                        </div>

                        <label className="user-login-label" htmlFor="password">Password</label>
                        <div className="input-row">
                            <input
                                id="password"
                                className="user-login-input"
                                type={showPwd ? "text" : "password"}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={busy}
                                required
                            />
                            <div className="input-action">
                                <button type="button" onClick={() => setShowPwd((s) => !s)}>
                                    {showPwd ? "Hide" : "Show"}
                                </button>
                            </div>
                        </div>

                        <button className="user-login-submit" type="submit" disabled={busy}>
                            {busy ? "Signing in..." : "Sign in"}
                        </button>
                    </form>
                )}

                {/* INVITE (send registration code) */}
                {mode === "invite" && (
                    <form onSubmit={getRegistrationCode} className="user-login-form">
                        <label className="user-login-label" htmlFor="invite-email">Email</label>
                        <div className="input-row">
                            <input
                                id="invite-email"
                                className="user-login-input"
                                type="email"
                                placeholder="you@firm.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={busy}
                                required
                            />
                            <div className="input-action">
                                <button type="button" onClick={() => pasteTo(setEmail)}>Paste</button>
                            </div>
                        </div>

                        <label className="user-login-label" htmlFor="creation-key">Account Creation Key</label>
                        <div className="input-row">
                            <input
                                id="creation-key"
                                className="user-login-input"
                                type="text"
                                placeholder="Your creation key"
                                value={creation_key}
                                onChange={(e) => setCreation_Key(e.target.value)}
                                disabled={busy}
                                required
                            />
                            <div className="input-action">
                                <button type="button" onClick={() => pasteTo(setCreation_Key)}>Paste</button>
                            </div>
                        </div>

                        <button className="user-login-submit" type="submit" disabled={busy}>
                            {busy ? "Sending…" : "Send Code"}
                        </button>
                    </form>
                )}

                {/* REGISTER */}
                {mode === "register" && (
                    <form onSubmit={handleRegister} className="user-login-form">
                        <label className="user-login-label" htmlFor="name">Name</label>
                        <div className="input-row">
                            <input
                                id="name"
                                className="user-login-input"
                                type="text"
                                placeholder="Jane Admin"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={busy}
                                required
                            />
                        </div>

                        <label className="user-login-label" htmlFor="reg-email">Email</label>
                        <div className="input-row">
                            <input
                                id="reg-email"
                                className="user-login-input"
                                type="email"
                                placeholder="you@firm.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={busy}
                                required
                            />
                            <div className="input-action">
                                <button type="button" onClick={() => pasteTo(setEmail)}>Paste</button>
                            </div>
                        </div>

                        <label className="user-login-label" htmlFor="reg-password">Password</label>
                        <div className="input-row">
                            <input
                                id="reg-password"
                                className="user-login-input"
                                type={showPwd ? "text" : "password"}
                                placeholder="Create a password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={busy}
                                required
                            />
                            <div className="input-action">
                                <button type="button" onClick={() => setShowPwd((s) => !s)}>
                                    {showPwd ? "Hide" : "Show"}
                                </button>
                            </div>
                        </div>

                        <label className="user-login-label" htmlFor="reg-code">Registration Code</label>
                        <div className="input-row">
                            <input
                                id="reg-code"
                                className="user-login-input"
                                type={showCode ? "text" : "password"}
                                placeholder="Paste your code"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                disabled={busy}
                                required
                            />
                            <div className="input-action">
                                <button type="button" onClick={() => setShowCode((s) => !s)}>
                                    {showCode ? "Hide" : "Show"}
                                </button>
                                <button type="button" onClick={() => pasteTo(setCode)}>Paste</button>
                            </div>
                        </div>

                        <button className="user-login-submit" type="submit" disabled={busy}>
                            {busy ? "Registering…" : "Register"}
                        </button>
                    </form>
                )}

                {pageMsg && <div className={statusClass}>{pageMsg}</div>}

                {/* Footer link (reuse same style) */}
                {mode === "login" ? (
                    <div className="request-token-hint" onClick={startInvite}>
                        Register a New Account
                    </div>
                ) : (
                    <div className="request-token-hint" onClick={backToLogin}>
                        Back to Login
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminLogin;