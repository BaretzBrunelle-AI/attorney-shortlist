import axios from "axios";
import { getToken } from "./reusable_config.jsx"

const baseURL = import.meta.env.VITE_API_BASE || "";

const api = axios.create({
	baseURL: baseURL,
});

api.interceptors.request.use(async (config) => {
	// Always send cookies
	config.withCredentials = true;
	// Only attach token if not explicitly disabled
	if (config.requiresAuth === false) return config;

	const token = await getToken(config.admin === true);
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

export default api;