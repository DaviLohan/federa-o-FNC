'use client';

import { useState, useRef } from 'react';
import { Button } from './Button';

interface ImageUploadProps {
  label: string;
  value?: string | null;
  onChange: (file: File | null) => void;
  accept?: string;
  maxSize?: number; // in MB
  previewClassName?: string;
  buttonText?: string;
  helpText?: string;
}

export function ImageUpload({
  label,
  value,
  onChange,
  accept = 'image/png,image/jpeg,image/jpg,image/webp',
  maxSize = 5,
  previewClassName = 'w-32 h-32',
  buttonText = 'Escolher Arquivo',
  helpText,
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(value || null);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError('');

    if (!file) {
      setPreview(null);
      onChange(null);
      return;
    }

    // Validate file type
    const acceptedTypes = accept.split(',').map(t => t.trim());
    const fileType = file.type;
    if (!acceptedTypes.some(type => {
      if (type.includes('*')) {
        const baseType = type.split('/')[0];
        return fileType.startsWith(baseType);
      }
      return fileType === type;
    })) {
      setError('Tipo de arquivo não permitido');
      return;
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSize) {
      setError(`Arquivo deve ter no máximo ${maxSize}MB`);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    onChange(file);
  };

  const handleRemove = () => {
    setPreview(null);
    setError('');
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-text">
        {label}
      </label>

      {/* Preview */}
      {preview && (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Preview"
            className={`${previewClassName} object-cover rounded-lg border-2 border-border`}
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 bg-error text-white rounded-full p-1 hover:bg-error/80 transition-colors shadow-lg"
            title="Remover imagem"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Upload Button */}
      {!preview && (
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClick}
            className="border-2 border-dashed border-border hover:border-brand transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {buttonText}
          </Button>
        </div>
      )}

      {/* Change Button (when preview exists) */}
      {preview && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClick}
            className="text-xs"
          >
            Trocar Imagem
          </Button>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Help Text */}
      {helpText && !error && (
        <p className="text-xs text-muted2">{helpText}</p>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-xs text-error">{error}</p>
      )}
    </div>
  );
}
