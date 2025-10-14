import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import './App.css';

// Layouts
import ClientLayout from "./components/client/layout/layout.jsx";
import AdminLayout from "./components/admin/layout/layout.jsx";

// Pages
import Dashboard from "./components/client/dashboard/dashboard.jsx";
import Landing from "./components/landing/landing.jsx";
import CreateShortlist from "./components/admin/createshortlist/createshortlist.jsx";
import UploadImages from "./components/admin/uploadimages/uploadimages.jsx";
import EditShortlists from "./components/admin/editshortlists/editshortlists.jsx";
import EditAttorneys from "./components/admin/editattorneys/editattorneys.jsx";

function App() {
	return (
		<Router>
			<div className="App">
				<Routes>
					{/* General layout routes */}
					<Route path="/client" element={<ClientLayout />}>
						<Route path="dashboard" element={<Dashboard />} />
					</Route>

					{/* Admin layout routes */}
					<Route path="/admin" element={<AdminLayout />}>
						<Route index element={<Dashboard />} />
						<Route path="client-view" element={<Dashboard />} />
						<Route path="create-shortlist" element={<CreateShortlist />} />
						<Route path="upload-images" element={<UploadImages />} />
						<Route path="edit-shortlists" element={<EditShortlists />} />
						<Route path="edit-attorneys" element={<EditAttorneys />} />
						{/* <Route path="invite-client" element={<InviteClient />} /> */}
					</Route>

					{/* Default fallback */}
					<Route path="*" element={<Landing />} />
				</Routes>
			</div>
		</Router>
	);
}

export default App;