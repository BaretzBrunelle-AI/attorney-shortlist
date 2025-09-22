import React, { useState } from "react";

// adjust these paths to wherever your components live
import UserLogin from "../client/login/login.jsx";
import AdminLogin from "../admin/login/login.jsx";

import "./landing.css";

const Landing = () => {
	const [mode, setMode] = useState("user");

	const toggle = () => setMode(m => (m === "user" ? "admin" : "user"));

	return (
		<main className="landing-container">
			{mode === "user" ? <UserLogin /> : <AdminLogin />}

			{/* clickable text under the component */}
			<button
				type="button"
				className="landing-toggle-link"
				onClick={toggle}
				aria-label={mode === "user" ? "Switch to admin login" : "Switch to user login"}
			>
				{mode === "user" ? "Login as admin" : "Login as user"}
			</button>
		</main>
	);
};

export default Landing;
