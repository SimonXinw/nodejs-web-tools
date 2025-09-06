-- 金价数据表创建脚本
-- 在 Supabase 的 SQL 编辑器中执行此脚本

-- 创建金价数据表
CREATE TABLE IF NOT EXISTS gold_prices (
  id SERIAL PRIMARY KEY,
  price DECIMAL(10, 2) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source VARCHAR(50) NOT NULL DEFAULT 'investing.com',
  currency VARCHAR(10) DEFAULT 'USD',
  market VARCHAR(20) DEFAULT 'COMEX',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_gold_prices_timestamp ON gold_prices(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_gold_prices_source ON gold_prices(source);
CREATE INDEX IF NOT EXISTS idx_gold_prices_created_at ON gold_prices(created_at DESC);

-- 创建复合索引
CREATE INDEX IF NOT EXISTS idx_gold_prices_timestamp_source ON gold_prices(timestamp DESC, source);

-- 添加表注释
COMMENT ON TABLE gold_prices IS '金价历史数据表';
COMMENT ON COLUMN gold_prices.id IS '主键ID';
COMMENT ON COLUMN gold_prices.price IS '金价（美元/盎司）';
COMMENT ON COLUMN gold_prices.timestamp IS '数据时间戳';
COMMENT ON COLUMN gold_prices.source IS '数据来源';
COMMENT ON COLUMN gold_prices.currency IS '货币单位';
COMMENT ON COLUMN gold_prices.market IS '市场类型';
COMMENT ON COLUMN gold_prices.created_at IS '记录创建时间';

-- 启用行级安全策略（RLS）
ALTER TABLE gold_prices ENABLE ROW LEVEL SECURITY;

-- 创建策略：允许所有用户读取数据
CREATE POLICY "Allow public read access" ON gold_prices
  FOR SELECT USING (true);

-- 创建策略：允许服务角色插入数据（需要使用 service_role key）
CREATE POLICY "Allow service role insert" ON gold_prices
  FOR INSERT WITH CHECK (true);

-- 创建视图：最新金价
CREATE OR REPLACE VIEW latest_gold_price AS
SELECT 
  price,
  timestamp,
  source,
  currency,
  market
FROM gold_prices 
ORDER BY timestamp DESC 
LIMIT 1;

-- 创建视图：每日金价统计
CREATE OR REPLACE VIEW daily_gold_stats AS
SELECT 
  DATE(timestamp) as date,
  MIN(price) as low_price,
  MAX(price) as high_price,
  AVG(price) as avg_price,
  FIRST_VALUE(price) OVER (PARTITION BY DATE(timestamp) ORDER BY timestamp ASC) as open_price,
  FIRST_VALUE(price) OVER (PARTITION BY DATE(timestamp) ORDER BY timestamp DESC) as close_price,
  COUNT(*) as record_count
FROM gold_prices 
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- 创建函数：清理过期数据
CREATE OR REPLACE FUNCTION cleanup_old_gold_prices(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM gold_prices 
  WHERE timestamp < NOW() - INTERVAL '1 day' * days_to_keep;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 创建函数：获取价格变化统计
CREATE OR REPLACE FUNCTION get_price_change_stats(hours_back INTEGER DEFAULT 24)
RETURNS TABLE(
  current_price DECIMAL,
  previous_price DECIMAL,
  price_change DECIMAL,
  change_percent DECIMAL,
  high_price DECIMAL,
  low_price DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH recent_prices AS (
    SELECT price, timestamp
    FROM gold_prices 
    WHERE timestamp >= NOW() - INTERVAL '1 hour' * hours_back
    ORDER BY timestamp DESC
  ),
  stats AS (
    SELECT 
      FIRST_VALUE(price) OVER (ORDER BY timestamp DESC) as curr_price,
      LAG(FIRST_VALUE(price) OVER (ORDER BY timestamp DESC), 1) OVER (ORDER BY timestamp DESC) as prev_price,
      MAX(price) OVER () as max_price,
      MIN(price) OVER () as min_price
    FROM recent_prices
    LIMIT 1
  )
  SELECT 
    curr_price,
    COALESCE(prev_price, curr_price),
    curr_price - COALESCE(prev_price, curr_price),
    CASE 
      WHEN COALESCE(prev_price, 0) > 0 
      THEN ((curr_price - COALESCE(prev_price, curr_price)) / prev_price * 100)
      ELSE 0 
    END,
    max_price,
    min_price
  FROM stats;
END;
$$ LANGUAGE plpgsql;

-- 插入示例数据（可选）
-- INSERT INTO gold_prices (price, timestamp, source) VALUES 
--   (2050.25, NOW() - INTERVAL '2 hours', 'investing.com'),
--   (2048.75, NOW() - INTERVAL '1 hour', 'investing.com'),
--   (2052.10, NOW(), 'investing.com');

-- 显示表结构
\d gold_prices;

-- 显示创建的索引
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'gold_prices';
