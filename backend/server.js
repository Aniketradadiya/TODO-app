const express = require('express');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

const PORT = process.env.PORT || 3000;

// Database connection details
let pool;

async function initDB() {
  const dbUrl = process.env.DATABASE_URL || process.env.JAWSDB_URL || process.env.CLEARDB_DATABASE_URL;

  if (dbUrl) {
    console.log('Connecting to database using connection URL...');
    pool = mysql.createPool(dbUrl);
  } else {
    console.log('Connecting to database using individual host config...');
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: parseInt(process.env.DB_PORT || '3306', 10),
    };

    // Connect first without database name to ensure it exists
    try {
      const connection = await mysql.createConnection(dbConfig);
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'focusflow'}\``);
      await connection.end();
    } catch (err) {
      console.warn('Warning: Could not create database. It may already exist or user lacks permission:', err.message);
    }

    // Create connection pool with database selected
    pool = mysql.createPool({
      ...dbConfig,
      database: process.env.DB_NAME || 'focusflow',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  // Create tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      avatar TEXT,
      theme VARCHAR(10) DEFAULT 'light'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(50) NOT NULL,
      UNIQUE KEY unique_user_category (user_id, name),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id VARCHAR(50) PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      completed BOOLEAN DEFAULT FALSE,
      category VARCHAR(50) NOT NULL,
      priority VARCHAR(20) NOT NULL,
      deadline VARCHAR(50),
      created_at BIGINT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  console.log('Database initialized successfully.');
}

async function getUserIdByUsername(username) {
  if (!username) return null;
  const [rows] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
  return rows.length > 0 ? rows[0].id : null;
}

// Auth Middleware
async function authMiddleware(req, res, next) {
  const username = req.headers['x-username'];
  if (!username) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  const userId = await getUserIdByUsername(username);
  if (!userId) {
    return res.status(401).json({ error: 'User does not exist.' });
  }
  req.userId = userId;
  req.username = username;
  next();
}

// --- Auth Endpoints ---

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, avatar } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256&h=256';
    const [userResult] = await pool.query(
      'INSERT INTO users (username, password, avatar) VALUES (?, ?, ?)',
      [username, password, avatar || defaultAvatar]
    );
    const userId = userResult.insertId;

    // Default categories
    const categories = ['Work', 'Personal', 'Shopping'];
    for (const cat of categories) {
      await pool.query('INSERT INTO categories (user_id, name) VALUES (?, ?)', [userId, cat]);
    }

    // Default tasks templates
    const now = Date.now();
    const defaultTasks = [
      { id: `task-1-${now}`, title: 'Finalize FocusFlow UI Style Guide', completed: false, category: 'Work', priority: 'High', deadline: '', created_at: now - 3600000 * 4 },
      { id: `task-2-${now}`, title: 'Review team performance metrics', completed: false, category: 'Work', priority: 'Medium', deadline: '', created_at: now - 3600000 * 2 },
      { id: `task-3-${now}`, title: 'Send weekly newsletter', completed: true, category: 'Personal', priority: 'Low', deadline: '', created_at: now - 3600000 * 24 },
      { id: `task-4-${now}`, title: 'Quarterly budget planning meeting', completed: false, category: 'Work', priority: 'High', deadline: '', created_at: now - 3600000 * 12 },
      { id: `task-5-${now}`, title: 'Complete quarterly project proposal', completed: false, category: 'Work', priority: 'High', deadline: '', created_at: now - 3600000 * 18 },
      { id: `task-6-${now}`, title: 'Update client roadmap', completed: false, category: 'Work', priority: 'Medium', deadline: '', created_at: now - 3600000 * 6 }
    ];

    for (const task of defaultTasks) {
      await pool.query(
        'INSERT INTO tasks (id, user_id, title, completed, category, priority, deadline, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [task.id, userId, task.title, task.completed, task.category, task.priority, task.deadline, task.created_at]
      );
    }

    res.status(201).json({ username, avatar: avatar || defaultAvatar, theme: 'light' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0 || rows[0].password !== password) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }

    const user = rows[0];
    res.json({ username: user.username, avatar: user.avatar, theme: user.theme });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// --- Tasks Endpoints ---

