import React, { Suspense, lazy } from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";

// lazy layouts
const ClientLayout = lazy(() => import("./components/client/layout/layout.jsx"));
const AdminLayout = lazy(() => import("./components/admin/layout/layout.jsx"));

// lazy pages
const Dashboard = lazy(() => import("./components/client/dashboard/dashboard.jsx"));
const Landing = lazy(() => import("./components/landing/landing.jsx"));
const CreateShortlist = lazy(() => import("./components/admin/createshortlist/createshortlist.jsx"));
const UploadImages = lazy(() => import("./components/admin/uploadimages/uploadimages.jsx"));
const EditShortlists = lazy(() => import("./components/admin/editshortlists/editshortlists.jsx"));
const EditAttorneys = lazy(() => import("./components/admin/editattorneys/editattorneys.jsx"));
const OutreachNotes = lazy(() => import("./components/admin/outreachnotes/outreachnotes.jsx"));
const InviteUsers = lazy(() => import("./components/admin/inviteusers/inviteusers.jsx"));

function App() {
	return (
		<Router>
			<div className="App">
				<Suspense fallback={<div className="route-fallback">loading…</div>}>
					<Routes>
						{/* client layout routes */}
						<Route path="/client" element={<ClientLayout />}>
							<Route path="dashboard" element={<Dashboard />} />
						</Route>

						{/* admin layout routes */}
						<Route path="/admin" element={<AdminLayout />}>
							<Route index element={<Dashboard />} />
							<Route path="client-view" element={<Dashboard />} />
							<Route path="create-shortlist" element={<CreateShortlist />} />
							<Route path="upload-images" element={<UploadImages />} />
							<Route path="edit-shortlists" element={<EditShortlists />} />
							<Route path="edit-attorneys" element={<EditAttorneys />} />
							<Route path="outreach-notes" element={<OutreachNotes />} />
							<Route path="invite-users" element={<InviteUsers />} />
						</Route>

						{/* default fallback */}
						<Route path="/login" element={<Landing />}/>
						<Route path="*" element={<Landing />} />
					</Routes>
				</Suspense>
			</div>
		</Router>
	);
}

export default App;