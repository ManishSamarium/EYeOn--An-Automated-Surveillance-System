import { v2 as cloudinary } from 'cloudinary';

let isConfigured = false;

/**
 * Lazy initialization of Cloudinary config
 * Only configures when first needed, ensuring env vars are loaded
 */
const ensureCloudinaryConfigured = () => {
  if (!isConfigured) {
    console.log('[CLOUDINARY] Initializing configuration...');
    console.log('[CLOUDINARY] CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? '✓' : '✗ MISSING');
    console.log('[CLOUDINARY] CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? '✓' : '✗ MISSING');
    console.log('[CLOUDINARY] CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '✓' : '✗ MISSING');

    if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_SECRET) {
      throw new Error('Cloudinary credentials missing. Check .env file has CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET');
    }

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });

    console.log('[CLOUDINARY] Configured successfully with cloud_name:', process.env.CLOUDINARY_CLOUD_NAME);
    isConfigured = true;
  }
};

/**
 * Upload file to Cloudinary with retry logic
 * @param {Buffer} fileBuffer - File buffer to upload
 * @param {string} folder - Folder path in Cloudinary (e.g., 'family-images/userId')
 * @param {string} publicId - Public ID for the file (optional)
 * @param {number} retryCount - Current retry attempt (internal use)
 * @returns {Promise} Upload result with secure_url
 */
export const uploadToCloudinary = async (fileBuffer, folder, publicId = null, retryCount = 0) => {
  // Ensure Cloudinary is configured before use
  ensureCloudinaryConfigured();

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 second

  return new Promise((resolve, reject) => {
    try {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          public_id: publicId,
          resource_type: 'auto',
          overwrite: true,
          timeout: 60000 // 60 second timeout
        },
        async (error, result) => {
          if (error) {
            console.error('[CLOUDINARY] Upload error:', error);
            
            // Retry on network errors (ECONNRESET, ETIMEDOUT, etc.)
            if ((error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.errno === -4077) && retryCount < MAX_RETRIES) {
              console.log(`[CLOUDINARY] Retrying upload (${retryCount + 1}/${MAX_RETRIES})...`);
              
              // Wait before retrying
              await new Promise(r => setTimeout(r, RETRY_DELAY * (retryCount + 1)));
              
              try {
                const retryResult = await uploadToCloudinary(fileBuffer, folder, publicId, retryCount + 1);
                resolve(retryResult);
              } catch (retryError) {
                reject(new Error(`Cloudinary upload failed after ${retryCount + 1} retries: ${retryError.message}`));
              }
            } else {
              reject(new Error(`Cloudinary upload failed: ${error.message}`));
            }
          } else {
            console.log('[CLOUDINARY] Upload successful:', result.public_id);
            resolve(result);
          }
        }
      );

      uploadStream.on('error', async (err) => {
        console.error('[CLOUDINARY] Stream error:', err);
        
        // Retry on stream errors
        if ((err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') && retryCount < MAX_RETRIES) {
          console.log(`[CLOUDINARY] Retrying after stream error (${retryCount + 1}/${MAX_RETRIES})...`);
          await new Promise(r => setTimeout(r, RETRY_DELAY * (retryCount + 1)));
          
          try {
            const retryResult = await uploadToCloudinary(fileBuffer, folder, publicId, retryCount + 1);
            resolve(retryResult);
          } catch (retryError) {
            reject(new Error(`Upload stream error after ${retryCount + 1} retries: ${retryError.message}`));
          }
        } else {
          reject(new Error(`Upload stream error: ${err.message}`));
        }
      });

      uploadStream.end(fileBuffer);
    } catch (err) {
      console.error('[CLOUDINARY] Catch error:', err);
      reject(err);
    }
  });
};

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Public ID of the file to delete
 * @returns {Promise} Deletion result
 */
export const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    throw new Error(`Cloudinary delete failed: ${error.message}`);
  }
};

/**
 * Get Cloudinary instance for advanced operations
 * @returns {object} Cloudinary instance
 */
export const getCloudinaryInstance = () => {
  return cloudinary;
};

export default {
  uploadToCloudinary,
  deleteFromCloudinary,
  getCloudinaryInstance
};