app.get('/api/tasks', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, title, completed, category, priority, deadline, created_at AS createdAt FROM tasks WHERE user_id = ?',
      [req.userId]
    );
    const tasks = rows.map(r => ({
      ...r,
      completed: !!r.completed
    }));
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tasks.' });
  }
});

app.post('/api/tasks', authMiddleware, async (req, res) => {
  try {
    const { id, title, completed, category, priority, deadline, createdAt } = req.body;
    await pool.query(
      'INSERT INTO tasks (id, user_id, title, completed, category, priority, deadline, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, req.userId, title, completed ? 1 : 0, category, priority, deadline || '', createdAt]
    );
    res.status(201).json({ message: 'Task created.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create task.' });
  }
});

app.put('/api/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, completed, category, priority, deadline } = req.body;
    
    const updates = [];
    const params = [];
    
    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (completed !== undefined) { updates.push('completed = ?'); params.push(completed ? 1 : 0); }
    if (category !== undefined) { updates.push('category = ?'); params.push(category); }
    if (priority !== undefined) { updates.push('priority = ?'); params.push(priority); }
    if (deadline !== undefined) { updates.push('deadline = ?'); params.push(deadline); }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }
    
    params.push(id, req.userId);
    await pool.query(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );
    res.json({ message: 'Task updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update task.' });
  }
});

app.delete('/api/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM tasks WHERE id = ? AND user_id = ?', [id, req.userId]);
    res.json({ message: 'Task deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete task.' });
  }
});

// --- Categories Endpoints ---

app.get('/api/categories', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT name FROM categories WHERE user_id = ?', [req.userId]);
    res.json(rows.map(r => r.name));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch categories.' });
  }
});

app.post('/api/categories', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required.' });
    
    await pool.query('INSERT INTO categories (user_id, name) VALUES (?, ?)', [req.userId, name]);
    res.status(201).json({ message: 'Category added.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add category.' });
  }
});

app.delete('/api/categories/:name', authMiddleware, async (req, res) => {
  try {
    const { name } = req.params;
    await pool.query('DELETE FROM categories WHERE user_id = ? AND name = ?', [req.userId, name]);
    await pool.query('UPDATE tasks SET category = ? WHERE user_id = ? AND category = ?', ['Personal', req.userId, name]);
    res.json({ message: 'Category deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete category.' });
  }
});

// --- User Profile & Theme Endpoints ---

