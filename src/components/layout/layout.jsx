import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import NavBar from "../navbar/navbar.jsx";
import AdminNav from "../admin_sidebar/admin_nav.jsx"; // NEW
import { getValue, verifyToken } from "../../config/reusable_config.jsx"; // NEW

import "./layout.css";

const Layout = () => {
	const [isAdminVerified, setIsAdminVerified] = useState(false);
	const [checkedAdmin, setCheckedAdmin] = useState(false);
	const [attorneys, setAttorneys] = useState([]);

	const [selectedProject, setSelectedProject] = useState("");

	useEffect(() => {
		const checkAdmin = async () => {
			try {
				const userType = await getValue("user_type");
				if (userType === "admin") {
					const ok = await verifyToken(true);
					setIsAdminVerified(!!ok);
				} else {
					setIsAdminVerified(false);
				}
			} catch {
				setIsAdminVerified(false);
			} finally {
				setCheckedAdmin(true);
			}
		};
		checkAdmin();
	}, []);

	return (
		<div className="layout-main-container">
			<NavBar />

			<div className="layout-body">
				<main className="layout-content">
          			<Outlet context={{ selectedProject, setSelectedProject, attorneys }} />
				</main>

				{checkedAdmin && isAdminVerified && (
					<AdminNav
						selectedProject={selectedProject}
						setSelectedProject={setSelectedProject}
						onAttorneysLoaded={setAttorneys}
					/>
				)}
			</div>
		</div>
	);

};

export default Layout;
