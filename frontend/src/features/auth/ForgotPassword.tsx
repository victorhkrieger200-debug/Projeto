import React, { useState, useEffect, useRef, useId } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import './Auth.css';

interface FieldErrors {
  email?: string;
}

const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6z" />
    <path d="M22 6l-10 7L2 6" />
  </svg>
);

const AlertIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const SuccessBadgeIcon = () => (
  <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="success-icon" style={{ marginBottom: "1.25rem" }}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

function ForgotPassword() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [formState, setFormState] = useState<"idle" | "loading" | "success">("idle");
  const [isShaking, setIsShaking] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<{ email?: boolean }>({});

  const timeoutsRef = useRef<number[]>([]);
  const emailInputRef = useRef<HTMLInputElement>(null);
  
  const uid = useId();
  const emailErrorId = `${uid}-email-error`;

  const isLoading = formState === "loading";
  const isSuccess = formState === "success";

  useEffect(() => {
    const timeoutIds = timeoutsRef.current;

    return () => {
      timeoutIds.forEach((id) => clearTimeout(id));
    };
  }, []);

  const triggerShake = () => {
    setIsShaking(true);
    const tId = window.setTimeout(() => {
      setIsShaking(false);
    }, 500);
    timeoutsRef.current.push(tId);
  };

  const validateEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? undefined : "Informe um e-mail válido.";

  const handleBlur = () => {
    setTouched({ email: true });
    setErrors({ email: validateEmail(email) });
  };

  const handleClear = () => {
    setEmail("");
    setErrors({});
    setTouched({});
    emailInputRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailError = validateEmail(email);
    setErrors({ email: emailError });
    setTouched({ email: true });

    if (emailError) {
      triggerShake();
      return;
    }

    setFormState('loading');

    try {
      await requestPasswordReset(email);
      window.setTimeout(() => {
        setFormState('success');
      }, 900);
    } catch (error) {
      setFormState('idle');
      setErrors({ email: error instanceof Error ? error.message : 'Não foi possível enviar o e-mail.' });
      triggerShake();
    }
  };

  return (
    <main className="app">
      <section className="left">
        <span className="logo-text">ATLHON SALES</span>
        <div className="hero">
          <h1>
            Recupere Seu
            <br />
            <em>Acesso à Elite</em>
          </h1>
          <p>
            Não se preocupe. Em poucos passos você estará de volta ao controle da gestão de seus alunos e da alta performance de sua equipe.
          </p>
        </div>
        <div className="footer-left">
          <span>WORKSPACE PRIVADO</span>
          <span>ALTA EFICIÊNCIA • SUPORTE SEGURO</span>
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
                Voltar para o login
              </Link>
            </div>
          </div>

          {!isSuccess ? (
            <>
              <div className="hero-copy">
                <h2>Esqueceu a senha?</h2>
                <h3>Insira seu e-mail para receber as instruções de recuperação.</h3>
              </div>

              <form onSubmit={handleSubmit} noValidate style={{ marginTop: "1.5rem" }}>
                <div className="input-group">
                  <label htmlFor="email">Endereço de E-mail</label>
                  <div className={`input-wrapper has-icon ${errors.email && touched.email ? "has-error" : ""} ${isShaking ? "shake-active" : ""}`}>
                    <span className="input-icon" aria-hidden="true"><MailIcon /></span>
                    <input
                      ref={emailInputRef}
                      id="email"
                      type="email"
                      placeholder="nome@empresa.com"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={handleBlur}
                      aria-invalid={!!(errors.email && touched.email)}
                      aria-describedby={errors.email && touched.email ? emailErrorId : undefined}
                      disabled={isLoading}
                    />
                    {email && !isLoading && (
                      <button type="button" className="action-btn" onClick={handleClear} aria-label="Limpar e-mail">
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

                <button
                  className="signin-btn"
                  type="submit"
                  disabled={isLoading}
                  aria-busy={isLoading}
                  style={{ marginTop: "1.5rem" }}
                >
                  {isLoading ? (
                    <svg className="spinner" viewBox="0 0 50 50">
                      <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
                    </svg>
                  ) : (
                    <>
                      <span>Enviar link de recuperação</span>
                      <svg className="arrow-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                      </svg>
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="hero-copy" style={{ textAlign: "center", padding: "0.5rem 0", animation: "cardEnter 0.4s var(--auth-ease-smooth) both" }}>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <SuccessBadgeIcon />
              </div>
              <h2>E-mail Enviado!</h2>
              <h3 style={{ marginTop: "0.75rem", lineHeight: "1.6", fontSize: "0.9rem" }}>
                Se o e-mail <strong>{email}</strong> estiver em nosso sistema, você receberá um link de redefinição em poucos instantes.
              </h3>
              <p style={{ fontSize: "0.78rem", color: "var(--auth-text-light)", marginTop: "1rem" }}>
                Verifique também a sua caixa de spam ou lixo eletrônico.
              </p>
              
              {/* CORREÇÃO DO BUG: Removido 'success-state' para liberar o clique e inserida cor de sucesso diretamente inline */}
              <Link to="/" className="signin-btn" style={{ marginTop: "2rem", textDecoration: "none", background: "var(--auth-success)" }}>
                <span>Voltar para o Login</span>
                <svg className="arrow-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </Link>
            </div>
          )}

          <small className="terms">
            Precisa de ajuda imediata? Contate nosso <Link to="/support">Suporte Técnico</Link>.
          </small>
        </div>
      </section>
    </main>
  );
}

export default ForgotPassword;