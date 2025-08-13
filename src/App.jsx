import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import './App.css';

// Routes
import Layout from "./components/layout/layout";
import Dashboard from "./components/dashboard/dashboard";
import Landing from "./components/landing/landing";
import AdminDashboard from "./components/admin_dashboard/admin_dashboard";

function App() {
	return (
		<Router>
			<div className="App">
				<Routes>
					{/* Routes WITH Layout */}
					<Route element={<Layout />}>
						<Route path="/dashboard" element={<Dashboard />} />
						<Route path="/admin/dashboard" element={<AdminDashboard />} />
					</Route>

					{/* Default route fallback */}
					<Route path="*" element={<Landing />} />
				</Routes>
			</div>
		</Router>
	);
}

export default App;