export interface StoredVideo {
  _id: string;
  id: string;
  name: string;
  base64Data: string;
  mimeType: string;
  size: number;
  createdAt: Date;
  type: 'video';
  thumbnailUrl?: string; // Optional thumbnail for video preview
}

export interface ImageVideoAssociation {
  _id: string;
  id: string;
  imageId: string; // ID of the associated image
  videoId: string; // ID of the associated video
  createdAt: Date;
  type: 'image-video-association';
}

// VideoModalData interface removed as it's not currently used