app.get('/api/profile', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT username, avatar, theme FROM users WHERE id = ?', [req.userId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found.' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

app.put('/api/profile', authMiddleware, async (req, res) => {
  try {
    const { username, avatar } = req.body;
    
    if (username) {
      if (username.toLowerCase() !== req.username.toLowerCase()) {
        const [exists] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
        if (exists.length > 0) {
          return res.status(400).json({ error: 'Username is already taken.' });
        }
      }
      await pool.query('UPDATE users SET username = ? WHERE id = ?', [username, req.userId]);
    }
    
    if (avatar) {
      await pool.query('UPDATE users SET avatar = ? WHERE id = ?', [avatar, req.userId]);
    }
    
    res.json({ message: 'Profile updated.', username: username || req.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

app.put('/api/theme', authMiddleware, async (req, res) => {
  try {
    const { theme } = req.body;
    await pool.query('UPDATE users SET theme = ? WHERE id = ?', [theme, req.userId]);
    res.json({ message: 'Theme updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update theme.' });
  }
});

app.post('/api/reset', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE user_id = ?', [req.userId]);
    await pool.query('DELETE FROM categories WHERE user_id = ?', [req.userId]);
    
    const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256&h=256';
    await pool.query('UPDATE users SET avatar = ?, theme = ? WHERE id = ?', [defaultAvatar, 'light', req.userId]);

    const categories = ['Work', 'Personal', 'Shopping'];
    for (const cat of categories) {
      await pool.query('INSERT INTO categories (user_id, name) VALUES (?, ?)', [req.userId, cat]);
    }

    const now = Date.now();
    const defaultTasks = [
      { id: `task-1-${now}`, title: 'Finalize FocusFlow UI Style Guide', completed: false, category: 'Work', priority: 'High', deadline: '', created_at: now - 3600000 * 4 },
      { id: `task-2-${now}`, title: 'Review team performance metrics', completed: false, category: 'Work', priority: 'Medium', deadline: '', created_at: now - 3600000 * 2 },
      { id: `task-3-${now}`, title: 'Send weekly newsletter', completed: true, category: 'Personal', priority: 'Low', deadline: '', created_at: now - 3600000 * 24 },
      { id: `task-4-${now}`, title: 'Quarterly budget planning meeting', completed: false, category: 'Work', priority: 'High', deadline: '', created_at: now - 3600000 * 12 },
      { id: `task-5-${now}`, title: 'Complete quarterly project proposal', completed: false, category: 'Work', priority: 'High', deadline: '', created_at: now - 3600000 * 18 },
      { id: `task-6-${now}`, title: 'Update client roadmap', completed: false, category: 'Work', priority: 'Medium', deadline: '', created_at: now - 3600000 * 6 }
    ];

    for (const task of defaultTasks) {
      await pool.query(
        'INSERT INTO tasks (id, user_id, title, completed, category, priority, deadline, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [task.id, req.userId, task.title, task.completed, task.category, task.priority, task.deadline, task.created_at]
      );
    }

    res.json({ message: 'Database reset completed.', avatar: defaultAvatar, theme: 'light' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reset data.' });
  }
});

// --- Workbench Endpoints ---

app.get('/api/workbench/tables', authMiddleware, async (req, res) => {
  try {
    const dbName = process.env.DB_NAME || 'focusflow';
    const [tableRows] = await pool.query('SHOW TABLES');
    const key = `Tables_in_${dbName}`;
    const tables = tableRows.map(row => row[key] || Object.values(row)[0]);

    const tableData = [];
    for (const table of tables) {
      // Get count
      const [countRows] = await pool.query(`SELECT COUNT(*) as count FROM \`${table}\``);
      const count = countRows[0].count;

      // Get columns
      const [colRows] = await pool.query(`DESCRIBE \`${table}\``);
      const columns = colRows.map(col => ({
        name: col.Field,
        type: col.Type,
        null: col.Null,
        key: col.Key,
        default: col.Default,
        extra: col.Extra
      }));

      tableData.push({
        name: table,
        count,
        columns
      });
    }

    res.json({ tables: tableData });
  } catch (err) {
    console.error('Workbench error fetching tables:', err);
    res.status(500).json({ error: 'Failed to fetch table metadata: ' + err.message });
  }
});

app.post('/api/workbench/query', authMiddleware, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required.' });
    }

    const start = Date.now();
    const [results, fields] = await pool.query(query);
    const duration = Date.now() - start;

    // Check if it's a SELECT / SHOW / DESCRIBE query or other
    const isSelect = Array.isArray(results) && (!results.constructor || results.constructor.name !== 'ResultSetHeader');
    
    if (isSelect) {
      const columns = fields ? fields.map(f => f.name) : [];
      return res.json({
        type: 'select',
        columns,
        rows: results,
        duration,
        affectedRows: results.length
      });
    } else {
      return res.json({
        type: 'mutation',
        duration,
        affectedRows: results.affectedRows || 0,
        insertId: results.insertId || null,
        info: results.info || ''
      });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Bootstrap Node App
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize server database:', err);
  process.exit(1);
});
