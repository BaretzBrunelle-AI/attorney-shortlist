import React, { useEffect, useState, useCallback } from "react";
import { Outlet, useLocation } from "react-router-dom";
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

	// auth
	useEffect(() => {
		const checkAdmin = async () => {
			const token = getValue("jwtToken");
			const verified = await verifyToken(token, true);
			setIsAdminVerified(verified);
			setCheckedAdmin(true);
		};
		checkAdmin();
	}, []);

	// fetch: projects
	const fetchProjects = useCallback(async () => {
		try {
			const res = await api.get("/admin/get-projects", { admin: true });
			setAvailableProjects(res.data?.projects || []);
		} catch (err) {
			console.error("Error fetching projects:", err);
		}
	}, []);

	// fetch: attorneys for a project
	const fetchAttorneysForProject = useCallback(
		async (projectName) => {
			if (!projectName) {
				setAttorneys([]);
				return;
			}
			try {
				const res = await api.get("/dashboard/get-attorneys-admin", {
					params: { project_name: projectName },
					admin: true,
				});
				const list = Array.isArray(res.data) ? res.data : (res.data?.attorneys ?? []);
				setAttorneys(list);
			} catch (err) {
				console.error("Failed to fetch attorneys:", err?.response?.data || err.message);
			}
		},
		[]
	);

	// one-button refresh available to children
	const refresh = useCallback(async () => {
		await fetchProjects();
		if (selectedProject) {
			await fetchAttorneysForProject(selectedProject);
		}
	}, [fetchProjects, fetchAttorneysForProject, selectedProject]);

	// load projects once
	useEffect(() => { fetchProjects(); }, [fetchProjects]);

	// keep attorneys in sync with selection
	useEffect(() => {
		if (selectedProject) fetchAttorneysForProject(selectedProject);
		else setAttorneys([]);
	}, [selectedProject, fetchAttorneysForProject]);

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
					availableProjects={availableProjects}
				/>
				<div className="admin-dashboard-content">
					<Outlet context={{
						selectedProject,
						setSelectedProject,
						attorneys,
						availableProjects,
						// exposed helpers
						fetchProjects,
						fetchAttorneysForProject,
						refresh,
					}} />
				</div>
			</div>
		</div>
	);
};

export default AdminLayout;