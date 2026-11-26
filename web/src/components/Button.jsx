// Button: primary (max one per screen) or secondary. Disabled primary = sand fill, stone text.
export default function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button type="button" className={`btn btn--${variant} t-action ${className}`} {...props}>
      {children}
    </button>
  );
}
