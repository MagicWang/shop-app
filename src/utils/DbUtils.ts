import pg from 'pg';
const config = require('../../config/pg.json');

export class DbUtils {
  private static pool: pg.Pool = new pg.Pool(config);
  /**
   * 执行sql语句
   */
  public static async executeSql(queryText: string, values?: any[]) {
    return await this.pool.query(queryText, values);
  }
}
