import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Authenticate with Google Drive
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // Convert File to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Google Drive
    const response = await drive.files.create({
      requestBody: {
        name: `${Date.now()}_${file.name}`,
        mimeType: file.type,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!],
      },
      media: {
        mimeType: file.type,
        body: require('stream').Readable.from(buffer),
      },
      fields: 'id, name, webViewLink, webContentLink, mimeType, size',
    });

    // Make file publicly accessible (read-only)
    await drive.permissions.create({
      fileId: response.data.id!,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    // Get the updated file with public link
    const updatedFile = await drive.files.get({
      fileId: response.data.id!,
      fields: 'id, name, webViewLink, webContentLink, thumbnailLink',
    });

    return NextResponse.json({
      success: true,
      file: {
        id: updatedFile.data.id,
        name: file.name,
        url: updatedFile.data.webViewLink,
        downloadUrl: updatedFile.data.webContentLink,
        thumbnailUrl: updatedFile.data.thumbnailLink,
        mimeType: file.type,
        size: file.size,
      },
    });
  } catch (error) {
    console.error('Google Drive upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file to Google Drive' },
      { status: 500 }
    );
  }
}
