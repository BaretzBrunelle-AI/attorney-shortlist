import React, { useEffect, useState } from "react";
import { Outlet, useLocation, Navigate } from "react-router-dom";

import NavBar from "../navbar/navbar.jsx";
import { getValue, verifyToken } from "../../../config/reusable_config.jsx";

import "./layout.css";

const ClientLayout = () => {
	const [isAdminVerified, setIsAdminVerified] = useState(false);
	const [checkedAdmin, setCheckedAdmin] = useState(false);
	const location = useLocation();

	useEffect(() => {
		const checkAdmin = async () => {
			const token = getValue("admin_token");
			const verified = await verifyToken(token);
			setIsAdminVerified(verified);
			setCheckedAdmin(true);
		};
		checkAdmin();
	}, []);

	if (!checkedAdmin) return null;

	// With HashRouter, useLocation().pathname is "/admin/..."
	const isAdminRoute = location.pathname.startsWith("/admin");
	const isAdminLogin = location.pathname === "/admin/login";

	if (isAdminRoute && !isAdminLogin && !isAdminVerified) {
		return <Navigate to="/admin/login" replace />;
	}

	return (
		<div className="client-dashboard-layout">
			<div className="client-dashboard-body">
				<NavBar />
				<div className="client-layout-content">
					<Outlet />
				</div>
			</div>
		</div>
	);
};

export default ClientLayout;