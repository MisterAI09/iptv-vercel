const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// مستخدمين افتراضيين (في الإنتاج استخدم قاعدة بيانات)
const users = [
  {
    id: 1,
    username: 'admin',
    password: '$2a$10$N9qo8uLOickgx2ZMRZoMye.Kh7z2h9Qk7q6f5U7QwY8w8t5zJ4W6C', // admin123
    role: 'admin'
  },
  {
    id: 2,
    username: 'user',
    password: '$2a$10$N9qo8uLOickgx2ZMRZoMye.Kh7z2h9Qk7q6f5U7QwY8w8t5zJ4W6C', // user123
    role: 'user'
  }
];

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
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'الرجاء إدخال جميع البيانات' });
      }

      // البحث عن المستخدم
      const user = users.find(u => u.username === username);
      
      if (!user) {
        return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
      }

      // التحقق من كلمة المرور
      const validPassword = await bcrypt.compare(password, user.password);
      
      if (!validPassword) {
        return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
      }

      // إنشاء توكن
      const token = jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      res.status(200).json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });

    } catch (error) {
      console.error('Auth error:', error);
      res.status(500).json({ error: 'حدث خطأ في الخادم' });
    }
  } else if (req.method === 'GET') {
    // التحقق من التوكن
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'غير مصرح' });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      res.status(200).json({ valid: true, user: decoded });
    } catch (error) {
      res.status(401).json({ error: 'توكن غير صالح' });
    }
  } else {
    res.status(405).json({ error: 'الطريقة غير مسموحة' });
  }
};
