import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { Navigate, useLocation, useSearchParams } from "react-router-dom";

function LoginPage({ user, onLogin }) {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  if (user) return <Navigate to={searchParams.get("next") || "/"} replace />;

  const submit = (event) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError("Enter your email and password to continue.");
      return;
    }
    onLogin(email.trim(), searchParams.get("next") || location.state?.from || "/");
  };

  return (
    <section className="auth-page page-width">
      <div className="auth-aside"><span className="section-kicker">YOUR NEXT APPOINTMENT</span><h1>A little time for you.</h1><p>Keep the details of your service booking clear, from choosing a time to your confirmation.</p><div className="auth-aside-note"><LockKeyhole size={17} /> Your payment is confirmed by the server.</div></div>
      <div className="auth-panel"><span className="section-kicker">WELCOME BACK</span><h2>Sign in to ServiceBook</h2><p>Use your demo account to continue.</p>
        <form className="auth-form" onSubmit={submit}>
          <label>Email address<div className="input-with-icon"><Mail size={17} /><input type="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} placeholder="you@example.com" required /></div></label>
          <label>Password<div className="input-with-icon"><LockKeyhole size={17} /><input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} placeholder="Enter your password" required /><button type="button" className="password-toggle" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((shown) => !shown)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary auth-submit" type="submit">Continue</button>
        </form>
        <p className="auth-demo-note">This project currently uses its existing local demo login; credentials are not verified by a server.</p>
      </div>
    </section>
  );
}

export default LoginPage;