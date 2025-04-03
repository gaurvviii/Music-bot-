const axios = require('axios');
const { createAudioResource, StreamType } = require('@discordjs/voice');

/**
 * Extract YouTube video ID from various URL formats
 * @param {string} url - YouTube URL
 * @returns {string|null} - Video ID or null if invalid
 */
function extractYoutubeVideoId(url) {
    try {
        // Handle youtu.be format
        if (url.includes('youtu.be')) {
            const urlParts = url.split('/');
            return urlParts[urlParts.length - 1].split('?')[0];
        } 
        // Handle youtube.com format
        else if (url.includes('youtube.com')) {
            // Handle watch URLs
            if (url.includes('/watch?v=')) {
                const urlObj = new URL(url);
                return urlObj.searchParams.get('v');
            }
            // Handle shorts
            else if (url.includes('/shorts/')) {
                const shortsPath = url.split('/shorts/')[1];
                return shortsPath.split('?')[0];
            }
        }
        return null;
    } catch (error) {
        console.error('Error extracting YouTube video ID:', error);
        return null;
    }
}

/**
 * Get audio stream URL from cnvmp3.com
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<Object>} - Object containing audio URL and metadata
 */
async function getYoutubeAudioUrl(videoId) {
    try {
        // First request to get the conversion started
        const response = await axios.get(`https://cnvmp3.com/v23/api/single/mp3/${videoId}`);
        
        if (!response.data || !response.data.id) {
            throw new Error('Failed to get conversion ID');
        }
        
        const conversionId = response.data.id;
        const title = response.data.title || 'YouTube Audio';
        const author = response.data.author || 'Unknown Artist';
        const duration = response.data.duration || '0:00';
        const thumbnail = response.data.thumbnail || null;
        
        // Second request to get the download URL
        const statusResponse = await axios.get(`https://cnvmp3.com/v23/api/mp3/${conversionId}`);
        
        if (!statusResponse.data || !statusResponse.data.url) {
            throw new Error('Failed to get audio URL');
        }
        
        return {
            url: statusResponse.data.url,
            title,
            author,
            duration,
            thumbnail
        };
    } catch (error) {
        console.error('Error getting YouTube audio URL:', error);
        throw error;
    }
}

/**
 * Create an audio resource from a YouTube URL using cnvmp3.com
 * @param {string} youtubeUrl - YouTube URL
 * @returns {Promise<Object>} - Object containing audio resource and metadata
 */
async function createYoutubeAudioResource(youtubeUrl) {
    try {
        const videoId = extractYoutubeVideoId(youtubeUrl);
        
        if (!videoId) {
            throw new Error('Invalid YouTube URL');
        }
        
        console.log(`Extracting audio for YouTube video ID: ${videoId}`);
        
        const audioData = await getYoutubeAudioUrl(videoId);
        
        console.log(`Got audio URL: ${audioData.url}`);
        
        // Create a stream from the audio URL
        const response = await axios({
            method: 'get',
            url: audioData.url,
            responseType: 'stream'
        });
        
        // Create an audio resource from the stream
        const resource = createAudioResource(response.data, {
            inputType: StreamType.Arbitrary,
            inlineVolume: true
        });
        
        return {
            resource,
            metadata: {
                title: audioData.title,
                author: audioData.author,
                duration: audioData.duration,
                thumbnail: audioData.thumbnail,
                url: youtubeUrl
            }
        };
    } catch (error) {
        console.error('Error creating YouTube audio resource:', error);
        throw error;
    }
}

module.exports = {
    extractYoutubeVideoId,
    getYoutubeAudioUrl,
    createYoutubeAudioResource
};
