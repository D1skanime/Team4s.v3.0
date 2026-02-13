'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { uploadCover } from '@/lib/auth';
import styles from './CoverUpload.module.css';

interface CoverUploadProps {
  currentCover?: string;
  onUploadComplete: (url: string) => void;
  onError?: (error: string) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function CoverUpload({ currentCover, onUploadComplete, onError }: CoverUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Construct full URL for existing cover
  const currentCoverUrl = currentCover ? `/covers/${currentCover}` : null;
  const displayUrl = previewUrl || currentCoverUrl;

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Nur JPG, PNG, WebP und GIF Dateien sind erlaubt.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'Die Datei darf maximal 5MB gross sein.';
    }
    return null;
  }, []);

  const handleUpload = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      onError?.(validationError);
      return;
    }

    setError(null);
    setIsUploading(true);
    setUploadProgress(0);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const result = await uploadCover(file, (progress) => {
        setUploadProgress(progress);
      });

      // Build full URL for the uploaded cover
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090';
      const fullUrl = `${apiBase}${result.url}`;

      onUploadComplete(fullUrl);
      setPreviewUrl(fullUrl);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload fehlgeschlagen';
      setError(errorMessage);
      onError?.(errorMessage);
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [validateFile, onUploadComplete, onError]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleUpload(files[0]);
    }
  }, [handleUpload]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleUpload(files[0]);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleClick = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  const handleClearPreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewUrl(null);
    setError(null);
  };

  return (
    <div className={styles.container}>
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleFileSelect}
        className={styles.hiddenInput}
      />

      <div
        className={`${styles.dropzone} ${isDragging ? styles.dragging : ''} ${isUploading ? styles.uploading : ''}`}
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {displayUrl ? (
          <div className={styles.preview}>
            <img src={displayUrl} alt="Cover Preview" className={styles.previewImage} />
            {!isUploading && (
              <button
                type="button"
                className={styles.clearButton}
                onClick={handleClearPreview}
                title="Vorschau entfernen"
              >
                <X size={16} />
              </button>
            )}
            <div className={styles.previewOverlay}>
              <Upload size={24} />
              <span>Neues Bild hochladen</span>
            </div>
          </div>
        ) : (
          <div className={styles.placeholder}>
            {isUploading ? (
              <Loader2 size={32} className={styles.spinner} />
            ) : (
              <ImageIcon size={32} />
            )}
            <span className={styles.placeholderText}>
              {isUploading ? 'Wird hochgeladen...' : 'Bild hierher ziehen oder klicken'}
            </span>
            <span className={styles.placeholderHint}>
              JPG, PNG, WebP, GIF - max. 5MB
            </span>
          </div>
        )}

        {isUploading && (
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
      </div>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}
    </div>
  );
}
