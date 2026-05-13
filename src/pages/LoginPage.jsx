import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";

import {
  loginApi,
  googleLoginApi,
} from "../services/auth.service";

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  // LOGIN THƯỜNG
  const handleLogin = async () => {
    try {
      const response =
        await loginApi(
          email,
          password
        );

      console.log(
        "LOGIN RESPONSE:",
        response.data
      );

      // LOGIN API
      const userData =
        response.data.data ||
        response.data;

      // SAVE TOKEN
      localStorage.setItem(
        "accessToken",
        userData.accessToken
      );

      // SAVE ROLES
      localStorage.setItem(
        "roles",
        JSON.stringify(
          userData.roles
        )
      );

      alert("Login success!");

      // REDIRECT ROLE
      if (
        userData.roles.includes(
          "Admin"
        )
      ) {
        navigate("/admin");
      } else if (
        userData.roles.includes(
          "Staff"
        )
      ) {
        navigate("/staff");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      console.log(error);

      alert("Login failed");
    }
  };

  // GOOGLE LOGIN
  const handleGoogleSuccess =
    async (
      credentialResponse
    ) => {
      console.log(
        "GOOGLE RESPONSE:",
        credentialResponse
      );

      console.log(
        "CREDENTIAL:",
        credentialResponse.credential
      );

      try {
        const response =
          await googleLoginApi(
            credentialResponse.credential
          );

        console.log(
          "GOOGLE LOGIN RESPONSE:",
          response.data
        );

        // GOOGLE API
        const userData =
          response.data.data;

        // SAVE TOKEN
        localStorage.setItem(
          "accessToken",
          userData.accessToken
        );

        // SAVE ROLES
        localStorage.setItem(
          "roles",
          JSON.stringify(
            userData.roles
          )
        );

        alert(
          "Google login success!"
        );

        // REDIRECT ROLE
        if (
          userData.roles.includes(
            "Admin"
          )
        ) {
          navigate("/admin");
        } else if (
          userData.roles.includes(
            "Staff"
          )
        ) {
          navigate("/staff");
        } else {
          navigate("/dashboard");
        }
      } catch (error) {
        console.log(error);

        alert(
          "Google login failed"
        );
      }
    };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 to-blue-300 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
        {/* TITLE */}
        <h1 className="text-5xl font-bold text-center text-blue-600 mb-2">
          Welcome Back
        </h1>

        <p className="text-center text-gray-500 mb-8">
          Login to continue
        </p>

        {/* EMAIL */}
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) =>
            setEmail(
              e.target.value
            )
          }
          className="w-full border border-gray-300 p-4 rounded-xl mb-4 outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* PASSWORD */}
        <input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) =>
            setPassword(
              e.target.value
            )
          }
          className="w-full border border-gray-300 p-4 rounded-xl mb-6 outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* LOGIN BUTTON */}
        <button
          onClick={handleLogin}
          className="w-full bg-blue-500 hover:bg-blue-600 transition duration-300 text-white p-4 rounded-xl font-semibold text-lg mb-5"
        >
          Login
        </button>

        {/* REGISTER */}
        <p className="text-center text-gray-600 mb-6">
          Don&apos;t have an
          account?{" "}
          <span
            onClick={() =>
              navigate("/register")
            }
            className="text-blue-500 cursor-pointer hover:underline font-semibold"
          >
            Register
          </span>
        </p>

        {/* GOOGLE LOGIN */}
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={
              handleGoogleSuccess
            }
            onError={() => {
              console.log(
                "Google Login Failed"
              );
            }}
          />
        </div>
      </div>
    </div>
  );
}