import axios from "axios";
import { getToken } from "./reusable_config.jsx"

const api = axios.create({
	baseURL: import.meta.env.VITE_BACKEND_URL
});

api.interceptors.request.use(async (config) => {
	// Only attach token if not explicitly disabled
	if (config.requiresAuth === false) return config;


	const token = await getToken();
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

export default api;