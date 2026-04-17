import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

export async function fetchMe() {
  const { data } = await api.get("/auth/me");
  return data;
}

export async function logout() {
  await api.post("/auth/logout");
}

export async function updateProfile(patch) {
  const { data } = await api.patch("/user/profile", patch);
  return data;
}

export const tasksApi = {
  list: (params = {}) => api.get("/tasks", { params }).then((r) => r.data),
  create: (payload) => api.post("/tasks", payload).then((r) => r.data),
  update: (id, payload) => api.patch(`/tasks/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/tasks/${id}`).then((r) => r.data),
};

export const subjectsApi = {
  list: () => api.get("/subjects").then((r) => r.data),
  create: (p) => api.post("/subjects", p).then((r) => r.data),
  remove: (id) => api.delete(`/subjects/${id}`).then((r) => r.data),
};

export const examsApi = {
  list: () => api.get("/exams").then((r) => r.data),
  create: (p) => api.post("/exams", p).then((r) => r.data),
  remove: (id) => api.delete(`/exams/${id}`).then((r) => r.data),
};

export const clientsApi = {
  list: () => api.get("/clients").then((r) => r.data),
  create: (p) => api.post("/clients", p).then((r) => r.data),
  remove: (id) => api.delete(`/clients/${id}`).then((r) => r.data),
};

export const timeLogsApi = {
  list: (params = {}) => api.get("/time-logs", { params }).then((r) => r.data),
  create: (p) => api.post("/time-logs", p).then((r) => r.data),
  remove: (id) => api.delete(`/time-logs/${id}`).then((r) => r.data),
};

export const paymentsApi = {
  list: () => api.get("/payments").then((r) => r.data),
  create: (p) => api.post("/payments", p).then((r) => r.data),
  update: (id, p) => api.patch(`/payments/${id}`, p).then((r) => r.data),
  remove: (id) => api.delete(`/payments/${id}`).then((r) => r.data),
};

export const ideasApi = {
  list: () => api.get("/ideas").then((r) => r.data),
  create: (p) => api.post("/ideas", p).then((r) => r.data),
  update: (id, p) => api.patch(`/ideas/${id}`, p).then((r) => r.data),
  remove: (id) => api.delete(`/ideas/${id}`).then((r) => r.data),
};

export const platformsApi = {
  list: () => api.get("/platforms").then((r) => r.data),
  create: (p) => api.post("/platforms", p).then((r) => r.data),
  remove: (id) => api.delete(`/platforms/${id}`).then((r) => r.data),
};

export const statsApi = {
  get: () => api.get("/dashboard/stats").then((r) => r.data),
};
