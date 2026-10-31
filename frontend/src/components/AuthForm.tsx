import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { authenticate, AuthError } from '../auth';
import type { AuthUser, Credentials } from '../auth';

type Field = keyof Credentials;
const labels: Record<Field, string> = {
  displayName: 'Nombre de usuario',
  email: 'Email',
  password: 'Contraseña',
  confirmPassword: 'Confirmar contraseña',
};
const errorFields: Record<string, Field> = {
  EMAIL_ALREADY_REGISTERED: 'email',
  INVALID_EMAIL: 'email',
  INVALID_DISPLAY_NAME: 'displayName',
  INVALID_PASSWORD: 'password',
  PASSWORD_MISMATCH: 'confirmPassword',
};
const emailPattern =
  /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export function AuthForm({ mode, onSuccess }: { mode: 'login' | 'register'; onSuccess: (user: AuthUser) => void }) {
  const registering = mode === 'register';
  const fields: Field[] = registering ? ['displayName', 'email', 'password', 'confirmPassword'] : ['email', 'password'];
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const locked = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const alert = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (message) alert.current?.focus();
  }, [message]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current) return;
    const data = new FormData(event.currentTarget);
    const values = Object.fromEntries(fields.map((field) => [field, String(data.get(field) || '')])) as Credentials;
    values.email = values.email.trim().toLowerCase();
    if (registering) values.displayName = values.displayName!.trim();
    const invalid: Partial<Record<Field, string>> = {};
    for (const field of fields) if (!values[field]?.trim()) invalid[field] = 'Este campo es obligatorio.';
    if (values.email && (values.email.length > 254 || !emailPattern.test(values.email)))
      invalid.email = 'Introduce un email válido de hasta 254 caracteres.';
    if (registering) {
      if ([...values.displayName!].length > 30) invalid.displayName = 'El nombre debe tener entre 1 y 30 caracteres.';
      if (
        values.password &&
        (!/^[\x20-\x7e]{8,72}$/.test(values.password) || values.password !== values.password.trim())
      )
        invalid.password = 'Usa entre 8 y 72 caracteres ASCII imprimibles, sin espacios al principio ni al final.';
      if (values.confirmPassword && values.confirmPassword !== values.password)
        invalid.confirmPassword = 'Las contraseñas no coinciden.';
    }
    setErrors(invalid);
    setMessage('');
    const first = fields.find((field) => invalid[field]);
    if (first) {
      (form.current?.elements.namedItem(first) as HTMLInputElement).focus();
      return;
    }
    locked.current = true;
    setPending(true);
    try {
      const user = await authenticate(mode, values);
      form.current?.reset();
      onSuccess(user);
    } catch (error) {
      const text =
        error instanceof AuthError
          ? error.message
          : 'No se ha podido conectar. Comprueba tu conexión e inténtalo de nuevo.';
      const field = error instanceof AuthError ? errorFields[error.code] : undefined;
      if (field) setErrors({ [field]: text });
      setMessage(text);
      // Credentials stay only in this request; clear password controls after every attempt.
      for (const name of ['password', 'confirmPassword']) {
        const input = form.current?.elements.namedItem(name) as HTMLInputElement | null;
        if (input) input.value = '';
      }
    } finally {
      values.password = '';
      values.confirmPassword = '';
      locked.current = false;
      setPending(false);
    }
  }

  return (
    <section className="auth-panel" aria-labelledby="auth-title">
      <p className="eyebrow">Comunidad ProTube</p>
      <h1 id="auth-title">{registering ? 'Crea tu cuenta' : 'Inicia sesión'}</h1>
      <p>Todos los campos son obligatorios (*).</p>
      <form ref={form} onSubmit={(event) => void submit(event)} noValidate aria-busy={pending}>
        <fieldset disabled={pending}>
          <legend className="visually-hidden">{registering ? 'Datos de registro' : 'Datos de acceso'}</legend>
          {fields.map((field) => (
            <div className="form-field" key={field}>
              <label htmlFor={field}>{labels[field]} *</label>
              <input
                id={field}
                name={field}
                required
                type={field.includes('assword') ? 'password' : field === 'email' ? 'email' : 'text'}
                autoComplete={
                  field === 'displayName'
                    ? 'nickname'
                    : field === 'email'
                      ? 'username'
                      : registering
                        ? 'new-password'
                        : 'current-password'
                }
                autoCapitalize={field === 'email' ? 'none' : undefined}
                spellCheck={false}
                onChange={() => setErrors((previous) => ({ ...previous, [field]: undefined }))}
                aria-invalid={!!errors[field]}
                aria-describedby={
                  [field === 'password' && registering ? 'password-help' : '', errors[field] ? `${field}-error` : '']
                    .filter(Boolean)
                    .join(' ') || undefined
                }
              />
              {field === 'password' && registering && (
                <p id="password-help" className="muted-text">
                  Entre 8 y 72 caracteres ASCII imprimibles (letras sin acentos, números y símbolos), sin espacios al
                  principio ni al final.
                </p>
              )}
              {errors[field] && (
                <p className="field-error" id={`${field}-error`}>
                  {errors[field]}
                </p>
              )}
            </div>
          ))}
          <button className="button" type="submit">
            {pending ? 'Procesando…' : registering ? 'Crear cuenta' : 'Entrar'}
          </button>
        </fieldset>
        <p
          ref={alert}
          role="alert"
          tabIndex={-1}
          className={message ? 'status-message status-error' : 'visually-hidden'}
        >
          {message}
        </p>
        {pending && <p role="status">Procesando tu solicitud…</p>}
      </form>
      <p>
        {registering ? '¿Ya tienes cuenta?' : '¿Todavía no tienes cuenta?'}{' '}
        <a href={registering ? '#login' : '#register'}>{registering ? 'Iniciar sesión' : 'Registrarse'}</a>
      </p>
    </section>
  );
}
