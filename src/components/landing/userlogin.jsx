import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
	deleteToken,
	saveValue,
	exchangeAccessCodeForSession,
	verifyAccess,
} from "../../config/reusable_config.jsx";

const UserLogin = () => {
	const [code, setCode] = useState("");
	const [msg, setMsg] = useState("");
	const [busy, setBusy] = useState(false);
	const [showCode, setShowCode] = useState(false);

	const navigate = useNavigate();
	const location = useLocation();

	const runLogin = async (rawCode, fromQuery = false) => {
		const trimmed = (rawCode || "").trim();
		if (!trimmed) {
			if (!fromQuery) setMsg("please enter an access code.");
			return;
		}

		setBusy(true);
		setMsg(
			fromQuery
				? "starting your session…"
				: "verifying access code…"
		);

		try {
			// exchange access code + device_id for jwt (starts or replaces session)
			const resp = await exchangeAccessCodeForSession(trimmed);

			// verify jwt-based session
			const ok = await verifyAccess();

			if (ok) {
				// persist raw access code separately (for auditing / future UX)
				await saveValue("access_code", trimmed);

				await saveValue("user_type", "user");
				await saveValue("session_status", "active");

				setMsg("session active. redirecting…");
				navigate("/client/dashboard", { replace: true });
			} else {
				await deleteToken();
				setMsg("invalid or expired session. please try again.");
			}
		} catch (err) {
			console.error(err);
			await deleteToken();
			setMsg("invalid access code or unable to start a session.");
		} finally {
			setBusy(false);
		}
	};

	// auto-login if an access code is present in the url
	useEffect(() => {
		const params = new URLSearchParams(location.search || "");
		const queryCode =
			params.get("access_token") ||
			params.get("code") ||
			params.get("token") ||
			params.get("ACCESSCODE") ||
			"";

		if (queryCode) {
			setCode(queryCode);
			// fire-and-forget; if it fails, user can still log in manually
			void runLogin(queryCode, true);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [location.search]);

	const handleSubmit = async (e) => {
		e.preventDefault();
		await runLogin(code, false);
	};

	const handlePaste = async () => {
		try {
			const text = await navigator.clipboard.readText();
			if (text) setCode(text.trim());
		} catch {
			// clipboard may be blocked — ignore
		}
	};

	const handleRequestCode = () => {
		// wire up "request access code" flow here
	};

	const statusClass =
		msg.toLowerCase().includes("session active") ||
			msg.toLowerCase().includes("success")
			? "login-status success"
			: msg.toLowerCase().includes("invalid") ||
				msg.toLowerCase().includes("unable")
				? "login-status error"
				: "login-status";

	return (
		<div className="user-login-page">
			<div className="user-login-card">
				<div className="user-login-header">
					<div className="user-login-title">Welcome</div>
					<div className="user-login-subtitle">
						Enter your access code to continue
					</div>
				</div>

				<form onSubmit={handleSubmit} className="user-login-form">
					<label
						htmlFor="access-code-input"
						className="user-login-label"
					>
						Access Code
					</label>

					<div className="input-row">
						<input
							id="access-code-input"
							type={showCode ? "text" : "password"}
							className="user-login-input"
							placeholder="Paste or type your code"
							value={code}
							onChange={(e) => setCode(e.target.value)}
							autoComplete="off"
							required
							disabled={busy}
						/>
						<div className="input-action">
							<button
								type="button"
								onClick={() => setShowCode((s) => !s)}
								aria-label={
									showCode
										? "Hide access code"
										: "Show access code"
								}
								disabled={busy}
							>
								{showCode ? "Hide" : "Show"}
							</button>
							<button
								type="button"
								onClick={handlePaste}
								aria-label="Paste from clipboard"
								disabled={busy}
							>
								Paste
							</button>
						</div>
					</div>

					<button
						type="submit"
						className="user-login-submit"
						disabled={busy}
					>
						{busy ? "Signing In…" : "Sign In"}
					</button>
				</form>

				{msg && <div className={statusClass}>{msg}</div>}

				<div
					className="request-token-hint"
					onClick={handleRequestCode}
				>
					Request Access Code
				</div>
			</div>
		</div>
	);
};

export default UserLogin;