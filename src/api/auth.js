import axios from 'axios';

const API_URL = 'http://localhost:5000/api/auth';

export const registerUser = (userData) => axios.post(`${API_URL}/register`, userData);
export const loginUser = (userData) => axios.post(`${API_URL}/login`, userData);
