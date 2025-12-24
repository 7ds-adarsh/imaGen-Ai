import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';
import { ImageModel } from '../../../lib/models/Image';

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const { prompt, saveToDb = true } = await req.json();

    if (!prompt) {
      return new NextResponse(JSON.stringify({ error: 'Prompt is required' }), {
        status: 400,
      });
    }

    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.HF_API_KEY}`,
        },
        body: JSON.stringify({ inputs: prompt }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return new Response(JSON.stringify({ error: errorData.error || 'Failed to generate image' }), {
        status: response.status,
      });
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes('application/json')) {
      const jsonData = await response.json();
      if (jsonData.error) {
        return new Response(JSON.stringify({ error: jsonData.error }), {
          status: 400,
        });
      }
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const generationTime = Date.now() - startTime;

    // Save to database if requested
    let savedImageId = null;
    if (saveToDb) {
      try {
        const client = await clientPromise;
        savedImageId = await ImageModel.createImage(client, {
          prompt,
          imageData: base64,
          contentType: contentType || 'image/png',
          timestamp: new Date(),
          generationTime,
          isFavorite: false,
        });
      } catch (dbError) {
        console.error('Failed to save to database:', dbError);
        // Continue without failing the request
      }
    }

    return new Response(
      JSON.stringify({
        image: base64,
        type: contentType,
        generationTime,
        savedImageId: savedImageId?.toString()
      }),
      { status: 200 }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'An error occurred' }), {
      status: 500,
    });
  }
}
