import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/headerlogo.jpeg"; // adjust path
import binshabib1 from '../../assets/binshabib1.png';
import { loginUser, registerUser } from "../../api/api";



export default function Login() {
    const navigate = useNavigate();

    // form state
    const [username, setUsername] = useState(() => localStorage.getItem("username") || "");
    const [password, setPassword] = useState(() => localStorage.getItem("password") || "");
    const [error, setError] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = React.useState(false);
    const [isSignup, setIsSignup] = useState(false);
    const [usernames, setUsernames] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("usernames") || "[]");
        } catch {
            return [];
        }
    });
    const [signupError, setSignupError] = useState({});
    const [checkingAuth, setCheckingAuth] = useState(true);




    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await loginUser({
                email: username,
                password: password,
                withCredentials: true,
            });

            // save token
            //localStorage.setItem("token", res.data.token);

            // save username for future autocomplete
             if (res.data.user) {
            localStorage.setItem("user", JSON.stringify(res.data.user));
            window.dispatchEvent(new Event("storage"));
             }
             console.log("Logged in user:", res.data.user);
             console.log("going to dashboard...");
            // optional navigation
            navigate("/dashboard");

        } catch (err) {
            setError(err.response?.data?.message || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    const validateSignup = (data) => {
    const errors = {};

    if (!data.name?.trim()) {
        errors.name = "Name is required";
    }

    if (!data.email?.trim()) {
        errors.email = "Email is required";
    } else if (!/^\S+@\S+\.\S+$/.test(data.email)) {
        errors.email = "Invalid email format";
    }

    if (!data.phone_number?.trim()) {
        errors.phone_number = "Phone number is required";
    } else if (!/^[0-9]{7,15}$/.test(data.phone_number)) {
        errors.phone_number = "Invalid phone number";
    }

    if (!data.password) {
        errors.password = "Password is required";
    } else if (data.password.length < 6) {
        errors.password = "Password must be at least 6 characters";
    }

    if (!data.confirmPassword) {
        errors.confirmPassword = "Confirm password is required";
    } else if (data.password !== data.confirmPassword) {
        errors.confirmPassword = "Passwords do not match";
    }

    return errors;
};

   const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = {
        name: e.target.name.value,
        email: e.target.email.value,
        phone_number: e.target.phone.value,
        password: e.target.password.value,
        confirmPassword: e.target.confirmPassword.value,
    };

    const errors = validateSignup(formData);
    setSignupError(errors);

    if (Object.keys(errors).length > 0) {
        setLoading(false);
        return;
    }

    try {
        const res = await registerUser(formData);

        alert("User registered successfully!");
        setIsSignup(false);

    } catch (err) {
        setError(err.response?.data?.message || "Signup failed");
    } finally {
        setLoading(false);
    }
};


    return (
        <div
            className="min-h-screen w-full bg-cover bg-center flex items-center justify-center px-6"
            style={{
                backgroundImage:
                    `linear-gradient(to bottom right, rgba(0,0,0,0.5), rgba(0,0,0,0.2)), url(${binshabib1})`,
            }}
        >
           
            <div className="flex flex-col md:flex-row justify-between items-center w-full max-w-6xl">

                {/* Left Side - Welcome Content font-[Libre_Baskerville]*/}
                <div className="text-white max-w-2xl mb-10 md:mb-0 font-[Libre_Baskerville]">
                    <h2 className="text-base uppercase tracking-widest mb-4">Welcome to</h2>
                    <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                        ABDUL WAHED <br /> BIN SHABIB <br />GROUP
                    </h1>
                </div>


                {/* Right Side - Glassmorphic Login Form */}
                <div className="bg-white/20 backdrop-blur-xl p-8 rounded-xl shadow-xl w-full max-w-122 font-[Times_New_Roman]">
                    <div className="flex flex-col items-center mb-6">
                        {/* <img src={logo} alt="Logo" className="h-40 mb-4 rounded-xl" /> */}
                        <h2 className="text-2xl font-bold text-black-900 font-[Libre_Baskerville]">{isSignup ? "SIGN UP" : "LOGIN"}</h2>
                    </div>

                    <form
                        className="space-y-5"
                        onSubmit={isSignup ? handleSignup : handleLogin}
                    >

                        {!isSignup ? (
                            <>
                                {/* LOGIN FORM */}
                                {error && (
                                    <p className="text-red-500 text-sm mb-2">
                                        {error}
                                    </p>
                                )}
                                <div>
                                    <label className="text-sm text-white block mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full px-4 py-3 rounded bg-white text-gray-900"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm text-white block mb-1">Password</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-4 py-3 rounded bg-white text-gray-900"
                                    />
                                </div>

                                <div className="flex space-x-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsSignup(true)}
                                        className="flex-1 border border-white text-white py-3 rounded hover:bg-orange-500"
                                    >
                                        Sign Up
                                    </button>

                                    <button
                                        type="submit"
                                        className="flex-1 border border-white text-white py-3 rounded hover:bg-orange-500"
                                    >
                                        Login
                                    </button>
                                </div>
                                <div className="text-center">
                                    <button
                                        type="button"
                                        className="text-sm text-black hover:underline"
                                        onClick={() => navigate("/forgot-password")}
                                    >
                                        Forgot Password?
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* SIGNUP FORM */}

                                <div>
                                    <label className="text-sm text-white block mb-1">Name</label>
                                    <input name="name" type="text" className="w-full px-4 py-3 rounded bg-white text-gray-900" />
{signupError.name && <p className="text-red-500 text-xs">{signupError.name}</p>}
                                </div>

                                <div>
                                    <label className="text-sm text-white block mb-1">Email</label>
                                    <input name="email" type="email" className="w-full px-4 py-3 rounded bg-white text-gray-900" />
{signupError.email && <p className="text-red-500 text-xs">{signupError.email}</p>}
                                </div>

                                <div>
                                    <label className="text-sm text-white block mb-1">Phone Number</label>
                                    <input name="phone" type="text" className="w-full px-4 py-3 rounded bg-white text-gray-900" />
{signupError.phone_number && <p className="text-red-500 text-xs">{signupError.phone_number}</p>}
                                </div>

                                <div>
                                    <label className="text-sm text-white block mb-1">Password</label>
                                    <input name="password" type="password" className="w-full px-4 py-3 rounded bg-white text-gray-900" />
{signupError.password && <p className="text-red-500 text-xs">{signupError.password}</p>}
                                </div>

                                <div>
                                    <label className="text-sm text-white block mb-1">Confirm Password</label>
                                    <input name="confirmPassword" type="password" className="w-full px-4 py-3 rounded bg-white text-gray-900" />
{signupError.confirmPassword && <p className="text-red-500 text-xs">{signupError.confirmPassword}</p>}
                                </div>

                                <div className="flex space-x-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsSignup(false)}
                                        className="flex-1 border border-white text-white py-3 rounded hover:bg-gray-500"
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        className="flex-1 border border-white text-white py-3 rounded hover:bg-orange-500"
                                    >
                                        Sign Up
                                    </button>
                                </div>
                            </>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );




}
<style>
    {`
  .clip-path-diagonal {
    clip-path: polygon(0 0, 100% 0, 100% 60%, 0 100%);
  }
  .clip-path-angle {
    clip-path: polygon(0 40%, 100% 0, 100% 100%, 0% 100%);
  }
`}
</style>