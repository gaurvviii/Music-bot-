module.exports = {
    app: {
        token: process.env.DISCORD_TOKEN || 'xxx',
        playing: 'by the Community ❤️',
        global: true,
        guild: process.env.GUILD_ID || 'xxx',
        extraMessages: false,
        loopMessage: false,
        lang: 'en',
        enableEmojis: false,
    },

    // API keys for external services
    freeConvertApiKey: process.env.FREECONVERT_API_KEY || 'api_production_d0985e210aadb99f22a2d803c8976a75c700d2fc13f06a5f5c8c8973b1722535.67eed51a8770f87f98daeef7.67eed53c8770f87f98daef02',

    emojis:{
        'back': '⏪',
        'skip': '⏩',
        'ResumePause': '⏯️',
        'savetrack': '💾',
        'volumeUp': '🔊',
        'volumeDown': '🔉',
        'loop': '🔁',
    },

    opt: {
        DJ: {
            enabled: false,
            roleName: '',
            commands: []
        },
        Translate_Timeout: 10000,
        maxVol: 100,
        spotifyBridge: true,
        volume: 80, // Slightly reduced to prevent distortion
        leaveOnEmpty: true,
        leaveOnEmptyCooldown: 30000,
        leaveOnEnd: true,
        leaveOnEndCooldown: 30000,
        discordPlayer: {
            ytdlOptions: {
                quality: 'highestaudio',
                highWaterMark: 1 << 25, // 32MB buffer
                dlChunkSize: 0, // Disable chunking for smoother streaming
                filter: 'audioonly',
                liveBuffer: 60000, // Increased buffer for live streams
                requestOptions: {
                    maxRetries: 5, // More retry attempts
                    maxRedirects: 10,
                },
                // Better audio bitrate handling
                audioBitrate: 128,
                audioEncoding: "opus"
            },
            connectionOptions: {
                enableLiveBuffer: true,
                // Opus encoder settings
                opusEncoding: true, 
                opusEncodeType: 'frame',
                // Reduce network jitter
                selfDeaf: true,
                samplingRate: 48000
            },
            fetchBeforeQueued: false, // Don't pre-download, stream directly
            smoothVolume: true,
            audioOnlyStream: true, // Ensures we're only getting audio data
            // Simplified FFmpeg options for better streaming performance
            ffmpegFilters: [
                'dynaudnorm=f=200', // Dynamic audio normalization
                'bass=g=2:f=110:w=0.6', // Enhance bass slightly
                'highpass=f=55', // Remove sub-bass frequencies that can cause distortion
                'lowpass=f=16000', // Limit high frequencies that can sound static-like
                'volume=1.0' // Volume adjustment
            ].join(','),
            bufferingTimeout: 10000, // Reduced buffering timeout
            // Stream options
            streamOptions: {
                seek: 0,
                opusEncoding: true
            },
            // Disable problematic extractors
            disableExtractors: [
                'YouTubei' // Disable the problematic YouTubei extractor
            ],
            // Use more reliable extractors
            extractors: [
                'play-dl',
                'Attachment'
            ]
        }
    }
};
