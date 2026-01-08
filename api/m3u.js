const axios = require('axios');
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 }); // تخزين مؤقت لمدة 5 دقائق

module.exports = async (req, res) => {
  // السماح بـ CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const { url, username, password } = req.body;

      if (!url) {
        return res.status(400).json({ error: 'الرجاء إدخال رابط M3U' });
      }

      // التحقق من التخزين المؤقت
      const cacheKey = `m3u_${Buffer.from(url).toString('base64')}`;
      const cachedData = cache.get(cacheKey);
      
      if (cachedData) {
        return res.status(200).json(cachedData);
      }

      // إعداد رؤوس الطلب
      const headers = {};
      if (username && password) {
        headers['Authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
      }

      // جلب ملف M3U
      const response = await axios.get(url, { 
        headers,
        timeout: 10000 
      });

      const m3uContent = response.data;
      const channels = parseM3U(m3uContent);

      const result = {
        success: true,
        url: url,
        count: channels.length,
        channels: channels.slice(0, 100), // الحد إلى 100 قناة للاختبار
        categories: [...new Set(channels.map(ch => ch.category).filter(Boolean))]
      };

      // تخزين في الكاش
      cache.set(cacheKey, result);

      res.status(200).json(result);

    } catch (error) {
      console.error('M3U parsing error:', error.message);
      
      // في حالة الفشل، إرجاع قنوات تجريبية
      const demoChannels = generateDemoChannels();
      
      res.status(200).json({
        success: false,
        error: error.message,
        message: 'تم استخدام قنوات تجريبية',
        count: demoChannels.length,
        channels: demoChannels,
        categories: [...new Set(demoChannels.map(ch => ch.category))]
      });
    }
  } else {
    res.status(405).json({ error: 'الطريقة غير مسموحة' });
  }
};

// دالة لتحليل ملف M3U
function parseM3U(content) {
  const channels = [];
  const lines = content.split('\n');
  
  let currentChannel = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('#EXTINF:')) {
      currentChannel = {};
      
      // استخراج معلومات القناة
      const infoMatch = line.match(/#EXTINF:(-?\d+)\s*(.*?),(.*)/);
      if (infoMatch) {
        currentChannel.duration = infoMatch[1];
        const attributes = infoMatch[2];
        currentChannel.name = infoMatch[3].trim();
        
        // استخراج السمات
        const logoMatch = attributes.match(/tvg-logo="([^"]+)"/);
        if (logoMatch) currentChannel.logo = logoMatch[1];
        
        const groupMatch = attributes.match(/group-title="([^"]+)"/);
        if (groupMatch) currentChannel.category = groupMatch[1];
        
        const idMatch = attributes.match(/tvg-id="([^"]+)"/);
        if (idMatch) currentChannel.id = idMatch[1];
      }
    } else if (line && !line.startsWith('#') && currentChannel) {
      currentChannel.url = line.trim();
      currentChannel.id = currentChannel.id || `channel_${channels.length + 1}`;
      
      channels.push(currentChannel);
      currentChannel = null;
    }
  }
  
  return channels;
}

// توليد قنوات تجريبية
function generateDemoChannels() {
  return [
    {
      id: 'demo1',
      name: 'BeIN Sports 1 HD',
      category: 'رياضة',
      logo: 'https://i.imgur.com/1.png',
      url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8'
    },
    {
      id: 'demo2',
      name: 'BeIN Sports 2 HD',
      category: 'رياضة',
      logo: 'https://i.imgur.com/2.png',
      url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8'
    },
    {
      id: 'demo3',
      name: 'MBC 1',
      category: 'ترفيه',
      logo: 'https://i.imgur.com/3.png',
      url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8'
    },
    {
      id: 'demo4',
      name: 'Al Jazeera',
      category: 'أخبار',
      logo: 'https://i.imgur.com/4.png',
      url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8'
    },
    {
      id: 'demo5',
      name: 'Rotana',
      category: 'موسيقى',
      logo: 'https://i.imgur.com/5.png',
      url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8'
    }
  ];
}
