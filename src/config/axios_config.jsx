import axios from "axios";
import { getSessionToken, getToken } from "./reusable_config.jsx";

const baseURL = import.meta.env.VITE_API_BASE || "";

const api = axios.create({
    baseURL,
});

api.interceptors.request.use(async (config) => {
    // always send cookies
    config.withCredentials = true;

    // allow opting out of auth
    if (config.requiresAuth === false) {
        return config;
    }

    // decide which token to attach
    const isAdmin = config.admin === true;

    let bearer = null;
    if (isAdmin) {
        // admin jwt stored under "admin_token"
        bearer = await getToken(true);
    } else {
        // client session jwt stored under "user_session_token"
        bearer = await getSessionToken();
    }

    if (bearer) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${bearer}`;
    }

    return config;
});

export default api;