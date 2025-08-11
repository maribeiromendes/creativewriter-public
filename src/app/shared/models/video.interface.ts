import { FirestoreDocument } from '../../core/services/firestore.service';

export interface StoredVideo extends FirestoreDocument {
  name: string;
  base64Data: string;
  mimeType: string;
  size: number;
  type: 'video';
  thumbnailUrl?: string; // Optional thumbnail for video preview
}

export interface ImageVideoAssociation extends FirestoreDocument {
  imageId: string; // ID of the associated image
  videoId: string; // ID of the associated video
  type: 'image-video-association';
}

// VideoModalData interface removed as it's not currently used