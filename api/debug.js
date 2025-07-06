export default function handler(req, res) {
  res.status(200).json({
    hasApiKey: !!process.env.TMDB_API_KEY,
    apiKeyLength: process.env.TMDB_API_KEY ? process.env.TMDB_API_KEY.length : 0,
    envVars: Object.keys(process.env).filter(key => key.includes('TMDB'))
  });
}