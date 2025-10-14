import React, { useEffect, useState, useCallback } from "react";
import { Outlet, useLocation, Navigate } from "react-router-dom";

import Navbar from "../../client/navbar/navbar.jsx";
import Sidebar from "../sidebar/sidebar.jsx";
import api from "../../../config/axios_config.jsx";
import { getValue, verifyToken } from "../../../config/reusable_config.jsx";

import "./layout.css";

const AdminLayout = () => {
	const [isAdminVerified, setIsAdminVerified] = useState(false);
	const [checkedAdmin, setCheckedAdmin] = useState(false);

	const [attorneys, setAttorneys] = useState([]);
	const [selectedProject, setSelectedProject] = useState("");
	const [availableProjects, setAvailableProjects] = useState([]);

	const location = useLocation();

	// ---- Auth gate ----
	useEffect(() => {
		const checkAdmin = async () => {
			const token = getValue("jwtToken");
			const verified = await verifyToken(token, true);
			setIsAdminVerified(verified);
			setCheckedAdmin(true);
		};
		checkAdmin();
	}, []);

	const fetchProjects = useCallback(async () => {
		try {
			const res = await api.get("/admin/shortlist/get-projects", { admin: true });
			const list = Array.isArray(res.data?.projects) ? res.data.projects : [];
			setAvailableProjects(list);
			return list;
		} catch (err) {
			console.error("fetchProjects failed:", err?.response?.data || err.message);
			setAvailableProjects([]);
			return [];
		}
	}, []);

	const fetchAttorneysForProject = useCallback(
		async (projectName) => {
			if (!projectName) {
				setAttorneys([]);
				return [];
			}
			try {
				const res = await api.get("/dashboard/get-attorneys-admin", {
					params: { project_name: projectName },
					admin: true,
				});
				const list = Array.isArray(res.data) ? res.data : (res.data?.attorneys ?? []);
				setAttorneys(list);
				return list;
			} catch (err) {
				console.error("fetchAttorneysForProject failed:", err?.response?.data || err.message);
				setAttorneys([]);
				return [];
			}
		},
		[]
	);

	const refreshSidebarData = useCallback(
		async (projectName = selectedProject) => {
			const projects = await fetchProjects();
			if (!projectName || !projects.includes(projectName)) {
				setSelectedProject("");
				setAttorneys([]);
			} else {
				await fetchAttorneysForProject(projectName);
			}
		},
		[fetchProjects, fetchAttorneysForProject, selectedProject]
	);

	const refresh = useCallback(async () => {
		await fetchProjects();
		if (selectedProject) {
			await fetchAttorneysForProject(selectedProject);
		}
	}, [fetchProjects, fetchAttorneysForProject, selectedProject]);

	// Kick off loads only *after* auth is checked & verified
	useEffect(() => {
		if (checkedAdmin && isAdminVerified) {
			fetchProjects();
		}
	}, [checkedAdmin, isAdminVerified, fetchProjects]);

	useEffect(() => {
		if (checkedAdmin && isAdminVerified) {
			if (selectedProject) fetchAttorneysForProject(selectedProject);
			else setAttorneys([]);
		}
	}, [checkedAdmin, isAdminVerified, selectedProject, fetchAttorneysForProject]);

	if (!checkedAdmin) return null;

	// HashRouter: pathname is "/admin/..."
	const isAdminRoute = location.pathname.startsWith("/admin");
	const isLoginRoute = location.pathname === "/admin/login";

	if (isAdminRoute && !isLoginRoute && !isAdminVerified) {
		return <Navigate to="/admin/login" replace />;
	}

	return (
		<div className="admin-dashboard-layout">
			<Navbar projectName={selectedProject}/>
			<div className="admin-dashboard-body">
				<Sidebar
					selectedProject={selectedProject}
					setSelectedProject={setSelectedProject}
					availableProjects={availableProjects}
					fetchProjects={fetchProjects}
					fetchAttorneysForProject={fetchAttorneysForProject}
					refreshSidebarData={refreshSidebarData}
				/>
				<div className="admin-dashboard-content">
					<Outlet
						context={{
							selectedProject,
							setSelectedProject,
							attorneys,
							availableProjects,
							fetchProjects,
							fetchAttorneysForProject,
							refreshSidebarData,
							refresh,
						}}
					/>
				</div>
			</div>
		</div>
	);
};

export default AdminLayout;