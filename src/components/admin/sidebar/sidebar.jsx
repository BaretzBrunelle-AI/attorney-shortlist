import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DownloadShortlist from "../downloadshortlist/downloadshortlist.jsx";
import dashboard from "../../../assets/icons/dashboard.png";
import profileuser from "../../../assets/icons/profile-user.png";
import create from "../../../assets/icons/anvil.png";
import shortlistEdit from "../../../assets/icons/edit.png";
import attorneyEdit from "../../../assets/icons/user-edit.png";
import postit from "../../../assets/icons/post-it.png";
import mail from "../../../assets/icons/mail.png";

import styles from "./sidebar.module.css";
import ConfigOptions from "../../config/configOptions.jsx";

const adminNavLinks = [
	{ label: "Client View", path: "/admin/client-view", icon: dashboard, aria: "Client View" },
	{ label: "Create Shortlist", path: "/admin/create-shortlist", icon: create, aria: "Create Shortlist" },
	{ label: "Upload Images", path: "/admin/upload-images", icon: profileuser, aria: "Upload Images" },
	{ label: "Edit Shortlists", path: "/admin/edit-shortlists", icon: shortlistEdit, aria: "Edit Shortlists" },
	{ label: "Edit Attorneys", path: "/admin/edit-attorneys", icon: attorneyEdit, aria: "Edit Attorneys" },
	{ label: "Outreach Notes", path: "/admin/outreach-notes", icon: postit, aria: "Outreach Notes" },
	{ label: "Invite Users", path: "/admin/invite-users", icon: mail, aria: "Invite Users" },
];

const Sidebar = ({ selectedProject, setSelectedProject, availableProjects = [] }) => {
	const navigate = useNavigate();
	const location = useLocation();

	const [isDownloadOpen, setIsDownloadOpen] = useState(false);
	const [isConfigOpen, setIsConfigOpen] = useState(false);

	const selectedValue = selectedProject || "";

	const handleLogout = () => {
		try {
			localStorage.clear();
		} catch {
			// ignore
		}
		navigate("/landing", { replace: true });
	};

	const isLinkActive = (path) => {
		return location.pathname === path || location.pathname.startsWith(path + "/");
	};

	return (
		<>
			<aside className={styles.adminSidebar}>
				<div className={styles.top}>
					<div className={styles.section}>
						<h3 className={styles.title}>Current Project</h3>
						<label htmlFor="project-select" className={styles.label}>
							Choose a Project to View
						</label>

						<select
							id="project-select"
							className={styles.select}
							value={selectedValue}
							onChange={(e) => setSelectedProject(e.target.value)}
						>
							<option value="" disabled>
								Select Project
							</option>
							{availableProjects.length > 0 ? (
								availableProjects.map((project, idx) => (
									<option key={idx} value={project}>
										{project}
									</option>
								))
							) : (
								<option value="" disabled>
									No projects found
								</option>
							)}
						</select>
					</div>

					{/* download button that opens modal */}
					<button
						type="button"
						className={styles.link}
						onClick={() => setIsDownloadOpen(true)}
						disabled={!selectedProject}
						title={
							selectedProject
								? "download shortlist pdf"
								: "select a project to download"
						}
					>
						<span>Download PDF</span>
					</button>

					<hr className={styles.divider} />
					<div className={styles.sectionTitle}>Admin Navigation</div>

					{adminNavLinks.map(({ label, path, icon, aria }, idx) => {
						const active = isLinkActive(path);
						return (
							<button
								key={idx}
								type="button"
								className={`${styles.link} ${active ? styles.linkActive : ""}`}
								onClick={() => !active && navigate(path)}
								aria-label={aria}
								aria-disabled={active ? "true" : "false"}
								disabled={active}
								title={label}
							>
								{icon && (
									<img
										className={styles.icon}
										src={icon}
										alt=""
										aria-hidden="true"
									/>
								)}
								<span>{label}</span>
							</button>
						);
					})}
				</div>

				<div className={styles.bottom}>
					{/* open config modal for send-links tab */}
					<button
						type="button"
						className={styles.link}
						onClick={() => setIsConfigOpen(true)}
						title="email sender settings"
					>
						<span>Settings</span>
					</button>

					<button
						type="button"
						className={`${styles.link} ${styles.logout}`}
						onClick={handleLogout}
						title="Log out"
					>
						Log out
					</button>
				</div>
			</aside>

			{/* download modal */}
			<DownloadShortlist
				selectedProject={selectedProject}
				isOpen={isDownloadOpen}
				onClose={() => setIsDownloadOpen(false)}
			/>

			{/* config modal, with tab indicator */}
			<ConfigOptions
				loc="send-links"
				open={isConfigOpen}
				onClose={() => setIsConfigOpen(false)}
				title="Email Sender Configuration"
			/>
		</>
	);
};

export default Sidebar;