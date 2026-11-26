import Card from './Card.jsx';
import Icon from './Icon.jsx';

// File card: 28px file icon + the file name (its own script, one line, ellipsis) + optional content.
export default function FileCard({ fileName, children }) {
  return (
    <Card className="file-card">
      <div className="file-card__row">
        <Icon name="file" size={28} accent />
        <bdi className="file-card__name t-body" dir="auto" title={fileName}>
          {fileName}
        </bdi>
      </div>
      {children}
    </Card>
  );
}
