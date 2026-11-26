import Icon from './Icon.jsx';

// Icon button: 44 × 44, no background, 22px outline icon in ink.
export default function IconButton({ icon = 'close', label, ...props }) {
  return (
    <button type="button" className="icon-button" aria-label={label} {...props}>
      <Icon name={icon} size={22} />
    </button>
  );
}
