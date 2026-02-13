import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { mkdir } from 'fs/promises';

export async function POST(request: Request) {
    try {
        const data = await request.formData();
        const file: File | null = data.get('file') as unknown as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Ensure directory exists
        const uploadDir = join(process.cwd(), 'public', 'uploads');
        try {
            await mkdir(uploadDir, { recursive: true });
        } catch (e) {
            // ignore if exists
        }

        // Create unique filename or just overwrite 'logo.jpg'?
        // The user might want to keep the original name or just 'logo'
        // Let's keep original name but sanitize it? Or just use a standard name 'logo_timestamp.ext'
        // Using original name is friendlier for "which file did I upload?"
        const filename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filepath = join(uploadDir, filename);

        await writeFile(filepath, buffer);

        // Return the path relative to public (for URL) and absolute (for email attachment if needed, though we can reconstruct)
        // actually we just need to return the filename or relative path
        const publicUrl = `/uploads/${filename}`;

        return NextResponse.json({
            success: true,
            filename: filename,
            publicUrl: publicUrl
        });

    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
