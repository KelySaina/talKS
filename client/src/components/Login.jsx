import './Login.css';

function Login() {
  const handleLogin = () => {
    window.location.href = '/auth/login';
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-title">talKS</h1>
        <p className="login-subtitle">Real-Time Messaging Application</p>
        <div className="login-features">
          <div className="feature">
            <span className="feature-icon">💬</span>
            <span>Instant messaging</span>
          </div>
          <div className="feature">
            <span className="feature-icon">👥</span>
            <span>Channels & DMs</span>
          </div>
          <div className="feature">
            <span className="feature-icon">🔐</span>
            <span>Secure OAuth login</span>
          </div>
        </div>
        <button className="btn btn-primary login-btn" onClick={handleLogin}>
          Sign in with Konnect
        </button>
        <p className="login-footer">
          Powered by Konnect Service
        </p>
      </div>
    </div>
  );
}

export default Login;
