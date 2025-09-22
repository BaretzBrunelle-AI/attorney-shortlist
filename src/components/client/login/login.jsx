import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { saveToken, verifyToken, deleteToken, saveValue } from "../../../config/reusable_config.jsx";

import "./login.css";

const UserLogin = () => {
	const [token, setToken] = useState("");
	const [msg, setMsg] = useState("");
	const [busy, setBusy] = useState(false);
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
				navigate("/client/dashboard");
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

	const handleRequestToken = () => {
		//TODO: Implement request token functionality
	}

	return (
		<div className="user-login-container">
			<form onSubmit={handleSubmit} className="user-login-form">
				<label htmlFor="access-token-input">Enter Access Token</label>
				<input
					id="access-token-input"
					type="password"
					placeholder="Enter Access Token"
					value={token}
					onChange={(e) => setToken(e.target.value)}
					autoComplete="off"
					required
				/>
				<button type="submit" disabled={busy}>
					{busy ? "Signing in..." : "Sign in"}
				</button>
			</form>

			{msg && <div className="login-status">{msg}</div>}

			<div className="request-token-hint">Request Access Token</div>
		</div>
	);
};

export default UserLogin;
