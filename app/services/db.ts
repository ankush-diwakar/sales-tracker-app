// app/services/db.ts
import { neon } from '@neondatabase/serverless';
import * as SecureStore from 'expo-secure-store';

const DATABASE_URL = process.env.EXPO_PUBLIC_DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('EXPO_PUBLIC_DATABASE_URL is not defined in environment variables');
}

const sql = neon(DATABASE_URL);

// --- USER AUTHENTICATION ---

// 1. Sign Up New User
export async function registerUser(fullName: string, businessName: string, username: string, password: string) {
  try {
    // Check if user exists first
    const existing = await sql`SELECT id FROM users WHERE username = ${username}`;
    if (existing.length > 0) return { success: false, error: "Username already taken" };

    // Insert new user
    // Note: In production, you should hash the password using expo-crypto before sending!
    const result = await sql`
      INSERT INTO users (full_name, business_name, username, password_hash)
      VALUES (${fullName}, ${businessName}, ${username}, ${password})
      RETURNING id, full_name, business_name;
    `;

    return { success: true, user: result[0] };
  } catch (error) {
    console.error("Signup Error:", error);
    return { success: false, error: "Database error" };
  }
}

export async function checkSession() {
  try {
    const userId = await SecureStore.getItemAsync('user_id');
    const expiryString = await SecureStore.getItemAsync('session_expiry');

    if (!userId || !expiryString) return false;

    const expiryTime = parseInt(expiryString);
    const currentTime = Date.now();

    // Check if session has expired
    if (currentTime > expiryTime) {
      // Session expired: Clear data
      await logoutUser();
      return false;
    }

    // Session is valid
    return true;
  } catch (error) {
    return false;
  }
}

// 2. Login User
export async function loginUser(username: string, password: string) {
  try {
    const users = await sql`
      SELECT id, full_name, business_name, password_hash 
      FROM users 
      WHERE username = ${username}
    `;

    if (users.length === 0) return { success: false, error: "User not found" };

    const user = users[0];

    if (user.password_hash === password) {
      // --- NEW: Calculate 3 Days from now ---
      const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
      const expiryTime = Date.now() + threeDaysInMs;

      // Save session data AND expiry time
      await SecureStore.setItemAsync('user_id', user.id.toString());
      await SecureStore.setItemAsync('business_name', user.business_name);
      await SecureStore.setItemAsync('session_expiry', expiryTime.toString());

      return { success: true, user };
    } else {
      return { success: false, error: "Invalid password" };
    }
  } catch (error) {
    console.error("Login Error:", error);
    return { success: false, error: "Connection failed" };
  }
}



export async function logoutUser() {
  await SecureStore.deleteItemAsync('user_id');
  await SecureStore.deleteItemAsync('business_name');
  await SecureStore.deleteItemAsync('session_expiry');
}

// --- SALES LOGIC ---

// 3. Add a New Sale
export async function addSale(itemName: string, category: string, sellingPrice: number, costPrice: number) {
  try {
    // Get current logged in user
    const userId = await SecureStore.getItemAsync('user_id');
    if (!userId) return { success: false, error: "User not logged in" };

    await sql`
      INSERT INTO sales (user_id, item_name, category, selling_price, cost_price)
      VALUES (${parseInt(userId)}, ${itemName}, ${category}, ${sellingPrice}, ${costPrice})
    `;
    return { success: true };
  } catch (error) {
    console.error("Add Sale Error:", error);
    return { success: false, error: "Could not save sale" };
  }
}


// 5. Delete a Sale
export async function deleteSale(saleId: number) {
  try {
    await sql`DELETE FROM sales WHERE id = ${saleId}`;
    return { success: true };
  } catch (error) {
    console.error("Delete Error:", error);
    return { success: false, error: "Could not delete sale" };
  }
}

