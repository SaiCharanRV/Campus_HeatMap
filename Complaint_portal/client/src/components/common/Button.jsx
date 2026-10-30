const VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  danger: 'btn-danger',
  ghost: 'btn-ghost',
};

export default function Button({ variant = 'primary', loading = false, className = '', children, disabled, ...props }) {
  return (
    <button className={`${VARIANTS[variant]} ${className}`} disabled={disabled || loading} {...props}>
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}
