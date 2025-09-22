import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useOutletContext } from "react-router-dom";

import Navbar from "../../client/navbar/navbar.jsx";
import Sidebar from "../sidebar/sidebar.jsx";

import { getValue, verifyToken } from "../../../config/reusable_config.jsx";

import "./layout.css";

const AdminLayout = () => {
	const [isAdminVerified, setIsAdminVerified] = useState(false);
	const [checkedAdmin, setCheckedAdmin] = useState(false);
	const [attorneys, setAttorneys] = useState([]);
	const [selectedProject, setSelectedProject] = useState(null);
	const [availableProjects, setAvailableProjects] = useState([]);

	const location = useLocation();

	useEffect(() => {
		const checkAdmin = async () => {
			const token = getValue("jwtToken");
			const verified = await verifyToken(token, true);
			setIsAdminVerified(verified);
			setCheckedAdmin(true);
		};
		checkAdmin();
	}, []);

	if (!checkedAdmin) return null;
	if (!isAdminVerified && location.pathname.startsWith("/admin")) {
		window.location.href = "/admin/login";
		return null;
	}

	return (
		<div className="admin-dashboard-layout">
			<Navbar />
			<div className="admin-dashboard-body">
				<Sidebar
					selectedProject={selectedProject}
					setSelectedProject={setSelectedProject}
					onAttorneysLoaded={setAttorneys}
					availableProjects={availableProjects}
					setAvailableProjects={setAvailableProjects}
				/>
				<div className="admin-dashboard-content">
					<Outlet context={{
						selectedProject,
						setSelectedProject,
						attorneys,
						availableProjects,
						setAvailableProjects,
					}} />
				</div>
			</div>
		</div>
	);
};

export default AdminLayout;