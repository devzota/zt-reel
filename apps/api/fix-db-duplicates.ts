import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://root:rootpassword@localhost:5432/ztreel?schema=public';
const pool = new Pool({ connectionString });

async function fixDatabase() {
  console.log('Bắt đầu dọn dẹp và sửa lỗi trùng lặp dữ liệu...');
  try {
    // 1. Xoá lịch sử bị đúp (giữ lại bản ghi cũ nhất)
    const resHistory = await pool.query(`
      DELETE FROM ztteam_reel_history a USING (
        SELECT MIN(ctid) as ctid, page_id, wp_post_id
        FROM ztteam_reel_history 
        GROUP BY page_id, wp_post_id HAVING COUNT(*) > 1
      ) b
      WHERE a.page_id = b.page_id 
      AND a.wp_post_id = b.wp_post_id 
      AND a.ctid <> b.ctid;
    `);
    console.log(`Đã dọn dẹp xong ${resHistory.rowCount} bản ghi lịch sử đúp.`);

    // 2. Xoá video (reels) bị đúp (giữ lại bản ghi cũ nhất)
    const resReels = await pool.query(`
      DELETE FROM ztteam_reels a USING (
        SELECT MIN(ctid) as ctid, page_id, wp_post_id
        FROM ztteam_reels 
        GROUP BY page_id, wp_post_id HAVING COUNT(*) > 1
      ) b
      WHERE a.page_id = b.page_id 
      AND a.wp_post_id = b.wp_post_id 
      AND a.ctid <> b.ctid;
    `);
    console.log(`Đã dọn dẹp xong ${resReels.rowCount} video đúp.`);

    // 3. Ép tạo UNIQUE INDEX để khoá chặn (nếu chưa có)
    try {
      await pool.query(`
        CREATE UNIQUE INDEX ztteam_reel_history_page_id_wp_post_id_key 
        ON ztteam_reel_history (page_id, wp_post_id);
      `);
      console.log('Đã tạo thành công khóa chặn (UNIQUE INDEX) trên Database!');
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log('Khóa chặn đã tồn tại trên Database, bỏ qua.');
      } else {
        throw e;
      }
    }
    
    console.log('Hoàn tất! Database đã được bảo vệ khỏi lỗi tạo đúp.');
  } catch (error) {
    console.error('Lỗi trong quá trình sửa Database:', error);
  } finally {
    await pool.end();
  }
}

fixDatabase().then(() => process.exit(0));
