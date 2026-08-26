import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3 from "../config/s3.js";

/**
 * ============================================================================
 * S3 PRESIGNED URL RETRIEVAL (`getFromS3.js`)
 * ============================================================================
 * Generates a time-limited presigned URL for downloading S3 assets.
 * ============================================================================
 * @param {string} fileName - S3 object key
 * @param {number} expiresIn - Expiration window in seconds (default: 3600s / 1 hour)
 */
export const getFromS3 = async (fileName, expiresIn = 3600) => {
    try {
        const command = new GetObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: fileName
        });

        return await getSignedUrl(s3, command, { expiresIn });
    } catch (error) {
        console.error("[S3 Presign] Failed:", error);
        throw error;
    }
};
