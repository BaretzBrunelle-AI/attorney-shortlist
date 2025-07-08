import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Navigate } from "react-router-dom";
import './App.css';

// Routes
import Dashboard from "./components/dashboard/dashboard";

function App() {
  return (
	<Router>
		<div className="App">
			<Routes>
				{/* Default Route */}
				{/* <Route path="/" element={<Navigate to="/login" />} /> */}

				{/* Other Routes */}
				{/* <Route path="/login" element={<Login />} /> */}
				<Route path="/dashboard" element={<Dashboard />} />
			</Routes>
		</div>
	</Router>
  );
};

export default App;
