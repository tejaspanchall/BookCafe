import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Set base URL for API requests
window.axios.defaults.baseURL = 'http://localhost:8000';

// Enable sending cookies with cross-origin requests
window.axios.defaults.withCredentials = true;
