import axiosInstance from "../api/axios";
import axios from "axios";


export const loginApi = async (
  email,
  password
) => {
  const response =
    await axiosInstance.post(
      "/authentication/login",
      {
        email,
        password,
      }
    );

  return response.data;
};

export const googleLoginApi =
  async (credential) => {
    return axios.post(
      "https://sep490-medicalaiassistant.onrender.com/api/authentication/google",
      {
        credential,
      }
    );
  };