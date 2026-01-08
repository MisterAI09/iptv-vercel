const axios = require('axios');
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 60 }); // تخزين مؤقت لمدة دقيقة

module.exports = async (req, res) => {
  // السماح بـ CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const { url, username, password } = req.query;

      if (!url) {
        return res.status(400).json({ error: 'الرجاء إدخال الرابط' });
      }

      // التحقق من التخزين المؤقت
      const cacheKey = `proxy_${Buffer.from(url).toString('base64')}`;
      const cachedResponse = cache.get(cacheKey);
      
      if (cachedResponse) {
        // إرجاع البيانات من الكاش
        return res.status(200).json(cachedResponse);
      }

      // إعداد رؤوس الطلب
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      };

      if (username && password) {
        headers['Authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
      }

      // جلب البيانات
      const response = await axios.get(url, {
        headers,
        responseType: 'stream',
        timeout: 15000
      });

      // إعداد رؤوس الاستجابة
      res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=60');

      // تخزين في الكاش (للبيانات النصية فقط)
      if (response.headers['content-type']?.includes('text')) {
        let data = '';
        response.data.on('data', chunk => data += chunk);
        response.data.on('end', () => {
          cache.set(cacheKey, { data, contentType: response.headers['content-type'] });
        });
        response.data.pipe(res);
      } else {
        response.data.pipe(res);
      }

    } catch (error) {
      console.error('Proxy error:', error.message);
      res.status(500).json({ 
        error: 'فشل في جلب البيانات',
        message: error.message 
      });
    }
  } else {
    res.status(405).json({ error: 'الطريقة غير مسموحة' });
  }
};