// 6. Update a Sale
export async function updateSale(saleId: number, itemName: string, category: string, sellingPrice: number, costPrice: number) {
  try {
    await sql`
      UPDATE sales 
      SET item_name = ${itemName}, 
          category = ${category}, 
          selling_price = ${sellingPrice}, 
          cost_price = ${costPrice}
      WHERE id = ${saleId}
    `;
    return { success: true };
  } catch (error) {
    console.error("Update Error:", error);
    return { success: false, error: "Could not update sale" };
  }
}
// 4. Get Today's Stats (For Home Screen)
export async function getDashboardStats() {
  try {
    const userId = await SecureStore.getItemAsync('user_id');
    if (!userId) return null;

    // Fetch sales for ONLY today
    const sales = await sql`
            SELECT * FROM sales 
            WHERE user_id = ${parseInt(userId)} 
            AND sale_date >= CURRENT_DATE
            ORDER BY sale_date DESC
        `;

    // Calculate totals manually or via SQL
    const totalSales = sales.reduce((sum, item) => sum + parseFloat(item.selling_price), 0);
    const totalProfit = sales.reduce((sum, item) => sum + parseFloat(item.profit), 0);

    return { sales, totalSales, totalProfit };
  } catch (error) {
    console.error("Stats Error:", error);
    return null;
  }
}
export async function getAnalyticsData(timeRange: 'Today' | 'Week' | 'Month') {
  try {
    const userId = await SecureStore.getItemAsync('user_id');
    if (!userId) return null;

    // 1. Fetch Sales
    const sales = await sql`
      SELECT * FROM sales 
      WHERE user_id = ${parseInt(userId)}
      AND (
        (${timeRange} = 'Today' AND sale_date >= CURRENT_DATE) OR
        (${timeRange} = 'Week' AND sale_date >= CURRENT_DATE - INTERVAL '7 days') OR
        (${timeRange} = 'Month' AND sale_date >= CURRENT_DATE - INTERVAL '30 days')
      )
      ORDER BY sale_date ASC
    `;

    // --- DATA PROCESSING ---

    const categoryProfitMap: any = {};
    const itemMap: any = {};
    const timeSeriesMap: any = {};

    sales.forEach(sale => {
      const profit = parseFloat(sale.profit);

      // A. For Bar/Pie Chart (Category Grouping)
      if (!categoryProfitMap[sale.category]) categoryProfitMap[sale.category] = 0;
      categoryProfitMap[sale.category] += profit;

      // B. For Trending List
      const key = sale.item_name;
      if (!itemMap[key]) itemMap[key] = { name: key, count: 0, category: sale.category, totalProfit: 0 };
      itemMap[key].count += 1;
      itemMap[key].totalProfit += profit;

      // C. For Area Chart (Time Grouping)
      const dateObj = new Date(sale.sale_date);
      let timeKey = '';

      if (timeRange === 'Today') {
        // Group by Hour (e.g., "14:00")
        timeKey = dateObj.getHours() + ':00';
      } else {
        // Group by Date (e.g., "10 Jan")
        const day = dateObj.getDate();
        const month = dateObj.toLocaleString('default', { month: 'short' });
        timeKey = `${day} ${month}`;
      }

      if (!timeSeriesMap[timeKey]) timeSeriesMap[timeKey] = 0;
      timeSeriesMap[timeKey] += profit;
    });

    // 3. Format Bar Data
    const barData = Object.keys(categoryProfitMap).map(cat => ({
      value: categoryProfitMap[cat],
      label: cat.split(' ')[0],
    }));

    // 4. Format Line/Area Data
    const lineData = Object.keys(timeSeriesMap).map(time => ({
      value: timeSeriesMap[time],
      label: time,
      dataPointText: Math.round(timeSeriesMap[time]).toString(),
    }));

    // 5. Format Trending
    const trendingItems = Object.values(itemMap).sort((a: any, b: any) => b.totalProfit - a.totalProfit);

    return { barData, lineData, trendingItems };

  } catch (error) {
    console.error("Analytics Error:", error);
    return null;
  }
}

export async function getUserProfile() {
  try {
    const userId = await SecureStore.getItemAsync('user_id');
    if (!userId) return null;

    const result = await sql`
      SELECT id, full_name, business_name, username, profile_image 
      FROM users 
      WHERE id = ${parseInt(userId)}
    `;

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("Get Profile Error:", error);
    return null;
  }
}

// 9. Update User Profile
export async function updateUserProfile(fullName: string, businessName: string, base64Image: string | null) {
  try {
    const userId = await SecureStore.getItemAsync('user_id');
    if (!userId) return { success: false, error: "User not logged in" };

    // Update logic: If image is provided, update it. If not, keep existing.
    if (base64Image) {
      await sql`
            UPDATE users 
            SET full_name = ${fullName}, 
                business_name = ${businessName},
                profile_image = ${base64Image}
            WHERE id = ${parseInt(userId)}
        `;
    } else {
      await sql`
            UPDATE users 
            SET full_name = ${fullName}, 
                business_name = ${businessName}
            WHERE id = ${parseInt(userId)}
        `;
    }

    // Update local storage for immediate app-wide consistency
    await SecureStore.setItemAsync('business_name', businessName);

    return { success: true };
  } catch (error) {
    console.error("Update Profile Error:", error);
    return { success: false, error: "Update failed" };
  }
}