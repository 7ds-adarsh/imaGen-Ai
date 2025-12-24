import { ObjectId } from 'mongodb';

export interface ImageDocument {
  _id?: ObjectId;
  userId?: string; // For future user authentication
  prompt: string;
  imageData: string; // Base64 encoded image
  contentType: string;
  timestamp: Date;
  generationTime?: number;
  isFavorite: boolean;
  tags?: string[];
}

export class ImageModel {
  static async createImage(client: any, imageData: Omit<ImageDocument, '_id'>) {
    const db = client.db('imagnerai');
    const collection = db.collection('images');

    const result = await collection.insertOne({
      ...imageData,
      timestamp: new Date(),
    });

    return result.insertedId;
  }

  static async getImages(client: any, limit = 50, skip = 0) {
    const db = client.db('imagnerai');
    const collection = db.collection('images');

    return await collection
      .find({})
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();
  }

  static async toggleFavorite(client: any, imageId: string) {
    const db = client.db('imagnerai');
    const collection = db.collection('images');

    const image = await collection.findOne({ _id: new ObjectId(imageId) });
    if (!image) return null;

    await collection.updateOne(
      { _id: new ObjectId(imageId) },
      { $set: { isFavorite: !image.isFavorite } }
    );

    return !image.isFavorite;
  }

  static async deleteImage(client: any, imageId: string) {
    const db = client.db('imagnerai');
    const collection = db.collection('images');

    return await collection.deleteOne({ _id: new ObjectId(imageId) });
  }

  static async getFavorites(client: any) {
    const db = client.db('imagnerai');
    const collection = db.collection('images');

    return await collection
      .find({ isFavorite: true })
      .sort({ timestamp: -1 })
      .toArray();
  }
}
