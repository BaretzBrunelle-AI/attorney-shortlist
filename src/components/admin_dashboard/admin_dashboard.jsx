import React from "react";
import { useState, useEffect } from "react";
import { replace, useNavigate, useOutletContext } from "react-router-dom";
import { getValue, verifyToken } from "../../config/reusable_config.jsx";
import api from "../../config/axios_config.jsx";

// Styles
import "./admin_dashboard.css";
import AdminUpload from "../admin_upload/admin_upload";

const AdminDashboard = () => {
	const navigate = useNavigate();
	const { attorneys } = useOutletContext?.() || {};

	useEffect(() => {
		(async () => {
		const userType = await getValue("user_type");
		if (userType !== "admin") {
			navigate("/landing", { replace: true });
			return;
		}
		const ok = await verifyToken(true);
		if (!ok) {
			navigate("/landing", { replace: true });
		}
		})();
	}, [navigate]);

	return (
		<div className="admin-dashboard">
			<AdminUpload />
		</div>
	);
};

export default AdminDashboard;
