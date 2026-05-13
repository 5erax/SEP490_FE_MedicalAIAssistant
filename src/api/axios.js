import axios from "axios";

const axiosInstance = axios.create({
  baseURL:
  "https://sep490-medicalaiassistant.onrender.com/api",
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem(
        "accessToken"
      );

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  }
);

export default axiosInstance;