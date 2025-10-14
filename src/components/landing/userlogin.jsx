import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveToken, verifyToken, deleteToken, saveValue } from "../../config/reusable_config.jsx";

const UserLogin = () => {
	const [token, setToken] = useState("");
	const [msg, setMsg] = useState("");
	const [busy, setBusy] = useState(false);
	const [showToken, setShowToken] = useState(false);
	const navigate = useNavigate();

	const handleSubmit = async (e) => {
		e.preventDefault();
		const trimmed = token.trim();
		if (!trimmed) {
			setMsg("Please enter an access token.");
			return;
		}
		setBusy(true);
		setMsg("Verifying…");
		try {
			await saveToken(trimmed, false);
			const ok = await verifyToken(false);
			if (ok) {
				await saveValue("user_type", "user");
				setMsg("Success! Redirecting…");
				// With HashRouter, navigate WITHOUT '#'
				navigate("/client/dashboard", { replace: true });
			} else {
				await deleteToken();
				setMsg("Invalid token. Please try again.");
			}
		} catch (err) {
			await deleteToken();
			setMsg("Unable to verify token right now.");
			console.error(err);
		} finally {
			setBusy(false);
		}
	};

	const handlePaste = async () => {
		try {
			const text = await navigator.clipboard.readText();
			if (text) setToken(text.trim());
		} catch {
			// Clipboard may be blocked — no-op
		}
	};

	const handleRequestToken = () => {
		// TODO: Implement request token workflow (modal or mailto link)
	};

	const statusClass =
		msg.toLowerCase().includes("success")
			? "login-status success"
			: msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("unable")
				? "login-status error"
				: "login-status";

	return (
		<div className="user-login-page">
			<div className="user-login-card">
				<div className="user-login-header">
					<div className="user-login-title">Welcome back</div>
					<div className="user-login-subtitle">Enter your access token to continue</div>
				</div>

				<form onSubmit={handleSubmit} className="user-login-form">
					<label htmlFor="access-token-input" className="user-login-label">
						Access Token
					</label>

					<div className="input-row">
						<input
							id="access-token-input"
							type={showToken ? "text" : "password"}
							className="user-login-input"
							placeholder="Paste or type your token"
							value={token}
							onChange={(e) => setToken(e.target.value)}
							autoComplete="off"
							required
							disabled={busy}
						/>
						<div className="input-action">
							<button type="button" onClick={() => setShowToken((s) => !s)} aria-label={showToken ? "Hide token" : "Show token"}>
								{showToken ? "Hide" : "Show"}
							</button>
							<button type="button" onClick={handlePaste} aria-label="Paste from clipboard">
								Paste
							</button>
						</div>
					</div>

					<button type="submit" className="user-login-submit" disabled={busy}>
						{busy ? "Signing in..." : "Sign in"}
					</button>
				</form>

				{msg && <div className={statusClass}>{msg}</div>}

				<div className="request-token-hint" onClick={handleRequestToken}>
					Request Access Token
				</div>
			</div>
		</div>
	);
};

export default UserLogin;