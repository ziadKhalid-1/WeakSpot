import { useRef, useState } from 'react';
import Icon from './Icon.jsx';

export const isPdf = (file) =>
  file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

// Upload box: white surface, 1.5px dashed stone border, fills the remaining height.
// Click opens the picker; dropping a PDF onto it hands the file to onFile.
// With `file`, it shows the attached file's name instead (tap again to change it).
export default function UploadBox({ onClick, onFile, file = null, disabled = false }) {
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0); // dragenter/leave fire for child elements too

  const onDragEnter = (e) => {
    e.preventDefault();
    if (disabled) return;
    depth.current += 1;
    setDragging(true);
  };
  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };
  const onDragLeave = () => {
    depth.current -= 1;
    if (depth.current <= 0) {
      depth.current = 0;
      setDragging(false);
    }
  };
  const onDrop = (e) => {
    e.preventDefault();
    depth.current = 0;
    setDragging(false);
    if (disabled) return;
    const dropped = Array.from(e.dataTransfer.files || []);
    const pdf = dropped.find(isPdf);
    if (pdf) onFile?.(pdf);
    else if (dropped[0]) onFile?.(dropped[0]); // not a PDF: the screen explains why it is refused
  };

  return (
    <button
      type="button"
      className={`upload-box${dragging ? ' upload-box--dragging' : ''}`}
      onClick={onClick}
      disabled={disabled}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <Icon name={file ? 'file' : 'upload'} size={56} accent />
      {file ? (
        <span className="upload-box__text">
          <bdi className="upload-box__name t-action" dir="auto" title={file.name}>
            {file.name}
          </bdi>
          <span className="t-label c-stone">اضغط عشان تغيّر الملف</span>
        </span>
      ) : (
        <span className="upload-box__text">
          <span className="t-action">اضغط واختر ملف PDF</span>
          <span className="t-label c-stone">ملف واحد لفصل واحد</span>
        </span>
      )}
    </button>
  );
}
