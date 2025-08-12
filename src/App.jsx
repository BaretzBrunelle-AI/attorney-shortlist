import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import './App.css';

// Routes
import Layout from "./components/layout/layout";
import Dashboard from "./components/dashboard/dashboard";
import AdminUpload from "./components/upload/admin_upload";
import AdminLogin from "./components/admin/admin_login";

function App() {
	return (
		<Router>
			<div className="App">
				<Routes>
					{/* Routes WITHOUT Layout (e.g. login screen) */}
					<Route path="/admin/login" element={<AdminLogin />} />

					{/* Routes WITH Layout */}
					<Route element={<Layout />}>
						<Route path="/dashboard" element={<Dashboard />} />
						<Route path="/admin/upload" element={<AdminUpload />} />
					</Route>

					{/* Default route fallback */}
					<Route path="*" element={<Dashboard />} />
				</Routes>
			</div>
		</Router>
	);
}

export default App;