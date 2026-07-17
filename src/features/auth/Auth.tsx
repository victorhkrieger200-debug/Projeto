import React, { useState, useEffect, useRef, useId } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import './Auth.css';

type FormMode = "signin" | "signup";

interface PasswordStrength {
  score: number;
  text: string;
  color: string;
  glow: string;
}

interface PwdRequirements {
  length: boolean;
  casing: boolean;
  number: boolean;
  special: boolean;
}

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
}

const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6z" />
    <path d="M22 6l-10 7L2 6" />
  </svg>
);

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const AlertIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const CheckIcon = ({ met }: { met: boolean }) => (
  <svg className="req-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" strokeWidth="2" className={met ? "met-circle" : "unmet-circle"} />
    <path d="M8 12L11 15L16 9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={met ? "met-check" : "unmet-check"} />
  </svg>
);

const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp, isAuthenticated } = useAuth();
  const [mode, setMode] = useState<FormMode>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [formState, setFormState] = useState<"idle" | "loading" | "success">("idle");
  const [shakingFields, setShakingFields] = useState<{ [k: string]: boolean }>({});

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<{ [k: string]: boolean }>({});

  const [pwdStrength, setPwdStrength] = useState<PasswordStrength>({
    score: 0,
    text: "Muito curta",
    color: "#64748b",
    glow: "rgba(100, 116, 139, 0.15)"
  });

  const [pwdReqs, setPwdReqs] = useState<PwdRequirements>({
    length: false,
    casing: false,
    number: false,
    special: false
  });

  const timeoutsRef = useRef<number[]>([]);
  const uid = useId();
  const emailErrorId = `${uid}-email-error`;
  const passwordErrorId = `${uid}-password-error`;
  const nameErrorId = `${uid}-name-error`;

  const isSignin = mode === 'signin';
  const isLoading = formState === 'loading';
  const isSuccess = formState === 'success';

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const timeoutIds = timeoutsRef.current;

    return () => {
      timeoutIds.forEach((id) => clearTimeout(id));
    };
  }, []);

  useEffect(() => {
    if (!password) {
      setPwdStrength({ score: 0, text: "", color: "#e2e8f0", glow: "rgba(37, 99, 235, 0.08)" });
      setPwdReqs({ length: false, casing: false, number: false, special: false });
      return;
    }

    const reqs = {
      length: password.length >= 8,
      casing: /[A-Z]/.test(password) && /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password)
    };

    setPwdReqs(reqs);
    const score = Object.values(reqs).filter(Boolean).length;

    switch (score) {
      case 1:
        setPwdStrength({ score: 1, text: "Muito Fraca", color: "#ef4444", glow: "rgba(239, 68, 68, 0.15)" });
        break;
      case 2:
        setPwdStrength({ score: 2, text: "Fraca", color: "#f59e0b", glow: "rgba(245, 158, 11, 0.15)" });
        break;
      case 3:
        setPwdStrength({ score: 3, text: "Boa", color: "#3b82f6", glow: "rgba(59, 130, 246, 0.15)" });
        break;
      case 4:
        setPwdStrength({ score: 4, text: "Excelente", color: "#10b981", glow: "rgba(16, 185, 129, 0.15)" });
        break;
      default:
        setPwdStrength({ score: 0, text: "Curta demais", color: "#64748b", glow: "rgba(100, 116, 139, 0.15)" });
    }

    if (touched.password) {
      setErrors((prev) => ({ ...prev, password: password.length >= 8 ? undefined : "Use ao menos 8 caracteres." }));
    }
  }, [password, touched.password]);

  useEffect(() => {
    setErrors({});
    setTouched({});
  }, [mode]);

  const triggerShake = (field: string) => {
    setShakingFields((prev) => ({ ...prev, [field]: true }));
    const tId = window.setTimeout(() => {
      setShakingFields((prev) => ({ ...prev, [field]: false }));
    }, 500);
    timeoutsRef.current.push(tId);
  };

  const validateEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? undefined : "Informe um e-mail válido.";

  const validatePassword = (value: string) =>
    value.length >= 8 ? undefined : "Use ao menos 8 caracteres.";

  const validateName = (value: string) =>
    value.trim().length > 2 ? undefined : "Informe seu nome completo.";

  const handleBlur = (field: "name" | "email" | "password") => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === "name" && !isSignin) {
      setErrors((prev) => ({ ...prev, name: validateName(name) }));
    }
    if (field === "email") {
      setErrors((prev) => ({ ...prev, email: validateEmail(email) }));
    }
    if (field === "password") {
      setErrors((prev) => ({ ...prev, password: validatePassword(password) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    const nameError = !isSignin ? validateName(name) : undefined;

    setErrors({ email: emailError, password: passwordError, name: nameError });
    setTouched({ name: true, email: true, password: true });

    if (nameError) triggerShake('name');
    if (emailError) triggerShake('email');
    if (passwordError) triggerShake('password');

    if (emailError || passwordError || nameError) return;

    setFormState('loading');

    try {
      if (isSignin) {
        await signIn({ email, password, rememberMe });
      } else {
        await signUp({ name, email, password, rememberMe });
      }

      setFormState('success');
      window.setTimeout(() => {
        navigate('/dashboard');
      }, 800);
    } catch (error) {
      setFormState('idle');
      setErrors((prev) => ({
        ...prev,
        email: error instanceof Error ? error.message : 'Não foi possível concluir a operação.',
      }));
      triggerShake('email');
    }
  };

  return (
    <main className="app">
      <section className="left">
        <span className="logo-text">ATLHON SALES</span>
        <div className="hero">
          <h1>
            Toda Sua
            <br />
            <em>Gestão Centralizada</em>
          </h1>
          <p>
            A Elite de seus atletas começa por aqui. Aumente a eficiência de sua equipe e melhore a gestão de seus alunos com nosso sistema de CRM.
          </p>
        </div>
        <div className="footer-left">
          <span>WORKSPACE PRIVADO</span>
          <span>ALTA EFICIÊNCIA • GESTÃO MELHORADA</span>
        </div>
      </section>

      <section className="right">
        <div className="login-card">
          <div className="brand">
            <div className="logo" aria-hidden="true">A</div>
            <div className="brand-text">
              <small>Atlhon Sales</small>
              <Link to="/" className="brand-link">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                Voltar
              </Link>
            </div>
          </div>

          <div className="tabs" role="tablist" aria-label="Alternar entre entrar e criar conta">
            <button
              type="button"
              role="tab"
              aria-selected={isSignin}
              className={isSignin ? "active" : ""}
              onClick={() => {
                setMode("signin");
                setShowPassword(false);
                setFormState("idle");
              }}
            >
              Entrar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isSignin}
              className={!isSignin ? "active" : ""}
              onClick={() => {
                setMode("signup");
                setShowPassword(false);
                setFormState("idle");
              }}
            >
              Criar conta
            </button>
          </div>

          <div className="hero-copy">
            {isSignin ? (
              <>
                <h2>Bem-vindo Novamente!</h2>
                <h3>Retome de onde parou.</h3>
              </>
            ) : (
              <>
                <h2>Comece do Zero</h2>
                <h3>Gerencie seus Alunos.</h3>
              </>
            )}
          </div>

          <button className="google" type="button">
            <span className="google-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
            </span>
            <span>Entrar com o Google</span>
            <svg className="arrow-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>

          <div className="divider">
            <span>Ou por E-mail</span>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className={`expandable-field ${!isSignin ? "open" : ""}`}>
              <div className="expandable-field-inner">
                <div className="input-group">
                  <label htmlFor="name">Nome Completo</label>
                  <div className={`input-wrapper has-icon ${errors.name && touched.name ? "has-error" : ""} ${shakingFields.name ? "shake-active" : ""}`}>
                    <span className="input-icon" aria-hidden="true"><UserIcon /></span>
                    <input
                      id="name"
                      type="text"
                      placeholder="Ex: João Silva"
                      required={!isSignin}
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onBlur={() => handleBlur("name")}
                      aria-invalid={!!(errors.name && touched.name)}
                      aria-describedby={errors.name && touched.name ? nameErrorId : undefined}
                    />
                    {name && !isSignin && (
                      <button type="button" className="action-btn" onClick={() => setName("")} aria-label="Limpar nome">
                        <XIcon />
                      </button>
                    )}
                  </div>
                  {errors.name && touched.name && (
                    <span className="field-error" id={nameErrorId} role="alert">
                      <AlertIcon /> {errors.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="email">Endereço de E-mail</label>
              <div className={`input-wrapper has-icon ${errors.email && touched.email ? "has-error" : ""} ${shakingFields.email ? "shake-active" : ""}`}>
                <span className="input-icon" aria-hidden="true"><MailIcon /></span>
                <input
                  id="email"
                  type="email"
                  placeholder="nome@empresa.com"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => handleBlur("email")}
                  aria-invalid={!!(errors.email && touched.email)}
                  aria-describedby={errors.email && touched.email ? emailErrorId : undefined}
                />
                {email && (
                  <button type="button" className="action-btn" onClick={() => setEmail("")} aria-label="Limpar e-mail">
                    <XIcon />
                  </button>
                )}
              </div>
              {errors.email && touched.email && (
                <span className="field-error" id={emailErrorId} role="alert">
                  <AlertIcon /> {errors.email}
                </span>
              )}
            </div>

            <div className="input-group">
              <label htmlFor="password">Senha</label>
              <div
                className={`input-wrapper has-icon ${errors.password && touched.password ? "has-error" : ""} ${shakingFields.password ? "shake-active" : ""}`}
                style={{
                  "--dynamic-focus-color": pwdStrength.color,
                  "--dynamic-glow-color": pwdStrength.glow
                } as React.CSSProperties}
              >
                <span className="input-icon" aria-hidden="true"><LockIcon /></span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mín. 8 Caracteres"
                  required
                  autoComplete={isSignin ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => handleBlur("password")}
                  aria-invalid={!!(errors.password && touched.password)}
                  aria-describedby={errors.password && touched.password ? passwordErrorId : undefined}
                />
                <button
                  type="button"
                  className="action-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>

              {isSignin && errors.password && touched.password && (
                <span className="field-error" id={passwordErrorId} role="alert">
                  <AlertIcon /> {errors.password}
                </span>
              )}

              <div className={`strength-container ${(!isSignin && password) ? "visible" : ""}`} aria-live="polite">
                <div className="strength-inner">
                  <div className="strength-header">
                    <span className="strength-text" style={{ color: pwdStrength.color }}>
                      Segurança: {pwdStrength.text}
                    </span>
                    <div className="strength-bars">
                      <div className={`strength-bar ${pwdStrength.score >= 1 ? "active" : ""}`} style={{ backgroundColor: pwdStrength.score >= 1 ? pwdStrength.color : undefined }} />
                      <div className={`strength-bar ${pwdStrength.score >= 2 ? "active" : ""}`} style={{ backgroundColor: pwdStrength.score >= 2 ? pwdStrength.color : undefined }} />
                      <div className={`strength-bar ${pwdStrength.score >= 3 ? "active" : ""}`} style={{ backgroundColor: pwdStrength.score >= 3 ? pwdStrength.color : undefined }} />
                      <div className={`strength-bar ${pwdStrength.score >= 4 ? "active" : ""}`} style={{ backgroundColor: pwdStrength.score >= 4 ? pwdStrength.color : undefined }} />
                    </div>
                  </div>

                  <div className="password-checklist">
                    <div className={`req-item ${pwdReqs.length ? 'met' : ''}`}>
                      <CheckIcon met={pwdReqs.length} /> 8+ Caracteres
                    </div>
                    <div className={`req-item ${pwdReqs.casing ? 'met' : ''}`}>
                      <CheckIcon met={pwdReqs.casing} /> Maiúsculas/minúsculas
                    </div>
                    <div className={`req-item ${pwdReqs.number ? 'met' : ''}`}>
                      <CheckIcon met={pwdReqs.number} /> Pelo menos 1 número
                    </div>
                    <div className={`req-item ${pwdReqs.special ? 'met' : ''}`}>
                      <CheckIcon met={pwdReqs.special} /> Caractere especial
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {isSignin && (
              <div className="options-row">
                <label className="remember-me">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  Lembrar-me
                </label>
                <Link to="/forgot-password" className="forgot-link">
                  Esqueci minha senha
                </Link>
              </div>
            )}

            <button
              className={`signin-btn ${isSuccess ? "success-state" : ""}`}
              type="submit"
              disabled={isLoading || isSuccess}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <svg className="spinner" viewBox="0 0 50 50">
                  <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
                </svg>
              ) : isSuccess ? (
                <>
                  <svg className="success-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Concluído</span>
                </>
              ) : (
                <>
                  <span>{isSignin ? "Entrar na plataforma" : "Cadastrar gratuitamente"}</span>
                  <svg className="arrow-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </>
              )}
            </button>
          </form>

          <small className="terms">
            Ao continuar, você concorda com nossos <Link to="/terms">Termos</Link> &amp; <Link to="/privacy">Privacidade</Link>.
          </small>
        </div>
      </section>
    </main>
  );
}

export default Auth;