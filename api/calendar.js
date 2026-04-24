// api/calendar.js — Vercel Serverless Function
// Pobiera dane z ForexFactory po stronie serwera (zero CORS)
// Dostępna automatycznie pod adresem /api/calendar

const https = require('https');

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchJSON(res.headers.location).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error('HTTP ' + res.statusCode));
        return;
      }
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error('Parse error')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=1800');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const [thisWeek, nextWeek] = await Promise.allSettled([
      fetchJSON('https://nfs.faireconomy.media/ff_calendar_thisweek.json'),
      fetchJSON('https://nfs.faireconomy.media/ff_calendar_nextweek.json'),
    ]);

    let data = [];
    if (thisWeek.status === 'fulfilled' && Array.isArray(thisWeek.value)) {
      data = data.concat(thisWeek.value);
    }
    if (nextWeek.status === 'fulfilled' && Array.isArray(nextWeek.value)) {
      data = data.concat(nextWeek.value);
    }

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
