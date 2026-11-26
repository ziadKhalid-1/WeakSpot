// Card: white surface, 1px sand border, radius 14, padding 16. No shadow.
export default function Card({ as: Tag = 'div', className = '', children, ...props }) {
  return (
    <Tag className={`card ${className}`} {...props}>
      {children}
    </Tag>
  );
}
