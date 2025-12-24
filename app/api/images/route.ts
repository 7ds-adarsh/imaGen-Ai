import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';
import { ImageModel } from '../../../lib/models/Image';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');
    const favoritesOnly = searchParams.get('favorites') === 'true';

    const client = await clientPromise;

    let images;
    if (favoritesOnly) {
      images = await ImageModel.getFavorites(client);
    } else {
      images = await ImageModel.getImages(client, limit, skip);
    }

    return NextResponse.json({ images });
  } catch (error) {
    console.error('Failed to fetch images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { imageId, action } = await req.json();

    if (!imageId || !action) {
      return NextResponse.json(
        { error: 'Image ID and action are required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;

    if (action === 'favorite') {
      const newFavoriteStatus = await ImageModel.toggleFavorite(client, imageId);
      if (newFavoriteStatus === null) {
        return NextResponse.json(
          { error: 'Image not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ isFavorite: newFavoriteStatus });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Failed to update image:', error);
    return NextResponse.json(
      { error: 'Failed to update image' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const imageId = searchParams.get('id');

    if (!imageId) {
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const result = await ImageModel.deleteImage(client, imageId);

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete image:', error);
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    );
  }
}
