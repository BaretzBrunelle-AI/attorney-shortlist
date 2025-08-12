import React from "react";
import { Outlet } from "react-router-dom";
import NavBar from "../navbar/navbar.jsx";
import Footer from "../footer/footer.jsx";

import "./layout.css";

const Layout = () => {
	return (
		<div className="layout-main-container">
			<NavBar />
			<main className="layout-content">
				<Outlet />
			</main>
            <Footer />
		</div>
	);
};

export default Layout;