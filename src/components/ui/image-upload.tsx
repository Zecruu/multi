"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface UploadedImage {
  url: string;
  key: string;
  isPrimary: boolean;
  file?: File;
  preview?: string;
}

interface ImageUploadProps {
  images: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
  maxImages?: number;
  maxSizeMB?: number;
  disabled?: boolean;
}

export function ImageUpload({
  images,
  onImagesChange,
  maxImages = 5,
  maxSizeMB = 5,
  disabled = false,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const validateFile = (file: File): string | null => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return "Invalid file type. Allowed: JPEG, PNG, WebP, GIF";
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File size exceeds ${maxSizeMB}MB limit`;
    }
    return null;
  };

  const uploadToS3 = async (file: File): Promise<UploadedImage | null> => {
    try {
      // Get presigned URL
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadUrl, key } = await response.json();

      // Upload to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload to S3");
      }

      // Get the CloudFront URL
      const imageUrlResponse = await fetch(`/api/upload/url?key=${encodeURIComponent(key)}`);
      let imageUrl = "";
      
      if (imageUrlResponse.ok) {
        const data = await imageUrlResponse.json();
        imageUrl = data.url;
      } else {
        // Fallback: construct URL from key
        imageUrl = key;
      }

      return {
        url: imageUrl,
        key,
        isPrimary: false,
      };
    } catch (error) {
      console.error("Upload error:", error);
      return null;
    }
  };

  const processFiles = async (files: FileList | File[]) => {
    if (disabled) return;

    const fileArray = Array.from(files);
    const remainingSlots = maxImages - images.length;
    const filesToProcess = fileArray.slice(0, remainingSlots);

    if (filesToProcess.length === 0) return;

    setIsUploading(true);
    const newImages: UploadedImage[] = [];

    for (const file of filesToProcess) {
      const error = validateFile(file);
      if (error) {
        console.error(error);
        continue;
      }

      // Create preview
      const preview = URL.createObjectURL(file);
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      
      setUploadProgress((prev) => ({ ...prev, [tempId]: 0 }));

      const uploadedImage = await uploadToS3(file);
      
      if (uploadedImage) {
        newImages.push({
          ...uploadedImage,
          preview,
          isPrimary: images.length === 0 && newImages.length === 0,
        });
      }

      setUploadProgress((prev) => {
        const updated = { ...prev };
        delete updated[tempId];
        return updated;
      });
    }

    if (newImages.length > 0) {
      onImagesChange([...images, ...newImages]);
    }

    setIsUploading(false);
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const { files } = e.dataTransfer;
      if (files && files.length > 0) {
        await processFiles(files);
      }
    },
    [disabled, images, maxImages, onImagesChange]
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target;
    if (files && files.length > 0) {
      await processFiles(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    // If we removed the primary image, make the first one primary
    if (images[index].isPrimary && newImages.length > 0) {
      newImages[0].isPrimary = true;
    }
    onImagesChange(newImages);
  };

  const setPrimaryImage = (index: number) => {
    const newImages = images.map((img, i) => ({
      ...img,
      isPrimary: i === index,
    }));
    onImagesChange(newImages);
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50",
          disabled && "opacity-50 cursor-not-allowed",
          images.length >= maxImages && "opacity-50 cursor-not-allowed"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || images.length >= maxImages}
        />
        
        {isUploading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Uploading images...</p>
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Drag and drop images here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PNG, JPG up to {maxSizeMB}MB. First image will be the primary.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              disabled={disabled || images.length >= maxImages}
            >
              Browse Files
            </Button>
          </>
        )}
      </div>

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div
              key={image.key || index}
              className={cn(
                "relative group rounded-lg overflow-hidden border-2 aspect-square",
                image.isPrimary ? "border-primary" : "border-border"
              )}
            >
              {image.preview || image.url ? (
                <img
                  src={image.preview || image.url}
                  alt={`Product image ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {!image.isPrimary && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPrimaryImage(index);
                    }}
                  >
                    Set Primary
                  </Button>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(index);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Primary Badge */}
              {image.isPrimary && (
                <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                  Primary
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
